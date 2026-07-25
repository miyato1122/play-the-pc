import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayfulAudio } from '../../src/core/audio.js';
import { MAX_FRAME_DELTA, Scene } from '../../src/core/scene.js';
import { createFakeContext } from '../helpers/fakeContext.js';

const WIDTH = 1440;
const HEIGHT = 900;

function createSpyAudio() {
  const audio = {
    unlock: vi.fn<() => void>(),
    pop: vi.fn<(normalizedY: number, intensity?: number) => void>(),
    chirp: vi.fn<(normalizedY: number) => void>(),
    setMotion: vi.fn<(speed01: number) => void>(),
    dispose: vi.fn<() => void>(),
  };
  // PlayfulAudio を満たしていることを型で保証する
  const _check: PlayfulAudio = audio;
  void _check;
  return audio;
}

function advance(scene: Scene, seconds: number, dt = 1 / 60): void {
  for (let i = 0; i < Math.round(seconds / dt); i++) scene.update(dt);
}

describe('Scene', () => {
  let audio: ReturnType<typeof createSpyAudio>;
  let scene: Scene;

  beforeEach(() => {
    audio = createSpyAudio();
    scene = new Scene({ width: WIDTH, height: HEIGHT, seed: 12345, audio });
  });

  it('動かすだけでキラキラが出る（当てなくても報酬がある）', () => {
    scene.pointerMove(200, 200);
    for (let i = 1; i <= 30; i++) {
      scene.pointerMove(200 + i * 20, 200 + i * 10);
      scene.update(1 / 60);
    }
    expect(scene.sparkles.liveCount).toBeGreaterThan(0);
    expect(scene.ribbon.points.length).toBeGreaterThan(1);
  });

  it('シャボン玉に重ねるだけで割れて、音と紙吹雪が出る', () => {
    advance(scene, 1);

    const bubble = scene.bubbles.bubbles.find((b) => b.active && b.y > 0 && b.y < HEIGHT);
    expect(bubble).toBeDefined();

    scene.pointerMove(bubble!.x, bubble!.y);
    scene.update(1 / 60);

    expect(scene.poppedCount).toBeGreaterThan(0);
    expect(audio.pop).toHaveBeenCalled();
    expect(scene.confetti.liveCount).toBeGreaterThan(0);
  });

  it('割れた高さに応じた音程で鳴る（上ほど高い）', () => {
    advance(scene, 1);
    const bubble = scene.bubbles.bubbles.find((b) => b.active && b.y > 0 && b.y < HEIGHT)!;
    scene.pointerMove(bubble.x, bubble.y);
    scene.update(1 / 60);

    const [normalizedY] = audio.pop.mock.calls[0] as [number, number];
    expect(normalizedY).toBeGreaterThanOrEqual(0);
    expect(normalizedY).toBeLessThanOrEqual(1);
    expect(normalizedY).toBeCloseTo(bubble.y / HEIGHT, 2);
  });

  it('速さを音の演出に渡している', () => {
    scene.pointerMove(100, 100);
    scene.update(1 / 60);
    expect(audio.setMotion).toHaveBeenCalled();
    const last = audio.setMotion.mock.calls.at(-1) as [number];
    expect(last[0]).toBeGreaterThanOrEqual(0);
    expect(last[0]).toBeLessThanOrEqual(1);
  });

  it('長時間放置してもパーティクルが上限を超えない', () => {
    for (let i = 0; i < 3600; i++) {
      scene.pointerMove((i * 37) % WIDTH, (i * 53) % HEIGHT);
      scene.update(1 / 60);
    }
    expect(scene.sparkles.liveCount).toBeLessThanOrEqual(scene.sparkles.capacity);
    expect(scene.confetti.liveCount).toBeLessThanOrEqual(scene.confetti.capacity);
    expect(scene.bubbles.liveCount).toBe(scene.bubbles.targetCount);
    expect(scene.ribbon.points.length).toBeLessThanOrEqual(90);
  });

  it('ウィンドウ復帰などで巨大な dt が来ても world が飛ばない', () => {
    scene.pointerMove(300, 300);
    advance(scene, 1);
    const timeBefore = scene.time;
    scene.update(30);
    expect(scene.time - timeBefore).toBeLessThanOrEqual(MAX_FRAME_DELTA + 1e-9);
  });

  it('dt が 0 や負でも壊れない', () => {
    expect(() => {
      scene.update(0);
      scene.update(-1);
    }).not.toThrow();
  });

  it('画面外の座標が来ても画面内に収まる', () => {
    scene.pointerMove(-9999, 99999);
    scene.update(1 / 60);
    expect(scene.pointer.x).toBeGreaterThanOrEqual(0);
    expect(scene.pointer.x).toBeLessThanOrEqual(WIDTH);
    expect(scene.pointer.y).toBeGreaterThanOrEqual(0);
    expect(scene.pointer.y).toBeLessThanOrEqual(HEIGHT);
  });

  it('リサイズしてもポインターとシャボン玉が画面内に残る', () => {
    advance(scene, 1);
    scene.pointerMove(1400, 880);
    scene.update(1 / 60);

    scene.resize(800, 600);
    advance(scene, 1);

    expect(scene.pointer.x).toBeLessThanOrEqual(800);
    expect(scene.pointer.y).toBeLessThanOrEqual(600);
    for (const b of scene.bubbles.bubbles) {
      if (!b.active) continue;
      expect(b.x).toBeLessThanOrEqual(800 + 1);
    }
  });

  it('0 サイズのウィンドウでも例外を出さない', () => {
    const tiny = new Scene({ width: 0, height: 0, seed: 1 });
    expect(() => {
      tiny.pointerMove(0, 0);
      tiny.update(1 / 60);
      tiny.draw(createFakeContext().ctx);
    }).not.toThrow();
  });

  it('描画は有限の数値だけを使い、キャラクターを最後に描く', () => {
    advance(scene, 2);
    scene.pointerMove(700, 400);
    advance(scene, 1);

    const fake = createFakeContext();
    expect(() => scene.draw(fake.ctx)).not.toThrow();
    expect(fake.countOf('fillRect')).toBe(1); // 背景
    expect(fake.calls.length).toBeGreaterThan(20);
  });

  it('同じシードなら同じ世界が再現される', () => {
    const a = new Scene({ width: WIDTH, height: HEIGHT, seed: 777 });
    const b = new Scene({ width: WIDTH, height: HEIGHT, seed: 777 });
    for (let i = 0; i < 120; i++) {
      a.pointerMove(i * 5, i * 3);
      b.pointerMove(i * 5, i * 3);
      a.update(1 / 60);
      b.update(1 / 60);
    }
    expect(a.poppedCount).toBe(b.poppedCount);
    expect(a.pointer.x).toBeCloseTo(b.pointer.x, 10);
  });
});
