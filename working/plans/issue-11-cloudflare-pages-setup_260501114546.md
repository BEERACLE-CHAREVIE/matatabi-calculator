# Issue #11 実装プラン — Cloudflare Pages プロジェクト作成と GitHub 連携

## Context

本リポジトリ（`matatabi-calculator`）は、Issue #6 で Next.js 14 雛形が、#7/#8/#9/#10/#22 でデザイントークン・依存ライブラリ・ブランド素材・共通コンポーネント・spec 整合がそれぞれ整い、フェーズ1とフェーズ2の主要タスクが完了した状態にある。本 Issue #11 はフェーズ3「インフラ／デプロイ」の入り口として、Cloudflare Pages にリポジトリを接続し、main ブランチを本番、その他ブランチをプレビューとする自動デプロイ経路を恒久的に通すことが目的である。

本 Issue で確定する事項は次の 3 点に絞る:

1. **ホスティング戦略**: 静的出力（`output: 'export'`）か `@cloudflare/next-on-pages` か — 現コードベース（後述）から **静的出力を推奨**
2. **Cloudflare Pages プロジェクト設定値**: ビルドコマンド／出力ディレクトリ／環境変数／Node バージョンの確定
3. **ブランチ運用ルール**: `main` 本番 / それ以外プレビューの明示

「Cloudflare Pages プロジェクト作成」「GitHub アプリ承認」「ダッシュボード設定」「初回デプロイ確認」の物理操作は、Cloudflare アカウントを持つ人間（オーナー）でなければ実行できないため、**「ユーザー側で必要な手順（手動作業チェックリスト）」と「リポジトリ側で必要な変更（コード／設定ファイル）」を §「変更対象ファイル」内で明確に分離して記述**する。

GitHub Issue: #11

---

## 設計上の考慮点

### A. 採用方針: 静的出力 (`output: 'export'`) を推奨

現コードベースを調査した結果、**Next.js のサーバ機能は一切使用していない**ため、`@cloudflare/next-on-pages` ではなく **`next.config.mjs` で `output: 'export'` を設定し、生成された `out/` を Cloudflare Pages に静的配信させる**方針を推奨する。

#### 推奨理由（コードベース調査エビデンス）

`/Users/YS/development/matatabi-calculator/src` 配下を `grep` で全件確認した結果:

| サーバ依存 API | 使用状況 | 出典 |
|---|---|---|
| `'use server'` ディレクティブ／Server Actions | 未使用 | `src/` 内に該当文字列なし |
| `cookies()` / `headers()` (`next/headers`) | 未使用 | 同上 |
| `export const runtime = 'edge' \| 'nodejs'` | 未使用 | 同上 |
| `export const dynamic` / `revalidate` 指定 | 未使用 | 同上 |
| `generateStaticParams` / 動的セグメント `[slug]` | 未使用 | `src/app` は `layout.tsx` / `page.tsx` のみ |
| API Route (`src/app/api/`) | 存在しない | ディレクトリ自体なし |
| `next/image` の動的最適化 | 未使用 | `src/` 内に `<Image>` 参照なし。ブランド素材は `public/brand/` の SVG／PNG を `<img>` または `metadata.icons` で直参照 |
| Server Components の非同期 fetch | 未使用 | `page.tsx` は完全に静的 JSX |

仕様レベルでも、`docs/spec/calculation-logic.md` で計算は完全クライアント、`docs/spec/result-dashboard.md` で `ResultDashboard` は `"use client"` + `next/dynamic`、`docs/spec/pdf-report.md` で PDF は jsPDF + html2canvas のクライアント生成 と確定済み。**入力値はサーバへ送らず、永続化もしない**設計のため、サーバランタイムは恒久的に不要である。

#### 静的出力の Pros / Cons

**Pros**:
- Cloudflare Pages の純粋静的配信に乗るため、`@cloudflare/next-on-pages` のビルド変換層・Workers ランタイム互換性問題（Next.js マイナー更新で破綻するリスク）を完全回避
- `next build` の出力 (`out/`) はそのまま `wrangler pages dev` でローカル検証も可能
- マスター設計書 §1.4 の LCP 1 秒目標と整合（Edge 配信 + 純静的）
- 将来 Next.js 15／React 19 へ移行する際、`@cloudflare/next-on-pages` の対応待ちにブロックされない

