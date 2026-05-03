# Next.js 15 → 16 メジャー更新（Issue #53 段階 2B）実装プラン

## Context

`docs/security/jspdf-vulnerabilities.md §6.4` で確定した方針のとおり、`npm audit` が報告する Next.js 系 high 4 件 + moderate 1 件（`next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss`）は `next@16.2.4` 以降で解消する。Issue #53 の段階分割設計（`working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md`）に従い、本 Issue #64 では段階 2B（`next@15.5.15` → `next@16.2.4+`）の作業を独立 PR で実施する。段階 1（PR #62、移行調査ノート）と段階 2A（PR #63、`next@15` / React 19）は既に `develop` にマージ済み（`git log` で `6cd4a48` / `b1865e8` 確認）。

本段階で受け入れ条件 1（`npm audit` の Next.js 系 advisory 0 件）を最終達成するとともに、Next.js 16 の Breaking change として削除される `next lint` を ESLint CLI に移行し、段階 3（文書更新）を本 PR に同梱して移行作業を完結させる。

GitHub Issue: #64

## 変更対象ファイル

### 1. `next` / `eslint-config-next` の v16 系へのメジャー更新
- **変更**: `/Users/YS/development/matatabi-calculator/package.json`
- **変更箇所**: `dependencies` の `next`、`devDependencies` の `eslint-config-next`
- **変更内容**:
  - `"next": "^15.0.0"` → `"next": "^16.2.4"`（Issue #53 受け入れ条件で指定された下限版以降）
  - `"eslint-config-next": "^15.0.0"` → `"eslint-config-next": "^16.0.0"`
  - `react` / `react-dom` / `@types/react` / `@types/react-dom` は段階 2A で `^19.0.0` に更新済みのため**据え置き**
  - `eslint: "^8"` は当面据え置き（v16 系の `eslint-config-next` が ESLint 8 / 9 双方をサポートする想定。Flat Config への全面移行は本 Issue のスコープ外、`docs/security/nextjs-15-16-migration-notes.md §4.6` の方針に従う）
  - `engines.node` (`>=20.0.0`) と `packageManager` (`npm@10.9.2`) は据え置き
- **理由**: Issue #64 受け入れ条件 1 に指定された `next@16.2.4` 以降で `npm audit` の Next.js 系 advisory 5 件が解消される（`docs/security/jspdf-vulnerabilities.md §6.4` の表参照）。`eslint-config-next` は `next` のメジャーに連動して更新する必要がある。

### 2. `lint` スクリプトの ESLint CLI 化
- **変更**: `/Users/YS/development/matatabi-calculator/package.json`
- **変更箇所**: `scripts.lint`（現状 `"lint": "next lint"`、9 行目）
- **変更内容**:
  - `"lint": "next lint"` → `"lint": "eslint ."`（codemod の出力結果に応じて `--ext .ts,.tsx` 等の付与は調整）
  - 必要に応じて `"lint:fix": "eslint . --fix"` を併設するかは codemod の提案に従う（追加しない方針が無難）
- **理由**: Next.js 16 で `next lint` が削除されるため、`npx @next/codemod@canary next-lint-to-eslint-cli .` を実行して ESLint CLI に切り替える必要がある（Issue 本文「5. `next lint` の deprecation 対応」、`docs/security/nextjs-15-16-migration-notes.md §5` の v16 Breaking changes 参照）。

### 3. `package-lock.json` の再解決
- **変更**: `/Users/YS/development/matatabi-calculator/package-lock.json`
- **変更箇所**: ファイル全体（自動再生成）
- **変更内容**:
  - `npm install` を実行して lockfile を再解決する。**`rm package-lock.json` は行わず**、上書き更新に任せる（`docs/security/jspdf-vulnerabilities.md §6.3` の `overrides` 不採用方針 + 推移依存解決を npm に委ねる方針に整合）
  - 期待される差分: `next@15.5.15` → `next@16.x.x`、`@next/swc-*` 各プラットフォーム、`@next/env`、`@next/eslint-plugin-next`、`eslint-config-next` の更新。`postcss` / `glob` / `fast-glob` / `glob-parent` の推移依存も連動して advisory 解消対象版へ追従
- **理由**: Issue 本文「2. `package-lock.json` の再生成」および `docs/security/nextjs-15-16-migration-notes.md §6.4 / §6.4.2` の依存解決追従方針。受け入れ条件 1 の `npm audit` クリアは lockfile が新しい依存ツリーを記録していることが必須。

