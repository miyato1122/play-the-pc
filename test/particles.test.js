import { describe, it, expect } from "vitest";
import {
  createTrailParticle,
  createBurst,
  createKeyPop,
  updateParticle,
  isDead,
  particleAlpha,
} from "../src/renderer/lib/particles.js";

const zeroRng = () => 0;

describe("createTrailParticle", () => {
  it("生成直後は生きていて、指定した位置から始まる", () => {
    const p = createTrailParticle(10, 20, { speed: 0, hue: 180, rng: zeroRng });
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
    expect(p.hue).toBe(180);
    expect(p.life).toBe(1);
    expect(isDead(p)).toBe(false);
  });

  it("速度が大きいほどサイズが大きくなる", () => {
    const slow = createTrailParticle(0, 0, { speed: 0, rng: zeroRng });
    const fast = createTrailParticle(0, 0, { speed: 50, rng: zeroRng });
    expect(fast.size).toBeGreaterThan(slow.size);
  });
});

describe("createBurst", () => {
  it("指定した個数のパーティクルを生成する", () => {
    const particles = createBurst(0, 0, 12, { hue: 0, rng: zeroRng });
    expect(particles).toHaveLength(12);
    particles.forEach((p) => {
      expect(p.shape).toBe("star");
      expect(p.life).toBe(1);
    });
  });
});

describe("createKeyPop", () => {
  it("circle/star/heartのいずれかの図形になる", () => {
    const p = createKeyPop(5, 5, { rng: zeroRng });
    expect(["circle", "star", "heart"]).toContain(p.shape);
  });
});

describe("updateParticle", () => {
  it("時間経過でlifeが減り、位置が速度分だけ進む", () => {
    const p = { x: 0, y: 0, vx: 2, vy: 1, size: 5, hue: 0, life: 1, decay: 1, gravity: 0, shape: "circle" };
    const next = updateParticle(p, 0.5);
    expect(next.life).toBeCloseTo(0.5);
    expect(next.x).toBeCloseTo(2 * 0.5 * 60);
    expect(next.y).toBeCloseTo(1 * 0.5 * 60);
  });

  it("元のパーティクルを変更しない（非破壊）", () => {
    const p = { x: 0, y: 0, vx: 1, vy: 1, size: 5, hue: 0, life: 1, decay: 1, gravity: 0, shape: "circle" };
    updateParticle(p, 0.1);
    expect(p.x).toBe(0);
    expect(p.life).toBe(1);
  });
});

describe("isDead / particleAlpha", () => {
  it("life<=0で死亡と判定する", () => {
    expect(isDead({ life: 0 })).toBe(true);
    expect(isDead({ life: -0.1 })).toBe(true);
    expect(isDead({ life: 0.01 })).toBe(false);
  });

  it("アルファ値は0-1にクランプされる", () => {
    expect(particleAlpha({ life: 1.5 })).toBe(1);
    expect(particleAlpha({ life: -0.5 })).toBe(0);
    expect(particleAlpha({ life: 0.3 })).toBeCloseTo(0.3);
  });
});
