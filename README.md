# またたび計算機 (Matatabi Calculator)

株式会社ねこにまたたびが展開する ROI 診断アプリ。中小企業の経営層向けに、ベンダー依存コスト削減と AI 駆動開発転換のメリットを数値化・可視化します。

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Cloudflare Pages（Issue #11 で設定予定）

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
npm start
```

### 型検証・Lint

```bash
npm run typecheck
npm run lint
```

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
