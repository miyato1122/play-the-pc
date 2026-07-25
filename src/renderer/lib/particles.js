/**
 * パーティクルの物理計算まわりの純粋関数群。
 * DOM/Canvasには一切触れないので、素の関数としてテストできる。
 */

const TWO_PI = Math.PI * 2;

/**
 * ポインターの軌跡用パーティクルを1つ作る。
 * @param {number} x
 * @param {number} y
 * @param {object} opts
 * @param {number} [opts.speed] 直前フレームでのポインター移動速度(px/frame相当)。大きいほど派手にする。
 * @param {number} [opts.hue] 色相(0-360)
 * @param {() => number} [opts.rng] 0以上1未満の乱数生成関数（テスト時に差し替え可能）
 */
export function createTrailParticle(x, y, opts = {}) {
  const { speed = 0, hue = 0, rng = Math.random } = opts;
  const boosted = Math.min(speed, 60);
  const angle = rng() * TWO_PI;
  const drift = 0.4 + rng() * 0.6;

  return {
    x,
    y,
    vx: Math.cos(angle) * drift,
    vy: Math.sin(angle) * drift - (0.2 + boosted * 0.02),
    size: 3 + rng() * 4 + boosted * 0.15,
    hue,
    life: 1,
    decay: 0.9 + rng() * 0.6, // 1秒あたりのlife減少量
    gravity: -0.02,
    shape: "circle",
  };
}

/**
 * クリック/タップ時に弾ける花火状のパーティクル群を作る。
 * @param {number} x
 * @param {number} y
 * @param {number} count
 * @param {object} opts
 */
export function createBurst(x, y, count, opts = {}) {
  const { hue = 0, rng = Math.random } = opts;
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (TWO_PI * i) / count + rng() * 0.3;
    const speed = 1.5 + rng() * 2.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + rng() * 5,
      hue: hue + rng() * 40 - 20,
      life: 1,
      decay: 0.7 + rng() * 0.5,
      gravity: 0.05,
      shape: "star",
    });
  }
  return particles;
}

/**
 * キー連打時にランダムな位置へポップする図形パーティクルを作る。
 */
export function createKeyPop(x, y, opts = {}) {
  const { hue = 0, rng = Math.random } = opts;
  const shapes = ["circle", "star", "heart"];
  return {
    x,
    y,
    vx: 0,
    vy: -0.3,
    size: 18 + rng() * 22,
    hue,
    life: 1,
    decay: 0.55 + rng() * 0.3,
    gravity: 0,
    shape: shapes[Math.floor(rng() * shapes.length)],
  };
}

/**
 * パーティクルを dtSeconds 秒分だけ進めた新しいオブジェクトを返す（非破壊）。
 */
export function updateParticle(particle, dtSeconds) {
  const framesEquivalent = dtSeconds * 60; // 既存の速度係数が60fps基準のため換算
  return {
    ...particle,
    x: particle.x + particle.vx * framesEquivalent,
    y: particle.y + particle.vy * framesEquivalent,
    vy: particle.vy + particle.gravity * framesEquivalent,
    life: particle.life - particle.decay * dtSeconds,
  };
}

/** パーティクルが寿命切れかどうか */
export function isDead(particle) {
  return particle.life <= 0;
}

/** 描画時に使うアルファ値（0-1、寿命に応じてフェード） */
export function particleAlpha(particle) {
  return Math.max(0, Math.min(1, particle.life));
}
