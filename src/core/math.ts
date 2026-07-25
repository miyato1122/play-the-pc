/** 描画・物理で共通に使う小さな数学ユーティリティ。DOM に依存しない。 */

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * フレームレートに依存しない指数補間。
 * `smoothing` が大きいほど速く target に追いつく（単位: 1/秒）。
 */
export function damp(current: number, target: number, smoothing: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

export function length(x: number, y: number): number {
  return Math.hypot(x, y);
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** 0..1 に正規化してから滑らかに立ち上がる補間。 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** value を [min, max) の範囲に巻き戻す。 */
export function wrap(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return min;
  return ((((value - min) % span) + span) % span) + min;
}

/** ある範囲の値を別の範囲へ写す（範囲外は丸める）。 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMin === inMax) return outMin;
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return lerp(outMin, outMax, t);
}
