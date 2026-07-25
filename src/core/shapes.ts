/** Canvas に描く基本図形。パスを組み立てるだけで、塗りは呼び出し側に任せる。 */

import { TAU } from './math.js';

export type Ctx2D = CanvasRenderingContext2D;

/** 星形のパスを作る（fill/stroke は呼び出し側）。 */
export function starPath(
  ctx: Ctx2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRatio = 0.44,
  points = 4,
  rotation = 0,
): void {
  const inner = outerRadius * innerRatio;
  ctx.beginPath();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : inner;
    const angle = rotation + i * step - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * ゆらゆら揺れる有機的な円（ブロブ）のパス。
 * `wobble` は半径に対する揺れの割合、`phase` を進めると波打つ。
 */
export function blobPath(
  ctx: Ctx2D,
  x: number,
  y: number,
  radius: number,
  wobble = 0.08,
  phase = 0,
  lobes = 3,
  segments = 28,
): void {
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * TAU;
    const r = radius * (1 + Math.sin(angle * lobes + phase) * wobble);
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function roundedRectPath(
  ctx: Ctx2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