**Cons**:
- `next/image` の組み込み最適化が使えない（→ 本プロジェクトは `next/image` を使っていないため影響なし。SVG／事前最適化済 PNG 運用）
- 将来 Server Actions や API Route が必要になった場合、構成変更（`@cloudflare/next-on-pages` または別ホスティング）が必要
  - → 現要件（5 項目入力 + クライアント計算 + PDF 出力）の範囲では発生しない見通し。万一の場合は別 Issue でホスティング方式変更を扱う

#### `@cloudflare/next-on-pages` を採用しない理由（追加）

- ランタイム依存層（`_worker.js`）が増え、ビルド失敗時の原因切り分けが難化する
- `nodejs_compat` フラグや wrangler 設定追加が必要となり、本 Issue のスコープが膨張する
- 現状で得られるメリット（Edge ランタイム実行、ISR）が **本プロジェクトの要件に存在しない**

### B. 注意点: `next/font/google` のビルド時 Google Fonts アクセス

現在 `src/app/layout.tsx` は `next/font/google` から Inter / Noto Sans JP を読み込んでいる。`docs/spec/pdf-report.md` §4 のフォント方針説明にも「Cloudflare Pages の CI が Google Fonts にアクセスできないとビルドが失敗する」点が既に明記されている。本 Issue ではフォント設定は変更せず（PDF 用 `next/font/local` 切替は別 Issue で扱う）、**ビルド時に Cloudflare Pages のビルドコンテナから `fonts.googleapis.com` への egress が許可されている前提**で進める。初回デプロイ失敗時の切り分け手順を「検証方法」に含める。

### C. ブランチ運用

- `main`: 本番（プロダクションブランチに指定）
- `develop` / `feature/*` / その他全ブランチ: プレビュー（自動でユニーク URL 生成）
- 本リポジトリは現在 `main` / `develop` / `development` の 3 ブランチ運用（`git log` で確認済）。`develop` がチーム共有のステージングとなるため、`develop` のプレビュー URL を「擬似ステージング」として扱う運用を README で明示する

### D. `output: 'export'` 採用に伴う next.config.mjs の項目

- `output: 'export'`（静的エクスポート有効化、`out/` 生成）
- `images: { unoptimized: true }`（`next/image` 最適化を抑止。現状 `next/image` 不使用だが、将来誤って導入しても静的出力でクラッシュしないよう先回り）
- `trailingSlash: true`（任意）— Cloudflare Pages の URL 解決と相性の良い末尾スラッシュ運用に倒すか、デフォルト（`false`）で `/foo.html` 配信に倒すか。**本 Issue ではデフォルト（false）で開始**し、ルーティング上の不具合があれば次 Issue（#12 独自ドメイン）で再評価する

### E. Cloudflare Pages 設定値（ダッシュボード入力）

| 設定項目 | 値 | 根拠 |
|---|---|---|
| Framework preset | **Next.js (Static HTML Export)** | `output: 'export'` 採用のため。`Next.js`（SSR）プリセットを選ぶと `@cloudflare/next-on-pages` が要求される |
| Build command | `npm run build` | `package.json` の既存 scripts に揃える |
| Build output directory | `out` | `output: 'export'` のデフォルト出力先 |
| Root directory | （空欄／ルート） | モノレポではないため |
| Production branch | `main` | 本 Issue で決定 |
| Node.js version | `20` | `.nvmrc` と `package.json` の `engines.node: ">=20.0.0"` に整合 |
| Compatibility flags | （静的出力では不要） | `nodejs_compat` 等は `@cloudflare/next-on-pages` 採用時のみ |
| 環境変数 | `NEXT_PUBLIC_SITE_URL` を本番 URL に設定（プレビュー環境にはプレビュー URL を別途）／`NODE_VERSION=20` も明示 | `src/app/layout.tsx` がデフォルト値 `https://matatabi-calculator.example` をフォールバック使用しているため、本番／プレビューで OG/Twitter card の URL を正しい値に上書きしたい |

### F. スコープ外（明示）

| 項目 | 担当 |
|---|---|
| 独自ドメインの DNS 設定／SSL モード確定 | Issue #12 |
| アクセス解析（GA4 / Cloudflare Web Analytics）導入 | Issue #14 |
| `next/font/local` への Noto Sans JP subset 切替 | Issue #5 本実装フェーズ（PDF レポート）で扱う |
| `_headers` / `_redirects` ファイルでのカスタムヘッダ・リダイレクト | 必要が顕在化した時点で別 Issue |
| Cloudflare Pages の build watch path、deploy hook、Skip Builds 設定 | 運用負荷が顕在化してから別 Issue |
| GitHub Actions による別経路デプロイ／プレビュー機能 | 不要（Cloudflare Pages の GitHub 連携で十分） |

