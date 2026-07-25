/**
 * シャボン玉。
 *
 * 「触れると割れる」という、いちばん分かりやすい因果を担当する。
 * クリックもドラッグも要らず、重なるだけで割れるのが重要（2歳はまだ押せない）。
 * 画面に必ず一定数居るよう補充し続けるので、遊ぶものが無くなることがない。
 */

import { TAU, clamp } from '../math.js';
import { hsla } from '../palette.js';
import type { Rng } from '../random.js';
import type { Ctx2D } from '../shapes.js';

export interface Bubble {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  /** 上昇速度（px/秒、正の値で上へ） */
  rise: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  hue: number;
  /** 出現からの経過秒。ふくらむアニメーションに使う */
  age: number;
  /** 横方向の外力（ポインターの風） */
  driftX: number;
}

export interface BubbleFieldOptions {
  capacity?: number;
  /** 画面に居させたい数 */
  targetCount?: number;
  minRadius?: number;
  maxRadius?: number;
}

/** ふくらみ切るまでの秒数。この間は当たり判定も小さい。 */
const GROW_TIME = 0.45;

export class BubbleField {
  readonly bubbles: Bubble[];
  readonly targetCount: number;
  private readonly minRadius: number;
  private readonly maxRadius: number;

  constructor(options: BubbleFieldOptions = {}) {
    const capacity = options.capacity ?? 40;
    this.targetCount = options.targetCount ?? 16;
    this.minRadius = options.minRadius ?? 26;
    this.maxRadius = options.maxRadius ?? 66;
    this.bubbles = Array.from({ length: capacity }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 0,
      rise: 0,
      wobblePhase: 0,
      wobbleSpeed: 0,
      wobbleAmp: 0,
      hue: 0,
      age: 0,
      driftX: 0,
    }));
  }

  get liveCount(): number {
    let count = 0;
    for (const b of this.bubbles) if (b.active) count++;
    return count;
  }

  /** 起動直後に画面全体へ散らす（下からの湧き出しを待たせない）。 */
  fill(width: number, height: number, rng: Rng): void {
    for (let i = 0; i < this.targetCount; i++) {
      const bubble = this.spawn(width, height, rng);
      if (!bubble) break;
      bubble.y = rng.range(-height * 0.1, height);
      bubble.age = GROW_TIME;
    }
  }

  private spawn(width: number, height: number, rng: Rng): Bubble | null {
    const bubble = this.bubbles.find((b) => !b.active);
    if (!bubble) return null;

    bubble.active = true;
    bubble.radius = rng.range(this.minRadius, this.maxRadius);
    bubble.x = rng.range(bubble.radius, Math.max(bubble.radius, width - bubble.radius));
    bubble.y = height + bubble.radius + rng.range(0, height * 0.35);
    bubble.rise = rng.range(26, 62);
    bubble.wobblePhase = rng.range(0, TAU);
    bubble.wobbleSpeed = rng.range(0.5, 1.4);
    bubble.wobbleAmp = rng.range(10, 34);
    bubble.hue = rng.range(0, 360);
    bubble.age = 0;
    bubble.driftX = 0;
    return bubble;
  }

  /** 当たり判定に使う実効半径（ふくらみ中は小さい）。 */
  effectiveRadius(bubble: Bubble): number {
    return bubble.radius * clamp(bubble.age / GROW_TIME, 0, 1);
  }

  update(dt: number, width: number, height: number, rng: Rng): void {
    for (const b of this.bubbles) {
      if (!b.active) continue;
      b.age += dt;
      b.wobblePhase += b.wobbleSpeed * dt;
      b.y -= b.rise * dt;
      b.x += (Math.cos(b.wobblePhase) * b.wobbleAmp + b.driftX) * dt;
      b.driftX *= 1 - 2.4 * dt;

      // 横は柔らかく跳ね返す
      if (b.x < b.radius) {
        b.x = b.radius;
        b.driftX = Math.abs(b.driftX) * 0.4;
      } else if (b.x > width - b.radius) {
        b.x = width - b.radius;
        b.driftX = -Math.abs(b.driftX) * 0.4;
      }

      // 上に抜けたら退場
      if (b.y + b.radius < 0) b.active = false;
    }

    while (this.liveCount < this.targetCount) {
      if (!this.spawn(width, height, rng)) break;
    }
  }

  /** ポインターの動きで近くのシャボン玉を軽く押す（当たり判定の外側だけ）。 */
  applyWind(x: number, y: number, vx: number, vy: number, radius: number): void {
    const reach = radius * 4;
    for (const b of this.bubbles) {
      if (!b.active) continue;
      const dx = b.x - x;
      const dy = b.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach || dist < 1) continue;
      const falloff = 1 - dist / reach;
      b.driftX += Math.sign(dx || 1) * Math.abs(vx) * 0.02 * falloff;
      b.y += Math.sign(dy || 1) * Math.abs(vy) * 0.0008 * falloff;
    }
  }

  /** 指定した円に重なるシャボン玉を割り、割れたものを返す。 */
  popAt(x: number, y: number, radius: number): Bubble[] {
    const popped: Bubble[] = [];
    for (const b of this.bubbles) {
      if (!b.active) continue;
      const reach = this.effectiveRadius(b) + radius;
      if ((b.x - x) ** 2 + (b.y - y) ** 2 <= reach * reach) {
        b.active = false;
        popped.push({ ...b, active: false });
      }
    }
    return popped;
  }

  draw(ctx: Ctx2D, time: number): void {
    ctx.save();
    for (const b of this.bubbles) {
      if (!b.active) continue;
      const grow = clamp(b.age / GROW_TIME, 0, 1);
      // ふくらむときに少しオーバーシュートさせると、ぷるんとした感じになる
      const scale = grow < 1 ? 1 + Math.sin(grow * Math.PI) * 0.18 : 1;
      const r = b.radius * grow * scale;
      if (r < 1) continue;

      const shimmer = Math.sin(time * 1.6 + b.wobblePhase) * 22;
      const hue = b.hue + shimmer;

      // 本体：背景を暗く濁らせないよう、光を「足す」形で塗る
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = hsla(hue, 95, 62, 1);
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.strokeStyle = hsla(hue + 40, 100, 82, 1);
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 0.94, 0, TAU);
      ctx.stroke();

      // ハイライト（丸みを伝える白い点）
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = hsla(hue, 100, 97, 1);
      ctx.beginPath();
      ctx.arc(b.x - r * 0.34, b.y - r * 0.36, r * 0.17, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(b.x + r * 0.3, b.y + r * 0.28, r * 0.09, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
