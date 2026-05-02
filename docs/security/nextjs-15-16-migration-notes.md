# Next.js 15 / 16 移行調査ノート（Issue #53 段階 1 アウトプット）

> ステータス: 調査完了（2026-05-02、`develop` 上の `next@14.2.35` を起点に実施）
> 関連 Issue: #53（本書の起票元）／ #50（jspdf 系 advisory 判断、`docs/security/jspdf-vulnerabilities.md §6.4` で Next.js 14→16 の別 Issue 化方針を記述）／ #11（Cloudflare Pages 静的エクスポート設定）／ #43（PDF レポート出力、`html2canvas` + `jspdf` 主体方針）
> 関連プラン: `working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md`

## 1. 本書の目的

本書は Issue #53「Next.js 14 → 16 メジャー更新と関連 high 脆弱性の解消」の **段階 1（影響範囲調査）** のアウトプットである。後続 PR（段階 2A: v15 移行 / 段階 2B: v16 移行 / 段階 3: 文書最終化）のレビュー時に「**何を確認したか／何を変えないと決めたか**」のエビデンスとして参照する。

特に `docs/security/jspdf-vulnerabilities.md §6.4.1` には「`next@14.2.35` で `next/font/local` / `@cloudflare/next-on-pages` 連携を前提に運用」との記述があるが、**本リポジトリの実態とは一致しない**（後述 §3）。本書はその差分を明文化し、段階 2A 以降の判断根拠を残す。

## 2. 本リポジトリの現状（2026-05-02 時点）

### 2.1 主要バージョン

`package.json`（2026-05-02 時点）より:

| パッケージ | バージョン | 役割 |
|---|---|---|
| `next` | `14.2.35` | フレームワーク本体 |
| `react` / `react-dom` | `^18` / `^18` | UI ランタイム |
| `@types/react` / `@types/react-dom` | `^18` / `^18` | 型 |
| `eslint` | `^8` | リンター |
| `eslint-config-next` | `14.2.35` | Next 用 lint ルール |
| `postcss` | `^8` | スタイル処理（推移依存で `next` も依存） |
| `tailwindcss` | `^3.4.1` | スタイル |
| `recharts` | `^2.15.4` | グラフ描画（クライアントのみ） |
| `lucide-react` | `^0.460.0` | アイコン |
| `html2canvas` | `^1.4.1` | DOM → PNG ラスタライズ |
| `jspdf` | `^2.5.2` | PDF 生成 |

### 2.2 配信モード

`next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};
```

- **完全静的エクスポート運用**（`output: "export"`）。`out/` ディレクトリを Cloudflare Pages へ静的アップロードして配信する（Issue #11 / `working/plans/issue-11-cloudflare-pages-setup_260501114546.md`）。
- 画像は `unoptimized: true` 固定。`next/image` の最適化機能は不使用。

### 2.3 採用していない Next.js 機能（コード grep で確認）

`grep -rn "<keyword>" src` を 2026-05-02 に実施した結果:

| キーワード | 結果 | 意味 |
|---|---|---|
| `next/font/local` | **0 件** | ローカルフォント API 不使用（`next/font/google` の `Inter` / `Noto_Sans_JP` のみ。`src/app/layout.tsx`） |
| `@next/font` | **0 件** | 旧パッケージ不使用（v15 で削除されるが、本リポジトリでは元から `next/font/google` 使用） |
| `cloudflare/next-on-pages` | **0 件**（`package.json` / `*.mjs` / `*.ts` / `*.tsx` 全走査） | アダプタ未導入（静的エクスポート + Cloudflare Pages 直接アップロード） |
| `cookies()` / `headers()` | **0 件** | 動的サーバー API 不使用 |
| `params:` / `searchParams:` | **0 件** | 動的ルート不使用（すべて静的セグメント） |
| `"use server"` / `generateStaticParams` | **0 件** | Server Actions / 動的静的生成不使用 |
| サーバー側 `fetch()` | **0 件**（`src/` 走査） | 外部 API SSR フェッチ不使用 |

### 2.4 採用している Next.js 機能と使用箇所

