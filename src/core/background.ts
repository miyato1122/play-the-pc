/**
 * 背景の空。
 *
 * ゆっくり色が巡るグラデーションと、漂う雲、ポインターを照らす柔らかい光。
 * 幼児向けなので、急な明滅・高コントラストの点滅は行わない。
 */

import { TAU, wrap } from './math.js';
import { hsla, hslaOf, skyColors } from './palette.js';
import type { Rng } from './random.js';
import type { Ctx2D } from './shapes.js';

interface Cloud {
  x: number;
  y: number;
  radius: number;
  speed: number;
  hue: number;
  alpha: number;
}

export class Background {
  private time = 0;
  private readonly clouds: Cloud[];

  constructor(count: number, rng: Rng) {
    this.clouds = Array.from({ length: count }, () => ({
      x: rng.next(),
      y: rng.range(0.05, 0.95),
      radius: rng.range(0.12, 0.34),
      speed: rng.range(0.006, 0.022) * rng.sign(),
      hue: rng.range(0, 360),
      alpha: rng.range(0.05, 0.13),
    }));
  }

  update(dt: number): void {
    this.time += dt;
    for (const cloud of this.clouds) {
      cloud.x = wrap(cloud.x + cloud.speed * dt, -0.4, 1.4);
    }
  }

  draw(ctx: Ctx2D, width: number, height: number, pointerX: number, pointerY: number): void {
    const sky = skyColors(this.time);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, hslaOf(sky.top));
    gradient.addColorStop(1, hslaOf(sky.bottom));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const cloud of this.clouds) {
      const cx = cloud.x * width;
      const cy = cloud.y * height;
      const r = cloud.radius * Math.max(width, height);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      glow.addColorStop(0, hsla(cloud.hue + this.time * 6, 90, 70, cloud.alpha));
      glow.addColorStop(1, hsla(cloud.hue + this.time * 6, 90, 70, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    }

    // ポインターの周りをほんのり照らす
    const lightRadius = Math.min(width, height) * 0.42;
    const light = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, lightRadius);
    light.addColorStop(0, hsla(50, 100, 78, 0.16));
    light.addColorStop(1, hsla(50, 100, 78, 0));
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(pointerX, pointerY, lightRadius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
