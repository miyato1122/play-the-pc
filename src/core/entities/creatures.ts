/**
 * おともだち。
 *
 * ふわふわ漂いながら、ポインターにゆっくり寄ってくる生き物。
 * 「追いかけっこ」が自然に成立するので、目的を説明しなくても遊びが生まれる。
 * ただし近づきすぎず、逃げもしない（怖がらせない・見失わせない）。
 */

import { TAU, clamp, damp, remap, smoothstep } from '../math.js';
import { candyHue, hsla } from '../palette.js';
import type { Rng } from '../random.js';
import { blobPath, type Ctx2D } from '../shapes.js';

export interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  /** ゆらぎ用の位相 */
  phase: number;
  wanderSpeedA: number;
  wanderSpeedB: number;
  /** 0..1。ポインターが近いほど上がる */
  happiness: number;
  /** ぴょんと跳ねるアニメーション 0..1 */
  hop: number;
  hopCooldown: number;
  blinkTimer: number;
  eyeX: number;
  eyeY: number;
}

/** これより近づくと満足して、それ以上は寄ってこない距離 */
const COMFORT_DISTANCE = 110;
/** これより近いと少し離れる */
const PERSONAL_SPACE = 62;
const MAX_SPEED = 250;

export interface CreatureHop {
  x: number;
  y: number;
  hue: number;
}

export class CreatureFlock {
  readonly creatures: Creature[];

  constructor(count: number, width: number, height: number, rng: Rng) {
    this.creatures = Array.from({ length: count }, (_, i) => ({
      x: rng.range(width * 0.15, width * 0.85),
      y: rng.range(height * 0.15, height * 0.85),
      vx: rng.range(-40, 40),
      vy: rng.range(-40, 40),
      size: rng.range(26, 44),
      hue: candyHue(i, count) + rng.range(-10, 10),
      phase: rng.range(0, TAU),
      wanderSpeedA: rng.range(0.4, 0.9),
      wanderSpeedB: rng.range(0.6, 1.3),
      happiness: 0,
      hop: 0,
      hopCooldown: rng.range(0, 1.5),
      blinkTimer: rng.range(1, 6),
      eyeX: 0,
      eyeY: 0,
    }));
  }

  /**
   * @returns このフレームで跳ねた生き物（喜びの演出を出す位置）
   */
  update(
    dt: number,
    pointerX: number,
    pointerY: number,
    width: number,
    height: number,
  ): CreatureHop[] {
    const hops: CreatureHop[] = [];

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      if (!c) continue;

      c.phase += dt;

      const dx = pointerX - c.x;
      const dy = pointerY - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      let ax = 0;
      let ay = 0;

      if (dist > COMFORT_DISTANCE) {
        // 遠いほど強く寄る（ただし上限つき）
        const pull = remap(dist, COMFORT_DISTANCE, 700, 60, 420);
        ax += nx * pull;
        ay += ny * pull;
      } else if (dist < PERSONAL_SPACE) {
        const push = remap(dist, PERSONAL_SPACE, 0, 0, 260);
        ax -= nx * push;
        ay -= ny * push;
      }

      // ふわふわした揺らぎ
      ax += Math.sin(c.phase * c.wanderSpeedA) * 90;
      ay += Math.cos(c.phase * c.wanderSpeedB) * 90;

      // 仲間同士がくっつきすぎないように
      for (let j = 0; j < this.creatures.length; j++) {
        if (j === i) continue;
        const other = this.creatures[j];
        if (!other) continue;
        const ox = c.x - other.x;
        const oy = c.y - other.y;
        const od = Math.hypot(ox, oy);
        const minDist = (c.size + other.size) * 1.5;
        if (od > 0.001 && od < minDist) {
          const strength = (1 - od / minDist) * 260;
          ax += (ox / od) * strength;
          ay += (oy / od) * strength;
        }
      }

      c.vx += ax * dt;
      c.vy += ay * dt;
      c.vx *= 1 - 1.5 * dt;
      c.vy *= 1 - 1.5 * dt;

      const speed = Math.hypot(c.vx, c.vy);
      if (speed > MAX_SPEED) {
        c.vx = (c.vx / speed) * MAX_SPEED;
        c.vy = (c.vy / speed) * MAX_SPEED;
      }

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // 画面の外に出さない（見失わせない）
      const margin = c.size;
      if (c.x < margin) {
        c.x = margin;
        c.vx = Math.abs(c.vx) * 0.6;
      } else if (c.x > width - margin) {
        c.x = width - margin;
        c.vx = -Math.abs(c.vx) * 0.6;
      }
      if (c.y < margin) {
        c.y = margin;
        c.vy = Math.abs(c.vy) * 0.6;
      } else if (c.y > height - margin) {
        c.y = height - margin;
        c.vy = -Math.abs(c.vy) * 0.6;
      }

      // 近いほどうれしい
      const targetHappiness = 1 - smoothstep(COMFORT_DISTANCE, COMFORT_DISTANCE * 3, dist);
      c.happiness = damp(c.happiness, targetHappiness, 3, dt);

      // うれしいと定期的に跳ねる
      c.hopCooldown -= dt * (0.4 + c.happiness * 2.4);
      if (c.hopCooldown <= 0) {
        c.hopCooldown = 0.9 + (1 - c.happiness) * 2.2;
        if (c.happiness > 0.35) {
          c.hop = 1;
          hops.push({ x: c.x, y: c.y, hue: c.hue });
        }
      }
      c.hop = Math.max(0, c.hop - dt * 2.2);

      // 目はポインターを見る
      c.eyeX = damp(c.eyeX, nx, 10, dt);
      c.eyeY = damp(c.eyeY, ny, 10, dt);

      c.blinkTimer -= dt;
      if (c.blinkTimer < -0.12) c.blinkTimer = 2.4 + (i % 5);
    }

