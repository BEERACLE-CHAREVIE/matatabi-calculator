# ブランド素材 出典・ライセンス記録

## 概要

本ディレクトリは「またたび計算機」のブランド素材（ロゴ・ファビコン・OGP・猫モチーフ装飾）について、**制作者・著作権・出典・ライセンス・差し替え履歴**を一箇所に記録するための運用ドキュメントです。

実ファイルは以下に配置されています:

- `src/app/favicon.ico` / `src/app/icon.svg` / `src/app/apple-icon.png` / `src/app/opengraph-image.png`
- `public/brand/logo-header.svg` / `public/brand/logo-pdf.svg` / `public/brand/cat-deco-1.svg`

`src/app/` 配下のアイコン系ファイルは Next.js App Router の規約（v14 以降同一）に従って配置されており、`<head>` 内の `<link rel="icon">` / `<meta property="og:image">` / `<link rel="apple-touch-icon">` は Next.js が自動付与します（`src/app/layout.tsx` で手動宣言する必要なし）。

## 素材一覧

| ファイル | 用途 | 寸法 / 形式 | 制作者 | 著作権 | ライセンス | ステータス |
|---|---|---|---|---|---|---|
| `public/brand/logo-header.svg` | Web ヘッダーロゴ | viewBox 200×40 / SVG | 開発者自作 | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `public/brand/logo-pdf.svg` | PDF ヘッダーロゴ（12×12mm 領域） | viewBox 48×48 / SVG | 開発者自作 | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `public/brand/cat-deco-1.svg` | Layout 背景装飾（猫モチーフ） | viewBox 200×200 / SVG | 開発者自作 | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `src/app/favicon.ico` | ブラウザタブアイコン（レガシー互換） | 16/32/48 マルチサイズ ICO | 開発者自作 | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `src/app/icon.svg` | モダンブラウザ向けファビコン | viewBox 32×32 / SVG | 開発者自作 | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `src/app/apple-icon.png` | iOS ホーム画面用アイコン | 180×180 / PNG | 開発者自作 | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `src/app/opengraph-image.png` | SNS / Slack OGP 画像 | 1200×630 / PNG | 開発者自作 | 株式会社ねこにまたたび | 社内利用 | 暫定 |

## カラー設計

すべての素材はマスター設計書 §3.3「カラーパレット: 案27 洗練されたニュアンス・キャット」に準拠しています。

| 用途 | カラー | HEX |
|---|---|---|
| 主線 / テキスト / ロゴ単色 | アッシュ・ブラウン | `#72665B` |
| ベース背景 / アイコン背景 | オフ・ホワイト | `#F8F6F2` |
| 罫線 / 装飾モチーフ | グレージュ | `#BEB5AA` |
| アクセント（OGP 区切り線） | ミスティ・ブルー | `#9CAEB8` |

## 外部素材を使用した場合の出典

本 Issue 完了時点では外部素材なし（すべて内製）。今後外部素材を追加する場合は以下のテンプレで記録してください。

```
- ファイル: `path/to/file.svg`
- 出典: <URL>
- 作者: <Name>
- ライセンス: <CC0 / MIT / CC-BY 4.0 / etc.>
- ライセンス遵守事項: <帰属表示要否 / 改変可否 / 商用利用可否>
```

## フォントライセンス（OGP 画像内への埋め込み）

| フォント | ライセンス | OGP 画像へのラスタライズ埋め込み |
|---|---|---|
| Inter | SIL Open Font License 1.1（OFL） | 可（OFL は商用利用・改変・再配布を許可） |
| Noto Sans JP | SIL Open Font License 1.1（OFL） | 可（同上） |
| ヒラギノ角ゴシック（macOS バンドル） | Apple System Font | 暫定 OGP 生成時に macOS 環境で使用。正式版差し替え時は OFL フォントへ移行する想定 |

OFL は「フォントファイルの再配布」に制限を課しますが、「フォントで描画した文字をラスタライズして画像に埋め込む」ことには制限がありません。よって OGP 画像内に Inter / Noto Sans JP の文字を埋め込んでも問題ありません。

> **注意**: 本 Issue で配備した暫定 OGP 画像はビルド環境（macOS）のヒラギノ角ゴシックで描画されています。正式版に差し替える際は Noto Sans JP（OFL）でラスタライズし直す運用が推奨です。

## 運用ルール

- SVG ファイルは **コミット前に SVGO 等で圧縮済み**であることを確認する（`npx svgo public/brand/*.svg src/app/icon.svg`）。
- 装飾 SVG（`cat-deco-*.svg`）を DOM に差し込む際は **`aria-hidden="true"` または CSS background-image** で装飾扱いとする。
- ロゴ SVG（`logo-header.svg` / `logo-pdf.svg`）を `<img>` または `<svg>` で組み込む際は `alt="またたび計算機"` または `aria-label="またたび計算機"` を必ず付与する。
- **ヘッダーロゴ（`logo-header.svg`）はフォールバック描画のリスクあり**: SVG 内に `<text font-family="'Noto Sans JP',...">` を含むため、Noto Sans JP が読み込まれていない環境（例: SVG を直接ブラウザで開く / 一部の SVG ビューア）ではシステムフォントで描画されレイアウトが崩れる可能性がある。後続 Layout コンポーネントでは `next/font` ロード後の DOM に `<img>` または `<svg>` を貼る前提とし、SVG 単体での視認確認は信頼しないこと。正式版差し替え時にはアウトライン化（`<path>` 化）も検討する。
- 暫定素材から正式素材への差し替えは、**ファイル名を維持したまま同パスで上書き**する（後続コードに変更を発生させない）。
- 猫モチーフは **本リポジトリ内製の SVG を使用**し、`lucide-react` などの汎用アイコンライブラリでは代替しない（ブランドの独自性確保のため）。

## 暫定 vs 本制作の方針

本 Issue で配備した素材はすべて **暫定（プレースホルダ）** です。Cloudflare Pages 公開（Issue #11）前または公開直後に、社内デザイナー / 委託デザイナーによる正式版に差し替える想定です。

差し替え時の手順:

1. 同名・同パスのファイルを正式版で上書きする
2. 正式版の SVG が SVGO で圧縮済みであることを確認する
3. PNG（`apple-icon.png` / `opengraph-image.png`）は §1 の容量予算（apple-icon: 15KB 以下、OGP: 200KB 以下）に収まることを確認する
4. 本ファイルの「素材一覧」のステータス欄を `暫定` → `本制作` に更新し、「差し替え履歴」に記録する

## OGP 画像のキャッシュリフレッシュ手順（Cloudflare Pages 公開後）

OGP 画像を差し替えた際、SNS / Slack 側のキャッシュが古い画像を返し続ける場合は、各サービスのデバッガでキャッシュ強制リフレッシュを実行してください。

- Meta（Facebook）: <https://developers.facebook.com/tools/debug/>（「もう一度スクレイピング」ボタン）
- X（Twitter）: <https://cards-dev.twitter.com/validator>
- Slack: URL 末尾にダミーパラメータ（`?v=2` 等）を付けて再投稿

## 差し替え履歴

| 日付 | PR | 内容 |
|---|---|---|
| 2026-04-25 | （本 Issue PR） | 初版（暫定素材一式を配備、`metadata` 拡張） |
