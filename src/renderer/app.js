import {
  createTrailParticle,
  createBurst,
  createKeyPop,
  updateParticle,
  isDead,
  particleAlpha,
} from "./lib/particles.js";
import { ambientHue, hsl, playfulHue } from "./lib/color.js";
import { keyToFrequency } from "./lib/scale.js";
import { createSynth } from "./lib/sound.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const MAX_PARTICLES = 400;
const IDLE_DELAY_MS = 2500;
const IDLE_SPAWN_INTERVAL_MS = 600;

let particles = [];
let lastPointer = null;
let lastInteractionAt = performance.now();
let lastTwinkleAt = 0;
let lastIdleSpawnAt = 0;
let synth = null;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function ensureSynth() {
  if (!synth && window.AudioContext) {
    try {
      synth = createSynth();
    } catch {
      synth = null;
    }
  }
  return synth;
}

function capParticles() {
  if (particles.length > MAX_PARTICLES) {
    particles.splice(0, particles.length - MAX_PARTICLES);
  }
}

function handlePointerMove(e) {
  const now = performance.now();
  lastInteractionAt = now;
  const x = e.clientX;
  const y = e.clientY;

  let speed = 0;
  if (lastPointer) {
    const dx = x - lastPointer.x;
    const dy = y - lastPointer.y;
    const dt = Math.max(now - lastPointer.t, 1);
    speed = Math.hypot(dx, dy) / (dt / 16.67); // 60fps基準のpx/frameに正規化
  }
  lastPointer = { x, y, t: now };

  const hue = playfulHue(now, 0);
  const count = Math.min(4, 1 + Math.floor(speed / 8));
  for (let i = 0; i < count; i += 1) {
    particles.push(createTrailParticle(x, y, { speed, hue: hue + i * 15 }));
  }
  capParticles();

  if (speed > 6 && now - lastTwinkleAt > 90) {
    lastTwinkleAt = now;
    ensureSynth()?.playTwinkle(220 + Math.min(speed, 60) * 6);
  }
}

function handlePointerDown(e) {
  const now = performance.now();
  lastInteractionAt = now;
  const hue = playfulHue(now, 1);
  particles.push(...createBurst(e.clientX, e.clientY, 24, { hue }));
  capParticles();
  ensureSynth()?.playPop(330);
}

function handleKeyDown(e) {
  if (e.repeat) return; // キー長押しでの過剰スパムを防ぐ
  const now = performance.now();
  lastInteractionAt = now;
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;
  const hue = playfulHue(now, 2);
  particles.push(createKeyPop(x, y, { hue }));
  capParticles();
  ensureSynth()?.playKeyTone(keyToFrequency(e.key));
}

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("keydown", handleKeyDown);

function maybeSpawnIdle(now) {
  const idleFor = now - lastInteractionAt;
  if (idleFor > IDLE_DELAY_MS && now - lastIdleSpawnAt > IDLE_SPAWN_INTERVAL_MS) {
    lastIdleSpawnAt = now;
    const x = window.innerWidth / 2 + Math.sin(now / 900) * window.innerWidth * 0.3;
    const y = window.innerHeight / 2 + Math.cos(now / 700) * window.innerHeight * 0.3;
    particles.push(createTrailParticle(x, y, { speed: 10, hue: playfulHue(now, 3) }));
    capParticles();
  }
}

function drawBackground(now) {
  const hue = ambientHue(now);
  const grad = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  grad.addColorStop(0, hsl(hue, 45, 14));
  grad.addColorStop(1, hsl(hue + 40, 45, 8));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawStar(cx, cy, size) {
  const spikes = 5;
  const outer = size;
  const inner = size / 2.2;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(cx, cy, size) {
  const top = size * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx, cy + top);
  ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + top);
  ctx.bezierCurveTo(
    cx - size / 2,
    cy + (size + top) / 2,
    cx,
    cy + (size + top) / 2,
    cx,
    cy + size
  );
  ctx.bezierCurveTo(
    cx,
    cy + (size + top) / 2,
    cx + size / 2,
    cy + (size + top) / 2,
    cx + size / 2,
    cy + top
  );
  ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + top);
  ctx.closePath();
  ctx.fill();
}

function drawParticle(p) {
  ctx.globalAlpha = particleAlpha(p);
  ctx.fillStyle = hsl(p.hue, 85, 65);
  if (p.shape === "star") drawStar(p.x, p.y, p.size);
  else if (p.shape === "heart") drawHeart(p.x, p.y, p.size);
  else {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

let lastFrameAt = performance.now();
function tick(now) {
  const dt = Math.min((now - lastFrameAt) / 1000, 0.05);
  lastFrameAt = now;

  maybeSpawnIdle(now);
  particles = particles.map((p) => updateParticle(p, dt)).filter((p) => !isDead(p));

  drawBackground(now);
  particles.forEach(drawParticle);

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// テスト/デバッグ用フック（本番動作には影響しない）
window.__pcGame = {
  get particleCount() {
    return particles.length;
  },
  simulatePointerMove: handlePointerMove,
  simulatePointerDown: handlePointerDown,
  simulateKeyDown: handleKeyDown,
};
