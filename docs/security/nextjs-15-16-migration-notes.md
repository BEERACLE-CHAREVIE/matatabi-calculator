# Next.js 15 / 16 移行ノート（Issue #53 / Issue #64 完了レポート）

> ステータス: 移行完了（2026-05-02、PR #62 / PR #63 / PR #65 にて全段階完了）
> 関連 Issue: #53（本書の起票元）／ #64（段階 2B 用 Issue、CLOSED 2026-05-02T06:07:53Z）／ #50（jspdf 系 advisory 判断、`docs/security/jspdf-vulnerabilities.md §6.4` で Next.js 14→16 の別 Issue 化方針を記述）／ #11（Cloudflare Pages 静的エクスポート設定）／ #43（PDF レポート出力、`html2canvas` + `jspdf` 主体方針）
> 関連プラン: `working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md` ／ `working/plans/issue-64-nextjs-15-to-16-major-upgrade_260502131649.md`

**完了 PR**: PR #62（段階 1, merged 2026-05-02 03:58）／ PR #63（段階 2A, merged 2026-05-02 04:14）／ PR #65（段階 2B + 段階 3, merged 2026-05-02 06:07）

## 1. 本書の目的

本書は当初 Issue #53 段階 1 の影響範囲調査として作成され、PR #62 / #63 / #65 で全段階完了後に **移行完了レポート** として再構成された。移行時に**事前に予測した影響**と、**実際に発生した差分**（§7 新設）の対比を提供する。

特に `docs/security/jspdf-vulnerabilities.md §6.4.1` には「`next@14.2.35` で `next/font/local` / `@cloudflare/next-on-pages` 連携を前提に運用」との記述があるが、**本リポジトリの実態とは一致しない**（後述 §3）。本書はその差分を明文化し、段階 2A 以降の判断根拠を残す。実際の §3 差分は段階 2B（PR #65）で `docs/security/jspdf-vulnerabilities.md §6.4.1` に履歴注記として反映済み。

## 2. 本リポジトリの現状（2026-05-02 時点）

### 2.1 主要バージョン

`package.json` 移行前後（2026-05-02 時点）。**起点列＝段階 1 調査時、最終列＝PR #65 マージ後の実測**:

| パッケージ | 起点バージョン（段階 1 時） | 最終バージョン（PR #65 後） | 役割 |
|---|---|---|---|
| `next` | `14.2.35` | `^16.2.4` | フレームワーク本体 |
| `react` / `react-dom` | `^18` / `^18` | `^19.0.0` / `^19.0.0` | UI ランタイム |
| `@types/react` / `@types/react-dom` | `^18` / `^18` | `^19.0.0` / `^19.0.0` | 型 |
| `eslint` | `^8` | `^9` | リンター |
| `eslint-config-next` | `14.2.35` | `^16.0.0` | Next 用 lint ルール |
| `postcss` | `^8` | `^8.5.10` | スタイル処理（推移依存で `next` も依存） |
| `tailwindcss` | `^3.4.1` | `^3.4.1` | スタイル |
| `recharts` | `^2.15.4` | `^2.15.4` | グラフ描画（クライアントのみ） |
| `lucide-react` | `^0.460.0` | `^0.460.0` | アイコン |
| `html2canvas` | `^1.4.1` | `^1.4.1` | DOM → PNG ラスタライズ |
| `jspdf` | `^2.5.2` | `^2.5.2` | PDF 生成 |

**実測差分**: `eslint` は段階 1 ノート §4.6 の「8 据え置き」方針から `^9` 必須昇格に変更（§7.1 参照）。`postcss` は `^8` から `^8.5.10` への明示固定が必要（§7.3 参照）。`overrides.next.postcss = "^8.5.10"` を `package.json` に追加（§7.3 参照）。

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

**実測差分（PR #65 後）**: `next.config.mjs` の内容は段階 1 ノートと同一（`output: "export"` / `images.unoptimized: true`）で、Next.js 16 でも変更なし。ただし生成物 `out/` の構造はフラット化された（`out/calculate.html` + `out/calculate/__next.*.txt` 形式へ。詳細 §7.5 / 検証は `out/calculate.html` と `out/calculate/__next._tree.txt` の存在で可能）。

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

**実測差分（PR #65 後）**: 表に挙げた 7 キーワードはいずれも段階 2A / 2B でも 0 件のまま維持された。`@next/codemod` 実行による誤書換は発生せず（§4.2 で予告した検証は OK）。本表は移行後も継続して「該当なし」。

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

`.eslintrc.json`（移行前、PR #65 で削除）:

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

