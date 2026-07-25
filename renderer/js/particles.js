// パーティクルシステム: ポインターの軌跡・シャボン玉の紙吹雪・クリック花火を描く
'use strict';

(() => {
  const TWO_PI = Math.PI * 2;
  const MAX_PARTICLES = 900;

  class ParticleSystem {
    constructor() {
      this.items = [];
    }

    _add(p) {
      if (this.items.length >= MAX_PARTICLES) {
        this.items.shift();
      }
      this.items.push(p);
    }

    // ポインター軌跡のキラキラ(虹色に変化するhueを受け取る)
    spawnTrail(x, y, hue) {
      const count = 3;
      for (let i = 0; i < count; i++) {
        this._add({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40 - 10,
          size: 3 + Math.random() * 5,
          hue: (hue + Math.random() * 40 - 20 + 360) % 360,
          life: 0,
          ttl: 0.6 + Math.random() * 0.5,
          gravity: 20,
          shape: Math.random() < 0.25 ? 'star' : 'circle',
        });
      }
    }

    // シャボン玉が弾けたときの紙吹雪
    spawnConfetti(x, y, hue) {
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * TWO_PI;
        const speed = 60 + Math.random() * 180;
        this._add({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          size: 4 + Math.random() * 6,
          hue: (hue + Math.random() * 60 - 30 + 360) % 360,
          life: 0,
          ttl: 0.8 + Math.random() * 0.6,
          gravity: 260,
          shape: Math.random() < 0.5 ? 'rect' : 'circle',
          spin: (Math.random() - 0.5) * 10,
          rot: Math.random() * TWO_PI,
        });
      }
    }

    // クリックしたときの花火
    spawnFirework(x, y) {
      const hue = Math.random() * 360;
      for (let i = 0; i < 48; i++) {
        const angle = (i / 48) * TWO_PI + Math.random() * 0.2;
        const speed = 120 + Math.random() * 260;
        this._add({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 4,
          hue: (hue + Math.random() * 50 + 360) % 360,
          life: 0,
          ttl: 0.9 + Math.random() * 0.7,
          gravity: 160,
          shape: Math.random() < 0.3 ? 'star' : 'circle',
        });
      }
    }

    update(dt) {
      const items = this.items;
      for (let i = items.length - 1; i >= 0; i--) {
        const p = items[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          items.splice(i, 1);
          continue;
        }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.spin) {
          p.rot += p.spin * dt;
        }
      }
    }

    draw(ctx) {
      for (const p of this.items) {
        const t = p.life / p.ttl;
        const alpha = 1 - t;
        const size = p.size * (1 - t * 0.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue}, 95%, ${65 - t * 15}%)`;

        if (p.shape === 'star') {
          drawStar(ctx, p.x, p.y, size * 1.6, p.rot || 0);
        } else if (p.shape === 'rect') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot || 0);
          ctx.fillRect(-size / 2, -size / 2, size, size * 0.6);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size / 2, 0, TWO_PI);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    get count() {
      return this.items.length;
    }
  }

  // 5角星を描くヘルパー(星カーソルとも共用)
  function drawStar(ctx, x, y, outerR, rot) {
    const innerR = outerR * 0.45;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i / 10) * TWO_PI - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  window.PlayParticles = ParticleSystem;
  window.PlayDrawStar = drawStar;
})();
