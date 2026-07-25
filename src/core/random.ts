/**
 * 決定的な擬似乱数生成器（mulberry32）。
 * テストで見た目・挙動を再現できるようにシード指定できる形にしている。
 */

export interface Rng {
  /** 0 以上 1 未満 */
  next(): number;
  /** min 以上 max 未満 */
  range(min: number, max: number): number;
  /** min 以上 max 以下の整数 */
  int(min: number, max: number): number;
  /** 配列から1つ選ぶ */
  pick<T>(items: readonly T[]): T;
  /** -1 か 1 */
  sign(): number;
  /** probability の確率で true */
  chance(probability: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const range = (min: number, max: number): number => min + next() * (max - min);

  return {
    next,
    range,
    int: (min, max) => Math.floor(range(min, max + 1)),
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick() called with an empty array');
      const index = Math.min(items.length - 1, Math.floor(next() * items.length));
      return items[index] as T;
    },
    sign: () => (next() < 0.5 ? -1 : 1),
    chance: (probability) => next() < probability,
  };
}