---

## 変更対象ファイル

> ## 凡例
> 本 Issue は **「ユーザーが Cloudflare ダッシュボードで実施する作業」** と **「リポジトリで実施するコード／設定変更」** に分かれる。前者は `M`（手動）プレフィックス、後者は番号のみで列挙する。

### M1. 【ユーザー手動作業】Cloudflare Pages プロジェクトを作成し GitHub と連携する

- **作業者**: Cloudflare アカウント保有者（オーナー）
- **場所**: Cloudflare ダッシュボード → Workers & Pages → Create → Pages → Connect to Git
- **手順**:
  1. GitHub の `BEERACLE-CHAREVIE/matatabi-calculator`（または該当の Owner/Repo）を選択し、Cloudflare GitHub アプリのインストール／リポジトリ追加を承認
  2. プロジェクト名を `matatabi-calculator`（または運用ルールに従う名）で確定
  3. **Production branch** に `main` を指定
  4. Build settings で以下を入力（後段の §E を参照）:
     - Framework preset: **Next.js (Static HTML Export)**
     - Build command: `npm run build`
     - Build output directory: `out`
     - Root directory: 空欄
  5. Environment variables（Production / Preview 別々に設定可）:
     - Production: `NODE_VERSION=20` / `NEXT_PUBLIC_SITE_URL=https://<本番URL>`
     - Preview: `NODE_VERSION=20` / `NEXT_PUBLIC_SITE_URL=https://<*.pages.dev のプロジェクト固定URL or プレビューURL>`
  6. **「Save and Deploy」** を押下し、初回デプロイのキューを発生させる
- **理由**: Cloudflare Pages のプロジェクト作成・GitHub 連携・初回デプロイは API でも可能だが、トークン管理コストの方が大きいため、**ダッシュボードでの 1 回限りの手作業**を正としてプランに明示する。リポジトリ側のリソース変更は不要。

### M2. 【ユーザー手動作業】初回デプロイ成功とプレビュー動作を確認する

- **作業者**: Cloudflare アカウント保有者
- **場所**: Cloudflare ダッシュボード → 該当 Pages プロジェクト → Deployments
- **手順**:
  1. 初回 Production デプロイ（`main`）が「Success」で完了することを確認
  2. デプロイログで以下を視認:
     - `npm install` がエラーなく完了
     - `next build` が `Generating static pages` を経て `Export successful` で終わる
     - 出力ディレクトリ `out/` が認識されている
  3. 発行された `*.pages.dev` URL に GET リクエストして HTTP 200 を確認、`<title>またたび計算機</title>` がレンダリングされること、`/_next/static/...` 配下のチャンクが 200 で配信されることを確認
  4. 別ブランチ（例: `develop`）に空コミットを push して **プレビューデプロイ**が自動生成され、別 URL でアクセスできることを確認
  5. 結果を Issue #11 のコメントに「初回デプロイ成功（URL: ...）」として記録
- **理由**: 「初回デプロイ成功を確認」が Issue 本文タスクの完了条件のため。プレビュー URL の自動生成が機能することは #12（独自ドメイン）と #14（アクセス解析）の前提でもある。

### M3. 【ユーザー手動作業】Cloudflare Pages の Git 設定にフォールバック動作を確認する（任意）

- **作業者**: Cloudflare アカウント保有者
- **場所**: ダッシュボード → Pages プロジェクト → Settings → Builds & deployments
- **手順**:
  - Branch deployments で「All non-Production branches」（または「Custom branches」で `develop` / `feature/*` を許可）が選択されていることを確認
  - Build watch paths は当面デフォルト（全ファイル監視）。モノレポ化したら見直し
- **理由**: Issue 本文「その他ブランチはプレビュー」要件を満たすため。デフォルト設定のままで満たされるはずだが、明示的に確認する。

---

### 1. `next.config.mjs` を静的エクスポート構成に拡張する

- **変更**: `/Users/YS/development/matatabi-calculator/next.config.mjs`
- **変更箇所**: 既存の `nextConfig` オブジェクト全体（現在は空オブジェクト `{}`）
- **変更内容**:
  - `output: 'export'` を追加（`out/` への静的エクスポートを有効化）
  - `images: { unoptimized: true }` を追加（静的出力では `next/image` 最適化が無効になる前提を明示。現状 `next/image` 未使用だが、将来誤って導入しても build 時にクラッシュしないよう先回り設定）
  - 末尾に短いコメントで「Cloudflare Pages 静的配信向け（Issue #11）」と意図を残す
  - `output` の指定により `next start` が無効化される。`README.md` の「ビルド」節（§3 を参照）の `npm start` 記述と整合を取る
