import { describe, it, expect } from "vitest";
import { normalizeHue, ambientHue, hsl, playfulHue } from "../src/renderer/lib/color.js";

describe("normalizeHue", () => {
  it("負の値も0-360に収める", () => {
    expect(normalizeHue(-30)).toBe(330);
  });

  it("360を超える値も0-360に収める", () => {
    expect(normalizeHue(370)).toBe(10);
  });

  it("範囲内の値はそのまま", () => {
    expect(normalizeHue(180)).toBe(180);
  });
});

describe("ambientHue", () => {
  it("経過時間と速度から色相を計算する", () => {
    expect(ambientHue(1000, 6)).toBeCloseTo(6);
    expect(ambientHue(60000, 6)).toBeCloseTo(0); // 360で一周
  });
});

describe("hsl", () => {
  it("alpha=1のときhsl()文字列を返す", () => {
    expect(hsl(0, 80, 60, 1)).toBe("hsl(0.0, 80%, 60%)");
  });

  it("alpha<1のときhsla()文字列を返す", () => {
    expect(hsl(0, 80, 60, 0.5)).toBe("hsla(0.0, 80%, 60%, 0.5)");
  });
});

describe("playfulHue", () => {
  it("同じ入力に対して常に同じ値を返す（決定的）", () => {
    expect(playfulHue(1234, 2)).toBe(playfulHue(1234, 2));
  });

  it("seedが違えば色相も変わる", () => {
    expect(playfulHue(0, 0)).not.toBe(playfulHue(0, 1));
  });
});
