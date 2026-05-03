# Next.js 14 → 16 メジャー更新と関連 high 脆弱性の解消

## Context

`npm audit` で報告されている Next.js 系 high 4 件 + moderate 1 件（`next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss`）は、いずれも `next@16.2.4` 以降で解消することが `docs/security/jspdf-vulnerabilities.md §6.4` で確認済みである。本リポジトリは現行 `next@14.2.35` のため、**v14 → v15 → v16 のメジャー 2 段移行**を独立 PR の段階リリースで実施する。

なお、本リポジトリは **`output: "export"` による完全静的エクスポート**運用であり、`@cloudflare/next-on-pages` は `package.json` に未導入である（Issue #11 / `working/plans/issue-11-cloudflare-pages-setup_260501114546.md` で確定）。Issue 本文の `@cloudflare/next-on-pages` 追従検証および `next/font/local` 確認は、本リポジトリの実装上は **対象外**（未使用）であるため、本計画では「該当なしの確認」の位置付けで段階 1 に組み込む。

GitHub Issue: #53

## 影響範囲のサマリ（事前調査結果）

| 項目 | 状態 | 備考 |
|---|---|---|
| `output: "export"` | 静的エクスポート運用（`next.config.mjs`） | v15 / v16 でも継続サポート |
| `@cloudflare/next-on-pages` | **未使用** | `package.json` に存在せず、`docs/security §6.4.1` の前提記述は本リポジトリでは正確でない |
| `next/font/local` | **未使用**。`src/app/layout.tsx` で `next/font/google` の `Inter` / `Noto_Sans_JP` のみ使用 | v15 で `next/font` は `next` 本体に統合済み（Codemod 対象） |
| `next/image` | `unoptimized: true` 設定下で `Hero.tsx` / `Header.tsx` / `ClosingCta.tsx` / `error.tsx` / `loading.tsx` / `not-found.tsx` で使用 | static export では従来どおり `unoptimized` 必須 |
| `next/link` | 多数の箇所で使用（11 ファイル） | v13 以降の API。Breaking なし |
| `next/script` | `src/app/layout.tsx` の Cloudflare Insights 用 1 件 | API 安定 |
| `next/dynamic` | `CalculatePageClient.tsx` で `ssr: false` 指定 | **v15 でクライアントコンポーネント内の `ssr: false` の扱いが厳格化**。本ファイルは `"use client"` 済みなので問題なしの想定だが要検証 |
| `metadata` API / `viewport` API | `layout.tsx` / `page.tsx` / `not-found.tsx` / `calculate/page.tsx` / `privacy/page.tsx` / `terms/page.tsx` | 既に `viewport` は分離済み。Breaking なし想定 |
| `MetadataRoute` 経路 | `sitemap.ts` / `robots.ts` / `manifest.ts` | App Router 標準。型のみ確認 |
| React 18 | `package.json` で `react: ^18` / `react-dom: ^18` | **Next.js 15 は React 19 必須**。同時に React 19 へ更新 |
| `eslint@^8` | `.eslintrc.json` で `next/core-web-vitals` / `next/typescript` を extends | v15+ では ESLint 9 / Flat Config 推奨だが v8 互換も維持。Codemod で対応可 |

## 変更対象ファイル

本計画は **3 つの独立 PR** に分割して順次実行する（段階 1 = 調査ノート / 段階 2A = v15 移行 / 段階 2B = v16 移行 / 段階 3 = 文書最終化）。各 PR は単独で `npm run build` / `lint` / `typecheck` がグリーンであり、Cloudflare Pages preview デプロイで全ページが 200 を返すことを完了条件とする。

---

### 段階 1: 影響範囲調査と移行ノートの作成（調査 PR、コード変更なし）