- **理由**: §設計上の考慮点 A 参照。Cloudflare Pages のビルドが `out/` を出力ディレクトリとして検出するためには `output: 'export'` が必須。`@cloudflare/next-on-pages` を採用しない方針を **コード側で恒久的に確定**するピン止め。

### 2. `package.json` の scripts と `engines` を Cloudflare Pages 設定に整合させる

- **変更**: `/Users/YS/development/matatabi-calculator/package.json`
- **変更箇所**:
  - `scripts.start`（現在 `"next start"`）
  - `scripts` に新規追加: `preview` 系スクリプト（任意、後述）
  - `engines.node`（既存値 `">=20.0.0"` のまま）
- **変更内容**:
  - `scripts.start` の扱い: `output: 'export'` を有効化すると `next start` は実行不可となるため、以下のいずれかを選択し PR で明示
    - **推奨**: `start` を削除し、READMEから `npm start` の記載も外す（誤実行を防止）
    - 代替: `start` を `"echo 'Static export. Use \"npx serve out\" or run \"npm run dev\".' && exit 1"` に置換し、誤起動時に明確なエラーメッセージを返す
  - `scripts` に `"preview": "npx serve out"` などローカル静的検証用スクリプトを追加することは **本 Issue では行わない**（依存追加はスコープ外。`wrangler pages dev` も別 Issue 扱い）
  - `engines.node` は **変更しない**（`">=20.0.0"` のまま、Cloudflare Pages 側で `NODE_VERSION=20` を環境変数指定）
- **理由**: `output: 'export'` と `next start` は両立しない。`scripts.start` を残したまま放置すると、新規参加メンバーがローカル検証で混乱する。Cloudflare Pages のビルド環境変数 `NODE_VERSION=20` で揺らぎを抑える。

### 3. `README.md` のセットアップ／ビルド節をホスティング方針へ整合させる

- **変更**: `/Users/YS/development/matatabi-calculator/README.md`
- **変更箇所**:
  - 「技術スタック」節（10 行目あたり）の「Cloudflare Pages（Issue #11 で設定予定）」記述
  - 「ビルド」節（38–42 行目）の `npm start` を含む説明
  - 末尾近くに「デプロイ」節を新設
- **変更内容**:
  1. 技術スタック節の括弧を「Cloudflare Pages（静的エクスポート + GitHub 連携）」に更新
  2. 「ビルド」節を「`npm run build` で `out/` に静的サイトが生成される。ローカル確認は `npm run dev`、または別途 `npx serve out` 等の静的サーバを利用する」と書き換え（`npm start` の記載を撤去）
  3. 新規「デプロイ」節を追加し、以下を簡潔に記載:
     - 本番ブランチ: `main`（push で自動デプロイ）
     - プレビュー: `main` 以外の全ブランチで自動的にユニーク URL を発行
     - Cloudflare Pages 設定値（Framework preset = Next.js (Static HTML Export) / Build command = `npm run build` / Output = `out` / NODE_VERSION = 20）
     - 環境変数 `NEXT_PUBLIC_SITE_URL` は本番／プレビューで個別に設定（OG/Twitter Card の `metadataBase` に使用）
- **理由**: チーム参加者が `npm start` で詰まらないようにする。本 Issue 完了時点でデプロイ運用ルールを README に明文化することで、#12（独自ドメイン）以降のオンボーディングが楽になる。

### 4. `.gitignore` の Cloudflare Pages／Wrangler 関連エントリを最終化する