    return hops;
  }

  draw(ctx: Ctx2D): void {
    ctx.save();
    for (const c of this.creatures) {
      const hopLift = Math.sin(c.hop * Math.PI) * c.size * 0.55;
      const squash = 1 + Math.sin(c.hop * Math.PI) * 0.16;
      const x = c.x;
      const y = c.y - hopLift;
      const r = c.size;

      // 影（浮いている感じを出す）
      ctx.globalAlpha = 0.18 * (1 - c.hop * 0.6);
      ctx.fillStyle = 'hsla(240, 40%, 10%, 1)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + r * 0.95, r * 0.75, r * 0.22, 0, 0, TAU);
      ctx.fill();

      // ほんのりした光
      ctx.globalAlpha = 0.3 + c.happiness * 0.3;
      ctx.fillStyle = hsla(c.hue, 95, 68, 1);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5, 0, TAU);
      ctx.fill();

      // からだ
      ctx.globalAlpha = 1;
      ctx.fillStyle = hsla(c.hue, 88, 66, 1);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1 / squash, squash);
      blobPath(ctx, 0, 0, r, 0.07, c.phase * 1.6, 3);
      ctx.fill();
      ctx.restore();

      // ほっぺ
      ctx.globalAlpha = 0.55 * c.happiness;
      ctx.fillStyle = hsla(c.hue - 24, 95, 74, 1);
      ctx.beginPath();
      ctx.arc(x - r * 0.52, y + r * 0.2, r * 0.19, 0, TAU);
      ctx.arc(x + r * 0.52, y + r * 0.2, r * 0.19, 0, TAU);
      ctx.fill();

      // め
      const blinking = c.blinkTimer < 0;
      const eyeOffset = r * 0.3;
      const eyeR = r * 0.19;
      for (const side of [-1, 1]) {
        const ex = x + side * eyeOffset;
        const ey = y - r * 0.12;
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'hsla(0, 0%, 100%, 1)';
        if (blinking) {
          ctx.lineWidth = Math.max(2, r * 0.08);
          ctx.strokeStyle = 'hsla(250, 45%, 22%, 1)';
          ctx.beginPath();
          ctx.moveTo(ex - eyeR, ey);
          ctx.lineTo(ex + eyeR, ey);
          ctx.stroke();
          continue;
        }
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'hsla(250, 45%, 22%, 1)';
        ctx.beginPath();
        ctx.arc(ex + c.eyeX * eyeR * 0.45, ey + c.eyeY * eyeR * 0.45, eyeR * 0.56, 0, TAU);
        ctx.fill();
      }

      // にっこり（うれしいときだけ口が開く）
      if (c.happiness > 0.25) {
        ctx.globalAlpha = clamp((c.happiness - 0.25) * 2, 0, 1);
        ctx.strokeStyle = 'hsla(250, 45%, 22%, 1)';
        ctx.lineWidth = Math.max(2, r * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y + r * 0.16, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
