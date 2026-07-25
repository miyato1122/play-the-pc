import { describe, expect, it } from 'vitest';

import { MAX_TRACKED_SPEED, PointerTracker } from '../../src/core/pointer.js';

const step = (tracker: PointerTracker, seconds: number, dt = 1 / 60): void => {
  for (let i = 0; i < Math.round(seconds / dt); i++) tracker.update(dt);
};

describe('PointerTracker', () => {
  it('最初の入力は補間せずワープする（遠くから飛んでこない）', () => {
    const tracker = new PointerTracker(0, 0);
    tracker.moveTo(800, 400);
    expect(tracker.x).toBe(800);
    expect(tracker.y).toBe(400);
    expect(tracker.hasMoved).toBe(true);
  });

  it('2 回目以降は少し遅れて追従する', () => {
    const tracker = new PointerTracker(0, 0);
    tracker.moveTo(0, 0);
    tracker.moveTo(500, 0);
    tracker.update(1 / 60);

    expect(tracker.x).toBeGreaterThan(0);
    expect(tracker.x).toBeLessThan(500);

    step(tracker, 1);
    expect(tracker.x).toBeCloseTo(500, 1);
  });

  it('速さは 0..1 に正規化され、上限を超えない', () => {
    const tracker = new PointerTracker(0, 0);
    tracker.moveTo(0, 0);
    for (let i = 1; i <= 60; i++) {
      tracker.moveTo(i * 500, 0);
      tracker.update(1 / 60);
    }
    expect(tracker.speed).toBeGreaterThan(0);
    expect(tracker.speed01).toBeGreaterThan(0.5);
    expect(tracker.speed01).toBeLessThanOrEqual(1);
    expect(MAX_TRACKED_SPEED).toBeGreaterThan(0);
  });

  it('進行方向の単位ベクトルを持つ', () => {
    const tracker = new PointerTracker(0, 0);
    tracker.moveTo(0, 0);
    for (let i = 1; i <= 30; i++) {
      tracker.moveTo(i * 30, 0);
      tracker.update(1 / 60);
    }
    expect(tracker.dirX).toBeCloseTo(1, 1);
    expect(Math.abs(tracker.dirY)).toBeLessThan(0.2);
  });

  it('止まると idleTime が伸び、動くとゼロに戻る', () => {
    const tracker = new PointerTracker(100, 100);
    tracker.moveTo(100, 100);
    step(tracker, 2);
    expect(tracker.idleTime).toBeGreaterThan(1.5);

    for (let i = 1; i <= 20; i++) {
      tracker.moveTo(100 + i * 40, 100);
      tracker.update(1 / 60);
    }
    expect(tracker.idleTime).toBe(0);
  });

  it('壊れた座標（NaN）は無視する', () => {
    const tracker = new PointerTracker(10, 10);
    tracker.moveTo(10, 10);
    tracker.moveTo(Number.NaN, 50);
    tracker.update(1 / 60);
    expect(Number.isFinite(tracker.x)).toBe(true);
    expect(tracker.targetX).toBe(10);
  });

  it('画面サイズが縮んだら範囲内に収める', () => {
    const tracker = new PointerTracker(0, 0);
    tracker.moveTo(1900, 1000);
    tracker.clampTo(800, 600);
    expect(tracker.x).toBe(800);
    expect(tracker.y).toBe(600);
    expect(tracker.targetX).toBe(800);
  });

  it('dt が 0 でも状態を壊さない', () => {
    const tracker = new PointerTracker(5, 5);
    tracker.moveTo(5, 5);
    tracker.update(0);
    expect(tracker.x).toBe(5);
    expect(tracker.speed).toBe(0);
  });
});
