/**
 * ウィンドウ設定。
 *
 * 子どもが勝手に他のアプリへ行ったり、開発者ツールを開いたりできないよう、
 * 「閉じた箱」になるように組み立てる。
 */

import type { BrowserWindowConstructorOptions } from 'electron';

export function createWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    show: false,
    fullscreen: true,
    // 全画面固定。タイトルバーもリサイズも与えない
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: true,
    title: 'ポインターであそぼう',
    backgroundColor: '#14142a',
    hasShadow: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
      devTools: false,
      // 背景に回ったときも描画を止めない（復帰時に固まって見えないように）
      backgroundThrottling: false,
    },
  };
}
