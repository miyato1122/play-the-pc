/**
 * 終了ガード。
 *
 * 幼児はキーボードも適当に叩くので、キー 1 つで終了させてはいけない。
 * 「Esc を 2 秒押しっぱなし」という、大人には簡単で幼児の偶然では起きにくい操作にする。
 * 進捗は画面の隅にリングで出す（大人が「効いている」と分かるため）。
 */

import { clamp } from './math.js';

export const EXIT_KEY = 'Escape';

export class ExitGuard {
  /** 0..1。押し続けている進捗 */
  progress = 0;
  private holding = false;
  private fired = false;

  constructor(
    private readonly holdSeconds = 2,
    private readonly onComplete: () => void = () => {},
  ) {}

  get isHolding(): boolean {
    return this.holding;
  }

  keyDown(key: string): void {
    if (key !== EXIT_KEY) return;
    this.holding = true;
  }

  keyUp(key: string): void {
    if (key !== EXIT_KEY) return;
    this.holding = false;
  }

  /** ウィンドウがフォーカスを失ったときなど、押しっぱなし状態を安全に解除する。 */
  reset(): void {
    this.holding = false;
    this.progress = 0;
    this.fired = false;
  }

  update(dt: number): void {
    if (this.holding) {
      this.progress = clamp(this.progress + dt / this.holdSeconds, 0, 1);
      if (this.progress >= 1 && !this.fired) {
        this.fired = true;
        this.onComplete();
      }
    } else {
      // 離したらすっと戻る（押し間違いを引きずらない）
      this.progress = clamp(this.progress - dt * 2, 0, 1);
      this.fired = false;
    }
  }
}
