import { describe, expect, it } from 'vitest';

import { clamp, damp, distance, lerp, remap, smoothstep, wrap } from '../../src/core/math.js';

describe('clamp', () => {
  it('範囲内はそのまま、外は丸める', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('端点と中点', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('damp', () => {
  it('target に近づくが行き過ぎない', () => {
    const next = damp(0, 100, 10, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(100);
  });

  it('dt の分割の仕方によらず、ほぼ同じ位置に着く（フレームレート非依存）', () => {
    const bigStep = damp(0, 100, 10, 0.1);

    let small = 0;
    for (let i = 0; i < 10; i++) small = damp(small, 100, 10, 0.01);

    expect(Math.abs(bigStep - small)).toBeLessThan(0.001);
  });

  it('十分な時間で target に収束する', () => {
    let value = 0;
    for (let i = 0; i < 600; i++) value = damp(value, 100, 10, 1 / 60);
    expect(value).toBeCloseTo(100, 3);
  });
});

describe('smoothstep', () => {
  it('境界の外は 0 と 1、中間は滑らか', () => {
    expect(smoothstep(0, 10, -5)).toBe(0);
    expect(smoothstep(0, 10, 15)).toBe(1);
    expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5, 5);
  });

  it('edge が同じでもゼロ除算しない', () => {
    expect(smoothstep(5, 5, 4)).toBe(0);
    expect(smoothstep(5, 5, 6)).toBe(1);
  });
});

describe('wrap', () => {
  it('負の値も正しく巻き戻す', () => {
    expect(wrap(370, 0, 360)).toBe(10);
    expect(wrap(-10, 0, 360)).toBe(350);
    expect(wrap(0, 0, 360)).toBe(0);
  });

  it('範囲が 0 以下なら min を返す', () => {
    expect(wrap(3, 5, 5)).toBe(5);
  });
});

describe('remap', () => {
  it('範囲外は端に丸められる', () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
    expect(remap(-1, 0, 10, 0, 100)).toBe(0);
    expect(remap(11, 0, 10, 0, 100)).toBe(100);
  });
});

describe('distance', () => {
  it('3-4-5 の直角三角形', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });
});
