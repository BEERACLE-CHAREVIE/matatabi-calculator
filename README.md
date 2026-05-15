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

## CI / 品質ゲート

本リポジトリは GitHub Actions で以下 2 ワークフローを運用しています。

| ワークフロー | トリガ | 内容 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `pull_request` / `push`（`main` / `develop`） | `lint` / `typecheck` / `test` / `build` を 4 ジョブで並列実行 |
| `.github/workflows/security-audit.yml` | `pull_request` / `push`（`main` / `develop`）+ 週次 schedule（毎週月曜 09:00 JST 相当）+ `workflow_dispatch` | `npm audit --audit-level=critical` を実行（high / moderate は到達不能判定済み。`docs/security/jspdf-vulnerabilities.md §6` 参照） |

E2E（Playwright）はブラウザインストールに時間がかかるため CI には含めていません。必要時に別ワークフローでの追加を検討します。

### ローカルで CI 同等の検証を再現

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

### branch protection 設定手順（リポジトリ管理者向け）

CI を必須化するには GitHub 側で branch protection を設定してください。

1. GitHub リポジトリの **Settings → Branches → Branch protection rules** で `main` と `develop` をそれぞれ保護対象に追加
2. **Require a pull request before merging** を有効化
3. **Require status checks to pass before merging** を有効化し、必須チェックとして以下 4 つを選択（少なくとも 1 度ワークフローが実行されると候補に表示される）
   - `ci / lint`
   - `ci / typecheck`
   - `ci / test`
   - `ci / build`
4. `security-audit / audit` は週次運用が主目的のため必須チェックからは除外する（PR 単位の合否と週次運用が混在すると CI 体感が悪化するため）
5. **Require branches to be up to date before merging** は任意（`develop` のリベース運用方針に応じて選択）
6. **Restrict who can push to matching branches** を必要に応じて有効化

### CI バッジ（任意）

README 冒頭に CI バッジを置きたい場合は以下を参考に追加してください（本 Issue では追加しません）。

```markdown
![ci](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg?branch=develop)
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
- HSTS: 本格運用値 `max-age=31536000; includeSubDomains`。Preload 申請は別 Issue で扱う。
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

## 計算ロジックの前提値出典

ROI 試算で使用するデフォルト値は、以下の公的統計および業界調査に基づきます。最新の出典詳細・採用ロジック・更新ポリシーは [`docs/spec/calculation-logic.md §3`](./docs/spec/calculation-logic.md) を参照してください。

| 値 | 採用値 | 主たる出典 | 取得日 |
|---|---|---|---|
| 時給 (`DEFAULT_HOURLY_WAGE`) | 2,500 円/時 | [厚生労働省「賃金構造基本統計調査 令和7年速報」](https://www.mhlw.go.jp/toukei/itiran/roudou/chingin/kouzou/z2025/sokuhou.html)（中小企業ホワイトカラー所定内給与＋賞与＋社保事業主負担の実質時給レンジ下限） | 2026-05-04 |
| 1 日あたり手作業時間 (`DEFAULT_HOURS_PER_DAY`) | 2 時間/日 | [BPO テクノロジー「会社員の業務実態調査」](https://prtimes.jp/main/html/rd/p/000000011.000086224.html)（ノンコア業務時間中央値レンジ 1〜3 時間/日の中央値） | 2026-05-04 |
| 月あたり稼働日数 (`DEFAULT_DAYS_PER_MONTH`) | 20 日/月 | [厚生労働省「就労条件総合調査 令和7年」](https://www.mhlw.go.jp/toukei/itiran/roudou/jikan/syurou/25/dl/gaikyou.pdf)（中小企業 30〜99 人 年間休日 111.2 日 + 年休取得 12.1 日 = 実稼働 約 240 日/年） | 2026-05-04 |
| 年あたり改修回数 (`REPAIRS_PER_YEAR`) | 3 回/年 | システム保守業界通念（四半期改修＋軽微 1 回除外）／補完: [システム幹事 2026 年最新版](https://system-kanji.com/posts/system-development-maintenance-cost-quote) | 2026-05-04 |
| 内製化 5 段階 (`INSOURCING_LEVELS`) | 0 / 0.25 / 0.5 / 0.75 / 1.0 | [中小企業庁「2025 年版 中小企業白書」](https://www.chusho.meti.go.jp/pamflet/hakusyo/2025/PDF/2025gaiyou.pdf)（粒度の妥当性検証） | 2026-05-04 |

> Issue #90 で旧版「説明ロジックのみ」から本出典付きセクションに格上げ。Phase 1 の一次情報メモは `working/issue-90/research/` に保管。

## ライセンス

Proprietary. © 株式会社ねこにまたたび
