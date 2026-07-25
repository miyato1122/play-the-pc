/**
 * 外部音源ファイルを使わず、Web Audio API のオシレーターで効果音を作るシンセ。
 * DOMの実行環境が必要なため純粋関数ではないが、副作用はこのモジュール内に閉じ込める。
 */

const MASTER_VOLUME = 0.18;

export function createSynth(AudioContextClass = window.AudioContext) {
  let ctx = null;
  let masterGain = null;

  function ensureContext() {
    if (!ctx) {
      ctx = new AudioContextClass();
      masterGain = ctx.createGain();
      masterGain.gain.value = MASTER_VOLUME;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  /**
   * やさしいアタック/ディケイの単音を鳴らす。
   * @param {number} frequency
   * @param {object} opts
   * @param {number} [opts.duration] 秒
   * @param {OscillatorType} [opts.type]
   */
  function playTone(frequency, opts = {}) {
    const { duration = 0.35, type = "sine" } = opts;
    const audioCtx = ensureContext();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.02); // アタック
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // ディケイ

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /** ポインター移動時のかすかなきらめき音 */
  function playTwinkle(frequency) {
    playTone(frequency, { duration: 0.15, type: "sine" });
  }

  /** クリック/タップ時のポップ音 */
  function playPop(frequency) {
    playTone(frequency, { duration: 0.25, type: "triangle" });
  }

  /** キー連打時の音 */
  function playKeyTone(frequency) {
    playTone(frequency, { duration: 0.3, type: "triangle" });
  }

  return { playTwinkle, playPop, playKeyTone };
}