### 4. Next.js 16 公式 codemod の適用
- **変更（codemod 結果次第）**: `/Users/YS/development/matatabi-calculator/src/**`、`/Users/YS/development/matatabi-calculator/next.config.mjs`、その他設定ファイル
- **変更箇所**: codemod 実行結果に応じて確定（事前確定不可）
- **変更内容**:
  - `npx @next/codemod@latest upgrade latest` を **非対話**で実行（v16 への upgrade transform 一括適用）
  - `npx @next/codemod@canary next-lint-to-eslint-cli .` を実行して ESLint CLI への移行 transform を適用（package.json の `lint` script 書き換え + ESLint config 互換調整）
  - 想定される変更パターン（`docs/security/nextjs-15-16-migration-notes.md §5` 参照）:
    - `next.config.mjs` の deprecate 削除キー除去（現状 `output: "export"` / `images.unoptimized: true` のみで該当なし見込み）
    - `experimental.turbo` の `turbopack` 名称への昇格（本リポジトリでは Turbopack 設定なし、影響なし見込み）
    - `next/image` のローダー API 関連の補正（`unoptimized: true` 固定運用のため影響軽微の見込み）
    - middleware Edge Runtime API の改名（本リポジトリは middleware 未使用のため影響なし）
  - 実行後 `git diff` で変更内容を逐一確認し、不要・誤検知の差分は revert する
- **理由**: 公式 codemod により機械的な API 移行を網羅して手動修正による漏れを防ぐ（Issue 本文「3. Next.js 16 公式 codemod の適用」）。本リポジトリは `cookies()` / `headers()` / `params` / `searchParams` / Server Actions / Route Handlers 不使用（段階 1 ノート §2.3）のため大規模書き換えは発生しない見込みだが、確定的な diff は CI / 手動検証後にしか決定できない。

### 5. `next.config.mjs` の v16 対応確認
- **変更（必要に応じて）**: `/Users/YS/development/matatabi-calculator/next.config.mjs`
- **変更箇所**: 設定オブジェクト（1〜10 行目）
- **変更内容**:
  - v16 で deprecated 削除された設定キーがあれば除去（現状 `output: "export"` と `images.unoptimized: true` のみで、両方とも v16 継続サポートと `docs/security/nextjs-15-16-migration-notes.md §5.1 / §5.5` で確認済み）
  - 実質的に変更なしの見込み。codemod が差分を出した場合のみ採用
- **理由**: 静的エクスポート方針を v16 でも維持する（受け入れ条件 5「`output: "export"` による `out/` 生成成功」と Cloudflare Pages 静的アップロード運用）。

### 6. ESLint 設定の v16 互換確認
- **変更（必要に応じて）**: `/Users/YS/development/matatabi-calculator/.eslintrc.json`
- **変更箇所**: `extends` / `rules`
- **変更内容**:
  - `eslint-config-next@^16.0.0` で `next/core-web-vitals` / `next/typescript` extends がそのまま動作するか `npm run lint` で検証
  - `next-lint-to-eslint-cli` codemod が `.eslintrc.json` を Flat Config (`eslint.config.*`) に変換した場合は採用するが、**自動変換が走らなければ `.eslintrc.json` のまま維持**（Flat Config への全面移行は本 Issue のスコープ外、Issue 本文「注意事項」で明示）
  - `@typescript-eslint/no-unused-vars` カスタムルールは継続維持
- **理由**: 最小差分で lint をグリーン化し、Flat Config 化の判断は別 Issue に切り出す方針（`working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md` 設計上の考慮点「`eslint-config-next` メジャー更新と既存ルールの互換性」）。

