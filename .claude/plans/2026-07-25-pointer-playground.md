# Plan: ポインターであそぼう（Pointer Playground）

- 作成日: 2026-07-25
- ブランチ: `claude/mac-kids-pointer-app-o6ew17`
- ステータス: 立案完了 → 実装へ（ユーザー事前承諾済み）

## 1. 目的

初めてPCに触れる子ども（2歳〜）が、**トラックパッドでポインターを適当に動かすだけで楽しい**と感じる
Mac専用デスクトップアプリを作る。

今回のスコープは「ポインター操作を楽しむ体験」の第1弾。キーボード遊びは次フェーズ。

## 2. ペルソナから導いた設計原則

CLAUDE.md のペルソナ「2歳以上・初めてPCに触れる子ども・操作はポインターの適当な移動とキーボードの適当な打鍵」から、
次を絶対条件とする。

| 原則 | 理由 | 実装への落とし込み |
|---|---|---|
| 文字を読ませない | 2歳は字が読めない | UIテキスト・メニュー・ボタンを一切置かない。すべて絵と音と動きで伝える |
| 目的・失敗・スコアを作らない | ルール理解は不可能 | クリア条件なし。何をしても「良いこと」しか起きない |
| 動かすだけで必ず報酬 | 適当な操作しかできない | 移動そのものにキラキラと光を発生させる（当たり判定不要の報酬） |
| 因果が1秒以内に分かる | 因果理解の学習途中 | 触れた瞬間に「割れる・光る・鳴る」を即時返す |
| クリック・ドラッグを要求しない | まだ押せない/押しっぱなしにできない | 全インタラクションを「重なる（hover）」だけで成立させる |
| ポインターを見失わせない | 小さい矢印は追えない | 大きい発光キャラでシステムカーソルを置き換える |
| 勝手に終了・破壊させない | 適当な打鍵で Cmd+Q 等が暴発する | メニュー削除・終了ガード・ショートカット無効化 |
| 目と耳に優しい | 幼児の安全 | ストロボ禁止・輝度変化を制限・音量上限・発音レート制限 |

## 3. 遊びの内容（機能仕様）

全画面の「空の世界」。ポインターは光る生き物になる。

1. **ポインターキャラ（character）**
   システムカーソルを隠し、大きな発光ブロブ＋目を描画。進行方向を目で見る。
   速度に応じてスクワッシュ＆ストレッチ。止まると呼吸するように揺れる。
   → 「自分の指がこの子を動かしている」という自己主体感を最優先で作る。

2. **キラキラの尾（sparkles）**
   移動速度に比例してパーティクルを放出。速いほど数と彩度が上がり、虹色になる。
   ゆっくり浮かんで消える。**当たり判定なしで必ずもらえる報酬。**

3. **シャボン玉（bubbles）**
   画面下から常時ゆっくり上昇。ポインターが重なると割れて紙吹雪＋音。
   常に画面内に一定数居るよう補充し、「触れるもの」が絶対に無くならないようにする。

4. **おともだち（creatures）**
   数匹の生き物がふわふわ徘徊し、ポインターへゆるく寄ってくる。
   近づくと跳ねて喜ぶ。追いかけっこが自然に成立する。

5. **音（audio）**
   WebAudio でその場生成（音声ファイル不要）。**Cメジャー・ペンタトニック**に量子化するので、
   でたらめに動かしても不協和にならない。画面の高さ＝音の高さ。
   マスター音量上限・同時発音数制限・レート制限あり。

6. **背景（background）**
   時間でゆっくり色相が回るグラデーションの空＋ポインター追従の柔らかい光。
   急激な輝度変化を禁止（光過敏対策）。

## 4. 安全設計（幼児が触る前提）

- `Menu.setApplicationMenu(null)` … Cmd+Q / Cmd+W / Cmd+H 等のデフォルト加速キーを消す
- `before-quit` / `close` をガードし、解除フラグなしでは終了しない
- **Esc 長押し2秒で終了**（進捗リングを隅に表示）。幼児の単発タップでは抜けない
- フルスクリーン（kiosk）固定、コンテキストメニュー・選択・ドラッグ&ドロップ・ズーム無効
- 外部URLへの遷移と新規ウィンドウ生成を全拒否
- `nodeIntegration: false` / `contextIsolation: true` / `sandbox: true`
- Esc 以外のキーは何も起こさない（今回のスコープ外。ただし壊れないことを保証する）
- パーティクル上限を設けて MacBook Air で 60fps を維持

## 5. 技術スタック・構成

- **Electron 43 + TypeScript**（Mac専用デスクトップ。Canvas 2D の描画性能で十分）
- **バンドラなし**。`tsc` で main / preload / renderer を出力し、renderer はネイティブ ESM で読む
  → 依存を最小化でき、生成物をそのまま Chromium で開いて検証できる
- **Canvas 2D + requestAnimationFrame**（devicePixelRatio 対応、dt 上限つき）
- **WebAudio**（音声アセット0）
- **Vitest**: DOM非依存の core ロジックを単体テスト
- **Playwright(Chromium)**: 実際に renderer を描画し、ポインター移動を再現してスモークテスト＋スクリーンショット
- **electron-builder**: `npm run dist` で arm64/x64 の .app / dmg を生成する設定（署名なしのローカル配布用）

### ディレクトリ

```
src/
  main/      main.ts, windowOptions.ts, safety.ts, preload.ts
  renderer/  index.html, styles.css, boot.ts
  core/      math, random, palette, pointer, audio, background, scene, exitGuard
             entities/ character, sparkles, bubbles, confetti, creatures
tests/
  unit/      core の純粋ロジック
  e2e/       Playwright による描画スモーク
```

`core/` は Electron API に一切依存させない（テスト可能性のため）。
描画は `CanvasRenderingContext2D` を引数で受け取る形にし、単体テストではフェイクの ctx を渡す。

## 6. 実装ステップ

1. プロジェクト雛形（package.json / tsconfig / npm scripts）
2. `core/` 基盤: math, random, palette, pointer（速度平滑化）
3. `core/entities/`: sparkles → bubbles → confetti → creatures → character
4. `core/background.ts`, `core/scene.ts`（統合・パーティクル上限）
5. `core/audio.ts`（ペンタトニック量子化・レート制限）
6. `core/exitGuard.ts`（Esc長押し状態機械）
7. `renderer/`: index.html / styles.css / boot.ts（RAFループ、リサイズ、入力配線）
8. `main/`: BrowserWindow・kiosk・安全ポリシー・preload
9. Vitest 単体テスト（各 core モジュール）
10. Playwright スモークテスト（描画確認＋スクリーンショット）
11. electron-builder 設定、README（Mac での起動・ビルド手順）
12. 型チェック・テスト・スクリーンショット確認 → コミット → push

## 7. 完了条件

- `npm run typecheck` が通る
- `npm test`（Vitest）が全て通る
- `npm run test:e2e`（Playwright）で描画・ポインター反応が検証でき、スクリーンショットが取得できる
- Xvfb 上で Electron 本体が起動しクラッシュしないことを確認
- README に Mac での実行手順（`npm start` / `npm run dist`）が記載されている
- 上記を designated ブランチにコミット・push

## 8. 今回やらないこと（次フェーズ候補）

- キーボードを叩いて遊ぶ機能（文字・音・図形の出現）
- クリック/ドラッグを使った遊び
- 保護者向け設定画面（音量・遊べる時間）
- 描いた絵の保存
