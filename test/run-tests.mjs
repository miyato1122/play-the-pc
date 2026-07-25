// renderer(画面ロジック)の自動テスト。
// macOS実機がない環境でも、Chromiumヘッドレスで主要機能を検証する。
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');

// この開発環境ではChromiumが /opt/pw-browsers に事前インストールされている。
// 見つからなければPlaywright既定の解決に任せる。
function resolveChromium() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  const direct = '/opt/pw-browsers/chromium';
  if (existsSync(direct)) return direct;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(root)) {
    for (const entry of readdirSync(root)) {
      if (entry.startsWith('chromium')) {
        for (const candidate of [
          path.join(root, entry, 'chrome-linux', 'chrome'),
          path.join(root, entry, 'chrome-linux', 'headless_shell'),
        ]) {
          if (existsSync(candidate)) return candidate;
        }
      }
    }
  }
  return undefined;
}

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  ok: ${name}`);
  } else {
    failures++;
    console.error(`  NG: ${name} ${detail}`);
  }
}

const browser = await chromium.launch({
  executablePath: resolveChromium(),
  args: ['--autoplay-policy=no-user-gesture-required'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (err) => {
    failures++;
    console.error(`  NG: page error: ${err.message}`);
  });
  await page.goto(pathToFileURL(indexPath).href);
  await page.waitForTimeout(300);

  console.log('1. ページロードとデバッグAPI');
  check('canvasが存在する', await page.locator('#stage').count() === 1);
  check('デバッグAPIが存在する', await page.evaluate(() => typeof window.__playDebug === 'object'));
  check('シャボン玉が浮かんでいる', await page.evaluate(() => window.__playDebug.bubbleCount() >= 5));

  console.log('2. ポインター移動でトレイルが発生する');
  await page.mouse.move(100, 700);
  for (let i = 0; i < 20; i++) {
    await page.mouse.move(100 + i * 20, 700 - i * 10);
    await page.waitForTimeout(16);
  }
  const trailCount = await page.evaluate(() => window.__playDebug.particleCount());
  check('パーティクルが発生した', trailCount > 0, `(count=${trailCount})`);

  console.log('3. シャボン玉にポインターが触れると弾ける');
  const poppedBefore = await page.evaluate(() => window.__playDebug.poppedCount());
  await page.evaluate(() => window.__playDebug.spawnBubbleAt(640, 400));
  await page.mouse.move(600, 400);
  await page.mouse.move(640, 400);
  await page.waitForTimeout(100);
  const poppedAfter = await page.evaluate(() => window.__playDebug.poppedCount());
  check('pop数が増えた', poppedAfter > poppedBefore, `(before=${poppedBefore}, after=${poppedAfter})`);
  check('シャボン玉が補充されている', await page.evaluate(() => window.__playDebug.bubbleCount() >= 5));

  console.log('4. クリックで花火が上がる');
  await page.waitForTimeout(1500); // トレイルが消えるのを待って花火分を数える
  const beforeClick = await page.evaluate(() => window.__playDebug.particleCount());
  await page.mouse.click(400, 300);
  await page.waitForTimeout(50);
  const afterClick = await page.evaluate(() => window.__playDebug.particleCount());
  check('花火パーティクルが発生した', afterClick >= beforeClick + 30, `(before=${beforeClick}, after=${afterClick})`);

  console.log('5. キー押下で大きな文字が表示される');
  await page.keyboard.press('a');
  await page.keyboard.press('7');
  check('グリフが2つ表示された', await page.evaluate(() => window.__playDebug.glyphCount()) === 2);
  const glyphText = await page.locator('.glyph').first().textContent();
  check('押したキーが大文字で表示される', glyphText === 'A', `(text=${glyphText})`);

  console.log('6. Esc長押しで終了オーバーレイが表示される');
  await page.keyboard.down('Escape');
  await page.waitForTimeout(200);
  check('オーバーレイが表示された', await page.evaluate(() => window.__playDebug.quitOverlayVisible()));
  await page.keyboard.up('Escape');
  await page.waitForTimeout(100);
  check('離すとオーバーレイが消える', await page.evaluate(() => !window.__playDebug.quitOverlayVisible()));
} finally {
  await browser.close();
}

if (failures > 0) {
  console.error(`\n${failures}件のテストが失敗しました`);
  process.exit(1);
}
console.log('\nすべてのテストに合格しました');
