import { describe, expect, it } from 'vitest';

import {
  PerformanceGovernor,
  QUALITY_FULL,
  QUALITY_REDUCED,
} from '../../src/core/performance.js';

const feed = (governor: PerformanceGovernor, frameMs: number, count: number): number => {
  let drops = 0;
  for (let i = 0; i < count; i++) if (governor.sample(frameMs / 1000)) drops++;
  return drops;
};

describe('PerformanceGovernor', () => {
  it('60fps が続くかぎり品質は最高のまま', () => {
    const governor = new PerformanceGovernor(90, 22);
    expect(feed(governor, 16.7, 1000)).toBe(0);
    expect(governor.level).toBe(QUALITY_FULL);
  });

  it('重い状態が続くと品質を 1 段だけ落とす', () => {
    const governor = new PerformanceGovernor(90, 22);
    expect(feed(governor, 33, 90)).toBe(1);
    expect(governor.level).toBe(QUALITY_REDUCED);
  });

  it('一度落としたら二度と上げ下げしない（ちらつき防止）', () => {
    const governor = new PerformanceGovernor(60, 22);
    feed(governor, 40, 60);
    expect(governor.level).toBe(QUALITY_REDUCED);
    expect(feed(governor, 8, 600)).toBe(0);
    expect(governor.level).toBe(QUALITY_REDUCED);
  });

  it('判定に必要なフレーム数が集まるまでは落とさない', () => {
    const governor = new PerformanceGovernor(90, 22);
    expect(feed(governor, 50, 89)).toBe(0);
    expect(governor.level).toBe(QUALITY_FULL);
  });

  it('スリープ復帰のような極端な 1 フレームでは落とさない', () => {
    const governor = new PerformanceGovernor(10, 22);
    for (let i = 0; i < 9; i++) governor.sample(0.016);
    expect(governor.sample(30)).toBe(false);
    expect(governor.level).toBe(QUALITY_FULL);
  });

  it('壊れた値を渡しても状態が壊れない', () => {
    const governor = new PerformanceGovernor(5, 22);
    expect(governor.sample(Number.NaN)).toBe(false);
    expect(governor.sample(-1)).toBe(false);
    expect(governor.sample(0)).toBe(false);
    expect(governor.level).toBe(QUALITY_FULL);
  });
});
