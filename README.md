# またたび計算機 (Matatabi Calculator)

株式会社ねこにまたたびが展開する ROI 診断アプリ。中小企業の経営層向けに、ベンダー依存コスト削減と AI 駆動開発転換のメリットを数値化・可視化します。

## 技術スタック

- Next.js 16 (App Router)
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

本リポジトリは Cloudflare Pages のダッシュボードで GitHub 連携を構成済みで、push をトリガーに自動デプロイされます。本番 URL は `https://roi.nekonimatatabi.com`（Apex を正規ホストとして運用）。

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

- Production: `https://roi.nekonimatatabi.com`
- Preview: プレビュー用 `*.pages.dev` URL（プロジェクト固定 URL）

### 任意環境変数（アクセス解析）

`NEXT_PUBLIC_CF_BEACON_TOKEN` を **Production スコープのみ** に設定してください。Cloudflare Web Analytics の beacon タグ（`src/app/layout.tsx`）が本値を参照し、未設定時は `<Script>` を出力しません。

- Production: Cloudflare ダッシュボード → Web Analytics で発行された token
- Preview / ローカル: **未設定**（送信オフ）

### 独自ドメイン運用方針

- 正規ホスト: Apex (`roi.nekonimatatabi.com`)。将来 `www.roi.nekonimatatabi.com` を併設する場合は Cloudflare の Redirect Rule で 301 を返す方針（現時点では併設なし）
- SSL/TLS モード: **Full (strict)**、Always Use HTTPS = On、Automatic HTTPS Rewrites = On、Minimum TLS Version = 1.2
- HSTS: 段階導入。初期 `max-age=300`（5 分）で開始し、1〜2 週間の安定運用後に `max-age=31536000` + `includeSubDomains` へ引き上げる（Preload 申請は別 Issue で扱う）
- 詳細な Cloudflare ダッシュボード設定値は Issue #12 のコメントを参照

## ドキュメント

- マスター設計書: [`.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md`](./.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md)
- 計算ロジック仕様: [`docs/spec/calculation-logic.md`](./docs/spec/calculation-logic.md) (Issue #1)
- 入力フォーム仕様: [`docs/spec/input-form.md`](./docs/spec/input-form.md) (Issue #2)
- 診断結果ダッシュボード仕様: [`docs/spec/result-dashboard.md`](./docs/spec/result-dashboard.md) (Issue #3)
- 警告コピー仕様: [`docs/spec/warning-copy.md`](./docs/spec/warning-copy.md) (Issue #4)
- PDF レポート仕様: [`docs/spec/pdf-report.md`](./docs/spec/pdf-report.md) (Issue #5)
- 実施順プラン: [`.claude/issue-order.md`](./.claude/issue-order.md)
- 法務判断記録: [`docs/legal/REASONING.md`](./docs/legal/REASONING.md) (Issue #13 / Issue #14)
- プライバシーポリシー（ドラフト）: [`docs/legal/privacy.md`](./docs/legal/privacy.md) (Issue #13 / Issue #14)
- 利用規約（ドラフト）: [`docs/legal/terms.md`](./docs/legal/terms.md) (Issue #13)

## アクセス解析

- 採用ツール: **Cloudflare Web Analytics**（Cookie 不発行、SPA 遷移は自動検知、LCP 影響極小）
- 計測対象: 当面は PV / Web Vitals / 平均滞在時間のみ。CF は任意イベント未対応のため、診断完了率・PDF ダウンロード数等のドメインイベントは未計測
- ラッパ: `src/lib/analytics.ts` に `trackEvent` / `trackPageView` を no-op スタブとして配置。後続 Issue (#2 / #3 / #4 / #5) でフックを差し込む際の API 入口。GA4 併用が決まった場合は内部実装のみ差し替え
- 計測有効判定: `isAnalyticsEnabled`（同モジュールから export）は環境変数の有無で決まる boolean。後続 Issue でガード条件付きの副作用（重い計測処理の skip 等）を書きたい場合の判定用
- オン／オフ: `NEXT_PUBLIC_CF_BEACON_TOKEN` の有無で分岐。Preview / ローカルは送信オフ
- 法令対応: 電気通信事業法 外部送信規律はプライバシーポリシー §5 への記載で対応（バナー不採用）。`docs/legal/REASONING.md` 参照

## ライセンス

Proprietary. © 株式会社ねこにまたたび
