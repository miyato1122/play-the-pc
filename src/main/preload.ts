/**
 * レンダラーへ渡す最小限の橋渡し。
 * 子ども向けアプリなので、公開するのは「終了したい」という 1 つの合図だけ。
 *
 * sandbox: true の preload からは相対 require ができないため、
 * チャンネル名は src/main/ipc.ts の EXIT_CHANNEL と同じ文字列をここに直接書いている。
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('playPC', {
  requestExit: () => ipcRenderer.send('play-pc:exit'),
});
