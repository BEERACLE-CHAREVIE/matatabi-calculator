# またたび計算機 (Matatabi Calculator)

株式会社ねこにまたたびが展開する ROI 診断アプリ。中小企業の経営層向けに、ベンダー依存コスト削減と AI 駆動開発転換のメリットを数値化・可視化します。

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Cloudflare Pages（静的エクスポート + GitHub 連携）

## セットアップ

### 前提

- Node.js 20+ (`.nvmrc` 参照)
- npm 10+

### インストール

`packageManager` フィールド (`npm@10.9.2`) を尊重するため、Corepack を有効化したうえでインストールしてください。

```bash
nvm use
corepack enable
npm install
```

### 開発サーバ起動

```bash
npm run dev
```

<http://localhost:3000> でアクセスできます。

### ビルド

```bash
npm run build
```

`output: 'export'` を有効化しているため、ビルド成果物はリポジトリ直下の `out/` に静的サイトとして生成されます。`next start` は使用しません。ローカルで成果物を確認したい場合は `npx serve out` 等の静的サーバを利用してください。

### 型検証・Lint

```bash
npm run typecheck
npm run lint
```

## デプロイ

本リポジトリは Cloudflare Pages のダッシュボードで GitHub 連携を構成済みで、push をトリガーに自動デプロイされます。

### ブランチ運用

- 本番ブランチ: `main`（push で自動的にプロダクションデプロイ）
- プレビュー: `main` 以外のすべてのブランチで自動的にユニーク URL が発行されます。`develop` のプレビュー URL を擬似ステージングとして利用してください。

### Cloudflare Pages 側の設定値

| 設定項目 | 値 |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Production branch | `main` |
| Node.js version | `20`（環境変数 `NODE_VERSION=20`） |

### 必須環境変数

`NEXT_PUBLIC_SITE_URL` を Production / Preview それぞれに設定してください。`src/app/layout.tsx` の `metadataBase` がこの値を参照し、OG / Twitter Card の絶対 URL を生成します。

- Production: 本番ドメイン確定までは Cloudflare Pages が発行する `*.pages.dev` URL を暫定値として設定
- Preview: プレビュー用 `*.pages.dev` URL（プロジェクト固定 URL）

## ドキュメント

- マスター設計書: [`.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md`](./.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md)
- 計算ロジック仕様: [`docs/spec/calculation-logic.md`](./docs/spec/calculation-logic.md) (Issue #1)
- 入力フォーム仕様: [`docs/spec/input-form.md`](./docs/spec/input-form.md) (Issue #2)
- 診断結果ダッシュボード仕様: [`docs/spec/result-dashboard.md`](./docs/spec/result-dashboard.md) (Issue #3)
- 警告コピー仕様: [`docs/spec/warning-copy.md`](./docs/spec/warning-copy.md) (Issue #4)
- PDF レポート仕様: [`docs/spec/pdf-report.md`](./docs/spec/pdf-report.md) (Issue #5)
- 実施順プラン: [`.claude/issue-order.md`](./.claude/issue-order.md)

## ライセンス

Proprietary. © 株式会社ねこにまたたび
