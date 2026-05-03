# Issue #6 実装プラン — Next.js 14+ プロジェクト雛形を作成する

## 0. このプランの性格

本プランは **リポジトリに初めて「動くコード」を入れるタスク** のためのプランです。成果物は `create-next-app` で生成された Next.js 14+ の雛形一式と、それを本プロジェクト向けに最小限調整した状態。機能コードは一切含まず、**「後続 Issue が即座にコミット可能な土台」** を作ることが唯一のゴールです。

Issue #1〜#5 が全て仕様書（Markdown）のみの成果物であったのに対し、本 Issue は **初めて `package.json` / `tsconfig.json` / `src/` 配下を作る境界点** に位置します。ここでの選択が #7〜#14 の全てに影響するため、**「今決めること」と「後続 Issue に譲ること」の境界線** を明確にすることを本プランの最上位要件とします。

---

## 1. 概要

### 何を作るか
- `create-next-app` による Next.js 14+ App Router 雛形 (TypeScript / Tailwind / ESLint 有効)
- 本プロジェクトのホスティング（Cloudflare Pages）・後続 Issue の追加ライブラリ（lucide-react, jsPDF, html2canvas, Recharts）を見据えた `package.json` / `tsconfig.json` / `.gitignore` の最小限調整
- リポジトリのランディング文書としての `README.md`（プロジェクト概要・セットアップ手順・spec へのリンク）
- Node.js / パッケージマネージャの固定（`.nvmrc` + `packageManager` フィールド）

### なぜ重要か（下流への影響）
- **#7（Tailwind デザイントークン）**: Tailwind の version / 設定ファイル形式（v3 の `tailwind.config.ts` か v4 の CSS ファースト設定か）が #7 の実装手法を規定する
- **#8（依存ライブラリ追加）**: パッケージマネージャ選定が lockfile 形式を決め、全員の開発環境に影響
- **#10（デザインガイドライン）**: `src/app/globals.css` / `src/app/layout.tsx` の初期状態が #10 の改変対象
- **#11（Cloudflare Pages）**: ビルド出力戦略（Node ランタイム / Edge / 静的エクスポート）を選べる下地になっている必要がある
- **レビュー効率**: Next.js 雛形の生成物は数十ファイルに及び、**生成直後コミットと手修正コミットを分ける** ことで後からの diff レビューが楽になる

---

## 2. 意思決定ステップ（軽め・ただし境界線は明確に）

本 Issue は実装タスクのため意思決定は軽量に留めますが、**「#6 で決める」「後続に譲る」の二分表** は必ず Issue のコメントに残す想定です。

### Step 1. Next.js のバージョン固定方針

#### 選択肢A: `create-next-app@latest` でその時点の最新を取得
- **Pros**: 常に最新機能・バグフィックスを享受。React 19 / Next.js 15 の新機能を先取りできる
- **Cons**: マスター設計書は「Next.js 14+」と明記。Next.js 15 は 2024 年リリースで App Router は既に安定だが、Cloudflare Pages（`@cloudflare/next-on-pages`）や Recharts / html2canvas との互換性が枯れていない場合がある

#### 選択肢B: `create-next-app@14` で Next.js 14 系に固定（推奨）
- **Pros**:
  - マスター設計書の明示通り。仕様との整合が明確
  - `@cloudflare/next-on-pages` のサポート状況が Next.js 14 で枯れている（#11 のリスク低下）
  - html2canvas / jsPDF / Recharts の既存文献の大半が Next.js 14 + React 18 ベース（#3 / #5 の仕様書記述と整合）
- **Cons**: Next.js 15 / React 19 の機能（Async Request APIs の正式化など）は使えない。本アプリは SPA 的な静的計算ロジック中心なので影響は軽微

#### 選択肢C: `create-next-app@15` で先行採用
- **Pros**: 将来的に最小の移行コスト
- **Cons**: React 19 系に切り替わると、既存 spec（#3 の Recharts・#5 の html2canvas）の検証コストが増える

**推奨**: **選択肢B（Next.js 14 系、`create-next-app@14` 実行で 14.x 最新パッチを取得）**。マスター設計書との整合、Cloudflare Pages の安定性、既存 spec との互換性のバランスが最良。`package.json` の `next` 依存はキャレット `^14.x.x` で許容（マイナー自動追従）。

