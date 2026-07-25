import { describe, expect, it } from 'vitest';

import { BubbleField } from '../../src/core/entities/bubbles.js';
import { createRng } from '../../src/core/random.js';
import { createFakeContext } from '../helpers/fakeContext.js';

const WIDTH = 1440;
const HEIGHT = 900;

const settled = (field: BubbleField, rng = createRng(1)): BubbleField => {
  field.fill(WIDTH, HEIGHT, rng);
  // ふくらみ切らせて当たり判定を有効にする
  for (let i = 0; i < 60; i++) field.update(1 / 60, WIDTH, HEIGHT, rng);
  return field;
};

describe('BubbleField', () => {
  it('起動直後から画面に目標数のシャボン玉が居る', () => {
    const field = settled(new BubbleField({ targetCount: 16 }));
    expect(field.liveCount).toBe(16);
  });

  it('割ると減り、すぐ補充される（遊ぶものが無くならない）', () => {
    const rng = createRng(2);
    const field = settled(new BubbleField({ targetCount: 12 }), rng);

    const target = field.bubbles.find((b) => b.active);
    expect(target).toBeDefined();

    const popped = field.popAt(target!.x, target!.y, 30);
    expect(popped.length).toBeGreaterThan(0);
    expect(field.liveCount).toBeLessThan(12);

    field.update(1 / 60, WIDTH, HEIGHT, rng);
    expect(field.liveCount).toBe(12);
  });

  it('離れた場所では割れない', () => {
    const field = settled(new BubbleField({ targetCount: 8 }));
    const before = field.liveCount;
    const popped = field.popAt(-500, -500, 30);
    expect(popped).toHaveLength(0);
    expect(field.liveCount).toBe(before);
  });

  it('割れたシャボン玉の情報（位置・色・大きさ）を返す', () => {
    const field = settled(new BubbleField({ targetCount: 8 }));
    const target = field.bubbles.find((b) => b.active)!;
    const [popped] = field.popAt(target.x, target.y, 30);

    expect(popped).toBeDefined();
    expect(popped!.x).toBeCloseTo(target.x, 5);
    expect(popped!.radius).toBeGreaterThan(0);
    expect(popped!.active).toBe(false);
  });

  it('ふくらみ切る前は当たり判定が小さい', () => {
    const rng = createRng(3);
    const field = new BubbleField({ targetCount: 4 });
    field.update(1 / 60, WIDTH, HEIGHT, rng);
    const fresh = field.bubbles.find((b) => b.active)!;
    expect(field.effectiveRadius(fresh)).toBeLessThan(fresh.radius);

    for (let i = 0; i < 60; i++) field.update(1 / 60, WIDTH, HEIGHT, rng);
    expect(field.effectiveRadius(fresh)).toBeCloseTo(fresh.radius, 5);
  });

  it('上に昇り、画面の左右からはみ出さない', () => {
    const rng = createRng(4);
    const field = settled(new BubbleField({ targetCount: 10 }), rng);
    const tracked = field.bubbles.find((b) => b.active)!;
    const startY = tracked.y;

    for (let i = 0; i < 120; i++) {
      field.update(1 / 60, WIDTH, HEIGHT, rng);
      for (const b of field.bubbles) {
        if (!b.active) continue;
        expect(b.x).toBeGreaterThanOrEqual(b.radius - 0.001);
        expect(b.x).toBeLessThanOrEqual(WIDTH - b.radius + 0.001);
      }
    }
    expect(tracked.y).toBeLessThan(startY);
  });

  it('風では割れず、押されるだけ', () => {
    const rng = createRng(5);
    const field = settled(new BubbleField({ targetCount: 10 }), rng);
    const before = field.liveCount;
    field.applyWind(WIDTH / 2, HEIGHT / 2, 2000, 2000, 30);
    expect(field.liveCount).toBe(before);
  });

  it('容量を超えて確保しようとしても壊れない', () => {
    const rng = createRng(6);
    const field = new BubbleField({ capacity: 3, targetCount: 10 });
    field.fill(WIDTH, HEIGHT, rng);
    expect(field.liveCount).toBe(3);
    expect(() => field.update(1 / 60, WIDTH, HEIGHT, rng)).not.toThrow();
  });

  it('描画は有限の数値だけを使う', () => {
    const field = settled(new BubbleField({ targetCount: 10 }));
    const fake = createFakeContext();
    expect(() => field.draw(fake.ctx, 1.23)).not.toThrow();
    expect(fake.countOf('arc')).toBeGreaterThan(0);
  });
});
