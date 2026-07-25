import { describe, expect, it } from 'vitest';

import {
  heightToNoteIndex,
  midiToFrequency,
  pentatonicMidi,
  PENTATONIC_STEPS,
  RateLimiter,
  silentAudio,
} from '../../src/core/audio.js';

describe('pentatonicMidi', () => {
  it('1 オクターブ分は C メジャー・ペンタトニックそのもの', () => {
    const notes = [0, 1, 2, 3, 4].map((i) => pentatonicMidi(i, 60));
    expect(notes).toEqual([60, 62, 64, 67, 69]);
  });

  it('5 番目でオクターブが上がる', () => {
    expect(pentatonicMidi(5, 60)).toBe(72);
    expect(pentatonicMidi(10, 60)).toBe(84);
  });

  it('負のインデックスでも下のオクターブへ正しく降りる', () => {
    expect(pentatonicMidi(-1, 60)).toBe(57);
    expect(pentatonicMidi(-5, 60)).toBe(48);
  });

  it('どのインデックスでもペンタトニックの音度から外れない', () => {
    for (let i = -30; i <= 30; i++) {
      const semitone = ((pentatonicMidi(i, 60) - 60) % 12 + 12) % 12;
      expect(PENTATONIC_STEPS).toContain(semitone);
    }
  });
});

describe('midiToFrequency', () => {
  it('A4 = 440Hz、1 オクターブで倍', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
  });
});

describe('heightToNoteIndex', () => {
  it('画面の上ほど高い音になる', () => {
    expect(heightToNoteIndex(0, 15)).toBe(14);
    expect(heightToNoteIndex(1, 15)).toBe(0);
    expect(heightToNoteIndex(0.5, 15)).toBe(7);
  });

  it('範囲外の入力でも音域からはみ出さない', () => {
    expect(heightToNoteIndex(-3, 15)).toBe(14);
    expect(heightToNoteIndex(4, 15)).toBe(0);
  });

  it('上に行くほど単調に高くなる', () => {
    let previous = -1;
    for (let i = 10; i >= 0; i--) {
      const index = heightToNoteIndex(i / 10, 15);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }
  });
});

describe('RateLimiter', () => {
  it('間隔が短い連打は間引かれる', () => {
    const limiter = new RateLimiter(0.05);
    expect(limiter.tryTake(0)).toBe(true);
    expect(limiter.tryTake(0.01)).toBe(false);
    expect(limiter.tryTake(0.04)).toBe(false);
    expect(limiter.tryTake(0.06)).toBe(true);
  });

  it('最初の呼び出しは必ず通る', () => {
    expect(new RateLimiter(1).tryTake(-100)).toBe(true);
  });
});

describe('silentAudio', () => {
  it('どのメソッドを呼んでも例外にならない', () => {
    expect(() => {
      silentAudio.unlock();
      silentAudio.pop(0.5);
      silentAudio.chirp(0.5);
      silentAudio.setMotion(1);
      silentAudio.dispose();
    }).not.toThrow();
  });
});
