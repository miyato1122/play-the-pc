/** 画面の隅に出す、終了ホールドの進捗リング（大人向けの唯一のUI）。 */

import { TAU } from './math.js';
import { hsla } from './palette.js';
import type { Ctx2D } from './shapes.js';

export function drawExitProgress(
  ctx: Ctx2D,
  progress: number,
  width: number,
  _height: number,
): void {
  if (progress <= 0.001) return;

  const radius = 22;
  const x = width - radius - 26;
  const y = radius + 26;

  ctx.save();
  ctx.globalAlpha = Math.min(1, progress * 3);

  ctx.lineWidth = 5;
  ctx.strokeStyle = hsla(0, 0, 100, 0.25);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = hsla(45, 100, 70, 0.95);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
  ctx.stroke();

  ctx.restore();
}
