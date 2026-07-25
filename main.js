// Electronメインプロセス
// 子ども(2歳〜)が全画面で安全に遊べるようにkioskモードで起動し、
// 誤操作につながるショートカットを抑制する。
'use strict';

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// ポインター移動だけでも音が鳴らせるよう、ユーザー操作なしの音声再生を許可する
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// PLAY_DEV=1 のときは開発用にウィンドウモードで起動する
const isDev = process.env.PLAY_DEV === '1';

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: !isDev,
    kiosk: !isDev,
    width: 1280,
    height: 800,
    frame: isDev,
    backgroundColor: '#0b1026',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setMenuBarVisibility(false);

  // ピンチズーム等で画面が崩れないよう倍率を固定する
  win.webContents.setVisualZoomLevelLimits(1, 1);

  // Cmd/Ctrl系ショートカットを抑制する。
  // Cmd+Q だけは保護者の標準的な終了手段として許可する。
  win.webContents.on('before-input-event', (event, input) => {
    const isQuitKey = String(input.key).toLowerCase() === 'q';
    if ((input.meta || input.control) && !isQuitKey) {
      event.preventDefault();
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  return win;
}

// renderer側のEsc長押し(保護者向け終了操作)から呼ばれる
ipcMain.on('play:quit', () => {
  app.quit();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