- **変更**: `/Users/YS/development/matatabi-calculator/.gitignore`
- **変更箇所**: 既存の「Cloudflare Pages / Wrangler (used from Issue #11)」コメント（42–43 行目）と Next.js 出力の `/out/`（14 行目で既に除外済）
- **変更内容**:
  - 既に `/out/` と `.wrangler/` が除外されているため **変更を加えない**ことを PR で明示（後続レビュアーが「なぜ触らない？」を疑問に思わないように）
  - 念のため `.dev.vars` を `.env.local` 系除外で十分カバーされているか確認し、不足していれば追記（Wrangler ローカル環境変数ファイル）
- **理由**: 既存の `.gitignore` は #6 のプランで Issue #11 を見越した除外が既に入っている。本 Issue では追加除外は最小限とし、内容変更を抑える方針を明記する。

### 5. `src/app/layout.tsx` の `metadataBase` フォールバック値の運用方針を明示する（コード変更は伴わない）

- **変更**: 行わない（`/Users/YS/development/matatabi-calculator/src/app/layout.tsx` は変更しない）
- **対応箇所**: 19–22 行目で `process.env.NEXT_PUBLIC_SITE_URL ?? "https://matatabi-calculator.example"` がフォールバックされている
- **対応内容**:
  - PR 本文 / Issue コメントで「**Cloudflare Pages の Production / Preview 環境変数 `NEXT_PUBLIC_SITE_URL` を必ず設定すること**」を運用ルールとして明示
  - 本番 URL は #12（独自ドメイン）確定までは `*.pages.dev` の暫定 URL を使用してよい
- **理由**: コード側のフォールバック実装は既に Issue #9 で適切に施されている。ここで `layout.tsx` を再編集すると Issue #9 の責務を侵食するため、**運用ドキュメントだけで完結**させる。

### 6. （任意・採用しない）`@cloudflare/next-on-pages` 関連ファイルは追加しない

- **変更**: 行わない（本 Issue では `wrangler.toml` / `_routes.json` / `_worker.js` を作成しない）
- **理由**: §設計上の考慮点 A の判断に従い、静的エクスポート方式を採用。`@cloudflare/next-on-pages` への依存追加・wrangler 設定ファイル追加は **本 Issue の意図に反する**ため避ける。Server Actions や API Route が将来導入される場合は、別 Issue でホスティング方式変更を改めて議論する。

---

## 検証方法

> 検証は **「リポジトリ側の変更が build を壊していないこと」** → **「Cloudflare Pages 側で初回デプロイが成功すること」** の順で実施する。

### 1. リポジトリ側のローカル検証（PR マージ前）

1. `npm install` が既存 lockfile で再現できる（diff なし）
2. `npm run lint` がエラー 0 件
3. `npm run typecheck` がエラー 0 件
4. `npm run build` が成功し、ルート直下に `out/` ディレクトリが生成される
5. `out/index.html` に `<title>またたび計算機</title>` が含まれる
6. `out/_next/static/` 配下にチャンクが生成されている
7. `npm start` が **存在しないか、明示的なエラーメッセージで終了する**（変更内容に応じて）
8. `git status` の untracked／ignored 対象として `out/` が `.gitignore` の `/out/` で除外されていることを確認

### 2. Cloudflare Pages 側の初回デプロイ検証（マージ後、ユーザー手動）

1. M1 の手順で Cloudflare Pages プロジェクトを作成
2. `main` への PR マージ（または develop → main のフィードフォワード）が初回 Production デプロイをキックする
3. Deployments タブで「Success」を確認
4. ビルドログで以下が連続して成功していることを確認:
   - `Cloning repository`
   - `Detected the following tools: nodejs@20, ...`
   - `Executing user command: npm run build`
   - `Compiled successfully`
   - `Generating static pages (X/X)`
   - `Export successful` と `Files written to .../out`
   - `Finished` / `Success: Assets published!`
5. 発行された `*.pages.dev` URL を GET し:
   - HTTP 200 / `text/html` を返す
   - `<title>またたび計算機</title>` が含まれる
   - `<link rel="icon" ...>`（Issue #9 で設定済）が解決される
   - DevTools Network タブで `/_next/static/...` のチャンクが 200 / `application/javascript` を返す
6. ローカルから `git checkout -b feature/cf-preview-test_<日付> && git commit --allow-empty -m "test: preview deploy" && git push -u origin HEAD` を実行し、**プレビューデプロイ**が独立 URL で成功することを確認、その後ブランチを破棄
7. **Google Fonts ビルド時アクセスの可否確認**: ビルドログに「Fetching Inter / Noto Sans JP from Google Fonts」相当の警告／エラーが無いことを確認。万一失敗する場合は、PDF 仕様（`docs/spec/pdf-report.md` §4）の `next/font/local` 切替を別 Issue で前倒し検討する

### 3. ロールバック手順（万一の備え）

- 初回デプロイが失敗した場合: ダッシュボード Deployments から直前のコミットを「Rollback」または `next.config.mjs` の `output: 'export'` を一時 revert する PR を `main` に出す
- 静的出力で解決困難な不具合が発覚した場合: `@cloudflare/next-on-pages` 採用へ切り替える別 Issue を立て、本 Issue は「初期判断とその記録」として履歴に残す
