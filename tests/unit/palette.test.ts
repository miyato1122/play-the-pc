import { describe, expect, it } from 'vitest';

import {
  candyHue,
  CANDY_HUES,
  hsla,
  lerpHue,
  skyColors,
  SKY_PERIOD,
  SKY_STOPS,
  speedHue,
} from '../../src/core/palette.js';

describe('hsla', () => {
  it('CSS として妥当な文字列を返す', () => {
    expect(hsla(200, 90, 60, 0.5)).toBe('hsla(200.0, 90.0%, 60.0%, 0.500)');
  });

  it('色相が範囲外でも 0..360 に巻き戻す', () => {
    expect(hsla(400, 50, 50)).toBe('hsla(40.0, 50.0%, 50.0%, 1.000)');
    expect(hsla(-30, 50, 50)).toBe('hsla(330.0, 50.0%, 50.0%, 1.000)');
  });
});

describe('candyHue', () => {
  it('必ず用意した色相の中から選ばれる', () => {
    for (let total = 1; total <= 12; total++) {
      for (let i = 0; i < total; i++) {
        expect(CANDY_HUES).toContain(candyHue(i, total));
      }
    }
  });

  it('隣り合うインデックスでは違う色になる（同じ色の生き物が並ばない）', () => {
    const total = 5;
    for (let i = 0; i < total - 1; i++) {
      expect(candyHue(i, total)).not.toBe(candyHue(i + 1, total));
    }
  });

  it('総数が 1 でも 0 でも壊れない', () => {
    expect(CANDY_HUES).toContain(candyHue(0, 1));
    expect(CANDY_HUES).toContain(candyHue(0, 0));
  });
});

describe('speedHue', () => {
  it('0..360 の範囲に収まる', () => {
    for (let speed = 0; speed <= 1; speed += 0.05) {
      for (let time = 0; time < 20; time += 1.3) {
        const hue = speedHue(120, speed, time);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThan(360);
      }
    }
  });
});

describe('lerpHue', () => {
  it('短い方の道を通る（赤→紫で緑を経由しない）', () => {
    expect(lerpHue(350, 10, 0.5)).toBeCloseTo(0, 5);
    expect(lerpHue(10, 350, 0.5)).toBeCloseTo(0, 5);
  });

  it('端点はそのまま', () => {
    expect(lerpHue(30, 200, 0)).toBeCloseTo(30, 5);
    expect(lerpHue(30, 200, 1)).toBeCloseTo(200, 5);
  });
});

describe('skyColors', () => {
  it('明度は常に中庸を保つ（真っ白・真っ黒を作らない）', () => {
    for (let time = 0; time < 400; time += 0.37) {
      const { top, bottom } = skyColors(time);
      for (const color of [top, bottom]) {
        expect(color.l).toBeGreaterThan(20);
        expect(color.l).toBeLessThan(70);
        expect(color.h).toBeGreaterThanOrEqual(0);
        expect(color.h).toBeLessThan(360);
      }
    }
  });

  it('下側の方が明るい（空として自然な向き）', () => {
    for (let time = 0; time < 200; time += 0.5) {
      const { top, bottom } = skyColors(time);
      expect(bottom.l).toBeGreaterThan(top.l);
    }
  });

  it('1 フレームでの色の変化はごくわずか（明滅させない）', () => {
    for (let time = 0; time < 200; time += 0.25) {
      const a = skyColors(time);
      const b = skyColors(time + 1 / 60);
      const hueDelta = Math.min(
        Math.abs(a.top.h - b.top.h),
        360 - Math.abs(a.top.h - b.top.h),
      );
      expect(hueDelta).toBeLessThan(1);
      expect(Math.abs(a.bottom.l - b.bottom.l)).toBeLessThan(0.5);
    }
  });

  it('一周すると最初の空に戻る', () => {
    const start = skyColors(0);
    const looped = skyColors(SKY_PERIOD * SKY_STOPS.length);
    expect(looped.top.h).toBeCloseTo(start.top.h, 5);
    expect(looped.bottom.l).toBeCloseTo(start.bottom.l, 5);
  });

  it('負の時刻でも壊れない', () => {
    expect(() => skyColors(-10)).not.toThrow();
    expect(skyColors(-10).top.l).toBeGreaterThan(0);
  });
});

describe('CANDY_HUES', () => {
  it('すべて 0..360 の色相', () => {
    for (const hue of CANDY_HUES) {
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});