**実測差分（PR #65 後）**: `.eslintrc.json` は **削除済み** で `eslint.config.mjs`（Flat Config）に置換された。`next-lint-to-eslint-cli` codemod（`--force` 付き実行）が自動変換し、レガシー設定不可となった（詳細 §7.2）。既存カスタムルール `@typescript-eslint/no-unused-vars`（`argsIgnorePattern` / `varsIgnorePattern`）は `eslint.config.mjs` 内に継承済み。さらに新 ESLint ルール（`react-hooks/set-state-in-effect` / `react-hooks/refs`）が 4 箇所で発火し、`eslint-disable-next-line` 抑制対応となった（§7.4）。

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

**実測差分**: 段階 2A の PR #63 では本想定どおり ESLint 8 据え置きで完了したが、段階 2B の PR #65 で `eslint-config-next@^16` の peer 要件により ESLint 9 + Flat Config 必須移行となった。詳細 §7.1 / §7.2。

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

**実測差分（PR #65）**: `eslint-config-next` を `^15.0.0` → `^16.0.0` に更新した結果、本書 §4.6 の想定（v8 互換維持）が崩れ、`eslint@^9` への昇格と Flat Config への自動移行が同時発生した。詳細 §7.1 / §7.2。

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

**実測差分（PR #63 マージ後）**: `recharts@^2.15.4` / `lucide-react@^0.460.0` / `html2canvas@^1.4.1` / `jspdf@^2.5.2` のいずれもバージョン更新を要さず、ビルドおよび実機描画で問題は発生しなかった。`tailwindcss` / `postcss` は §7.3 のとおり `postcss` のみ `^8.5.10` に明示固定が必要となった。

## 7. 移行後の想定外差分

本節は段階 1 ノート（PR #62）作成時点では予測されておらず、段階 2A / 2B（PR #63 / #65）の実装中に判明した差分を時系列＋分類別に記録する。後続の Next.js メジャー更新（v17 想定）時の参照用。

### 7.1 ESLint 8 → 9 への必要昇格

PR #65 で `eslint-config-next@^16.0.0` を導入した結果、当該パッケージが `eslint@>=9.0.0` を peer 必須としたため、段階 1 ノート §4.6 の「ESLint 8 据え置き、Flat Config 別 Issue 化」方針は維持不可能となり、`eslint@^8` → `^9` のメジャー昇格を同 PR で実施した。`package.json` L40 で `eslint: "^9"` 確定。

### 7.2 `.eslintrc.json` → `eslint.config.mjs`（Flat Config）への移行

`npx @next/codemod@canary next-lint-to-eslint-cli .` を `--force` 付きで実行し、`.eslintrc.json` 削除 / `eslint.config.mjs` 新規生成。`next@16` ではレガシー `.eslintrc.*` が動作不可。codemod 生成の未使用 import（`path`, `fileURLToPath`）は手動除去。既存カスタムルールは Flat Config 内に継承済み（`/Users/YS/development/matatabi-calculator/eslint.config.mjs` 参照）。

### 7.3 `postcss` `overrides` の必要性

段階 1 ノート §2.1 では `next@16` への更新で `postcss` advisory が自動解消すると想定していたが、`next@16.2.4` がネスト依存に `postcss@8.4.31`（vulnerable）を pin していたため、`package.json` 末尾に `overrides.next.postcss = "^8.5.10"`（L49〜L53）を追加して全ネスト依存を強制更新する必要があった。直接依存の `postcss` も `^8` → `^8.5.10` に同時バンプ（L44）。`docs/security/jspdf-vulnerabilities.md §6.3` の overrides 不採用方針は dompurify / jspdf 互換性破壊リスクが理由で、postcss の semver マイナー差分（8.4 → 8.5）には適用されないと判断（PR #65 description の「プランからの逸脱」参照）。

### 7.4 新 ESLint ルール（`react-hooks/set-state-in-effect` / `react-hooks/refs`）の発火

Next.js 16 同梱の `eslint-config-next@^16` で新規追加された 2 ルールが既存コードで 4 箇所発火。発火箇所は `src/components/calculate/ResultDashboard.tsx`（`useReducedMotion` / `useIsMobile` の `setX(mql.matches)` 同期、`PdfDashboard` への `generatedAt={generatedAtRef.current ?? new Date()}` 渡し）と `src/hooks/useCountUp.ts`（`setReducedMotion(mql.matches)`）。本 PR では `eslint-disable-next-line` で抑制し理由コメントを併記。`useSyncExternalStore` への正攻法リファクタは別 Issue 候補として切り出し（本 Issue #68 とは別 Issue）。

### 7.5 Next.js 16 静的エクスポート構造の変更

v15 までの `out/calculate/index.html` 形式から、v16 では `out/calculate.html`（フラット）+ `out/calculate/__next._full.txt` / `__next._head.txt` / `__next._index.txt` / `__next._tree.txt` / `__next.calculate.__PAGE__.txt` / `__next.calculate.txt`（Turbopack メタデータ）の併存形式に変更（実測値、`/Users/YS/development/matatabi-calculator/out/calculate/` 直下）。`/calculate` URL の到達性は Cloudflare Pages の auto-routing で維持され、Issue #11 の静的アップロード運用と非互換にはならない。本書 §4.5 / §5.5 の検証想定（「`out/calculate/index.html` のレンダリング結果が変わらない」）は文言更新が必要だが、機能要件としては満たされた。

