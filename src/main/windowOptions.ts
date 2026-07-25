/**
 * ウィンドウ設定。
 *
 * 子どもが勝手に他のアプリへ行ったり、開発者ツールを開いたりできないよう、
 * 「閉じた箱」になるように組み立てる。
 */

import type { BrowserWindowConstructorOptions, Rectangle } from 'electron';

export function createWindowOptions(
  preloadPath: string,
  bounds: Rectangle,
): BrowserWindowConstructorOptions {
  return {
    show: false,
    ...bounds,
    // macOS のネイティブ全画面（専用 Space を作る方式）は使わない。
    // setVisibleOnAllWorkspaces / setAlwaysOnTop と両立せず、
    // 起動直後にウィンドウが Space から追い出されて見えなくなるため。
    fullscreen: false,
    simpleFullscreen: true,
    // 全画面固定。タイトルバーもリサイズも与えない
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: false,
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
