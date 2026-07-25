/**
 * キラキラの尾。
 *
 * ペルソナ上もっとも重要な演出。ポインターを「適当に動かすだけ」で必ず出るので、
 * 何かに当てる・狙うといった技能を一切必要としない報酬になっている。
 */

import { TAU, clamp, remap } from '../math.js';
import { hsla, speedHue } from '../palette.js';
import type { Rng } from '../random.js';
import { starPath, type Ctx2D } from '../shapes.js';

export interface Sparkle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  rotation: number;
  spin: number;
}

export interface SparkleEmitOptions {
  x: number;
  y: number;
  /** 0..1 に正規化した速さ */
  speed01: number;
  /** 進行方向（単位ベクトル） */
  dirX: number;
  dirY: number;
  /** 色相の基準。時間で回してレインボーにする */
  time: number;
}

const GRAVITY = -26; // ふわっと上に昇る（負の重力）

export class SparkleField {
  readonly particles: Sparkle[];
  private cursor = 0;
  /** 放出のたまり（フレーム間で端数を持ち越す） */
  private emitAccumulator = 0;

  constructor(capacity = 700) {
    this.particles = Array.from({ length: capacity }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      hue: 0,
      rotation: 0,
      spin: 0,
    }));
  }

  get capacity(): number {
    return this.particles.length;
  }

  get liveCount(): number {
    let count = 0;
    for (const p of this.particles) if (p.active) count++;
    return count;
  }

  /**
   * 速さに応じた量を放出する。
   * 止まっていてもゼロにはせず、わずかに出し続けて「生きている」感じを保つ。
   */
  emitTrail(options: SparkleEmitOptions, dt: number, rng: Rng): void {
    const perSecond = remap(options.speed01, 0, 1, 6, 140);
    this.emitAccumulator += perSecond * dt;
    const count = Math.floor(this.emitAccumulator);
    this.emitAccumulator -= count;
    for (let i = 0; i < count; i++) this.spawn(options, rng);
  }

  /** 単発の放出（他のエンティティからも使う）。 */
  burst(x: number, y: number, count: number, hue: number, rng: Rng, power = 1): void {
    for (let i = 0; i < count; i++) {
      const angle = rng.range(0, TAU);
      const speed = rng.range(40, 240) * power;
      const p = this.take();
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = rng.range(0.5, 1.2);
      p.life = p.maxLife;
      p.size = rng.range(5, 14);
      p.hue = hue + rng.range(-24, 24);
      p.rotation = rng.range(0, TAU);
      p.spin = rng.range(-5, 5);
    }
  }

  private spawn(options: SparkleEmitOptions, rng: Rng): void {
    const p = this.take();
    const spread = rng.range(-1, 1);
    // 進行方向の真後ろに、少し横のばらつきを付けて置く
    const perpX = -options.dirY;
    const perpY = options.dirX;
    const offset = spread * remap(options.speed01, 0, 1, 6, 26);

    p.active = true;
    p.x = options.x + perpX * offset - options.dirX * rng.range(0, 18);
    p.y = options.y + perpY * offset - options.dirY * rng.range(0, 18);
    p.vx = perpX * spread * 60 - options.dirX * rng.range(0, 90);
    p.vy = perpY * spread * 60 - options.dirY * rng.range(0, 90) - rng.range(10, 50);
    p.maxLife = rng.range(0.55, 1.35);
    p.life = p.maxLife;
    p.size = remap(options.speed01, 0, 1, 5, 15) * rng.range(0.6, 1.4);
    p.hue = speedHue(options.time * 26, options.speed01, options.time) + rng.range(-30, 30);
    p.rotation = rng.range(0, TAU);
    p.spin = rng.range(-4, 4);
  }

  /** 使い回しのためリングバッファ状に確保する（一番古いものを上書き）。 */
  private take(): Sparkle {
    const p = this.particles[this.cursor] as Sparkle;
    this.cursor = (this.cursor + 1) % this.particles.length;
    return p;
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += GRAVITY * dt;
      p.vx *= 1 - 1.6 * dt;
      p.vy *= 1 - 1.6 * dt;
      p.rotation += p.spin * dt;
    }
  }

  draw(ctx: Ctx2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      if (!p.active) continue;
      const t = clamp(p.life / p.maxLife, 0, 1);
      // 出た瞬間にふくらんで、消えるときに縮む
      const scale = Math.sin(t * Math.PI) * 0.45 + t * 0.7;
      const size = p.size * scale;
      if (size < 0.4) continue;

      ctx.globalAlpha = t * 0.85;
      ctx.fillStyle = hsla(p.hue, 95, 72, 1);
      starPath(ctx, p.x, p.y, size, 0.42, 4, p.rotation);
      ctx.fill();

      ctx.globalAlpha = t * 0.35;
      ctx.fillStyle = hsla(p.hue, 100, 88, 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.42, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
