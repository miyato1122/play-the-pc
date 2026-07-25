# 起動直後にウィンドウが隠れる不具合の修正プラン

## 症状

`npm start` で起動すると一瞬だけ画面が出て、すぐに隠れる。音（レンダラーの再生）は鳴り続ける。

## 原因

macOS のウィンドウ挙動の衝突。

1. `windowOptions.ts` の `fullscreen: true` と `main.ts` の `window.setKiosk(true)` は、どちらも
   macOS の **ネイティブ全画面**（そのウィンドウ専用の Space を新規作成する方式）になる。
2. その直後に `window.setVisibleOnAllWorkspaces(true, ...)` を呼んでいる。これは AppKit の
   `NSWindowCollectionBehaviorCanJoinAllSpaces` を立てるが、この属性はネイティブ全画面
   （`FullScreenPrimary`）と両立しない。
3. 結果、ウィンドウは作られた全画面 Space から追い出され、元のデスクトップへ画面が切り替わる。
   ウィンドウ自体は生きたまま（= レンダラーは動き続けるので音は鳴り続ける）、見えなくなる。

`backgroundThrottling: false` を指定しているため、非表示になっても描画・音声処理は止まらず、
「画面だけ消えて音が続く」という症状になる。

## 方針

ネイティブ全画面をやめ、**シンプル全画面**（現在の Space 内で画面いっぱいに広げる従来方式）にする。
これなら `alwaysOnTop` / `setVisibleOnAllWorkspaces` と共存でき、Space の切り替えも起きない。

## 変更内容

### src/main/windowOptions.ts

- `fullscreen: true` → `fullscreen: false`
- `simpleFullscreen: true` を追加（ネイティブ全画面を使わないことを明示）
- `fullscreenable: false`（子どもの操作でネイティブ全画面へ入らせない）
- 生成時から画面サイズにするため、ディスプレイの bounds を引数で受け取る

### src/main/main.ts

- `screen.getPrimaryDisplay().bounds` を取得してウィンドウ生成に渡す
- `window.setKiosk(true)` を削除（ネイティブ全画面のため）
- 呼び出し順を「`setVisibleOnAllWorkspaces` → `setSimpleFullScreen` → `setAlwaysOnTop`」に整理
  （Space 設定を先に済ませてから全画面化する）

## 囲い込み（幼児が抜け出せない）の担保

`setKiosk` を外しても、以下は維持される。

- `setSimpleFullScreen(true)` がメニューバーと Dock を隠し、画面全体を覆う
- `setAlwaysOnTop(true, 'floating')` で他アプリより前面
- `Menu.setApplicationMenu(null)` + `before-input-event` で Cmd/Ctrl 系ショートカットを無効化
- `frame: false` / `resizable: false` / `movable: false` / `closable: false`
- `close` と `before-quit` を `allowQuit` で握っている

## 確認方法

1. `npm run typecheck`
2. `npm test`
3. `npm run test:smoke`（5 秒後に自動終了し `smoke ok` を出す）
4. `npm start` で実際に画面が出続けることを目視確認
