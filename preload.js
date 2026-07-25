// rendererへ公開するAPIは「アプリを終了する」の1つだけに絞る
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('playApi', {
  quit: () => ipcRenderer.send('play:quit'),
});