#### 1. 移行調査ノートの新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/docs/security/nextjs-15-16-migration-notes.md`
- **変更箇所**: 新規ファイル全体
- **変更内容**:
  - 公式 release notes（Next.js 15 / Next.js 16）から本リポジトリで影響しうる Breaking changes を抽出した一覧
    - v15: 非同期 Request APIs（`cookies()` / `headers()` / `params` / `searchParams` の Promise 化）、`fetch` リクエストのデフォルトキャッシュ無効化、Route Handlers の GET / Client Router Cache のデフォルト変更、React 19 必須化、`@next/font` パッケージの削除（`next/font` への統合）、ESLint 9 サポート追加
    - v16: `experimental.turbo` の `turbopack` への昇格、`next.config.js` の各種 deprecated オプション削除、`next/image` のローダー変更、middleware の Edge Runtime API 仕様、`output: "export"` 互換性
  - 各 Breaking change に対する本リポジトリでの該当・非該当の判定（コード grep 結果と影響箇所のリスト）
  - `@cloudflare/next-on-pages` 未導入の確認結果
  - `next/font/local` 未使用の確認結果（`src/app/layout.tsx` で `next/font/google` のみ）
  - 静的エクスポート（`output: "export"`）が v15 / v16 で継続サポートされることを公式 docs から確認した記録
  - React 18 → React 19 への併行更新の必要性と互換性確認（`recharts@^2.15.4` / `lucide-react@^0.460.0` / `html2canvas@^1.4.1` / `jspdf@^2.5.2` の React 19 対応状況を npm registry / GitHub で確認した記録）
- **理由**: Issue 本文「段階 1: 影響範囲調査」を文書化し、後続の v15 / v16 PR レビュー時に「何を確認したか」のエビデンスとして残す。本書を経由せずに移行を進めると、`docs/security/jspdf-vulnerabilities.md §6.4.1` の根拠が更新されない。

#### 2. README.md / `.claude/issue-order.md` などの「Next.js 14」表記は本段階では未変更
- **変更なし**: `/Users/YS/development/matatabi-calculator/README.md`
- **変更なし**: `/Users/YS/development/matatabi-calculator/.claude/issue-order.md`
- **変更なし**: `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md`
- **理由**: 段階 2B（v16 移行）完了時点で一括更新（後述）。段階 1 はあくまで調査 PR で、コード・運用文書の事実を変えない。

---

### 段階 2A: `next@15` への移行（独立 PR）

#### 3. `package.json` の `next` / `eslint-config-next` / React の更新
- **変更**: `/Users/YS/development/matatabi-calculator/package.json`
- **変更箇所**: `dependencies` / `devDependencies`
- **変更内容**:
  - `next: "14.2.35"` → `next: "^15.0.0"`（v15 系の最新パッチに追従）
  - `eslint-config-next: "14.2.35"` → `eslint-config-next: "^15.0.0"`
  - `react: "^18"` → `react: "^19.0.0"`
  - `react-dom: "^18"` → `react-dom: "^19.0.0"`
  - `@types/react: "^18"` → `@types/react: "^19.0.0"`
  - `@types/react-dom: "^18"` → `@types/react-dom: "^19.0.0"`
  - `eslint: "^8"` は `next/core-web-vitals` v15 の互換性に応じて `^8` 維持または `^9` に追従（Next.js 公式 codemod の指針に従う）
  - `engines.node` と `packageManager` は据え置き
- **理由**: Next.js 15 は React 19 を要求するため、フレームワークと UI ランタイムをセットで更新する。`eslint-config-next` のメジャーは Next.js のメジャーに連動。

#### 4. `package-lock.json` の再生成
- **変更**: `/Users/YS/development/matatabi-calculator/package-lock.json`
- **変更箇所**: ファイル全体
- **変更内容**: `rm package-lock.json && npm install` ではなく、**`npm install` のみで lockfile を再解決**する（Issue #50 / `docs/security/jspdf-vulnerabilities.md §6.3` の「`overrides` 不採用方針」に整合させ、推移依存解決は npm に委ねる）
- **理由**: lockfile 再解決により `glob` / `postcss` / `@next/eslint-plugin-next` の推移依存が `next@15` の依存ツリーに追従する。

#### 5. Next.js 公式 codemod の適用
- **変更**: 該当する場合のみ `src/**` のソースコード（多数ファイル）
- **変更箇所**: codemod 実行結果に応じて確定
- **変更内容**:
  - `npx @next/codemod@latest upgrade latest` を実行（v15 系の最新 stable に更新する codemod）
  - 想定される変更:
    - `cookies()` / `headers()` の `await` 化（本リポジトリでは未使用と思われるため変更なし見込み）
    - `params` / `searchParams` の Promise 化（本リポジトリの `page.tsx` は引数を取らない設計のため変更なし見込み）
    - `next/font` の package 統合（既に `next/font/google` を使用しているため import パスは無変更）