## 8. 段階別最終結果（PR 番号 / マージ日）

段階 1 時点ではチェックリスト形式だったが、全段階完了後の本改訂では実施結果として記録する。

### 8.1 段階 1（PR #62, merged 2026-05-02 03:58）— 移行調査ノート策定

- [x] `docs/security/nextjs-15-16-migration-notes.md` 初版作成（本書）

### 8.2 段階 2A（PR #63, merged 2026-05-02 04:14）— next@15.5.15 / React 19 採用

- [x] `package.json` の `next` / `react` / `react-dom` / `@types/react` / `@types/react-dom` / `eslint-config-next` を v15 / v19 系へ更新
- [x] `npm install` で `package-lock.json` を再解決
- [x] `npx @next/codemod@latest upgrade latest` を実行し、diff を `git diff` で確認
  - 本書 §4.2 / §4.4 のとおり、本リポジトリでは大きな書き換えは発生しなかった
- [x] `src/app/calculate/CalculatePageClient.tsx` の `dynamic({ ssr: false })` がビルドエラーを起こさないことを確認（本書 §4.5）
- [x] `next.config.mjs` / `.eslintrc.json` の互換性確認
- [x] `npm run lint` / `npm run typecheck` / `npm run build` グリーン
- [x] Cloudflare Pages preview デプロイで全ページ 200、フォント描画継続、PDF 出力動作

### 8.3 段階 2B（PR #65, merged 2026-05-02 06:07）— next@16.2.4 / eslint-config-next@^16 / eslint@^9 / Flat Config / postcss overrides

- [x] `next` を `^16.2.4` 以降に更新
- [x] `eslint-config-next` を `^16.0.0` に更新（→ ESLint 9 必須昇格、§7.1 参照）
- [x] `.eslintrc.json` → `eslint.config.mjs`（Flat Config）への自動移行（§7.2 参照）
- [x] `package.json` `overrides.next.postcss = "^8.5.10"` 追加（§7.3 参照）
- [x] 新 ESLint ルール（`react-hooks/set-state-in-effect` / `react-hooks/refs`）の 4 箇所発火を `eslint-disable-next-line` で抑制（§7.4 参照）
- [x] `npx @next/codemod@latest upgrade latest` を再実行
- [x] `npm audit --json` で `next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss` の advisory が **0 件**（受け入れ条件 1）
- [x] 静的エクスポート出力構造が `out/calculate.html` + `out/calculate/__next.*.txt` 形式へ変更されたことを確認（§7.5 参照）
- [x] PDF 生成の実機回帰: `docs/spec/pdf-report.md §3.1 / §11.2 / §11.3` の実装契約遵守

### 8.4 段階 3（PR #65 同梱, merged 2026-05-02 06:07）— 文書更新

- [x] `docs/security/jspdf-vulnerabilities.md §6.4` を「移行完了」ステータスに更新、Issue #53 番号を §6.4.2 に追記
- [x] §6.4.1 に本書 §3 の差分注記を追加（`next/font/local` 不使用 / `@cloudflare/next-on-pages` 未導入）
- [x] `README.md` の Next.js バージョン表記を更新
- [x] `.claude/issue-order.md` フェーズ 1 表記に「後に Issue #53 で `next@16` へ更新」注記を追加
- [x] `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` の Framework 表記を更新
- [x] `docs/brand/README.md` 更新
- [x] `.github/workflows/security-audit.yml` は据え置き

## 9. 関連ファイル

- `working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md` — 本書を生成する元プラン
- `working/plans/issue-64-nextjs-15-to-16-major-upgrade_260502131649.md` — PR #65 のプラン
- `docs/security/jspdf-vulnerabilities.md` — §6.4 / §6.4.1 / §6.4.2（Issue #53 の動機）
- `docs/spec/pdf-report.md` — PDF 生成の実装契約（§3.1 / §11.2 / §11.3、段階 2B 検証で参照）
- `next.config.mjs` — `output: "export"` / `images.unoptimized: true`
- `package.json` — 移行対象パッケージ
- `package.json` `overrides` セクション（L49〜L53） — `postcss` 強制更新の根拠
- `.eslintrc.json` — `eslint-config-next` extends
- `eslint.config.mjs` — Flat Config 実装（PR #65 で `.eslintrc.json` から置換）
- `src/app/layout.tsx` — `next/font/google` 使用箇所
- `src/app/calculate/CalculatePageClient.tsx` — `next/dynamic({ ssr: false })` 使用箇所
- `src/app/{robots,sitemap,manifest}.ts` — `MetadataRoute` 使用箇所
