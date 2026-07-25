/**
 * ポインターの状態を追跡する。
 *
 * 生の座標をそのまま使うと動きが硬いので、少しだけ遅れて追従させる。
 * この「ぷにっとした追従」が、指の動きとキャラクターの一体感を生む。
 */

import { clamp, damp, length } from './math.js';

/** これ以上速く動いても演出は変わらない上限（px/秒）。 */
export const MAX_TRACKED_SPEED = 2600;

export interface PointerSnapshot {
  /** 表示に使う（補間後の）座標 */
  x: number;
  y: number;
  /** OS から届いた生の座標 */
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  /** px/秒 */
  speed: number;
  /** 0..1 に正規化した速さ */
  speed01: number;
  /** 進行方向の単位ベクトル（静止時は直前の向きを保持） */
  dirX: number;
  dirY: number;
  /** ほとんど動いていない状態が続いている秒数 */
  idleTime: number;
  /** 一度でもポインターが動いたか */
  hasMoved: boolean;
}

const IDLE_SPEED = 24;

export class PointerTracker {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx = 0;
  vy = 0;
  speed = 0;
  speed01 = 0;
  dirX = 1;
  dirY = 0;
  idleTime = 0;
  hasMoved = false;

  /** 追従の速さ（1/秒）。大きいほど機敏。 */
  private readonly follow: number;

  constructor(x = 0, y = 0, follow = 26) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.follow = follow;
  }

  /** OS のポインターイベントを受け取る。 */
  moveTo(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!this.hasMoved) {
      // 初回はワープさせて、遠くから飛んでくる不自然さを避ける
      this.x = x;
      this.y = y;
    }
    this.targetX = x;
    this.targetY = y;
    this.hasMoved = true;
  }

  /** 画面サイズが変わったときに、範囲内へ収める。 */
  clampTo(width: number, height: number): void {
    this.x = clamp(this.x, 0, width);
    this.y = clamp(this.y, 0, height);
    this.targetX = clamp(this.targetX, 0, width);
    this.targetY = clamp(this.targetY, 0, height);
  }

  update(dt: number): void {
    if (dt <= 0) return;

    const prevX = this.x;
    const prevY = this.y;

    this.x = damp(this.x, this.targetX, this.follow, dt);
    this.y = damp(this.y, this.targetY, this.follow, dt);

    const instantVx = (this.x - prevX) / dt;
    const instantVy = (this.y - prevY) / dt;

    // 速度も平滑化する。トラックパッドのイベントは間隔が不揃いで、
    // 生の速度をそのまま使うと演出がちらつくため。
    this.vx = damp(this.vx, instantVx, 14, dt);
    this.vy = damp(this.vy, instantVy, 14, dt);

    this.speed = length(this.vx, this.vy);
    this.speed01 = clamp(this.speed / MAX_TRACKED_SPEED, 0, 1);

    if (this.speed > 1) {
      this.dirX = this.vx / this.speed;
      this.dirY = this.vy / this.speed;
    }

    this.idleTime = this.speed < IDLE_SPEED ? this.idleTime + dt : 0;
  }

  snapshot(): PointerSnapshot {
    return {
      x: this.x,
      y: this.y,
      targetX: this.targetX,
      targetY: this.targetY,
      vx: this.vx,
      vy: this.vy,
      speed: this.speed,
      speed01: this.speed01,
      dirX: this.dirX,
      dirY: this.dirY,
      idleTime: this.idleTime,
      hasMoved: this.hasMoved,
    };
  }
}