| API | 使用ファイル | 備考 |
|---|---|---|
| `next/font/google` | `src/app/layout.tsx`（`Inter`, `Noto_Sans_JP`） | v15 で `next/font` は `next` 本体に統合済み（import パスは無変更） |
| `next/image` | `src/components/landing/Hero.tsx`, `Header.tsx`, `ClosingCta.tsx`, `src/app/error.tsx`, `loading.tsx`, `not-found.tsx` | `unoptimized: true` 設定下で使用 |
| `next/link` | `Footer.tsx`, `Header.tsx`, `Hero.tsx`, `ClosingCta.tsx`, `src/app/error.tsx`, `not-found.tsx`, `privacy/page.tsx`, `terms/page.tsx`（計 8 ファイル） | v13 以降の API。Breaking なし想定 |
| `next/script` | `src/app/layout.tsx`（Cloudflare Insights 用 1 件） | API 安定 |
| `next/dynamic` | `src/app/calculate/CalculatePageClient.tsx`（`{ ssr: false }`） | **v15 で Server Component 内 `ssr: false` 禁止**。本ファイルは `"use client"` 済みなので問題なし想定（§4.5 参照） |
| `MetadataRoute` 型 | `src/app/robots.ts`, `sitemap.ts`, `manifest.ts` | App Router 標準。型のみ確認 |
| `Metadata` / `Viewport` API | `src/app/layout.tsx`, `page.tsx`, `not-found.tsx`, `calculate/page.tsx`, `privacy/page.tsx`, `terms/page.tsx` | `viewport` は `metadata` から既に分離済み |

### 2.5 ESLint 設定

`.eslintrc.json`:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
    ]
  }
}
```

`extends` ベースの旧形式（`.eslintrc.*`）。Flat Config（`eslint.config.*`）には未移行。

## 3. Issue / 既存文書の前提と本リポジトリ実態の差分

`docs/security/jspdf-vulnerabilities.md §6.4.1`（Issue #50 起票時）に以下の記述がある:

> 本リポジトリは `next@14.2.35` で App Router / `next/font/local` / `@cloudflare/next-on-pages` 連携を前提に運用される。

本書の §2.3 で確認したとおり、**本リポジトリは `next/font/local` を使用しておらず、`@cloudflare/next-on-pages` も導入していない**。Issue #53 の段階 2A / 2B では、これらの「該当なし確認」を維持確認するに留める（追加の追従検証は不要）。

段階 3（文書更新 PR）で `docs/security/jspdf-vulnerabilities.md §6.4.1` に「※ 本リポジトリでは `next/font/local` 不使用、`@cloudflare/next-on-pages` 未導入。当時の Issue #50 起票文の記述に準じて履歴として記録」の注記を追加する（プラン §15 参照）。

## 4. Next.js 15 への移行で本リポジトリに影響しうる Breaking changes

> 一次ソース: Next.js 公式 Upgrading ガイド（`https://nextjs.org/docs/app/building-your-application/upgrading/version-15`、参照 2026-05-02）。本書は同ガイドを実装で確認した範囲で要約する。各 Breaking change の網羅性は保証せず、段階 2A の codemod 実行（`npx @next/codemod@latest upgrade latest`）で機械的に追従する。

### 4.1 React 19 の必須化

- **影響: あり（同時更新が必要）**
- v15 は React 19 を peer dependency とする。`package.json` の `react` / `react-dom` / `@types/react` / `@types/react-dom` を `^19` へ同時更新する（プラン §3）。
- 本リポジトリのクライアントランタイムに対する影響範囲:
  - `recharts@^2.15.4`: React 19 対応は v2.13 系以降で順次追加されている。段階 2A の `npm install` 後にビルド・実機描画でグラフが正常表示されることを確認。必要に応じて同 PR でマイナーバンプを許容する（プラン §6.4 / 設計上の考慮点「React 19 同時更新の必然性」）。
  - `lucide-react@^0.460.0`: SVG コンポーネント主体で、`forwardRef` / `useRef` 程度の依存。React 19 でも互換維持の見込み。
  - `html2canvas@^1.4.1`: バニラ JS。React に依存しない。
  - `jspdf@^2.5.2`: バニラ JS。React に依存しない。

### 4.2 非同期 Request APIs（`cookies()` / `headers()` / `params` / `searchParams` の Promise 化）

- **影響: なし**（§2.3 でいずれも 0 件確認済み）
- 本リポジトリの `page.tsx` はいずれも引数を取らず、動的ルートを採用していない。`cookies()` / `headers()` も呼ばない。
- 公式 codemod が誤検知して書き換えを試みないか、段階 2A の codemod 実行後に `git diff` で確認する。

### 4.3 `fetch()` のデフォルトキャッシュ無効化

- **影響: なし**（§2.3 でサーバー側 `fetch()` は 0 件）
- クライアント側の `fetch` は本書の対象外（v15 の挙動変更は Server Component / Route Handler の `fetch` に対する話）。

### 4.4 `next/font` の本体統合（`@next/font` パッケージ削除）

