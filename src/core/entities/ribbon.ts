/**
 * ポインターの通った跡に残る虹色のリボン。
 * 「自分が線を描いた」という手応えを、速く動かしたときほど強く返す。
 */

import { clamp, remap } from '../math.js';
import { hsla, speedHue } from '../palette.js';
import type { Ctx2D } from '../shapes.js';

export interface RibbonPoint {
  x: number;
  y: number;
  hue: number;
  width: number;
  life: number;
}

const MAX_LIFE = 0.85;

export class Ribbon {
  readonly points: RibbonPoint[] = [];
  private readonly capacity: number;

  constructor(capacity = 90) {
    this.capacity = capacity;
  }

  push(x: number, y: number, speed01: number, time: number): void {
    const last = this.points[this.points.length - 1];
    if (last && Math.hypot(x - last.x, y - last.y) < 2) return;

    this.points.push({
      x,
      y,
      hue: speedHue(time * 26, speed01, time),
      width: remap(speed01, 0, 1, 3, 34),
      life: MAX_LIFE,
    });

    if (this.points.length > this.capacity) this.points.shift();
  }

  update(dt: number): void {
    for (const p of this.points) p.life -= dt;
    while (this.points.length > 0 && (this.points[0] as RibbonPoint).life <= 0) {
      this.points.shift();
    }
  }

  draw(ctx: Ctx2D): void {
    if (this.points.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      if (!a || !b) continue;
      const t = clamp(b.life / MAX_LIFE, 0, 1);
      if (t <= 0) continue;

      ctx.globalAlpha = t * 0.5;
      ctx.strokeStyle = hsla(b.hue, 95, 70, 1);
      ctx.lineWidth = b.width * t;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      ctx.globalAlpha = t * 0.35;
      ctx.strokeStyle = hsla(b.hue + 30, 100, 88, 1);
      ctx.lineWidth = Math.max(1, b.width * t * 0.35);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
