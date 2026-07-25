/**
 * 画面の起動処理。
 * DOM とのやり取りはこのファイルに閉じ込め、遊びのロジックは core/ 側に置く。
 */

import { silentAudio, WebAudioPlayfulAudio, type PlayfulAudio } from '../core/audio.js';
import { ExitGuard } from '../core/exitGuard.js';
import { drawExitProgress } from '../core/overlay.js';
import { PerformanceGovernor, QUALITY_FULL } from '../core/performance.js';
import { Scene } from '../core/scene.js';

/** 高解像度ディスプレイでも描画量が跳ね上がらないよう上限を設ける。 */
const MAX_PIXEL_RATIO = 2;

function createAudio(): PlayfulAudio {
  try {
    const Ctor = window.AudioContext;
    if (!Ctor) return silentAudio;
    return new WebAudioPlayfulAudio(new Ctor());
  } catch {
    return silentAudio;
  }
}

function start(): void {
  const canvas = document.getElementById('stage');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('canvas #stage が見つかりません');
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('2D コンテキストを取得できません');

  const audio = createAudio();
  const scene = new Scene({
    width: window.innerWidth,
    height: window.innerHeight,
    audio,
    seed: Math.floor(Math.random() * 0xffffffff),
  });

  const exitGuard = new ExitGuard(2, () => {
    window.playPC?.requestExit();
  });

  const governor = new PerformanceGovernor();
  let pixelRatio = 1;

  const resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const cap = governor.level === QUALITY_FULL ? MAX_PIXEL_RATIO : 1;
    pixelRatio = Math.min(window.devicePixelRatio || 1, cap);
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    scene.resize(width, height);
  };

  resize();
  window.addEventListener('resize', resize);

  // --- 入力 ---------------------------------------------------------------

  let audioUnlocked = false;
  const unlockAudio = (): void => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio.unlock();
  };

  const onPointerMove = (event: PointerEvent | MouseEvent): void => {
    unlockAudio();
    scene.pointerMove(event.clientX, event.clientY);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', (event) => {
    // 押せなくても遊べるが、押せた子にはちゃんと反応する
    unlockAudio();
    scene.pointerMove(event.clientX, event.clientY);
    scene.character.celebrate();
  });

  window.addEventListener('keydown', (event) => {
    unlockAudio();
    // アプリ内にテキスト入力は無いので、キーの既定動作はすべて止める
    event.preventDefault();
    exitGuard.keyDown(event.key);
  });
  window.addEventListener('keyup', (event) => {
    event.preventDefault();
    exitGuard.keyUp(event.key);
  });
  window.addEventListener('blur', () => exitGuard.reset());

  // 事故のもとになる既定動作を封じる
  for (const type of ['contextmenu', 'dragstart', 'selectstart', 'gesturestart'] as const) {
    window.addEventListener(type, (event) => event.preventDefault());
  }
  window.addEventListener(
    'wheel',
    (event) => {
      // ピンチ操作は Ctrl 付きホイールとして届く（拡大縮小させない）
      if (event.ctrlKey) event.preventDefault();
    },
    { passive: false },
  );

  // --- ループ -------------------------------------------------------------

  let lastTime = performance.now();
  let running = true;

  const frame = (now: number): void => {
    if (!running) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // 重いままだと「動かしても付いてこない」体験になるので、解像度を下げてなめらかさを取る
    if (governor.sample(dt)) resize();

    scene.update(dt);
    exitGuard.update(dt);

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    scene.draw(ctx);
    drawExitProgress(ctx, exitGuard.progress, scene.width, scene.height);

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);

  window.addEventListener('pagehide', () => {
    running = false;
    audio.dispose();
  });

  // E2E テストから状態を確認するための入口
  Reflect.set(window, '__playPc', {
    scene,
    exitGuard,
    stop: () => {
      running = false;
    },
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