### 7. `docs/security/jspdf-vulnerabilities.md §6.4` の「移行完了」化（段階 3 同梱）
- **変更**: `/Users/YS/development/matatabi-calculator/docs/security/jspdf-vulnerabilities.md`
- **変更箇所**: 141 行目以降の §6.4 ブロック全体（特に §6.4.1 の 153〜157 行、§6.4.2 の 159〜162 行、§6.4 の表 145〜151 行）
- **変更内容**:
  - §6.4 冒頭に「**ステータス: 移行完了（YYYY-MM-DD、Issue #53 / Issue #64 にて解消）**」の注記を追加
  - §6.4 の表「修正版」列のステータスを「✅ 解消（`next@16.x.x` 採用）」に更新
  - §6.4.1「即時更新しない理由」を**過去形ステータス**（履歴として残す形）に書き換え。現状の `next@14.2.35` 前提・`next/font/local` 言及・`@cloudflare/next-on-pages` 連携記述には「※ 本リポジトリでは `next/font/local` 不使用、`@cloudflare/next-on-pages` 未導入。当時の Issue #50 起票文の記述に準じて履歴として記録（`docs/security/nextjs-15-16-migration-notes.md §3` 参照）」の注記を追加
  - §6.4.2「別 Issue 化方針」末尾に「**Issue #53 / Issue #64 にて移行完了**（YYYY-MM-DD、`next@16.x.x` / `eslint-config-next@16.x.x` 採用）」を追記
- **理由**: 受け入れ条件 7「`docs/security/jspdf-vulnerabilities.md §6.4` の TODO が解消され、§6.4.2 に Issue #53 / 本 Issue 番号が追記されている」を満たす。

### 8. `README.md` の Next.js バージョン表記更新（段階 3 同梱）
- **変更**: `/Users/YS/development/matatabi-calculator/README.md`
- **変更箇所**: 7 行目「技術スタック」セクション
- **変更内容**: `- Next.js 14 (App Router)` → `- Next.js 16 (App Router)`
- **理由**: Issue 本文「7. 文書更新」および受け入れ条件 8「README.md 等の Next.js バージョン表記が更新されている」を満たす。段階 2A の PR #63 では未更新のままだったため、本段階で v16 を反映する。

### 9. `.claude/issue-order.md` のフェーズ 1 表記更新（段階 3 同梱）
- **変更**: `/Users/YS/development/matatabi-calculator/.claude/issue-order.md`
- **変更箇所**: 32 行目（`| 6 | ✅ | Next.js 14+ プロジェクト雛形を作成する | …`）
- **変更内容**: 履歴的事実（`create-next-app` で Next.js 14+ 雛形を作成した経緯）は維持し、概要末尾に「（後に Issue #53 / Issue #64 で `next@16` へ更新）」の注記を追加
- **理由**: Issue 本文「7. 文書更新」の指示に従い、過去の意思決定履歴を破壊せずに現在の運用バージョンが追える状態にする。

### 10. `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` の Framework 表記更新（段階 3 同梱）
- **変更**: `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md`
- **変更箇所**: 38 行目「**Framework:** Next.js 14+ (App Router採用)」
- **変更内容**: `Next.js 14+` → `Next.js 16+`（または「Next.js 16+（App Router 採用）」に整える）
- **理由**: Issue 本文「7. 文書更新」、設計マスタードキュメントの実装現状追従。

### 11. `next-env.d.ts` の自動再生成
- **変更（自動）**: `/Users/YS/development/matatabi-calculator/next-env.d.ts`
- **変更箇所**: 自動生成コメント・参照
- **変更内容**: `npm run build` 実行時に Next.js が自動更新する。手動編集はしない
- **理由**: メジャー更新時に reference 行が変わる可能性があるため、ビルド後の差分を commit に含める。

### 12. `.github/workflows/security-audit.yml` は据え置き
- **変更なし**: `/Users/YS/development/matatabi-calculator/.github/workflows/security-audit.yml`
- **理由**: Issue 本文「注意事項」で「メジャー更新中は `audit-level=critical` を維持。`high` への引き上げは別 Issue 化候補」と明記。`docs/security/jspdf-vulnerabilities.md §6.2` の jspdf critical 1 件の赤化許容運用も継続（`working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md §19` の方針）。

## 設計上の考慮点

### v16 codemod 適用結果の不確定性

`npx @next/codemod@latest upgrade latest` および `npx @next/codemod@canary next-lint-to-eslint-cli .` の実行結果は、codemod 側の更新タイミング（PR 作業時点での codemod パッケージのバージョン）に依存するため、**事前に確定的な diff を本プランで規定することはできない**。本リポジトリは段階 1 ノート（`docs/security/nextjs-15-16-migration-notes.md §2.3`）で確認した通り、`cookies()` / `headers()` / `params` / `searchParams` / Server Actions / Route Handlers / middleware いずれも未使用で、`next.config.mjs` も `output: "export"` / `images.unoptimized: true` の最小設定であるため、**実質的なコード書き換えはほぼ発生しない見込み**。確定的な diff は PR 作業時の `git diff` レビューおよび CI / 手動検証で判断する。

