import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererDir = path.join(__dirname, "..", "src", "renderer");

// このプロジェクトの実行環境ではPlaywrightにChromiumの実行ファイルを明示指定する
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

let browser;
let server;
let baseUrl;

beforeAll(async () => {
  // type="module" のスクリプトは file:// だとCORSでブロックされるため、
  // テスト用に最小限の静的サーバーでレンダラーを配信する。
  server = http.createServer((req, res) => {
    const filePath = path.join(rendererDir, decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  browser = await chromium.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
});

afterAll(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

describe("renderer smoke test", () => {
  it("エラーなく読み込め、操作でパーティクルが増える", async () => {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(`${baseUrl}/index.html`);
    await page.waitForFunction(() => window.__pcGame !== undefined);

    const initialCount = await page.evaluate(() => window.__pcGame.particleCount);
    expect(initialCount).toBe(0);

    // トラックパッドでの適当なポインター移動を模擬
    await page.mouse.move(100, 100);
    for (let i = 0; i < 10; i += 1) {
      await page.mouse.move(100 + i * 15, 100 + (i % 3) * 10, { steps: 2 });
    }

    // クリック(タップ)を模擬
    await page.mouse.click(300, 300);

    // キー連打を模擬
    await page.keyboard.press("a");
    await page.keyboard.press("k");
    await page.keyboard.press(" ");

    const afterCount = await page.evaluate(() => window.__pcGame.particleCount);
    expect(afterCount).toBeGreaterThan(initialCount);

    expect(consoleErrors).toEqual([]);

    await page.close();
  }, 20000);
});
