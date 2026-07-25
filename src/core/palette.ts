/**
 * 子ども向けの配色。
 * - 彩度は高めだが明度も高く保ち、目に刺さらない「キャンディ色」に寄せる
 * - 極端に暗い色・純白の点滅は使わない（光過敏への配慮）
 */

import { wrap } from './math.js';

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** 明るく識別しやすい色相たち（ピンク〜オレンジ〜黄〜緑〜水色〜青〜紫） */
export const CANDY_HUES: readonly number[] = [340, 10, 32, 52, 96, 152, 186, 208, 232, 276, 308];

export function hsla(h: number, s: number, l: number, a = 1): string {
  return `hsla(${wrap(h, 0, 360).toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${a.toFixed(3)})`;
}

export function hslaOf(color: Hsl, a = 1): string {
  return hsla(color.h, color.s, color.l, a);
}

/** CANDY_HUES の中から、全体に散らばるように 1 色選ぶ。 */
export function candyHue(index: number, total: number): number {
  const count = CANDY_HUES.length;
  const position = total <= 1 ? 0 : Math.round((index * (count - 1)) / total) % count;
  return CANDY_HUES[position] as number;
}

/** 速さ 0..1 に応じて、やさしい色 → 虹色へ。 */
export function speedHue(baseHue: number, speed01: number, time: number): number {
  return wrap(baseHue + speed01 * 260 + time * 40, 0, 360);
}

/** 色相の短い方の道を通って補間する（赤→紫が緑を経由しないように）。 */
export function lerpHue(from: number, to: number, t: number): number {
  const delta = wrap(to - from + 180, 0, 360) - 180;
  return wrap(from + delta * t, 0, 360);
}

/**
 * 空のグラデーション（上・下）。
 * 色相をぐるぐる回すと濁った色（くすんだ黄土色など）を通ってしまうため、
 * あらかじめ「きれいに見える組み合わせ」だけを並べて、その間を行き来する。
 */
export const SKY_STOPS: readonly { top: Hsl; bottom: Hsl }[] = [
  // ひるの空
  { top: { h: 214, s: 68, l: 36 }, bottom: { h: 192, s: 76, l: 60 } },
  // ゆうやけ
  { top: { h: 282, s: 58, l: 34 }, bottom: { h: 22, s: 82, l: 60 } },
  // よぞら
  { top: { h: 248, s: 62, l: 27 }, bottom: { h: 286, s: 58, l: 47 } },
  // あさやけ
  { top: { h: 252, s: 56, l: 33 }, bottom: { h: 330, s: 74, l: 62 } },
  // みずうみ
  { top: { h: 196, s: 60, l: 31 }, bottom: { h: 156, s: 62, l: 54 } },
];

/** 1 つの空にとどまる秒数。ゆっくり変わるので、変化そのものは意識されない。 */
export const SKY_PERIOD = 26;

export function skyColors(time: number): { top: Hsl; bottom: Hsl } {
  const count = SKY_STOPS.length;
  const position = (Math.max(0, time) / SKY_PERIOD) % count;
  const index = Math.floor(position);
  const t = position - index;

  const from = SKY_STOPS[index] as { top: Hsl; bottom: Hsl };
  const to = SKY_STOPS[(index + 1) % count] as { top: Hsl; bottom: Hsl };

  const blend = (a: Hsl, b: Hsl): Hsl => ({
    h: lerpHue(a.h, b.h, t),
    s: a.s + (b.s - a.s) * t,
    l: a.l + (b.l - a.l) * t,
  });

  return { top: blend(from.top, to.top), bottom: blend(from.bottom, to.bottom) };
}
