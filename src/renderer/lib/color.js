/**
 * 色相計算まわりの純粋関数群。DOM/Canvasには一切触れない。
 */

/** 0-360の範囲に正規化した色相を返す */
export function normalizeHue(hue) {
  return ((hue % 360) + 360) % 360;
}

/** 経過時間(ms)からゆっくり循環する背景用の色相を作る */
export function ambientHue(elapsedMs, speedDegPerSec = 6) {
  return normalizeHue((elapsedMs / 1000) * speedDegPerSec);
}

/** hsl()のCSS文字列を作る */
export function hsl(hue, saturation = 80, lightness = 60, alpha = 1) {
  const h = normalizeHue(hue);
  if (alpha >= 1) {
    return `hsl(${h.toFixed(1)}, ${saturation}%, ${lightness}%)`;
  }
  return `hsla(${h.toFixed(1)}, ${saturation}%, ${lightness}%, ${alpha})`;
}

/** 見た目が単調にならないよう、時間とインデックスからにぎやかな色相を作る */
export function playfulHue(elapsedMs, seed = 0) {
  return normalizeHue((elapsedMs / 8) + seed * 47);
}