- **影響: なし**（§2.3 で `@next/font` は 0 件）
- 本リポジトリは元から `next/font/google` を使用しており、import パスは v15 でも変更不要。

### 4.5 `next/dynamic({ ssr: false })` の制約強化

- **影響: 要確認だが現状の実装では問題なし想定**
- v15 では **Server Component 内** で `dynamic({ ssr: false })` を呼び出すとビルドエラー化される。
- 本リポジトリの該当箇所 `src/app/calculate/CalculatePageClient.tsx` は **冒頭に `"use client"` を持つ Client Component** であり、制約には抵触しない。
- 段階 2A の `npm run build` でエラーが出ないこと、および `out/calculate/index.html` のレンダリング結果が変わらないこと（`ResultDashboard` は引き続きクライアント描画）を確認する。

### 4.6 `eslint-config-next` のメジャー更新と ESLint 9

- **影響: 中（最小差分での追従を想定）**
- v15 系の `eslint-config-next` は ESLint 8 / 9 の双方をサポート（公式 docs より）。本リポジトリは `eslint@^8` のため、まず v8 互換のまま `eslint-config-next` のみ v15 系に上げる。
- **Flat Config（`eslint.config.*`）への移行は本 Issue のスコープ外**。`.eslintrc.json` 形式を維持する（プラン §8）。
- 既存ルール（`next/core-web-vitals` / `next/typescript` extends + `@typescript-eslint/no-unused-vars` カスタム）が v15 系の `eslint-config-next` でも互換であることを `npm run lint` で検証。

### 4.7 Client Router Cache のデフォルト変更

- **影響: なし**（本リポジトリは静的エクスポートで Server Component 階層が極小、かつ全ページが静的生成。Client Router Cache の挙動差は実体験に影響しないと判断）
- 段階 2A の preview デプロイで遷移時の表示崩れがないことのみ確認。

### 4.8 GET Route Handlers の非キャッシュ化

- **影響: なし**（Route Handler 不使用。`src/app/**/route.ts` は存在しない）

### 4.9 静的エクスポート（`output: "export"`）の継続性

- **影響: なし（継続サポート）**
- v15 公式 Upgrading ガイドで `output: "export"` は引き続きサポート対象として明記。`out/` 生成は段階 2A の `npm run build` で実証する（プラン §9）。

## 5. Next.js 16 への移行で本リポジトリに影響しうる Breaking changes

> 一次ソース: Next.js 公式 Upgrading ガイド（v16）。`next@16.2.4` 以降で `docs/security/jspdf-vulnerabilities.md §6.4` の high advisory 5 件（`next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss`）が解消されることが Issue #53 受け入れ条件 1 で確定済み。

### 5.1 deprecated 設定キーの削除

- **影響: 要確認（現状の `next.config.mjs` は最小設定なので問題なし想定）**
- `next.config.mjs` は `output: "export"` と `images.unoptimized: true` のみ。両方とも v16 で継続サポート（公式 Upgrading ガイド）。
- 段階 2B の codemod 実行時に diff が出れば追従する。

### 5.2 `experimental.turbo` の `turbopack` 安定化

- **影響: なし**
- 本リポジトリは `next.config.mjs` で Turbopack 関連設定を行っていない。`npm run dev` の挙動が変わる可能性のみあるが、開発体験の差にとどまる。

### 5.3 `next/image` のローダー / 仕様変更

- **影響: 軽微（`unoptimized: true` 固定運用）**
- 静的エクスポートでは `images.unoptimized: true` が必須で、v16 でも同方針を維持。
- 段階 2B の preview デプロイで Hero / Header / ClosingCta の画像が従来どおり表示されることを目視確認。

### 5.4 middleware Edge Runtime API 仕様

- **影響: なし**（middleware 不使用。`src/middleware.ts` は存在しない）

### 5.5 静的エクスポート（`output: "export"`）の継続性

- **影響: なし（v16 でも継続サポート）**
- 受け入れ条件 5「`@cloudflare/next-on-pages` のビルド + 静的エクスポート (`out/`) が成功する」は、本リポジトリでは `@cloudflare/next-on-pages` 不採用のため「`output: "export"` による `out/` 生成成功」と読み替える（プラン「設計上の考慮点」§`output: "export"` の継続性）。

### 5.6 `eslint-config-next` v16 系の挙動

- **影響: 中（v15 → v16 の差分は段階 2A より小さい想定）**
- 段階 2B では `eslint-config-next: "^15.0.0"` → `"^16.0.0"` のメジャー更新を実施。`.eslintrc.json` の extends 互換性を確認する（プラン §10）。