予期せぬ大規模書き換えが発生した場合の対応:
- codemod が誤検知して書き換えを試みた diff は個別に revert
- それでも build / lint / typecheck が通らない場合、当該箇所のみ手動で v16 API へ追従
- 影響が PDF 生成・静的エクスポート・フォント描画に及ぶ場合は、対応を本 PR に含めるか別 Issue に切り出すかをレビュー時に判断

### `next lint` から ESLint CLI への移行範囲

Next.js 16 で `next lint` が削除されるため `lint` スクリプトの書き換えは必須だが、ESLint Flat Config (`eslint.config.*`) への全面移行は本 Issue のスコープ外（Issue 本文「注意事項」、`working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md` 設計上の考慮点）。本 PR では:

- `next-lint-to-eslint-cli` codemod が `package.json` の `lint` script を書き換え、必要に応じて `.eslintrc.json` を維持または最小調整する範囲のみ採用
- codemod が `eslint.config.*` を新規生成した場合、本リポジトリのカスタムルール（`@typescript-eslint/no-unused-vars` の `argsIgnorePattern`/`varsIgnorePattern` 設定）が継承されているかを目視確認し、欠落していれば手動補完
- `eslint@^8` 系維持を前提とし、`eslint@^9` への昇格は別 Issue 化候補（同方針）

### 段階 3（文書更新）を本 PR に同梱する方針

Issue 本文「7. 文書更新（段階 3 を本 PR 同梱、または直後の独立 PR）」で同梱・分離どちらも許容されているが、本プランでは**同梱方針**を採る。理由:

- 受け入れ条件 7（`§6.4` の TODO 解消）と受け入れ条件 8（`README.md` 等の表記更新）は Issue #64 のスコープに含まれており、別 PR にすると受け入れ確認の追跡が分散する
- 文書差分は codemod / ビルド検証に影響せず、レビュー負荷も小さい
- 段階 2A PR #63 マージ後の現時点で `develop` の README は `Next.js 14` 表記のまま残っており、段階 2A → 段階 2B 間に紛らわしい中間状態を作らない方が運用上わかりやすい（段階 2A 単独では README を v15 に止め、段階 2B で一気に v16 へ進める判断）

ただし、文書のみの差分が本 PR のレビューを長期化させる兆候があれば、レビューフェーズで分離 PR への切り替えを判断する余地を残す。

### `output: "export"` の継続性と Cloudflare Pages 配信

本リポジトリは `@cloudflare/next-on-pages` を導入しておらず、`out/` を Cloudflare Pages へ静的アップロードする運用（`README.md` § Cloudflare Pages 側の設定値、`docs/security/nextjs-15-16-migration-notes.md §2.2`）。Issue #53 受け入れ条件 5 の「`@cloudflare/next-on-pages` のビルド + 静的エクスポート (`out/`) が成功する」は、本リポジトリでは「`output: "export"` による `out/` 生成成功」と読み替える（段階 1 ノート §5.5 で明記済み）。

Next.js 16 の `output: "export"` 継続サポートは段階 1 ノートで一次情報として確認済みのため、本段階の検証では `out/` 生成と各ページの 200 応答を実証すれば足りる。

### React 19 / Next.js 16 ランタイム下での PDF 生成回帰

`src/lib/pdf.ts` の `generatePdf` は `html2canvas@^1.4.1` と `jspdf@^2.5.2` を dynamic import するクライアント側ユーティリティ（バニラ JS 主体）。React 19 / Next.js 16 のランタイム差分は dynamic import の挙動と、`PdfDashboard` の React 19 互換性のみが論点。

- `html2canvas` / `jspdf` 自体は React に非依存のため、Next.js 16 のビルド成果物に含まれること以外の変更要因はない
- `docs/spec/pdf-report.md §3.1 / §11.2 / §11.3` の実装契約（html2canvas 主体方針、`pdf.html()` 不使用、`buildPdfFilename()` の戻り値以外を `save()` に渡さない）は `src/lib/pdf.ts` のコメントとコードで担保されており、本 PR ではコード変更を行わない方針
- 受け入れ条件 6 を満たすため、preview / 本番デプロイ環境で `/calculate` の InputForm → ResultDashboard → PDF ダウンロードまでの実機回帰を行う

### 段階 2A マージ後の develop での CI 安定性確認