- **理由**: 公式 codemod により機械的な API 移行を網羅。手動修正による漏れを防ぐ。

#### 6. `next/dynamic({ ssr: false })` の動作確認
- **変更（必要に応じて）**: `/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.tsx`
- **変更箇所**: 11〜17 行目の `dynamic` 呼び出し
- **変更内容**: 本ファイルは `"use client"` 済みであり、v15 のクライアントコンポーネント内 `ssr: false` の制約には抵触しない想定。`npm run build` 後の `out/calculate/index.html` で `ResultDashboard` が描画されないこと（クライアント描画継続）と、`recharts` が SSR されないことを確認。差分が必要になった場合のみ修正
- **理由**: Next.js 15 では Server Component 内での `dynamic({ ssr: false })` が禁止された。本ファイルは Client Component なので問題なしの想定だが、回帰確認は必須。

#### 7. `next.config.mjs` の互換性確認
- **変更（必要に応じて）**: `/Users/YS/development/matatabi-calculator/next.config.mjs`
- **変更箇所**: 設定オブジェクト
- **変更内容**: v15 で deprecated になった設定キーがないか確認（`output: "export"` / `images.unoptimized: true` は v15 でも継続サポート）。実質的に変更なし見込み
- **理由**: 静的エクスポート方針を v15 でも維持する。

#### 8. ESLint 設定の互換性確認
- **変更（必要に応じて）**: `/Users/YS/development/matatabi-calculator/.eslintrc.json`
- **変更箇所**: `extends` / `rules`
- **変更内容**: `eslint-config-next@^15` と既存ルールの互換性を確認。Flat Config への移行は本 PR のスコープ外として、`.eslintrc.json` 形式を維持
- **理由**: ESLint 9 の Flat Config 移行は別 Issue 化候補。本 PR は最小差分でグリーンを維持。

#### 9. ビルド検証と preview デプロイ確認
- **変更なし**: コード変更を伴わない検証ステップ
- **変更内容**:
  - `npm run lint` / `npm run typecheck` / `npm run build` がローカルでグリーンであること
  - `out/` 配下に `index.html` / `calculate/index.html` / `privacy/index.html` / `terms/index.html` / `_not-found.html` / `robots.txt` / `sitemap.xml` / `manifest.webmanifest` が生成されること
  - Cloudflare Pages の preview デプロイで全ページ 200、視覚的崩れなし、`Inter` / `Noto Sans JP` の描画継続
  - `npm audit` で `next` / `glob` / `postcss` / `eslint-config-next` / `@next/eslint-plugin-next` 系の advisory 件数の **減少** を確認（v15 段階では完全解消しない可能性あり、その場合は段階 2B で解消する見込みを記録）
- **理由**: v15 段階で受け入れ条件のうち「lint / typecheck / build / preview / フォント描画」を独立 PR で担保。段階 2B のスコープを純粋な v15 → v16 のみに絞る。

---

### 段階 2B: `next@16.2.4+` への移行（独立 PR、段階 2A マージ後に実施）

#### 10. `package.json` の `next` / `eslint-config-next` の更新
- **変更**: `/Users/YS/development/matatabi-calculator/package.json`
- **変更箇所**: `dependencies` / `devDependencies`
- **変更内容**:
  - `next: "^15.0.0"` → `next: "^16.2.4"`（受け入れ条件で指定された下限版以降）
  - `eslint-config-next: "^15.0.0"` → `eslint-config-next: "^16.0.0"`
  - 他の依存（`react` / `react-dom` / 型）は段階 2A で React 19 化済みのため据え置き
- **理由**: 受け入れ条件で `next@16.2.4` 以降での advisory 解消が確定しているため、当該下限を満たすバージョン制約とする。

