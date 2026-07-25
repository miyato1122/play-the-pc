import { describe, expect, it } from 'vitest';

import { createRng } from '../../src/core/random.js';

describe('createRng', () => {
  it('同じシードなら同じ列になる（見た目を再現できる）', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('別のシードなら別の列になる', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next は 0 以上 1 未満', () => {
    const rng = createRng(99);
    for (let i = 0; i < 2000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('range は指定した範囲に収まる', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.range(-5, 5);
      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThan(5);
    }
  });

  it('int は両端を含む整数', () => {
    const rng = createRng(31);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const value = rng.int(1, 3);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(3);
      seen.add(value);
    }
    expect(seen).toEqual(new Set([1, 2, 3]));
  });

  it('pick は必ず配列の要素を返す', () => {
    const rng = createRng(5);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 200; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('空配列の pick は例外', () => {
    const rng = createRng(5);
    expect(() => rng.pick([])).toThrow();
  });

  it('sign は -1 か 1', () => {
    const rng = createRng(11);
    for (let i = 0; i < 200; i++) expect(Math.abs(rng.sign())).toBe(1);
  });
});
