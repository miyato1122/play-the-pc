/**
 * 紙吹雪。シャボン玉が割れた瞬間だけ出る「ごほうび」。
 * キラキラ（常時出る）との差を付けるため、重力で落ち、ひらひら回転する。
 */

import { TAU, clamp } from '../math.js';
import { hsla } from '../palette.js';
import type { Rng } from '../random.js';
import { roundedRectPath, type Ctx2D } from '../shapes.js';

export interface ConfettiPiece {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  width: number;
  height: number;
  hue: number;
  rotation: number;
  spin: number;
  /** ひらひら（横回転）の位相 */
  flutter: number;
  flutterSpeed: number;
}

const GRAVITY = 420;
const DRAG = 1.1;

export class ConfettiField {
  readonly pieces: ConfettiPiece[];
  private cursor = 0;

  constructor(capacity = 420) {
    this.pieces = Array.from({ length: capacity }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      width: 8,
      height: 12,
      hue: 0,
      rotation: 0,
      spin: 0,
      flutter: 0,
      flutterSpeed: 1,
    }));
  }

  get capacity(): number {
    return this.pieces.length;
  }

  get liveCount(): number {
    let count = 0;
    for (const p of this.pieces) if (p.active) count++;
    return count;
  }

  burst(x: number, y: number, count: number, hue: number, rng: Rng, power = 1): void {
    for (let i = 0; i < count; i++) {
      const angle = rng.range(0, TAU);
      const speed = rng.range(90, 330) * power;
      const p = this.pieces[this.cursor] as ConfettiPiece;
      this.cursor = (this.cursor + 1) % this.pieces.length;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - rng.range(40, 160);
      p.maxLife = rng.range(1.1, 2.1);
      p.life = p.maxLife;
      p.width = rng.range(6, 13);
      p.height = rng.range(8, 18);
      p.hue = hue + rng.range(-70, 70);
      p.rotation = rng.range(0, TAU);
      p.spin = rng.range(-9, 9);
      p.flutter = rng.range(0, TAU);
      p.flutterSpeed = rng.range(5, 11);
    }
  }

  update(dt: number): void {
    for (const p of this.pieces) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += GRAVITY * dt;
      p.vx *= 1 - DRAG * dt;
      p.vy *= 1 - DRAG * dt * 0.5;
      p.rotation += p.spin * dt;
      p.flutter += p.flutterSpeed * dt;
    }
  }

  draw(ctx: Ctx2D): void {
    ctx.save();
    for (const p of this.pieces) {
      if (!p.active) continue;
      const t = clamp(p.life / p.maxLife, 0, 1);
      // ひらひら＝横幅が周期的に潰れる（紙が裏返る表現）
      const squash = Math.abs(Math.cos(p.flutter));
      const width = p.width * (0.25 + squash * 0.75);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = clamp(t * 1.6, 0, 1);
      ctx.fillStyle = hsla(p.hue, 92, 62 + squash * 12, 1);
      roundedRectPath(ctx, -width / 2, -p.height / 2, width, p.height, 3);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}
