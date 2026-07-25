import { describe, expect, it, vi } from 'vitest';

import { ExitGuard, EXIT_KEY } from '../../src/core/exitGuard.js';

const hold = (guard: ExitGuard, seconds: number): void => {
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(seconds / dt); i++) guard.update(dt);
};

describe('ExitGuard', () => {
  it('Esc を 2 秒押し続けると終了する', () => {
    const onComplete = vi.fn();
    const guard = new ExitGuard(2, onComplete);

    guard.keyDown(EXIT_KEY);
    hold(guard, 1.9);
    expect(onComplete).not.toHaveBeenCalled();

    hold(guard, 0.2);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(guard.progress).toBe(1);
  });

  it('短く押しただけでは終了しない（幼児の単発タップ対策）', () => {
    const onComplete = vi.fn();
    const guard = new ExitGuard(2, onComplete);

    for (let i = 0; i < 20; i++) {
      guard.keyDown(EXIT_KEY);
      hold(guard, 0.1);
      guard.keyUp(EXIT_KEY);
      hold(guard, 0.3);
    }

    expect(onComplete).not.toHaveBeenCalled();
    expect(guard.progress).toBe(0);
  });

  it('Esc 以外のキーをいくら叩いても反応しない', () => {
    const onComplete = vi.fn();
    const guard = new ExitGuard(2, onComplete);

    for (const key of ['a', 'Enter', ' ', 'Meta', 'q', 'ArrowUp', 'F1']) {
      guard.keyDown(key);
      hold(guard, 3);
      guard.keyUp(key);
    }

    expect(onComplete).not.toHaveBeenCalled();
    expect(guard.progress).toBe(0);
    expect(guard.isHolding).toBe(false);
  });

  it('押し続けても 1 回しか発火しない', () => {
    const onComplete = vi.fn();
    const guard = new ExitGuard(1, onComplete);
    guard.keyDown(EXIT_KEY);
    hold(guard, 5);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('離すと進捗が戻る', () => {
    const guard = new ExitGuard(2);
    guard.keyDown(EXIT_KEY);
    hold(guard, 1);
    const midway = guard.progress;
    expect(midway).toBeGreaterThan(0.4);

    guard.keyUp(EXIT_KEY);
    hold(guard, 0.2);
    expect(guard.progress).toBeLessThan(midway);
  });

  it('reset で押しっぱなし状態が解除される（フォーカスを失ったとき用）', () => {
    const onComplete = vi.fn();
    const guard = new ExitGuard(2, onComplete);
    guard.keyDown(EXIT_KEY);
    hold(guard, 1);
    guard.reset();
    hold(guard, 5);
    expect(onComplete).not.toHaveBeenCalled();
    expect(guard.progress).toBe(0);
  });
});
