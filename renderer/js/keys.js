// キーボードあそび: どのキーを叩いても大きな文字/絵文字が画面にポンッと現れる
'use strict';

(() => {
  const FALLBACK_EMOJIS = ['🐶', '🐱', '🐰', '🦁', '🐼', '🐘', '🦒', '🚗', '🚂', '🍎', '⭐', '🌈', '🎈', '🌟', '🎵'];
  const MAX_GLYPHS = 24;

  const KeyFx = {
    container: null,

    init(container) {
      this.container = container;
    },

    // 押されたキーに応じた表示文字を決める。
    // 1文字の印字可能キーはそのまま大きく(英字は大文字化)、それ以外は絵文字にする。
    glyphFor(key) {
      if (typeof key === 'string' && key.length === 1 && key.trim() !== '') {
        return key.toUpperCase();
      }
      return FALLBACK_EMOJIS[Math.floor(Math.random() * FALLBACK_EMOJIS.length)];
    },

    show(key) {
      if (!this.container) return null;

      // 溜まりすぎたら古いものから消す(連打対策)
      while (this.container.children.length >= MAX_GLYPHS) {
        this.container.firstElementChild.remove();
      }

      const el = document.createElement('div');
      el.className = 'glyph';
      el.textContent = this.glyphFor(key);
      el.style.left = `${12 + Math.random() * 76}%`;
      el.style.top = `${15 + Math.random() * 65}%`;
      el.style.color = `hsl(${Math.floor(Math.random() * 360)}, 95%, 70%)`;
      el.addEventListener('animationend', () => el.remove());
      this.container.appendChild(el);
      return el;
    },
  };

  window.PlayKeyFx = KeyFx;
})();