Issue 本文「注意事項」末尾の「段階 2A マージ後の develop で CI が安定したことを確認してから本 Issue の作業ブランチを切ることを推奨」に従い、PR #63 マージ後の `develop` で `security-audit.yml` がすでに緑で安定していることを作業着手前に確認する（`git log` 確認時点で `4ef8ae0` の review fix も適用済み）。本 PR の作業ブランチは `develop` から派生させる。

### Flat Config への全面移行と ESLint 9 昇格は別 Issue

Issue 本文「注意事項」および `working/plans/issue-53-nextjs-14-to-16-major-upgrade_260502123644.md` 設計上の考慮点で明示されている通り、Flat Config 化と ESLint 9 への昇格は本 Issue のスコープ外。`next-lint-to-eslint-cli` codemod が部分的に `.eslintrc.json` を書き換える範囲は本 PR で受容するが、自発的な Flat Config 化は行わない。

## 検証方法

### ローカル検証（作業ブランチ）

1. `develop` から作業ブランチを派生させた直後に `rm -rf node_modules` してから `npm install` を実行し、`package.json` 更新後の依存ツリーが完全再解決されることを確認
2. `npm run lint`（ESLint CLI 化後）/ `npm run typecheck` / `npm run build` の 3 つがいずれも exit 0
3. `out/` 配下に以下のファイルが生成されることを確認:
   - `index.html`
   - `calculate/index.html`
   - `privacy/index.html`
   - `terms/index.html`
   - `_not-found.html`（Next.js 16 でのファイル名変更があれば追従。受け入れ条件は `/_not-found` 到達性）
   - `robots.txt`
   - `sitemap.xml`
   - `manifest.webmanifest`
4. `npm audit --json` を実行し、`next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss` の advisory が **0 件**であることを確認（受け入れ条件 1）。PR description に実行ログを貼付
5. `npm run audit:critical` が引き続き jspdf 系 critical 1 件（GHSA-f8cm-6447-x5h2）でのみ赤化することを確認（`docs/security/jspdf-vulnerabilities.md §6.2` の運用継続）
6. `git diff` で codemod の差分内容を逐一確認し、誤検知・不要書き換えがないことをレビュー

### Cloudflare Pages preview デプロイ検証

7. 作業ブランチを push してプレビュー URL を発行し、以下の全ページで HTTP 200 応答 + 視覚的崩れなしを確認（受け入れ条件 3）:
   - `/`（landing page、Hero / ProblemSection / ValuePropSection / HowItWorks / FAQ / ClosingCta）
   - `/calculate`
   - `/privacy`
   - `/terms`
   - 存在しないパス（404 経路で `not-found.tsx` が返ること、受け入れ条件 3 の `/_not-found`）
   - `/robots.txt`
   - `/sitemap.xml`
   - `/manifest.webmanifest`
8. ブラウザの DevTools で `Inter` および `Noto Sans JP` フォントが従来通り読み込まれて描画されていることを目視確認（受け入れ条件 4）
9. `/calculate` で InputForm に有効値を入力 → 送信 → ResultDashboard 描画 → PDF ダウンロードボタン押下までを実機で実行し、ファイル名が `matatabi-roi-${ymd}-${hm}.pdf` 形式で保存され、A4 1 枚の PDF が `docs/spec/pdf-report.md §3.1 / §11.2 / §11.3` の実装契約通り生成されることを確認（受け入れ条件 6）。Chrome / Safari / iOS Safari の最低 1 つで実施

### 本番デプロイ検証（main マージ後）

10. `main` マージ後の本番デプロイで `https://roi.nekonimatatabi.com/` の全ページが 200 応答、視覚崩れなし、PDF 生成正常動作を再確認

### 文書整合性検証

11. `git grep "Next.js 14"` の結果が、履歴的記述（注記付き、`.claude/issue-order.md` の「（後に Issue #53 / Issue #64 で `next@16` へ更新）」など）と過去計画ノート（`working/plans/`、`docs/security/nextjs-15-16-migration-notes.md` の段階 1 時点の記述）以外で 0 件であることを確認
12. `docs/security/jspdf-vulnerabilities.md §6.4` のステータスが「移行完了」に書き換わり、§6.4.2 に Issue #53 / Issue #64 番号が併記されていることを確認（受け入れ条件 7）
13. `README.md` 7 行目が `- Next.js 16 (App Router)` になっていることを確認（受け入れ条件 8）