## 6. React 19 同時更新における依存ライブラリ互換性メモ

段階 2A の `npm install` 時点で確認すべき項目:

| ライブラリ | 想定対応バージョン | 確認方法 |
|---|---|---|
| `recharts` | `^2.15.x`（v2.13+ で React 19 対応開始、v2.15 系で安定。必要に応じて同 PR でパッチ／マイナー追従） | `npm install` 後の peer dependency 警告 + `out/calculate/index.html` でグラフが描画されること |
| `lucide-react` | `^0.460.0` 以降（React 19 互換、SVG ラッパーで実害なし） | アイコン描画の目視 |
| `html2canvas` | `^1.4.1`（React 非依存） | PDF 出力の実機回帰 |
| `jspdf` | `^2.5.2`（React 非依存） | PDF 出力の実機回帰 |
| `tailwindcss` / `postcss` | `next` の推移依存解決に追従 | `npm run build` のグリーン |

`npm install` で peer dependency 警告が出たライブラリは、段階 2A の PR description にログを貼付して可否を判断する。**警告が継続更新で解消可能なものはマイナーバンプを許容**、破壊的差分が大きい場合は別 Issue 化を検討する。

## 7. 段階 2A / 2B / 3 への申し送り（チェックリスト）

### 段階 2A（v15 移行 PR）

- [ ] `package.json` の `next` / `react` / `react-dom` / `@types/react` / `@types/react-dom` / `eslint-config-next` を v15 / v19 系へ更新（プラン §3）
- [ ] `npm install` で `package-lock.json` を再解決（プラン §4）
- [ ] `npx @next/codemod@latest upgrade latest` を実行し、diff を `git diff` で確認（プラン §5）
  - 本書 §4.2 / §4.4 のとおり、本リポジトリでは大きな書き換えは発生しない見込み
- [ ] `src/app/calculate/CalculatePageClient.tsx` の `dynamic({ ssr: false })` がビルドエラーを起こさないこと（本書 §4.5）
- [ ] `next.config.mjs` / `.eslintrc.json` の互換性確認（プラン §7 / §8）
- [ ] `npm run lint` / `npm run typecheck` / `npm run build` がグリーン（プラン §9）
- [ ] Cloudflare Pages preview デプロイで全ページ 200、フォント描画継続、PDF 出力動作

### 段階 2B（v16 移行 PR、段階 2A マージ後）

- [ ] `next` を `^16.2.4` 以降に更新（プラン §10）
- [ ] `eslint-config-next` を `^16.0.0` に更新（プラン §10）
- [ ] `npx @next/codemod@latest upgrade latest` を再実行（プラン §12）
- [ ] `npm audit --json` で `next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss` の advisory が **0 件**（受け入れ条件 1）
- [ ] PDF 生成の実機回帰: `docs/spec/pdf-report.md §3.1 / §11.2 / §11.3` の実装契約遵守（プラン §14）

### 段階 3（文書更新）

- [ ] `docs/security/jspdf-vulnerabilities.md §6.4` を「移行完了」ステータスに更新、Issue #53 番号を §6.4.2 に追記（プラン §15、受け入れ条件 6）
- [ ] §6.4.1 に本書 §3 の差分注記を追加（`next/font/local` 不使用 / `@cloudflare/next-on-pages` 未導入）
- [ ] `README.md` の Next.js バージョン表記を更新（プラン §16）
- [ ] `.claude/issue-order.md` フェーズ 1 表記に「後に Issue #53 で `next@16` へ更新」注記を追加（プラン §17）
- [ ] `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` の Framework 表記を更新（プラン §18）
- [ ] `.github/workflows/security-audit.yml` は据え置き（プラン §19）

## 8. 関連ファイル

- `working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md` — 本書を生成する元プラン
- `docs/security/jspdf-vulnerabilities.md` — §6.4 / §6.4.1 / §6.4.2（Issue #53 の動機）
- `docs/spec/pdf-report.md` — PDF 生成の実装契約（§3.1 / §11.2 / §11.3、段階 2B 検証で参照）
- `next.config.mjs` — `output: "export"` / `images.unoptimized: true`
- `package.json` — 移行対象パッケージ
- `.eslintrc.json` — `eslint-config-next` extends
- `src/app/layout.tsx` — `next/font/google` 使用箇所
- `src/app/calculate/CalculatePageClient.tsx` — `next/dynamic({ ssr: false })` 使用箇所
- `src/app/{robots,sitemap,manifest}.ts` — `MetadataRoute` 使用箇所
