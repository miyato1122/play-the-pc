/**
 * ポインターの分身になるキャラクター。
 *
 * OS の矢印カーソルは 2 歳児には小さすぎて見失うため、これで完全に置き換える。
 * 速度に応じて伸び縮みし、進む方向を目で見る。止まっているときは呼吸し、
 * しばらく動かないと「ここだよ」と輪を出して自分の位置を知らせる。
 */

import { TAU, clamp, damp, remap } from '../math.js';
import { hsla } from '../palette.js';
import type { PointerSnapshot } from '../pointer.js';
import { blobPath, type Ctx2D } from '../shapes.js';

/** シャボン玉との当たり判定に使う半径 */
export const CHARACTER_RADIUS = 30;

export class PointerCharacter {
  x = 0;
  y = 0;
  private stretch = 0;
  private angle = 0;
  private hue = 200;
  private breathe = 0;
  private eyeX = 0;
  private eyeY = 0;
  private blinkTimer = 3;
  private idlePulse = 0;
  /** 何かを割った瞬間のリアクション 0..1 */
  private cheer = 0;

  /** 何かを割ったときに呼ぶ（ぷるんと喜ぶ）。 */
  celebrate(): void {
    this.cheer = 1;
  }

  update(dt: number, pointer: PointerSnapshot, time: number): void {
    this.x = pointer.x;
    this.y = pointer.y;
    this.breathe = time;

    const targetStretch = remap(pointer.speed01, 0, 1, 0, 0.55);
    this.stretch = damp(this.stretch, targetStretch, 10, dt);

    if (pointer.speed > 20) {
      this.angle = Math.atan2(pointer.dirY, pointer.dirX);
      this.eyeX = damp(this.eyeX, pointer.dirX, 12, dt);
      this.eyeY = damp(this.eyeY, pointer.dirY, 12, dt);
    } else {
      this.eyeX = damp(this.eyeX, 0, 4, dt);
      this.eyeY = damp(this.eyeY, 0, 4, dt);
    }

    this.hue = damp(this.hue, remap(pointer.speed01, 0, 1, 195, 320), 3, dt);

    this.blinkTimer -= dt;
    if (this.blinkTimer < -0.11) this.blinkTimer = 2.6 + (time % 2);

    this.cheer = Math.max(0, this.cheer - dt * 2.6);

    // 3 秒以上止まっていたら、ゆっくり輪を出して存在を知らせる
    this.idlePulse = pointer.idleTime > 3 ? (this.idlePulse + dt * 0.7) % 1 : 0;
  }

  draw(ctx: Ctx2D): void {
    const breath = Math.sin(this.breathe * 2.1) * 0.035;
    const cheerPop = Math.sin(this.cheer * Math.PI) * 0.3;
    const radius = CHARACTER_RADIUS * (1 + breath + cheerPop);
    const along = 1 + this.stretch;
    const across = 1 / (1 + this.stretch * 0.85);

    ctx.save();

    // 「ここだよ」の輪
    if (this.idlePulse > 0) {
      const t = this.idlePulse;
      ctx.globalAlpha = (1 - t) * 0.4;
      ctx.strokeStyle = hsla(this.hue, 100, 85, 1);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius * (1 + t * 3), 0, TAU);
      ctx.stroke();
    }

    // やわらかい光（重ねた円で作る。グラデーションより軽い）
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.1 * i * 0.6;
      ctx.fillStyle = hsla(this.hue, 100, 70, 1);
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius * (1 + i * 0.75), 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.translate(this.x, this.y);

    // からだ（進行方向に伸びる）
    ctx.save();
    ctx.rotate(this.angle);
    ctx.scale(along, across);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hsla(this.hue, 95, 72, 1);
    blobPath(ctx, 0, 0, radius, 0.06, this.breathe * 2.4, 3);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = hsla(this.hue, 100, 90, 0.9);
    ctx.stroke();
    ctx.restore();

    // つや
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = 'hsla(0, 0%, 100%, 1)';
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.42, radius * 0.16, 0, TAU);
    ctx.fill();

    // め（顔は常に正面。回転させると見づらいため）
    const eyeOffset = radius * 0.32;
    const eyeR = radius * 0.2;
    const blinking = this.blinkTimer < 0;
    for (const side of [-1, 1]) {
      const ex = side * eyeOffset;
      const ey = -radius * 0.08;
      if (blinking) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'hsla(250, 50%, 20%, 1)';
        ctx.lineWidth = Math.max(2, radius * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - eyeR, ey);
        ctx.lineTo(ex + eyeR, ey);
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'hsla(0, 0%, 100%, 1)';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'hsla(250, 50%, 20%, 1)';
      ctx.beginPath();
      ctx.arc(ex + this.eyeX * eyeR * 0.5, ey + this.eyeY * eyeR * 0.5, eyeR * 0.55, 0, TAU);
      ctx.fill();
    }

    // くち（喜んでいるときは大きく開く）
    const mouthOpen = clamp(0.25 + this.cheer, 0, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'hsla(350, 60%, 42%, 1)';
    ctx.beginPath();
    ctx.ellipse(
      0,
      radius * 0.34,
      radius * (0.16 + mouthOpen * 0.12),
      radius * (0.08 + mouthOpen * 0.16),
      0,
      0,
      TAU,
    );
    ctx.fill();

    ctx.restore();
  }
}
