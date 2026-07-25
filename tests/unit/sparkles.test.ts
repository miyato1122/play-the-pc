import { describe, expect, it } from 'vitest';

import { ConfettiField } from '../../src/core/entities/confetti.js';
import { SparkleField } from '../../src/core/entities/sparkles.js';
import { createRng } from '../../src/core/random.js';
import { createFakeContext } from '../helpers/fakeContext.js';

const emit = (field: SparkleField, speed01: number, seconds: number): void => {
  const rng = createRng(42);
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    field.emitTrail({ x: 100, y: 100, speed01, dirX: 1, dirY: 0, time: i * dt }, dt, rng);
  }
};

describe('SparkleField', () => {
  it('止まっていても少しは出る（動かす前から生きて見える）', () => {
    const field = new SparkleField(400);
    emit(field, 0, 0.5);
    expect(field.liveCount).toBeGreaterThan(0);
  });

  it('速く動かすほどたくさん出る', () => {
    const slow = new SparkleField(900);
    emit(slow, 0.1, 1);

    const fast = new SparkleField(900);
    emit(fast, 1, 1);

    expect(fast.liveCount).toBeGreaterThan(slow.liveCount * 3);
  });

  it('容量を超えても壊れず、上限を守る', () => {
    const field = new SparkleField(50);
    emit(field, 1, 5);
    expect(field.liveCount).toBeLessThanOrEqual(50);
    expect(field.capacity).toBe(50);
  });

  it('時間が経てば消える（描画量が無限に増えない）', () => {
    const field = new SparkleField(400);
    emit(field, 1, 0.5);
    expect(field.liveCount).toBeGreaterThan(0);

    for (let i = 0; i < 300; i++) field.update(1 / 60);
    expect(field.liveCount).toBe(0);
  });

  it('burst は指定した数だけ出す', () => {
    const field = new SparkleField(400);
    field.burst(50, 50, 20, 180, createRng(1));
    expect(field.liveCount).toBe(20);
  });

  it('描画は有限の数値だけを使う', () => {
    const field = new SparkleField(200);
    emit(field, 0.8, 0.5);
    field.update(0.2);
    const fake = createFakeContext();
    expect(() => field.draw(fake.ctx)).not.toThrow();
    expect(fake.countOf('fill')).toBeGreaterThan(0);
  });
});

describe('ConfettiField', () => {
  it('burst した数だけ出て、やがて消える', () => {
    const field = new ConfettiField(200);
    field.burst(100, 100, 24, 200, createRng(9));
    expect(field.liveCount).toBe(24);

    for (let i = 0; i < 300; i++) field.update(1 / 60);
    expect(field.liveCount).toBe(0);
  });

  it('重力で落ちる', () => {
    const field = new ConfettiField(50);
    field.burst(100, 100, 10, 200, createRng(3));
    for (let i = 0; i < 90; i++) field.update(1 / 60);
    const alive = field.pieces.filter((p) => p.active);
    expect(alive.length).toBeGreaterThan(0);
    expect(alive.some((p) => p.y > 100)).toBe(true);
  });

  it('容量を超える burst でも壊れない', () => {
    const field = new ConfettiField(20);
    expect(() => field.burst(0, 0, 500, 10, createRng(4))).not.toThrow();
    expect(field.liveCount).toBeLessThanOrEqual(20);
  });

  it('描画は有限の数値だけを使う', () => {
    const field = new ConfettiField(60);
    field.burst(100, 100, 20, 90, createRng(6));
    field.update(0.3);
    const fake = createFakeContext();
    expect(() => field.draw(fake.ctx)).not.toThrow();
  });
});
