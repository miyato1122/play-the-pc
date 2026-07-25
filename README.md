# play-the-pc

初めてPCに触れる子ども向けのPC操作を楽しめる、Mac専用デスクトップアプリです。

## ペルソナ

- 2歳以上の初めてPCに触れる子ども
- 操作できるのはトラックパッドを指で動かしてポインターを適当に移動することと、キーボードを適当に叩くことの2つだけ

このペルソナに合わせて、メニュー操作やクリックの正確さを一切要求しない設計にしています。起動すると全画面のキャンバスがすぐに表示され、ポインターを動かすとカラフルな光の粒が軌跡として舞い、キーを叩くと画面のどこかに星やハートがポップして音が鳴ります。

## v1: トラックパッドで遊べる機能

- ポインターの軌跡に沿って光の粒が発生し、ふわっと浮かんで消える（動かす速さに応じて量・大きさが変化）
- トラックパッドをタップ（クリック）すると花火のようにパーティクルが弾ける
- キーを叩くたびに画面のランダムな位置に図形（丸・星・ハート）がポップし、五音音階（ペンタトニック）の音が鳴る（どのキーを連打しても不協和音にならない）
- 一定時間操作が無いとゆっくり漂う演出が入り、放置していても寂しくならない
- 効果音は外部音源ファイルを使わず、Web Audio APIで生成
- キー連打で誤ってアプリが最小化・終了しないよう、メニューは「フルスクリーン切替」と「終了(Cmd+Q)」のみに限定

## セットアップ

```bash
npm install
```

## 起動（開発時の実行確認）

```bash
npm start
```

## テスト

```bash
npm test
```

- `test/particles.test.js` / `test/color.test.js` / `test/scale.test.js`: パーティクル物理・色相計算・音階マッピングの単体テスト（vitest）
- `test/renderer.smoke.test.js`: レンダラーをヘッドレスChromiumで開き、ポインター移動・クリック・キー入力でエフェクトが発火することを確認するスモークテスト（Playwright）

## macOS向けビルド

```bash
npm run dist:mac
```

- `electron-builder` の設定でビルド対象をmacOS(dmg/zip, arm64+x64)のみに限定しています。
- コード署名・公証・アプリアイコンの用意は行っていないため、配布用のdmg作成にはmacOS実機での追加設定が必要です。

## ディレクトリ構成

```
src/
  main/
    main.js        # Electronメインプロセス（ウィンドウ生成・最小限のメニュー定義）
  renderer/
    index.html
    style.css
    app.js          # ポインター/クリック/キー入力の配線と描画ループ
    lib/
      particles.js  # パーティクル物理（純粋関数）
      color.js       # 色相計算（純粋関数）
      scale.js        # キー入力→ペンタトニック音階の周波数マッピング（純粋関数）
      sound.js        # Web Audioシンセ
test/
  particles.test.js
  color.test.js
  scale.test.js
  renderer.smoke.test.js
```

## 実装計画

初期実装の計画は [`.claude/plans/2026-07-25-mac-kids-pointer-app.md`](.claude/plans/2026-07-25-mac-kids-pointer-app.md) に記載しています。
