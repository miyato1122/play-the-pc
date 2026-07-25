/**
 * 音づくり。音声ファイルは使わず WebAudio でその場で合成する。
 *
 * 幼児が「でたらめに」操作する前提なので、
 * - 音階を C メジャー・ペンタトニックに量子化して、どう鳴らしても不協和にしない
 * - 画面の上ほど高い音にして、位置と音の関係を体で覚えられるようにする
 * - 音量上限・同時発音数・発音間隔を制限して、耳に痛い音が絶対に出ないようにする
 */

import { clamp, remap } from './math.js';

/** C メジャー・ペンタトニック（ド・レ・ミ・ソ・ラ） */
export const PENTATONIC_STEPS: readonly number[] = [0, 2, 4, 7, 9];

/** 音階のインデックス（0,1,2...）から MIDI ノート番号へ。オクターブは自動で繰り上がる。 */
export function pentatonicMidi(index: number, rootMidi = 60): number {
  const size = PENTATONIC_STEPS.length;
  const octave = Math.floor(index / size);
  const step = ((index % size) + size) % size;
  return rootMidi + octave * 12 + (PENTATONIC_STEPS[step] as number);
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * 画面上の縦位置（0 = 上端, 1 = 下端）を音階インデックスに変換する。
 * 上に行くほど高い音になる。
 */
export function heightToNoteIndex(normalizedY: number, noteCount = 15): number {
  const y = clamp(normalizedY, 0, 1);
  return clamp(Math.round((1 - y) * (noteCount - 1)), 0, noteCount - 1);
}

/** 一定間隔より短い連続再生を間引く。 */
export class RateLimiter {
  private lastTime = Number.NEGATIVE_INFINITY;

  constructor(private readonly minInterval: number) {}

  /** 発音してよければ true を返し、内部の時刻を更新する。 */
  tryTake(now: number): boolean {
    if (now - this.lastTime < this.minInterval) return false;
    this.lastTime = now;
    return true;
  }
}

export interface PlayfulAudio {
  /** ユーザー操作をきっかけに音声を有効化する（ブラウザ/Electron の自動再生制限対策）。 */
  unlock(): void;
  /** シャボン玉が割れた音。normalizedY は 0(上) 〜 1(下)。 */
  pop(normalizedY: number, intensity?: number): void;
  /** おともだちが跳ねた音。 */
  chirp(normalizedY: number): void;
  /** ポインターの動きに追従する風の音。speed01 は 0..1。 */
  setMotion(speed01: number): void;
  dispose(): void;
}

/** 音を鳴らさないダミー実装（テスト用・音声が使えない環境用）。 */
export const silentAudio: PlayfulAudio = {
  unlock: () => {},
  pop: () => {},
  chirp: () => {},
  setMotion: () => {},
  dispose: () => {},
};

const MASTER_VOLUME = 0.32;

export class WebAudioPlayfulAudio implements PlayfulAudio {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly windGain: GainNode;
  private windSource: AudioBufferSourceNode | null = null;
  private readonly popLimiter = new RateLimiter(0.045);
  private readonly chirpLimiter = new RateLimiter(0.09);
  private started = false;

  constructor(context: AudioContext) {
    this.ctx = context;

    // 圧縮器を通して、同時に鳴っても音量が跳ね上がらないようにする
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_VOLUME;
    this.master.connect(compressor);
    compressor.connect(this.ctx.destination);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
  }

  unlock(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.started) return;
    this.started = true;
    this.startWind();
  }

  private startWind(): void {
    const seconds = 2;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // ブラウンノイズ寄りにして、耳に刺さらない柔らかい風にする
      last = (last + Math.random() * 2 - 1) * 0.5;
      data[i] = last;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 620;
    filter.Q.value = 0.7;

    source.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.master);
    source.start();
    this.windSource = source;
  }

  setMotion(speed01: number): void {
    if (!this.started) return;
    const target = remap(clamp(speed01, 0, 1), 0.12, 1, 0, 0.22);
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  pop(normalizedY: number, intensity = 1): void {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    if (!this.popLimiter.tryTake(now)) return;

    const midi = pentatonicMidi(heightToNoteIndex(normalizedY), 60);
    const frequency = midiToFrequency(midi);
    const volume = clamp(intensity, 0.2, 1) * 0.5;

    // ぽん、という丸い音（サイン波＋わずかな倍音、素早い減衰）
    this.playTone(frequency, now, 0.42, volume, 'sine', -4);
    this.playTone(frequency * 2, now + 0.005, 0.16, volume * 0.28, 'triangle', -2);
  }

  chirp(normalizedY: number): void {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    if (!this.chirpLimiter.tryTake(now)) return;

    const midi = pentatonicMidi(heightToNoteIndex(normalizedY) + 5, 60);
    this.playTone(midiToFrequency(midi), now, 0.22, 0.16, 'triangle', 3);
  }

  /** @param bendSemitones 発音中に上下するピッチ（音に表情を付ける） */
  private playTone(
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    bendSemitones: number,
  ): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequency * Math.pow(2, bendSemitones / 12)),
      startTime + duration,
    );

    // アタックを少し鈍らせて、クリック音（パチッ）が出ないようにする
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  dispose(): void {
    this.windSource?.stop();
    this.windSource = null;
    void this.ctx.close();
  }
}