#### 11. `package-lock.json` の再生成
- **変更**: `/Users/YS/development/matatabi-calculator/package-lock.json`
- **変更箇所**: ファイル全体
- **変更内容**: `npm install` で lockfile を再解決
- **理由**: 段階 2A と同様、推移依存（`glob` / `postcss`）の advisory が `next@16` の依存解決に追従して解消されることを `npm audit` で確認する。

#### 12. Next.js 16 公式 codemod の適用
- **変更**: 該当する場合のみ `src/**` / `next.config.mjs`
- **変更箇所**: codemod 実行結果に応じて確定
- **変更内容**: `npx @next/codemod@latest upgrade latest` を v16 向けに実行。想定される変更は段階 1 のノートに従う
- **理由**: v16 の Breaking changes（中間で deprecate 済みオプションの削除など）を機械的に追従。

#### 13. `next.config.mjs` の v16 対応確認
- **変更（必要に応じて）**: `/Users/YS/development/matatabi-calculator/next.config.mjs`
- **変更箇所**: 設定オブジェクト
- **変更内容**:
  - v16 で deprecated 削除された設定が含まれていれば除去（現状は `output: "export"` と `images.unoptimized: true` のみで、いずれも v16 継続サポート想定）
  - v16 で `images` の挙動変更があれば、static export 用に `unoptimized: true` を維持
- **理由**: 静的エクスポート方針を v16 でも維持する。

#### 14. ビルド検証と preview デプロイ確認
- **変更なし**: コード変更を伴わない検証ステップ
- **変更内容**:
  - 段階 9 と同等のローカル検証を再実施
  - Cloudflare Pages preview / 本番デプロイで全ページ（`/`, `/calculate`, `/privacy`, `/terms`, `/_not-found`, `/robots.txt`, `/sitemap.xml`）が 200 で返ること
  - PDF 生成機能（`src/lib/pdf.ts` / `PdfDashboard`）が実機で正常動作すること（`html2canvas` / `jspdf` が React 19 / Next.js 16 のクライアントランタイム上で従来どおり動くこと）
  - `npm audit --json` で `next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss` の advisory が **0 件** になっていること（受け入れ条件 1）
- **理由**: 受け入れ条件全項目をこの PR で満たす。

---

### 段階 3: 文書更新（v16 PR と同梱、または直後の独立 PR）

#### 15. `docs/security/jspdf-vulnerabilities.md` の §6.4 を「移行完了」ステータスに更新
- **変更**: `/Users/YS/development/matatabi-calculator/docs/security/jspdf-vulnerabilities.md`
- **変更箇所**: 141 行目以降の §6.4 ブロック全体
- **変更内容**:
  - §6.4 の冒頭に「**ステータス: 移行完了（YYYY-MM-DD、Issue #53 にて解消）**」の注記を追加
  - §6.4.1「即時更新しない理由」を **過去形ステータス**（履歴として残す形）に書き換え。`next@14.2.35` 前提・`next/font/local`・`@cloudflare/next-on-pages` の記述に「※ 本リポジトリでは `next/font/local` 不使用、`@cloudflare/next-on-pages` 未導入。当時の Issue #50 起票文の記述に準じて記録」と注記を追加
  - §6.4.2「別 Issue 化方針」の本文に「**Issue #53 にて移行完了**（YYYY-MM-DD、`next@16.x.x` 採用）」を追記。Issue 本文の指示「§6.4.2 に本 Issue 番号を追記」を満たす
  - §6.4 表の「修正版」列のステータスを「✅ 解消」に更新
- **理由**: 受け入れ条件 6「`docs/security/jspdf-vulnerabilities.md §6.4` の TODO が解消され、本 Issue 番号が §6.4.2 に追記されている」を満たす。

#### 16. README.md の Next.js バージョン表記更新
- **変更**: `/Users/YS/development/matatabi-calculator/README.md`
- **変更箇所**: 7 行目「技術スタック」セクション
- **変更内容**: `- Next.js 14 (App Router)` → `- Next.js 16 (App Router)`
- **理由**: Issue 本文「README.md の Next.js バージョン表記を更新」を満たす。

