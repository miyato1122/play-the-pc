import { describe, expect, it } from 'vitest';

import { CreatureFlock } from '../../src/core/entities/creatures.js';
import { createRng } from '../../src/core/random.js';
import { createFakeContext } from '../helpers/fakeContext.js';

const WIDTH = 1280;
const HEIGHT = 800;

const run = (flock: CreatureFlock, x: number, y: number, seconds: number): number => {
  const dt = 1 / 60;
  let hops = 0;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    hops += flock.update(dt, x, y, WIDTH, HEIGHT).length;
  }
  return hops;
};

describe('CreatureFlock', () => {
  it('ポインターに近づいてくる', () => {
    const flock = new CreatureFlock(4, WIDTH, HEIGHT, createRng(1));
    const targetX = 80;
    const targetY = 80;
    const before = flock.creatures.map((c) => Math.hypot(c.x - targetX, c.y - targetY));

    run(flock, targetX, targetY, 6);

    const after = flock.creatures.map((c) => Math.hypot(c.x - targetX, c.y - targetY));
    const averageBefore = before.reduce((a, b) => a + b, 0) / before.length;
    const averageAfter = after.reduce((a, b) => a + b, 0) / after.length;
    expect(averageAfter).toBeLessThan(averageBefore);
  });

  it('近づきすぎて重ならない（ポインターに張り付かない）', () => {
    const flock = new CreatureFlock(4, WIDTH, HEIGHT, createRng(2));
    run(flock, WIDTH / 2, HEIGHT / 2, 10);
    for (const c of flock.creatures) {
      expect(Math.hypot(c.x - WIDTH / 2, c.y - HEIGHT / 2)).toBeGreaterThan(20);
    }
  });

  it('画面の外に出ていかない（見失わせない）', () => {
    const flock = new CreatureFlock(5, WIDTH, HEIGHT, createRng(3));
    const dt = 1 / 60;
    for (let i = 0; i < 900; i++) {
      // ポインターを画面の隅で暴れさせる
      const x = i % 2 === 0 ? -400 : WIDTH + 400;
      const y = i % 3 === 0 ? -300 : HEIGHT + 300;
      flock.update(dt, x, y, WIDTH, HEIGHT);
      for (const c of flock.creatures) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x).toBeLessThanOrEqual(WIDTH);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThanOrEqual(HEIGHT);
      }
    }
  });

  it('そばに居ると喜んで跳ねる', () => {
    const flock = new CreatureFlock(4, WIDTH, HEIGHT, createRng(4));
    const hops = run(flock, WIDTH / 2, HEIGHT / 2, 12);
    expect(hops).toBeGreaterThan(0);
    expect(Math.max(...flock.creatures.map((c) => c.happiness))).toBeGreaterThan(0.5);
  });

  it('遠くに居るときは happiness が低い', () => {
    const flock = new CreatureFlock(3, WIDTH, HEIGHT, createRng(5));
    // 画面外の遠方を指し続ける（生き物は壁に阻まれて到達できない）
    const dt = 1 / 60;
    for (let i = 0; i < 120; i++) flock.update(dt, WIDTH * 6, HEIGHT * 6, WIDTH, HEIGHT);
    expect(Math.max(...flock.creatures.map((c) => c.happiness))).toBeLessThan(0.5);
  });

  it('生き物が 0 匹でも壊れない', () => {
    const flock = new CreatureFlock(0, WIDTH, HEIGHT, createRng(6));
    expect(() => run(flock, 10, 10, 1)).not.toThrow();
  });

  it('描画は有限の数値だけを使う', () => {
    const flock = new CreatureFlock(4, WIDTH, HEIGHT, createRng(7));
    run(flock, WIDTH / 2, HEIGHT / 2, 3);
    const fake = createFakeContext();
    expect(() => flock.draw(fake.ctx)).not.toThrow();
    expect(fake.countOf('fill')).toBeGreaterThan(0);
  });
});