### Step 2. パッケージマネージャ選定

#### 選択肢A: npm（推奨）
- **Pros**: Next.js の公式ドキュメントが npm 前提、Cloudflare Pages のデフォルトも npm、追加インストール不要
- **Cons**: インストールが pnpm より遅い、ディスク使用量が多い

#### 選択肢B: pnpm
- **Pros**: 高速・ディスク効率良・モノレポ拡張性あり
- **Cons**: 単一アプリのリポジトリで恩恵が薄い。Cloudflare Pages のビルドで `pnpm` 指定が必要（追加設定コスト）

#### 選択肢C: yarn (Berry / Classic)
- **Pros**: 安定
- **Cons**: 近年 npm / pnpm に比べて選ばれる頻度が減少。本プロジェクトに特有の優位性なし

**推奨**: **選択肢A（npm）**。規模が小さく、Cloudflare Pages のデフォルトに合わせる利点が大きい。`package.json` に `"packageManager": "npm@10.x.x"` を明記して揺らぎを防止。

### Step 3. App Router / src/ / import alias / Turbopack の採用可否

`create-next-app` の対話プロンプトに対する回答を事前確定:

| 項目 | 選択 | 根拠 |
|---|---|---|
| TypeScript | **Yes** | マスター設計書 §2.1 で確定 |
| ESLint | **Yes** | Issue #6 本文のタスクに明記 |
| Tailwind CSS | **Yes** | マスター設計書 §2.1 で確定 |
| `src/` ディレクトリ | **Yes** | 既存 spec (#3, #5) が `src/components/`, `src/lib/` 前提で書かれている |
| App Router | **Yes** | マスター設計書 §2.1 で確定 |
| import alias | **Yes (`@/*`)** | Next.js デフォルト。既存 spec 内のインポート例も `@/...` 前提 |
| Turbopack (dev) | **No（本 Issue では採用しない）** | Next.js 14 時点で Turbopack は依然ベータ。html2canvas / jsPDF の動作保証が webpack 前提で整っているため、**dev も webpack** で統一。#11 以降の必要に応じて再検討 |

### Step 4. Node.js バージョン固定

- Next.js 14 の動作要件は Node.js 18.17 以上。Cloudflare Pages のビルド環境も Node 18 / 20 を選択可能
- **推奨**: **`.nvmrc` に `20` を記載**（LTS かつ Cloudflare Pages でも選択可能、Next.js 14 の推奨レンジ内）
- `package.json` に `"engines": { "node": ">=20.0.0" }` を明記

### Step 5. ESLint 設定の拡張方針

#### 選択肢A: Next.js デフォルト（`eslint-config-next`）のみ（推奨）
- **Pros**: 追加設定不要。`create-next-app` が生成した状態のまま運用開始
- **Cons**: プロジェクト特有のルール（import 順、未使用変数の厳格化）は入らない

#### 選択肢B: Prettier / 追加プラグイン（`eslint-plugin-tailwindcss` 等）を追加
- **Pros**: コード品質の自動担保が厚くなる
- **Cons**: 本 Issue のスコープが膨張。#10（デザインガイドライン）以降で必要に応じて追加するのが自然

**推奨**: **選択肢A（Next.js デフォルトのみ）**。本 Issue は「雛形作成」に集中。ESLint / Prettier の厚塗りは将来 Issue（例えば #10 と併せたリファインフェーズ）で行う。

### Step 6. Cloudflare Pages 対応の「境界線」

本 Issue では **`@cloudflare/next-on-pages` や `next.config.js` の `output: 'export'` 等は一切導入しない**。ただし以下の「地ならし」は行う:

- `next.config.mjs` は `create-next-app` のデフォルトのまま維持（将来 #11 で追記）
- **Edge ランタイム指定は一切入れない**（`export const runtime = 'edge'` 等も付けない）
- 画像最適化（`next/image`）はデフォルトの挙動のまま。静的エクスポート時の `images.unoptimized: true` 等は #11 で決める
- 初期 `src/app/page.tsx` を「またたび計算機 - 準備中」レベルの最小ランディングに置換してもよいが、**`create-next-app` のデフォルトのまま残すほうがレビューの diff を小さくできるため推奨**

### Step 7. ブランチ戦略

- 既存リポジトリは `main` / `develop` / `development` の 3 ブランチ運用。#1〜#5 は `develop` への PR マージで進行（git log より確認済み）
- 本 Issue も **`feature/nextjs-scaffolding_20260424` ブランチを `develop` から切って PR 作成 → `develop` にマージ** を推奨
- **`.claude/issue-order.md` と `working/` ディレクトリは現在 `develop` で untracked（`git status` 確認済み）**。これらは本 Issue とは別タスクで整理されるべきだが、少なくとも `working/plans/` は `.gitignore` に含めるか別 Issue で追跡対象化するかの判断が必要 → §4 で詳述

---

## 3. 実装ステップ（順序付き）

### Step 1. ブランチ作成

```bash
cd /Users/YS/development/matatabi-calculator
git checkout develop
git pull origin develop
git checkout -b feature/nextjs-scaffolding_20260424
```

### Step 2. `create-next-app` 実行（非対話フラグで実行）

`create-next-app` の対話プロンプトを回避するため、全オプションをフラグで明示:

```bash
npx create-next-app@14 . \
  --ts \
  --eslint \
  --tailwind \
  --src-dir \
  --app \
  --import-alias "@/*" \
  --use-npm \
  --skip-install
```

- **`.` を実行先に指定**: 既存リポジトリディレクトリに直接生成。`create-next-app` は空でないディレクトリへの生成時に警告を出すが、`.git` / `.claude` / `docs` / `working` のみなら既存ファイルを上書きしないことを事前確認する
- **`--skip-install`**: 自動 `npm install` を抑止し、まず生成物のレビューを先行
- **対話プロンプトの影響**: `create-next-app@14` は「Would you like to customize the default import alias?」以外はフラグで抑制可能。該当プロンプトが出たら Enter 許容（`--import-alias "@/*"` で既に指定済みなので表示されない想定）

#### 想定される生成物

```
matatabi-calculator/
├── .eslintrc.json
├── .gitignore                     # create-next-app 版
├── README.md                      # create-next-app デフォルト
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── postcss.config.js
├── public/
│   ├── next.svg
│   ├── vercel.svg
│   └── ...
├── src/
│   └── app/
│       ├── favicon.ico
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
├── tailwind.config.ts
└── tsconfig.json
```

### Step 3. 生成ファイルの確認と不要ファイル除去

1. `public/next.svg` と `public/vercel.svg` は本プロジェクトで使用しないため削除（猫モチーフは #9 で別途用意）
2. `src/app/page.tsx` と `src/app/globals.css` は **デフォルトのまま残す**（#10 で全面差し替えになるため、ここで触らない）
3. `README.md` は `create-next-app` デフォルトを本プロジェクト向けに差し替え（Step 7 で詳述）

### Step 4. `.gitignore` の追加整備

`create-next-app` が生成する `.gitignore` は Next.js の基本的な除外のみカバー。以下を追記:

```gitignore
# --- create-next-app の既存内容は維持 ---

# macOS
.DS_Store

# IDE / Editor
.vscode/
.idea/
*.swp
*.swo

# Local env files
.env
.env.local
.env.*.local

# Cloudflare Pages / Wrangler（#11 で使用開始）
.wrangler/
.vercel/

# Claude Code ワーキングディレクトリ
# ※ working/plans/ は本プランの保存先でもあり、commit する運用に戻すなら別途検討
```

**判断ポイント**: 現在 `working/` は `git status` で untracked。リポジトリに commit するか無視するかは本プロジェクトチームの運用次第。**本 Issue では `.gitignore` に `working/` を追加せず、別 Issue で運用方針を決める** のが安全（本 Issue のスコープを膨張させない）。

### Step 5. `tsconfig.json` のレビューと調整

`create-next-app` のデフォルトは以下（Next.js 14）:

```jsonc
{
  "compilerOptions": {
    "target": "ES2017",  // または "ES5"
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
    // ...
  }
}
```

調整候補:

| 項目 | デフォルト | 推奨 | 根拠 |
|---|---|---|---|
| `strict` | `true` | **維持** | 計算ロジックの型安全性のため必須 |
| `target` | `"ES2017"` 等 | **維持** | Cloudflare Pages の実行環境で十分 |
| `paths` | `"@/*": ["./src/*"]` | **維持** | 既存 spec が `@/lib/...` 前提 |
| `noUncheckedIndexedAccess` | 未設定 | **追加推奨（任意）** | 配列アクセスの undefined チェックを強制。ただし開発初期の型エラーが増えるため本 Issue では見送り、#8 以降で検討 |

**本 Issue では基本的にデフォルトのまま維持**。`noUncheckedIndexedAccess` など厳格化オプションは、実装コードが増えてから議論する。

### Step 6. `package.json` のレビューと調整

`create-next-app` デフォルトの scripts は以下:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

追加・調整:

- **`type`**: `next.config.mjs` 方式なので明示不要だが、生成物の状態を確認
- **`engines`**: `"node": ">=20.0.0"` を追加
- **`packageManager`**: `"npm@10.x.x"` を明記（`corepack` 活用）
- **`typecheck` スクリプト**: `"typecheck": "tsc --noEmit"` を追加（CI / ローカルで型検証用）
- **`format` 系スクリプト**: 本 Issue では Prettier を導入しないため追加しない

### Step 7. `README.md` の初期整備

`create-next-app` デフォルトの英語 README を、本プロジェクト向けに置換:

```markdown
# またたび計算機 (Matatabi Calculator)

株式会社ねこにまたたびが展開する ROI 診断アプリ。中小企業の経営層向けに、
ベンダー依存コスト削減と AI 駆動開発転換のメリットを数値化・可視化します。

## 技術スタック
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Cloudflare Pages（#11 で設定予定）

## セットアップ

### 前提
- Node.js 20+ (`.nvmrc` 参照)
- npm 10+

### インストール
\`\`\`bash
nvm use
npm install
\`\`\`

### 開発サーバ起動
\`\`\`bash
npm run dev
\`\`\`
http://localhost:3000 でアクセス。

### ビルド
\`\`\`bash
npm run build
npm start
\`\`\`

### 型検証・Lint
\`\`\`bash
npm run typecheck
npm run lint
\`\`\`

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
```

### Step 8. `.nvmrc` 作成

```
20
```

（LTS メジャー番号のみ。パッチまで固定すると追従コストが増える）

### Step 9. 依存インストールと動作確認

```bash
npm install
```

Lockfile (`package-lock.json`) が生成されることを確認。その後:

```bash
npm run dev
```

- `http://localhost:3000` が開き、`create-next-app` のデフォルトトップページ（Next.js ロゴ + "Get started by editing src/app/page.tsx"）が表示されることを確認
- ターミナルでコンパイルエラー・警告がないことを確認

次に:

```bash
npm run build
```

- `.next/` 配下にビルド成果物が生成されることを確認
- TypeScript / ESLint のエラーがないことを確認

最後に:

```bash
npm run lint
npm run typecheck
```

- どちらもエラーなしで終了することを確認

### Step 10. 初回コミット（論理的分割を推奨）

レビュー効率のためコミットを 2〜3 個に分ける:

```bash
# コミット1: create-next-app の生成物そのまま（diff を「自動生成」と明示）
git add .eslintrc.json .gitignore next-env.d.ts next.config.mjs \
        package.json package-lock.json postcss.config.js \
        tailwind.config.ts tsconfig.json src/ public/
git commit -m "chore: create-next-app で Next.js 14 雛形を生成

create-next-app@14 を以下オプションで実行した生成物:
  --ts --eslint --tailwind --src-dir --app --import-alias @/*"

# コミット2: 本プロジェクト向けの調整
git add .gitignore README.md .nvmrc package.json
git commit -m "chore: 本プロジェクト向けに雛形を調整

- .gitignore に macOS/IDE/env/wrangler 除外を追加
- README.md を本プロジェクトの概要・spec リンクに差し替え
- .nvmrc 追加 (Node 20)
- package.json に engines / packageManager / typecheck 追加"

# コミット3: 不要ファイルの除去
git add -u public/
git commit -m "chore: create-next-app デフォルト public/ アセットを削除

next.svg / vercel.svg は本プロジェクトでは使用しない。
猫モチーフ素材は Issue #9 で別途用意される。"
```

### Step 11. プッシュと PR 作成

```bash
git push -u origin feature/nextjs-scaffolding_20260424
gh pr create --base develop --title "Next.js 14 プロジェクト雛形を作成" --body "..."
```

PR 本文には以下を記載:
- 本プランへの参照（`working/plans/issue-6_nextjs-scaffolding.md`）
- §2 の意思決定サマリー（Next.js 14 / npm / Node 20 / Turbopack 不採用 等）
- 「後続 Issue に譲った項目」のリスト（§4 の「スコープ外」一覧）
- 検証コマンドの結果（dev / build / lint / typecheck）

---

## 4. 新規生成・変更されるファイル一覧

### 新規生成（`create-next-app` による）
- `package.json` / `package-lock.json`
- `tsconfig.json`
- `next.config.mjs`
- `next-env.d.ts`
- `.eslintrc.json`
- `tailwind.config.ts`
- `postcss.config.js`
- `.gitignore`
- `README.md`（後述のとおり内容差し替え）
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/favicon.ico`
- `public/*.svg`（一部は削除）

### 本 Issue で手動追加・調整
- `.gitignore`（`create-next-app` 版 + macOS / IDE / wrangler 追記）
- `README.md`（日本語版に全面差し替え）
- `.nvmrc`（新規作成、内容は `20`）
- `package.json`（`engines` / `packageManager` / `typecheck` scripts 追加）

### 本 Issue で **触らない** もの（後続 Issue の担当）
| ファイル / 領域 | 担当 Issue |
|---|---|
| `tailwind.config.ts` の `theme.extend.colors` | #7 |
| `src/app/layout.tsx` の `next/font` 設定 | #7 |
| `src/app/globals.css` のデザイントークン | #10 |
| `package.json` への lucide-react / jsPDF / html2canvas / Recharts 追加 | #8 |
| `next.config.mjs` の Cloudflare Pages 対応 | #11 |
| `public/` の猫モチーフ・ファビコン置き換え | #9 |
| `src/app/page.tsx` の本実装（InputForm / ResultDashboard） | 実装フェーズの別 Issue |

---

## 5. 検証手順（Issue を閉じるためのチェックリスト）

### 生成物
- [ ] `package.json` が存在し、`next`, `react`, `react-dom`, `typescript`, `tailwindcss` の依存が含まれる
- [ ] `tsconfig.json` が存在し、`strict: true` と `paths: { "@/*": ["./src/*"] }` が設定されている
- [ ] `tailwind.config.ts` が存在する
- [ ] `src/app/layout.tsx` / `src/app/page.tsx` / `src/app/globals.css` が存在する
- [ ] `src/` ディレクトリ採用がされている（App Router ルートが `src/app/` 配下）

### 追加整備
- [ ] `.gitignore` に macOS / IDE / `.env*` / `.wrangler/` の除外が追加されている
- [ ] `README.md` が本プロジェクト向けに差し替わっている
- [ ] `.nvmrc` に `20` が記載されている
- [ ] `package.json` に `"engines": { "node": ">=20.0.0" }` と `"packageManager": "npm@..."` が追加されている
- [ ] `package.json` に `"typecheck": "tsc --noEmit"` スクリプトが追加されている

### 動作確認
- [ ] `npm install` がエラーなく完了する
- [ ] `npm run dev` で `http://localhost:3000` がアクセス可能
- [ ] `npm run build` が成功する
- [ ] `npm run lint` がエラー 0 件で終了
- [ ] `npm run typecheck` がエラー 0 件で終了

### 後続 Issue への引き継ぎ
- [ ] PR 本文または Issue コメントに「本 Issue で決めたこと」と「後続に譲ったこと」が記載されている
- [ ] #7, #8, #10, #11 の担当者が、本 Issue の成果を元に即座に着手できる状態

### Git
- [ ] `feature/nextjs-scaffolding_20260424` ブランチが `develop` から作成されている
- [ ] コミットが論理的に分割されている（生成物 / 調整 / 削除の 2〜3 個）
- [ ] PR が `develop` をベースに作成されている
- [ ] PR のタイトル・本文が他 Issue（#1〜#5）のスタイルと整合

---

## 6. 考慮事項・リスク

### R1: `create-next-app` の対話プロンプト

`create-next-app` は対話プロンプトを挟むため、CI やスクリプト化した環境ではハングする。本プランでは全オプションをフラグで明示することで回避する（§3 Step 2）。**実行時は念のためコンソールを注視し、想定外のプロンプトが出たら中断する**。

### R2: Next.js 14 と 15 の差異リスク

- `create-next-app@14` を使うことで Next.js 15 を誤って取得するリスクを回避
- ただし **React のマイナーバージョン（18.x）も暗黙に決まる**。React 19 は Next.js 15 から正式対応のため、本 Issue では React 18 固定で進む
- 後日 Next.js 15 / React 19 への移行は別 Issue（マイグレーションタスク）で扱う

### R3: Tailwind v3 / v4 問題

- `create-next-app@14` が生成する Tailwind は **v3.4 系**（`tailwind.config.ts` ベース、PostCSS 設定）
- Tailwind v4（CSS ファースト、`@theme` ディレクティブ）は 2025 年リリース。#7 のデザイントークン設定では **v3 ベースの `theme.extend.colors` で実装する前提** が成立するため、仕様書との整合性が取れる
- 本 Issue の時点で Tailwind を v4 にアップグレードするか否かは **Issue #7 でのフォローアップ判断**とし、本 Issue では v3 で確定

### R4: 既存リポジトリ上での `create-next-app` 実行時の衝突

- 本リポジトリには既に `.git`, `.claude`, `docs`, `working` が存在
- `create-next-app .` 実行時、**既存ファイルと衝突する可能性はない**（`create-next-app` は `.git` / 任意のディレクトリを維持する）
- ただし `README.md` は **`create-next-app` 既定版が生成されない**（空ディレクトリを要求する場合がある）。実行前に `git status` で未コミットファイルが無い状態にして、何か予期せぬ挙動が起きてもリセットできるようにする
- **実行前の安全策**: `feature/nextjs-scaffolding_20260424` ブランチを切ってから `create-next-app` を実行することで、問題があれば `develop` への影響なくブランチごと破棄可能

### R5: Cloudflare Pages デプロイへのハンドオフ

- 本 Issue では Cloudflare Pages 関連の設定を **一切入れない**
- ただし **以下の地雷を避ける選択はしておく**:
  - `next.config.mjs` に `output: 'export'` を入れない（静的エクスポート採用時の選択肢を #11 で狭めないため、デフォルトのまま残す）
  - Edge ランタイム指定を入れない
  - Server Components の非同期処理・cookies 参照等を page.tsx に入れない（デフォルトのまま）
- **#11 のブロッカー解消の意味**: 本 Issue 完了時点で、少なくとも `npm run build` が成功し `.next/` が生成される状態になっていれば、#11 は `@cloudflare/next-on-pages` 採用 or 静的出力かの判断に専念できる

### R6: パッケージマネージャの揺らぎ

- チームメンバーが yarn / pnpm で `install` すると別 lockfile が生成されて揺れる
- 防止策: **`packageManager` フィールドを `package.json` に明記し Corepack で enforce**
- さらに `.gitignore` で `yarn.lock`, `pnpm-lock.yaml` を除外するかは議論あり（CI で検知するほうがクリーン）。本 Issue では揺らぎ防止の最小限として `packageManager` 指定のみ行う

### R7: 本 Issue では触らないものの明示

以下は本 Issue では **一切触らない**（PR レビュー時に reviewer が「なぜ触らなかった」と指摘しないよう、PR 本文に明記）:

- 色・フォント・デザイントークン（#7 / #10 担当）
- 追加ライブラリ（lucide-react, jsPDF, html2canvas, Recharts）の導入（#8 担当）
- 猫モチーフ・ファビコン・OGP 画像（#9 担当）
- Cloudflare Pages 連携（#11 担当）
- プライバシーポリシー文面・アクセス解析タグ（#13 / #14 担当）
- `src/lib/calculation.ts` 等の実装コード（実装フェーズ担当）
- `.claude/issue-order.md` の更新、`working/` の Git 管理方針（別タスク）

### R8: Node バージョン固定の粒度

- `.nvmrc` を `20.11.1` のようにパッチまで固定すると、セキュリティパッチの追従忘れが起きやすい
- 逆に `20` のみだと、マイナー間での微妙な挙動差が起きうる
- **推奨: `20` のみ**。Next.js 14 のマイナーバージョン幅が十分に広いため、パッチ追従の柔軟性を優先

### R9: ESLint デフォルト設定の後方互換性

- `create-next-app@14` 時点のデフォルトは `.eslintrc.json` (Legacy Config) 形式
- 将来的に Flat Config (`eslint.config.js`) への移行が必要になる可能性あり
- **本 Issue ではデフォルトのまま**。移行は別 Issue で扱う

### R10: Cloudflare Pages の Node ランタイム / Edge ランタイム選択を #11 に委ねる意味

- 仮に #6 で何らかの方針を決めると、#11 の議論時に「#6 で決まったからそれを前提に」と議論の幅が狭まる
- `@cloudflare/next-on-pages` を前提にすると Server Actions / Edge APIs への依存設計になり、静的エクスポートへの撤退が困難になる
- **本 Issue では `next.config.mjs` を `create-next-app` デフォルトのまま残す** ことで、#11 が自由に決定できる状態を保つ

---

## 7. 関連ファイル

### 既存の参照元
- `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` — §2.1 技術要件（Next.js 14+ / TypeScript / Tailwind）
- `/Users/YS/development/matatabi-calculator/.claude/issue-order.md` — フェーズ1の位置付け、#6 が #7 / #8 / #11 のブロッカー
- `/Users/YS/development/matatabi-calculator/docs/spec/calculation-logic.md` — Issue #6 後の `src/lib/constants.ts` / `src/lib/calculation.ts` の実装根拠
- `/Users/YS/development/matatabi-calculator/docs/spec/input-form.md` — 後続 UI 実装の根拠
- `/Users/YS/development/matatabi-calculator/docs/spec/result-dashboard.md` — `src/components/`, `src/lib/` 前提のコンポーネント設計
- `/Users/YS/development/matatabi-calculator/docs/spec/warning-copy.md` — `buildCriticalOpportunityLossMessage` 等の関数契約
- `/Users/YS/development/matatabi-calculator/docs/spec/pdf-report.md` — §1.3 に「Issue #6 / Issue #8 以降の実装 Issue が本仕様を入力として実装する」と本 Issue の位置付けが明記

### 本 Issue で新規生成・調整されるファイル
- `/Users/YS/development/matatabi-calculator/package.json` — 新規生成 + `engines` / `packageManager` / `typecheck` 追記
- `/Users/YS/development/matatabi-calculator/package-lock.json` — 新規生成
- `/Users/YS/development/matatabi-calculator/tsconfig.json` — 新規生成（基本デフォルト維持）
- `/Users/YS/development/matatabi-calculator/next.config.mjs` — 新規生成（デフォルト維持）
- `/Users/YS/development/matatabi-calculator/tailwind.config.ts` — 新規生成（#7 で拡張）
- `/Users/YS/development/matatabi-calculator/.eslintrc.json` — 新規生成
- `/Users/YS/development/matatabi-calculator/.gitignore` — 新規生成 + 追記
- `/Users/YS/development/matatabi-calculator/README.md` — 新規生成 → 日本語版に差し替え
- `/Users/YS/development/matatabi-calculator/.nvmrc` — 新規作成
- `/Users/YS/development/matatabi-calculator/src/app/layout.tsx` — 新規生成（#7 / #10 で拡張）
- `/Users/YS/development/matatabi-calculator/src/app/page.tsx` — 新規生成（本実装で全面置換）
- `/Users/YS/development/matatabi-calculator/src/app/globals.css` — 新規生成（#10 で拡張）
