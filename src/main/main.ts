/**
 * メインプロセス。
 *
 * 役割は 2 つだけ。
 *  1. 全画面の「遊び場」ウィンドウを 1 枚出す
 *  2. 幼児が触っても壊れない・抜け出せないように囲う
 */

import { app, BrowserWindow, Menu, ipcMain, protocol, screen, session } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { EXIT_CHANNEL } from './ipc.js';
import {
  contentTypeFor,
  RENDERER_ENTRY_URL,
  RENDERER_SCHEME,
  resolveRendererFile,
} from './rendererPath.js';
import { createWindowOptions } from './windowOptions.js';

/** dist/ ディレクトリ（このファイルは dist/main/main.js として動く） */
const DIST_ROOT = path.join(__dirname, '..');

let mainWindow: BrowserWindow | null = null;
/** 終了ホールドが完了したときだけ true になる。 */
let allowQuit = false;

// 1 つだけ起動させる（幼児が Dock を連打しても増やさない）
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// 音は起動直後から鳴らせるようにする（子どもに「クリックして許可」はできない）
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

protocol.registerSchemesAsPrivileged([
  {
    scheme: RENDERER_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

function registerRendererProtocol(): void {
  protocol.handle(RENDERER_SCHEME, async (request) => {
    const filePath = resolveRendererFile(DIST_ROOT, new URL(request.url).pathname);
    if (!filePath) return new Response('forbidden', { status: 403 });

    try {
      // net.fetch は下の onBeforeRequest を通ってしまい、自分で自分を塞いでしまうため、
      // ここではファイルを直接読む。
      const body = await readFile(filePath);
      return new Response(body, { headers: { 'Content-Type': contentTypeFor(filePath) } });
    } catch {
      return new Response('not found', { status: 404 });
    }
  });
}

function hardenSession(): void {
  // 外部への通信は一切しないアプリなので、ネットワークを丸ごと塞ぐ
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith(`${RENDERER_SCHEME}://`) });
  });

  // カメラ・マイク・位置情報などの要求はすべて拒否
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}

function createWindow(): void {
  const preloadPath = path.join(DIST_ROOT, 'main', 'preload.js');
  const { bounds } = screen.getPrimaryDisplay();
  const window = new BrowserWindow(createWindowOptions(preloadPath, bounds));
  mainWindow = window;

  // 呼ぶ順番が大事。Space の設定を先に済ませてから全画面にする。
  // 逆順（全画面 → Space 設定）だと macOS がウィンドウを全画面 Space から追い出し、
  // 音だけ鳴って画面が見えない状態になる。
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // ネイティブ全画面ではなく従来方式の全画面。
  // 新しい Space を作らずに、メニューバーと Dock を隠して画面全体を覆う。
  window.setSimpleFullScreen(true);
  // 他のアプリより前に出すが、'screen-saver' ほど高くはしない。
  // 強制終了ダイアログ（Cmd+Option+Esc）まで覆ってしまうと、大人の逃げ道が無くなるため。
  window.setAlwaysOnTop(true, 'floating');

  const contents = window.webContents;

  // 拡大縮小を封じる（トラックパッドのピンチ・Cmd+プラス など）
  contents.on('did-finish-load', () => {
    void contents.setVisualZoomLevelLimits(1, 1);
    contents.setZoomFactor(1);
  });

  // Cmd / Ctrl を伴うキー操作はすべて無効（再読み込み・終了・印刷などの暴発防止）
  contents.on('before-input-event', (event, input) => {
    if (input.meta || input.control) event.preventDefault();
  });

  // 別ウィンドウ・別ページへは絶対に行かせない
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => {
    if (url !== RENDERER_ENTRY_URL) event.preventDefault();
  });

  // 万一クラッシュしても、子どもの前で黒画面のままにしない。
  // ただし直らない失敗で無限に読み直さないよう、回数を区切る。
  let loadRetries = 0;
  contents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[play-the-pc] load failed: ${errorCode} ${errorDescription}`);
    if (allowQuit || loadRetries >= 5) return;
    loadRetries++;
    setTimeout(() => contents.reload(), 500 * loadRetries);
  });
  contents.on('render-process-gone', () => {
    if (!allowQuit) contents.reload();
  });
  contents.on('unresponsive', () => {
    if (!allowQuit) contents.reload();
  });

  window.on('close', (event) => {
    if (!allowQuit) event.preventDefault();
  });

  window.once('ready-to-show', () => {
    window.show();
    window.focus();
  });

  void window.loadURL(RENDERER_ENTRY_URL);
}

/**
 * 起動確認。画面が本当に動いているか（アニメーションが進んでいるか）を確かめて終了する。
 * PLAY_PC_SMOKE_EXIT_MS が設定されているときだけ呼ばれる。
 */
async function runSmokeCheck(): Promise<void> {
  let ok = false;
  try {
    ok = Boolean(
      await mainWindow?.webContents.executeJavaScript(
        'Boolean(window.__playPc && window.__playPc.scene.time > 0)',
      ),
    );
  } catch (error) {
    console.error('[play-the-pc] smoke check error:', error);
  }

  console.log(ok ? '[play-the-pc] smoke ok' : '[play-the-pc] smoke failed');
  allowQuit = true;
  mainWindow?.destroy();
  mainWindow = null;
  app.exit(ok ? 0 : 1);
}

function quitApp(): void {
  allowQuit = true;
  mainWindow?.destroy();
  mainWindow = null;
  app.quit();
}

app.on('second-instance', () => {
  mainWindow?.focus();
});

app.on('before-quit', (event) => {
  // Cmd+Q やアクティビティモニタ以外の経路で終了しないようにする
  if (!allowQuit) event.preventDefault();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

void app.whenReady().then(() => {
  // メニューを消すことで Cmd+Q / Cmd+W / Cmd+H などの既定ショートカットも無効になる
  Menu.setApplicationMenu(null);

  registerRendererProtocol();
  hardenSession();

  ipcMain.on(EXIT_CHANNEL, () => quitApp());

  createWindow();

  // 起動確認（スモークテスト）用のフック。
  // PLAY_PC_SMOKE_EXIT_MS を設定したときだけ、指定ミリ秒後に画面の状態を確認して自動終了する。
  const smokeExitMs = Number(process.env.PLAY_PC_SMOKE_EXIT_MS);
  if (Number.isFinite(smokeExitMs) && smokeExitMs > 0) {
    setTimeout(() => void runSmokeCheck(), smokeExitMs);
  }
});
