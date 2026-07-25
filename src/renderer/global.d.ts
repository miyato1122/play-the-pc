/** preload が contextBridge で公開する API の型。 */

export interface PlayPcBridge {
  /** 終了ホールドが完了したときにメインプロセスへ伝える。 */
  requestExit(): void;
}

declare global {
  interface Window {
    playPC?: PlayPcBridge;
  }
}

export {};
