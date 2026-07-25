// Web Audioによる効果音合成。音声ファイルは使わない。
// キー連打が「メロディーっぽく」聞こえるよう、音階はペンタトニックスケールに限定する。
'use strict';

(() => {
  const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const BASE_FREQ = 261.63; // C4

  const PlayAudio = {
    ctx: null,
    master: null,

    // AudioContextは初回の入力時に生成する(環境によっては自動再生が制限されるため)
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return this.ctx;
      }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch (_e) {
        this.ctx = null;
      }
      return this.ctx;
    },

    // ペンタトニックの1音を鳴らす(キーボードあそび用)
    note(index) {
      const ctx = this.ensure();
      if (!ctx) return;
      const semi = PENTATONIC_SEMITONES[Math.abs(index) % PENTATONIC_SEMITONES.length];
      const freq = BASE_FREQ * Math.pow(2, semi / 12);
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = freq * 2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      const subGain = ctx.createGain();
      subGain.gain.value = 0.12;

      osc.connect(gain);
      sub.connect(subGain);
      subGain.connect(gain);
      gain.connect(this.master);

      osc.start(now);
      sub.start(now);
      osc.stop(now + 0.5);
      sub.stop(now + 0.5);
    },

    // シャボン玉が弾ける「ポンッ」
    pop() {
      const ctx = this.ensure();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700 + Math.random() * 300, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.16);
    },

    // 花火の「ドーン」(ノイズ+ローパス減衰)
    burst() {
      const ctx = this.ensure();
      if (!ctx) return;
      const now = ctx.currentTime;
      const duration = 0.5;

      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + duration);

      const gain = ctx.createGain();
      gain.gain.value = 0.5;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(now);
    },
  };

  window.PlayAudio = PlayAudio;
})();