#### 17. `.claude/issue-order.md` のフェーズ 1 表記更新
- **変更**: `/Users/YS/development/matatabi-calculator/.claude/issue-order.md`
- **変更箇所**: 32 行目「Next.js 14+ プロジェクト雛形を作成する」（履歴的記述）
- **変更内容**: 履歴的事実は維持し、文末に「（後に Issue #53 で `next@16` へ更新）」の注記を追加
- **理由**: 過去の意思決定履歴は破壊しないが、現在の運用バージョンが追える状態にする。

#### 18. `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` の Framework 表記更新
- **変更**: `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md`
- **変更箇所**: 38 行目「**Framework:** Next.js 14+ (App Router採用)」
- **変更内容**: `Next.js 14+` → `Next.js 16+`（または「Next.js 14+（実装は Next.js 16 系）」）
- **理由**: 設計ドキュメントの実装現状追従。

#### 19. `.github/workflows/security-audit.yml` は据え置き
- **変更なし**: `/Users/YS/development/matatabi-calculator/.github/workflows/security-audit.yml`
- **理由**: Issue 本文「メジャー更新中は `audit-level=critical` を維持。移行完了後の `high` 引き上げは別 Issue（今回のスコープ外）」に従う。`docs/security/jspdf-vulnerabilities.md §6.2` の「critical 1 件（GHSA-f8cm-6447-x5h2）の赤化許容運用」も継続。

---

## 設計上の考慮点

### 段階を 3 つの独立 PR に分ける理由

- **回帰の局所化**: v14 → v15 と v15 → v16 を 1 PR に同梱すると、回帰原因の切り分け（React 19 起因か Next.js 16 起因か）が困難になる。Cloudflare Pages preview の挙動も同様に切り分けたい。
- **ロールバック容易性**: v15 PR で発見された不具合を解消した上で v16 PR を進める運用を取れば、v15 を一定期間運用してから v16 に踏み出せる。
- **受け入れ条件の段階達成**: 受け入れ条件 1（`npm audit` 解消）は v16 PR 完了時のみ達成。それ以外の条件（lint / typecheck / build / preview / フォント / 静的エクスポート成功）は v15 PR でも検証可能で、両 PR で同じ受け入れ確認を踏むことで品質を二重に担保。

### Issue 本文と本リポジトリ実体の差分

Issue 本文の以下 2 点は本リポジトリの実体と一致しないため、調査ノート（段階 1 の §1）と §6.4.1 注記でその旨を記録する:

1. `next/font/local` を使う前提の記述 → 本リポジトリは `next/font/google` のみ使用。`local` 経路は **影響なし**。
2. `@cloudflare/next-on-pages` 追従検証 → 本リポジトリは未導入。**影響なし**。

ただし、Issue 本文の調査スコープ自体は誤りではなく、`docs/security/jspdf-vulnerabilities.md §6.4.1` の表現に引きずられた前提とみなせる。本リポジトリでは「該当なしの確認」として処理する。

### React 19 同時更新の必然性

Next.js 15 以降は React 19 を peer dependency とする。`recharts@^2.15.4` / `html2canvas@^1.4.1` / `jspdf@^2.5.2` / `lucide-react@^0.460.0` の React 19 対応は段階 1 のノートで事前確認する。`recharts` v2 系は React 19 サポートが追加された版に追従する必要がある可能性があり、この場合は同 PR で `recharts` のマイナー更新を含める判断を許容する（Issue #53 のスコープ内、PDF レポート Issue #43 と整合）。

### `next/dynamic` と App Router 静的エクスポートの相互作用

`CalculatePageClient.tsx` は `"use client"` 配下で `next/dynamic({ ssr: false })` を使用しており、Next.js 15 / 16 のクライアントコンポーネント文脈では引き続き有効。仮に v15 codemod が `dynamic` の API 変更を検出した場合（例: `loading` プロパティのデフォルト値変更）も、本リポジトリの実装では既存の引数のみを使うため互換維持の見込み。

### `output: "export"` の継続性

Next.js 15 / 16 の release notes で `output: "export"` の継続サポートが明記されていることは段階 1 の調査ノートで一次情報を引用し、段階 2A / 2B のビルド検証で `out/` 生成を実証する。受け入れ条件 5「`@cloudflare/next-on-pages` のビルド + 静的エクスポート (`out/`) が成功する」は、本リポジトリでは `@cloudflare/next-on-pages` 不採用のため「`output: "export"` による `out/` 生成成功」と読み替える（段階 1 ノートに明記）。

