/**
 * 実際のブラウザエンジンで画面を動かす E2E テスト。
 *
 * 単体テストでは「ロジックが正しいか」しか分からないので、ここでは
 * 「本当に描画されるか」「トラックパッド操作に反応するか」「キーを乱打しても壊れないか」を確かめる。
 *
 * Mac で動かす場合は先に `npx playwright install chromium` を実行すること。
 * 別の場所の Chromium を使いたいときは PLAYWRIGHT_CHROMIUM_EXECUTABLE で指定できる。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { startStaticServer } from './staticServer.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VIEWPORT = { width: 1280, height: 800 };

let server;
let browser;
let page;
/** ページ側で起きたエラー（1 件でもあれば失敗にする） */
let pageErrors = [];

before(async () => {
  server = await startStaticServer(path.join(ROOT, 'dist'));

  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  page = await context.newPage();

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  // preload の代わりに、終了要求を記録するだけのブリッジを差し込む
  await page.addInitScript(() => {
    window.__exitRequests = 0;
    window.playPC = {
      requestExit: () => {
        window.__exitRequests += 1;
      },
    };
  });

  await page.goto(`${server.origin}/renderer/index.html`);
  await page.waitForFunction(() => Boolean(window.__playPc));
});

after(async () => {
  await browser?.close();
  await server?.close();
});

/** シーンの状態を取り出す。 */
const readScene = () =>
  page.evaluate(() => {
    const { scene } = window.__playPc;
    return {
      poppedCount: scene.poppedCount,
      sparkles: scene.sparkles.liveCount,
      confetti: scene.confetti.liveCount,
      bubbles: scene.bubbles.liveCount,
      ribbonPoints: scene.ribbon.points.length,
      pointer: { x: scene.pointer.x, y: scene.pointer.y },
      width: scene.width,
      height: scene.height,
      time: scene.time,
    };
  });

/** トラックパッドで「適当に動かす」動きを再現する。 */
async function scribble(steps = 40) {
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 4;
    const x = VIEWPORT.width / 2 + Math.cos(t) * 380;
    const y = VIEWPORT.height / 2 + Math.sin(t * 1.7) * 260;
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
}

describe('ポインターであそぼう（レンダラー）', () => {
  it('画面が起動し、アニメーションが進む', async () => {
    const first = await readScene();
    await page.waitForTimeout(300);
    const second = await readScene();

    assert.ok(second.time > first.time, 'requestAnimationFrame のループが進んでいない');
    assert.equal(second.width, VIEWPORT.width);
    assert.equal(second.height, VIEWPORT.height);
  });

  it('起動直後からシャボン玉が画面に居る', async () => {
    const scene = await readScene();
    assert.ok(scene.bubbles > 0, 'シャボン玉が 1 つも無い');
  });

  it('システムのカーソルは隠されている', async () => {
    const cursor = await page.evaluate(() => getComputedStyle(document.body).cursor);
    assert.equal(cursor, 'none');
  });

  it('ポインターを動かすとキラキラと軌跡が出る', async () => {
    await scribble();
    const scene = await readScene();

    assert.ok(scene.sparkles > 0, 'キラキラが出ていない');
    assert.ok(scene.ribbonPoints > 1, '軌跡が描かれていない');
  });

  it('実際にキャンバスが塗られている（真っ黒ではない）', async () => {
    const stats = await page.evaluate(() => {
      const canvas = document.getElementById('stage');
      const ctx = canvas.getContext('2d');
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const colors = new Set();
      let bright = 0;
      for (let i = 0; i < data.length; i += 4 * 997) {
        colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
        if (data[i] + data[i + 1] + data[i + 2] > 120) bright++;
      }
      return { uniqueColors: colors.size, bright };
    });

    assert.ok(stats.uniqueColors > 20, `色の種類が少なすぎる: ${stats.uniqueColors}`);
    assert.ok(stats.bright > 0, '明るい画素が全く無い');
  });

  it('シャボン玉に重ねるだけで割れる（クリック不要）', async () => {
    const before = await readScene();

    // 画面内にあるシャボン玉の位置をシーンから取り出して、そこへポインターを運ぶ
    const target = await page.evaluate(() => {
      const { scene } = window.__playPc;
      const bubble = scene.bubbles.bubbles.find(
        (b) => b.active && b.y > 60 && b.y < scene.height - 60,
      );
      return bubble ? { x: bubble.x, y: bubble.y } : null;
    });
    assert.ok(target, '画面内にシャボン玉が見つからない');

    await page.mouse.move(target.x, target.y, { steps: 12 });
    await page.waitForTimeout(120);

    const after = await readScene();
    assert.ok(
      after.poppedCount > before.poppedCount,
      `重ねてもシャボン玉が割れていない (${before.poppedCount} -> ${after.poppedCount})`,
    );
    assert.ok(after.confetti > 0, '紙吹雪が出ていない');
  });

  it('キーボードを乱打しても終了せず、エラーも出ない', async () => {
    const keys = ['a', 'Z', '1', 'Enter', ' ', 'ArrowUp', 'F5', 'Tab', 'Backspace', 'q'];
    for (let round = 0; round < 3; round++) {
      for (const key of keys) await page.keyboard.press(key);
    }
    await page.waitForTimeout(100);

    const exits = await page.evaluate(() => window.__exitRequests);
    assert.equal(exits, 0, 'キーの乱打で終了要求が飛んでしまった');

    const scene = await readScene();
    assert.ok(scene.time > 0, '乱打後にループが止まっている');
  });

  it('Esc を短く押しただけでは終了しない', async () => {
    for (let i = 0; i < 5; i++) {
      await page.keyboard.down('Escape');
      await page.waitForTimeout(120);
      await page.keyboard.up('Escape');
      await page.waitForTimeout(120);
    }
    const exits = await page.evaluate(() => window.__exitRequests);
    assert.equal(exits, 0, '短押しで終了してしまった');
  });

  it('Esc を 2 秒押し続けると終了要求が飛ぶ（大人用の出口）', async () => {
    await page.keyboard.down('Escape');
    await page.waitForTimeout(2400);
    await page.keyboard.up('Escape');

    const exits = await page.evaluate(() => window.__exitRequests);
    assert.ok(exits >= 1, '長押ししても終了要求が飛ばない');
  });

  it('ウィンドウサイズが変わっても追従する', async () => {
    await page.setViewportSize({ width: 900, height: 600 });
    await page.waitForTimeout(200);
    const scene = await readScene();

    assert.equal(scene.width, 900);
    assert.equal(scene.height, 600);
    assert.ok(scene.pointer.x <= 900 && scene.pointer.y <= 600, 'ポインターが画面外に残っている');

    await page.setViewportSize(VIEWPORT);
    await page.waitForTimeout(200);
  });

  it('遊んでいる様子のスクリーンショットを保存できる', async () => {
    await scribble(60);
    await page.waitForTimeout(200);

    const outputPath = path.join(ROOT, 'docs', 'screenshot.png');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath });

    const stat = await fs.stat(outputPath);
    assert.ok(stat.size > 10_000, 'スクリーンショットが小さすぎる（描画されていない可能性）');
  });

  it('一連の操作を通してページエラーが 1 件も起きていない', () => {
    assert.deepEqual(pageErrors, []);
  });
});
