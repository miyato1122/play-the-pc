/**
 * 遊び場全体をまとめる。
 *
 * 「更新」と「描画」だけを外に公開し、Electron にも DOM にも依存しない。
 * そのため単体テストでは偽の CanvasRenderingContext2D を渡すだけで検証できる。
 */

import { silentAudio, type PlayfulAudio } from './audio.js';
import { Background } from './background.js';
import { BubbleField } from './entities/bubbles.js';
import { CHARACTER_RADIUS, PointerCharacter } from './entities/character.js';
import { ConfettiField } from './entities/confetti.js';
import { CreatureFlock } from './entities/creatures.js';
import { Ribbon } from './entities/ribbon.js';
import { SparkleField } from './entities/sparkles.js';
import { clamp } from './math.js';
import { PointerTracker } from './pointer.js';
import { createRng, type Rng } from './random.js';
import type { Ctx2D } from './shapes.js';

export interface SceneOptions {
  width: number;
  height: number;
  seed?: number;
  audio?: PlayfulAudio;
  creatureCount?: number;
  bubbleCount?: number;
}

/** 1 フレームで進める時間の上限。ウィンドウ復帰時などに世界が飛ぶのを防ぐ。 */
export const MAX_FRAME_DELTA = 1 / 20;

export class Scene {
  width: number;
  height: number;
  time = 0;
  /** 割ったシャボン玉の総数（見せてはいないが、遊びの量の指標） */
  poppedCount = 0;

  readonly pointer: PointerTracker;
  readonly background: Background;
  readonly bubbles: BubbleField;
  readonly sparkles = new SparkleField(700);
  readonly confetti = new ConfettiField(420);
  readonly ribbon = new Ribbon(90);
  readonly creatures: CreatureFlock;
  readonly character = new PointerCharacter();

  private readonly rng: Rng;
  private readonly audio: PlayfulAudio;

  constructor(options: SceneOptions) {
    this.width = Math.max(1, options.width);
    this.height = Math.max(1, options.height);
    this.rng = createRng(options.seed ?? 20260725);
    this.audio = options.audio ?? silentAudio;

    this.pointer = new PointerTracker(this.width / 2, this.height / 2);
    this.background = new Background(6, this.rng);
    this.bubbles = new BubbleField({ targetCount: options.bubbleCount ?? 16 });
    this.creatures = new CreatureFlock(options.creatureCount ?? 4, this.width, this.height, this.rng);
    this.bubbles.fill(this.width, this.height, this.rng);
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.pointer.clampTo(this.width, this.height);
  }

  /** OS のポインター座標（CSS ピクセル）を渡す。 */
  pointerMove(x: number, y: number): void {
    this.pointer.moveTo(clamp(x, 0, this.width), clamp(y, 0, this.height));
  }

  update(rawDt: number): void {
    const dt = clamp(rawDt, 0, MAX_FRAME_DELTA);
    if (dt <= 0) return;

    this.time += dt;
    this.pointer.update(dt);
    const p = this.pointer.snapshot();

    this.background.update(dt);

    this.ribbon.push(p.x, p.y, p.speed01, this.time);
    this.ribbon.update(dt);

    this.sparkles.emitTrail(
      { x: p.x, y: p.y, speed01: p.speed01, dirX: p.dirX, dirY: p.dirY, time: this.time },
      dt,
      this.rng,
    );
    this.sparkles.update(dt);

    this.bubbles.applyWind(p.x, p.y, p.vx, p.vy, CHARACTER_RADIUS);
    this.bubbles.update(dt, this.width, this.height, this.rng);

    const popped = this.bubbles.popAt(p.x, p.y, CHARACTER_RADIUS);
    for (const bubble of popped) {
      this.poppedCount++;
      const pieces = Math.round(clamp(bubble.radius * 0.55, 10, 26));
      this.confetti.burst(bubble.x, bubble.y, pieces, bubble.hue, this.rng, 1);
      this.sparkles.burst(bubble.x, bubble.y, 12, bubble.hue, this.rng, 0.8);
      this.audio.pop(bubble.y / this.height, clamp(bubble.radius / 60, 0.4, 1));
      this.character.celebrate();
    }

    const hops = this.creatures.update(dt, p.x, p.y, this.width, this.height);
    for (const hop of hops) {
      this.sparkles.burst(hop.x, hop.y - 20, 6, hop.hue, this.rng, 0.5);
      this.audio.chirp(hop.y / this.height);
    }

    this.confetti.update(dt);
    this.character.update(dt, p, this.time);
    this.audio.setMotion(p.speed01);
  }

  draw(ctx: Ctx2D): void {
    const p = this.pointer;
    this.background.draw(ctx, this.width, this.height, p.x, p.y);
    this.creatures.draw(ctx);
    this.bubbles.draw(ctx, this.time);
    this.ribbon.draw(ctx);
    this.sparkles.draw(ctx);
    this.confetti.draw(ctx);
    // キャラクターは必ず最前面（子どもが自分の分身を見失わないため）
    this.character.draw(ctx);
  }
}