### `eslint-config-next` メジャー更新と既存ルールの互換性

`.eslintrc.json` は `next/core-web-vitals` と `next/typescript` を extends し、`@typescript-eslint/no-unused-vars` のみ独自設定。v15 / v16 の `eslint-config-next` でも同一ルールセットがエクスポートされる想定だが、Flat Config 化や非推奨ルールの削除が起きた場合は最小差分で追従する。Flat Config への全面移行は本 Issue のスコープ外として別 Issue 化する。

### Issue #43（PDF レポート出力）との整合

Issue #43 は既に `develop` にマージ済み（commit `bb175ed`）であり、本 Issue 起票時点では「並行する可能性のある実装」ではなく**完了済み**となっている。`src/lib/pdf.ts` / `PdfDashboard.tsx` は React 19 / Next.js 16 のクライアントランタイム上で動作することを段階 2B のビルド検証で確認すれば足りる。

## 検証方法

### 段階 1（調査 PR）
1. `docs/security/nextjs-15-16-migration-notes.md` が新規作成され、v15 / v16 の Breaking changes 影響箇所が網羅されていること
2. `npm install` / `npm run build` / `npm run lint` / `npm run typecheck` がいずれも exit 0（コード変更がないため当然グリーン）
3. レビュアーが調査ノートを読み、v15 / v16 移行で「何を変更しないのか」「何を確認するのか」を判断できる粒度になっていること

### 段階 2A（v15 移行 PR）
1. ローカル: `rm -rf node_modules && npm install` で依存ツリー再解決後、`npm run lint` / `npm run typecheck` / `npm run build` が exit 0
2. ローカル: `out/` 配下に `index.html` / `calculate/index.html` / `privacy/index.html` / `terms/index.html` / `_not-found.html` / `robots.txt` / `sitemap.xml` / `manifest.webmanifest` が生成されること
3. Cloudflare Pages preview デプロイで全ページが 200、`Inter` / `Noto Sans JP` の描画継続、レイアウト崩れなし
4. ブラウザで `/calculate` の `InputForm` 入力 → `ResultDashboard` 描画 → PDF ダウンロードが動作すること（実機: Chrome / Safari / iOS Safari の最低 1 つで確認）
5. `npm audit --json` 実行結果を本 PR description に貼付し、`next` / `glob` / `postcss` 等の advisory 件数の差分を記録（v15 段階で部分的に減少する想定）
6. `npm run audit:critical` が引き続き jspdf 系 critical 1 件で赤化することのみ確認（`docs/security/jspdf-vulnerabilities.md §6.2` の運用継続）

### 段階 2B（v16 移行 PR）
1. 段階 2A の検証 1〜4 を再実施
2. `npm audit --json` で `next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss` の advisory が **0 件**（受け入れ条件 1）
3. `npm audit --audit-level=high` を試験的に手元で実行し、jspdf 系以外の high が 0 件であることを目視確認（CI には反映しない、本 Issue スコープ外）
4. Cloudflare Pages **本番デプロイ**（`main` マージ後）で `https://roi.nekonimatatabi.com/` の全ページが 200 を返し、視覚的崩れがないこと
5. PDF 生成の実機回帰: `docs/spec/pdf-report.md §3.1 / §11.2 / §11.3` の実装契約が引き続き満たされること（`buildPdfFilename()` テンプレート、`html2canvas` 主体方針、`pdf.html()` 不使用）
6. `docs/security/jspdf-vulnerabilities.md §6.4.2` に Issue #53 番号が追記され、§6.4 が「移行完了」ステータスになっていること

### 段階 3（文書更新、PR 単独で実施する場合）
1. README.md / `.claude/issue-order.md` / `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` のバージョン表記が更新されていること
2. `git grep "Next.js 14"` / `git grep "next@14"` の結果が、履歴的記述（注記付き）以外で 0 件であること
3. `npm run lint` / `npm run typecheck` / `npm run build` がドキュメントのみの変更で引き続きグリーンであること
