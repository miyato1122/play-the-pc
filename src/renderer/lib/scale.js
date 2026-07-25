/**
 * キー入力を「不協和音にならない音階」の周波数に変換する純粋関数群。
 * 五音音階(ペンタトニック)だけを使うことで、どのキーを連打しても耳に心地よい音になる。
 */

// Cメジャー・ペンタトニックのルートからの半音オフセット
export const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9];
export const BASE_FREQUENCY = 261.63; // C4

/** 文字列から安定した非負整数ハッシュを作る（乱数ではなく決定的） */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * キー文字列（KeyboardEvent.key など）をペンタトニック音階の周波数に変換する。
 * @param {string} key
 * @param {object} opts
 * @param {number} [opts.octaveRange] 何オクターブぶんに散らすか
 */
export function keyToFrequency(key, opts = {}) {
  const { octaveRange = 2 } = opts;
  const hash = hashString(String(key));
  const semitone = PENTATONIC_SEMITONES[hash % PENTATONIC_SEMITONES.length];
  const octave = Math.floor(hash / PENTATONIC_SEMITONES.length) % octaveRange;
  const semitonesFromBase = semitone + octave * 12;
  return BASE_FREQUENCY * 2 ** (semitonesFromBase / 12);
}
