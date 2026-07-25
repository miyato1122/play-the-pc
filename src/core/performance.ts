/**
 * 描画が重いときに自動で品質を落とす仕組み。
 *
 * 対象は MacBook Air（内蔵GPU）。Retina では実ピクセル数が 4 倍になるので、
 * 古い機種ではコマ落ちしうる。カクついた瞬間に自分で解像度を下げて、
 * 「なめらかに動く」ことを最優先する（幼児はカクつきを操作ミスと感じてしまう）。
 *
 * 一度下げたら上げ直さない。上げ下げを往復すると、かえって不安定に見えるため。
 */

export const QUALITY_FULL = 1;
export const QUALITY_REDUCED = 0;

export class PerformanceGovernor {
  private samples = 0;
  private total = 0;
  private currentLevel = QUALITY_FULL;

  /**
   * @param windowSize 判定に使うフレーム数
   * @param slowFrameMs この平均フレーム時間を超えたら品質を落とす（既定 22ms ≒ 45fps 未満）
   */
  constructor(
    private readonly windowSize = 90,
    private readonly slowFrameMs = 22,
  ) {}

  get level(): number {
    return this.currentLevel;
  }

  /**
   * 1 フレーム分の時間を渡す。
   * @returns 品質を落としたフレームなら true
   */
  sample(dtSeconds: number): boolean {
    if (this.currentLevel === QUALITY_REDUCED) return false;
    // タブ復帰などの極端な値は判定に混ぜない
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || dtSeconds > 0.5) return false;

    this.total += dtSeconds * 1000;
    this.samples++;
    if (this.samples < this.windowSize) return false;

    const average = this.total / this.samples;
    this.samples = 0;
    this.total = 0;

    if (average > this.slowFrameMs) {
      this.currentLevel = QUALITY_REDUCED;
      return true;
    }
    return false;
  }
}
