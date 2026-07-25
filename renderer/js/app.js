// 入力の配線と描画ループ。
// ペルソナ(2歳〜)の操作 = 「ポインターを適当に動かす」「キーを適当に叩く」の
// どちらにも必ず楽しい反応を返す。
'use strict';

(() => {
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const glyphContainer = document.getElementById('glyphs');
  const quitOverlay = document.getElementById('quit-overlay');
  const quitRing = document.getElementById('quit-ring');

  const audio = window.PlayAudio;
  const particles = new window.PlayParticles();
  const keyFx = window.PlayKeyFx;
  keyFx.init(glyphContainer);

  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (bubbles) {
      bubbles.resize(width, height);
    }
  }

  let bubbles = null;
  resize();
  bubbles = new window.PlayBubbles(width, height);
  bubbles.onPop = (b) => {
    particles.spawnConfetti(b.x, b.y, b.hue);
    audio.pop();
  };
  window.addEventListener('resize', resize);

  // ---- ポインター(星カーソル+虹色トレイル) ----
  const pointer = {
    x: width / 2,
    y: height / 2,
    // 星カーソルはやわらかく追従させる
    starX: width / 2,
    starY: height / 2,
    active: false,
    hue: 0,
    rot: 0,
  };

  window.addEventListener('pointermove', (e) => {
    const prevX = pointer.x;
    const prevY = pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;

    const dist = Math.hypot(pointer.x - prevX, pointer.y - prevY);
    // 動いた分だけ虹色を進めてトレイルを撒く
    pointer.hue = (pointer.hue + dist * 0.6) % 360;
    if (dist > 2) {
      particles.spawnTrail(pointer.x, pointer.y, pointer.hue);
    }
    bubbles.tryPop(pointer.x, pointer.y);
  });

  // クリック(押し込んでしまった時)も楽しい反応にする
  window.addEventListener('pointerdown', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    particles.spawnFirework(e.clientX, e.clientY);
    audio.burst();
  });

  // ---- キーボードあそび & 保護者向けEsc長押し終了 ----
  const QUIT_HOLD_MS = 3000;
  let escHeldSince = 0;

  // 同じキーは同じ音になるよう、キー名から音階indexを決める
  function noteIndexFor(key) {
    let hash = 0;
    const s = String(key);
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  window.addEventListener('keydown', (e) => {
    e.preventDefault();
    if (e.key === 'Escape') {
      if (escHeldSince === 0) {
        escHeldSince = performance.now();
        quitOverlay.hidden = false;
      }
      return;
    }
    // キーリピート(押しっぱなし)はうるさくなるので間引く
    if (e.repeat) return;
    keyFx.show(e.key);
    audio.note(noteIndexFor(e.key));
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      escHeldSince = 0;
      quitOverlay.hidden = true;
      quitRing.style.setProperty('--p', '0');
    }
  });

  function updateQuitHold() {
    if (escHeldSince === 0) return;
    const held = performance.now() - escHeldSince;
    const progress = Math.min(100, (held / QUIT_HOLD_MS) * 100);
    quitRing.style.setProperty('--p', String(progress));
    if (held >= QUIT_HOLD_MS) {
      escHeldSince = 0;
      if (window.playApi && typeof window.playApi.quit === 'function') {
        window.playApi.quit();
      } else {
        // ブラウザでの開発表示など、Electron外ではオーバーレイを閉じるだけ
        quitOverlay.hidden = true;
        quitRing.style.setProperty('--p', '0');
      }
    }
  }

  // 誤操作でメニュー等が出ないようにする
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('dragstart', (e) => e.preventDefault());

  // ---- 星カーソルの描画 ----
  function drawCursor(dt) {
    if (!pointer.active) return;
    // ばね的に追従させてふわっとした動きにする
    const follow = Math.min(1, dt * 14);
    pointer.starX += (pointer.x - pointer.starX) * follow;
    pointer.starY += (pointer.y - pointer.starY) * follow;
    pointer.rot += dt * 1.8;

    ctx.save();
    ctx.shadowColor = `hsl(${pointer.hue}, 95%, 70%)`;
    ctx.shadowBlur = 24;
    ctx.fillStyle = `hsl(${pointer.hue}, 95%, 72%)`;
    window.PlayDrawStar(ctx, pointer.starX, pointer.starY, 22, pointer.rot);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    window.PlayDrawStar(ctx, pointer.starX, pointer.starY, 10, -pointer.rot * 1.4);
    ctx.restore();
  }

  // ---- メインループ ----
  let lastTime = performance.now();

  function frame(now) {
    // タブ復帰などでdtが暴れないよう上限を設ける
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    bubbles.update(dt);
    particles.update(dt);
    updateQuitHold();

    ctx.clearRect(0, 0, width, height);
    bubbles.draw(ctx);
    particles.draw(ctx);
    drawCursor(dt);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- テスト用デバッグAPI ----
  window.__playDebug = {
    particleCount: () => particles.count,
    bubbleCount: () => bubbles.items.length,
    poppedCount: () => bubbles.popped,
    glyphCount: () => glyphContainer.children.length,
    spawnBubbleAt: (x, y) => bubbles.spawnAt(x, y),
    quitOverlayVisible: () => !quitOverlay.hidden,
  };
})();
