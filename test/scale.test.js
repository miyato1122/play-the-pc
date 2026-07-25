import { describe, it, expect } from "vitest";
import {
  hashString,
  keyToFrequency,
  PENTATONIC_SEMITONES,
  BASE_FREQUENCY,
} from "../src/renderer/lib/scale.js";

describe("hashString", () => {
  it("同じ文字列には常に同じハッシュを返す", () => {
    expect(hashString("a")).toBe(hashString("a"));
  });

  it("既知の入力に対して決定的な値を返す", () => {
    // hash = 0*31 + 'a'.charCodeAt(0) = 97
    expect(hashString("a")).toBe(97);
  });
});

describe("keyToFrequency", () => {
  const possibleFrequencies = [];
  for (let octave = 0; octave < 2; octave += 1) {
    for (const semitone of PENTATONIC_SEMITONES) {
      possibleFrequencies.push(BASE_FREQUENCY * 2 ** ((semitone + octave * 12) / 12));
    }
  }

  it("常にペンタトニック音階上の周波数を返す（不協和音にならない）", () => {
    ["a", "b", "Enter", " ", "1", "Shift", "あ"].forEach((key) => {
      const freq = keyToFrequency(key);
      const matches = possibleFrequencies.some((f) => Math.abs(f - freq) < 1e-6);
      expect(matches).toBe(true);
    });
  });

  it("同じキーには常に同じ周波数を返す（決定的）", () => {
    expect(keyToFrequency("q")).toBe(keyToFrequency("q"));
  });
});
