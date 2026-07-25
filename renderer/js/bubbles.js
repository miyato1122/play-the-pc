// シャボン玉: 画面をふわふわ漂い、ポインターが「触れるだけ」で弾ける。
// クリック不要にするのがペルソナ(2歳児)対応の要点。
'use strict';

(() => {
  const TWO_PI = Math.PI * 2;
  const BUBBLE_COUNT = 9;
  const EMOJIS = ['🐶', '🐱', '🐰', '🐼', '🦁', '🐸', '🐥', '🍎', '🍓', '🍌', '🚗', '🚀', '⭐', '🌈', '🎈'];

  class BubbleField {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.items = [];
      this.popped = 0;
      for (let i = 0; i < BUBBLE_COUNT; i++) {
        this.items.push(this._make(true));
      }
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
    }

    _make(anywhere) {
      const r = 36 + Math.random() * 40;
      return {
        x: r + Math.random() * Math.max(1, this.width - r * 2),
        // 初回は画面内に、補充時は画面下から登場させる
        y: anywhere ? Math.random() * this.height : this.height + r + Math.random() * 120,
        r,
        hue: Math.random() * 360,
        vy: 18 + Math.random() * 22,
        wobblePhase: Math.random() * TWO_PI,
        wobbleAmp: 12 + Math.random() * 16,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        // 出現直後にポインターが重なっていて即弾けるのを防ぐ猶予
        grace: 0.4,
      };
    }

    // デバッグ/テスト用: 指定位置にシャボン玉を出す
    spawnAt(x, y) {
      const b = this._make(true);
      b.x = x;
      b.y = y;
      b.grace = 0;
      this.items.push(b);
      return b;
    }

    update(dt) {
      for (const b of this.items) {
        b.grace = Math.max(0, b.grace - dt);
        b.wobblePhase += dt * 1.6;
        b.y -= b.vy * dt;
        b.x += Math.sin(b.wobblePhase) * b.wobbleAmp * dt;
        // 画面上に抜けたら下から再登場
        if (b.y < -b.r * 2) {
          Object.assign(b, this._make(false));
        }
      }
    }

    // ポインター位置と重なったシャボン玉を弾く。弾けた数を返す。
    tryPop(x, y) {
      let poppedNow = 0;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const b = this.items[i];
        if (b.grace > 0) continue;
        const dx = b.x - x;
        const dy = b.y - y;
        if (dx * dx + dy * dy <= b.r * b.r) {
          this.items.splice(i, 1);
          this.popped++;
          poppedNow++;
          if (this.onPop) {
            this.onPop(b);
          }
        }
      }
      // 減った分は補充して遊びを途切れさせない
      while (this.items.length < BUBBLE_COUNT) {
        this.items.push(this._make(false));
      }
      return poppedNow;
    }

    draw(ctx) {
      for (const b of this.items) {
        const grad = ctx.createRadialGradient(
          b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1,
          b.x, b.y, b.r
        );
        grad.addColorStop(0, `hsla(${b.hue}, 90%, 85%, 0.9)`);
        grad.addColorStop(0.7, `hsla(${b.hue}, 85%, 65%, 0.45)`);
        grad.addColorStop(1, `hsla(${b.hue}, 85%, 60%, 0.15)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TWO_PI);
        ctx.fill();

        ctx.strokeStyle = `hsla(${b.hue}, 90%, 80%, 0.8)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // ハイライト
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(b.x - b.r * 0.4, b.y - b.r * 0.45, b.r * 0.18, b.r * 0.1, -0.6, 0, TWO_PI);
        ctx.fill();

        // 中の絵文字
        ctx.font = `${Math.floor(b.r * 0.95)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.emoji, b.x, b.y + b.r * 0.05);
      }
    }
  }

  window.PlayBubbles = BubbleField;
})();
