# テストスイート構築プラン（Jest + RTL + Playwright）

## Context

Issue #48 で要請されているとおり、本リポジトリの `src/` 配下には `.test.ts` / `.spec.ts` ファイルが一切存在せず、計算ロジック・コンポーネント・ゴールデンパスを保証する仕組みが欠落している。特に `src/lib/calculation.ts` は ROI 試算アプリの中核で、仕様書 `docs/spec/calculation-logic.md` §5 の擬似コードと一致する純粋関数として実装されているが、回帰検出の自動化がない。本プランでは Jest + React Testing Library（単体・コンポーネント）と Playwright（E2E）でテストスイートを構築し、CI（#49）で自動実行可能な形に整える。

GitHub Issue: #48

## 前提となる調査結果

- フレームワーク: Next.js 16（App Router）/ React 19 / TypeScript（strict）/ ESLint 9 flat config / Tailwind 3
- ビルド設定: `next.config.mjs` で `output: "export"`（Cloudflare Pages 静的配信）
- `tsconfig.json`: `paths: { "@/*": ["./src/*"] }`, `module: "esnext"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`
- 既存スクリプト: `dev` / `build` / `lint` / `typecheck` / `audit` / `audit:critical`
- 既存 CI: `.github/workflows/security-audit.yml`（npm audit のみ。テスト用ジョブは未整備）
- テスト対象実体:
  - `src/lib/calculation.ts`（`calculate` / `manYenToYen` / `yenToManYen`）
  - `src/lib/format.ts`（`formatManYen` / `formatManYenCompact` / `formatYen` / `formatPercent` / `formatHumanCount`）
  - `src/lib/analytics.ts`（`isAnalyticsEnabled` / `trackEvent` / `trackPageView` no-op スタブ）
  - `src/hooks/useCountUp.ts`（rAF + `useMediaQuery(REDUCED_MOTION_QUERY)` 連携）
  - 同等の純粋ユーティリティとして `src/lib/messages.ts` / `src/lib/pdfFilename.ts` / `src/lib/cn.ts` も対象に追加推奨
  - `src/components/calculate/InputForm.tsx`（5 項目バリデーション + 送信 → `manYenToYen` 変換）
  - `src/components/calculate/ResultDashboard.tsx` / `DashboardView.tsx`（PDF ボタン制御・headerSlot 描画。コンテナ寄りの責務分離あり）
  - `src/components/calculate/WarningBanner.tsx`（`role="alert"` の純表示層）
- E2E ゴールデンパス: `/` → CTA → `/calculate` → 5 項目入力 → 結果表示 → PDF ダウンロード
- Issue 本文に挙がっている `src/lib/utils.ts` は **存在しない**。代わりに `src/lib/cn.ts` が同等の極小ヘルパとして機能しているため、テスト対象を `cn.ts` に読み替える（プラン §8 参照）。
- 既存規約: `.claude/rules/` ディレクトリは存在せず、ルートに `CLAUDE.md` も無い。コーディング規約は各実装ファイル先頭の JSDoc コメント（仕様参照リンク + 設計意図）に集約されている。本プランで追加するテストファイルでも同じ JSDoc 規約（仕様書のセクション参照）に従う。

## ツール選定: **Jest + ts-jest** を採用（Vitest ではない）

理由:
- Next.js 公式が `next/jest`（SWC ベースの Jest プリセット）を提供しており、Next.js 16 + App Router 構成と最も親和性が高い。
- `next/jest` は Next.js が内部で使う SWC を流用し、Babel を経由せずに ts-jest 相当のトランスパイルを得られる（`ts-jest` の追加導入も不要）。
- React 19 / RTL の組み合わせで Vitest を選ぶと `jsdom` + ESM 解決周りの設定を自前で組む必要があり、本プロジェクトの「依存最小・設定単純化」方針（`src/lib/cn.ts` の JSDoc に記載）に反する。
- Issue 本文も「Jest + ts-jest（または Vitest）」と Jest を第一候補に提示している。

## 変更対象ファイル

### 1. Jest セットアップ（`next/jest` プリセット導入）
- **新規**: `/Users/YS/development/matatabi-calculator/jest.config.ts`
- **変更箇所**: 新規作成
- **変更内容**:
  - `next/jest` の `createJestConfig({ dir: "./" })` をエクスポートし、Next.js の SWC + 環境変数読み込みを継承。
  - カスタム設定として以下を指定:
    - `testEnvironment: "jsdom"`
    - `setupFilesAfterEach: ["<rootDir>/jest.setup.ts"]`
    - `moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" }`（`tsconfig.json` の `paths` に対応）
    - `testPathIgnorePatterns: ["/node_modules/", "/.next/", "/out/", "/e2e/"]`（Playwright 配下を Jest スコープから除外）
    - `collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/app/**/{layout,page,error,loading,not-found,sitemap,robots,manifest,site-metadata}.{ts,tsx}", "!src/**/index.ts"]`
    - `coverageThreshold`: `src/lib/calculation.ts` は branches/functions/lines/statements 全て 100、その他の `src/**` は 80
- **理由**: Issue 受け入れ条件「計算ロジックのカバレッジが 100%」「UI 80%+」を `coverageThreshold` で機械的に保証する。Playwright の `e2e/` を Jest の testMatch から除外することで実行系を分離する。

### 2. Jest 共通セットアップ（`@testing-library/jest-dom` 拡張 + ブラウザ API モック）
- **新規**: `/Users/YS/development/matatabi-calculator/jest.setup.ts`
- **変更箇所**: 新規作成
- **変更内容**:
  - `import "@testing-library/jest-dom";` で `toBeInTheDocument` / `toHaveAttribute` 等を有効化。
  - `window.matchMedia` モック: `useMediaQuery` (`src/hooks/useMediaQuery.ts`) と `useCountUp` (`src/hooks/useCountUp.ts`) が `window.matchMedia` に依存。jsdom はこれを実装しないため、`Object.defineProperty(window, "matchMedia", { ... })` で `MediaQueryList` モック（`addEventListener` / `removeEventListener` / `matches: false`）を注入。
  - `IntersectionObserver` モック: 将来的にランディングのアニメーション系コンポーネントを RTL でレンダリングするケースに備え、`global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };` を定義。
  - `ResizeObserver` モック: Recharts の `ResponsiveContainer` が依存するため、`DashboardView` のテストで必要。同様にスタブクラスを `globalThis` に注入。
  - `requestAnimationFrame` / `cancelAnimationFrame` のフォールバック: jsdom は実装するが、`useCountUp` のテストでは `jest.useFakeTimers()` と組み合わせて時間を進めるため、`globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16)` のスタブを最後に上書き（テスト側で再上書き可）。
- **理由**: Issue 受け入れ条件「テスト用モック（`window.matchMedia` / `IntersectionObserver` 等）が設定済み」を満たす単一の真実の源を作る。各テストファイルで重複定義しなくて済む。

### 3. `package.json` への scripts / devDependencies 追加
- **変更**: `/Users/YS/development/matatabi-calculator/package.json`
- **変更箇所**: `scripts` セクション / `devDependencies` セクション
- **変更内容**:
  - `scripts` に追加:
    - `"test": "jest"`
    - `"test:watch": "jest --watch"`
    - `"test:coverage": "jest --coverage"`
    - `"test:e2e": "playwright test"`
    - `"test:e2e:install": "playwright install --with-deps"`（CI 初回セットアップ用）
  - `devDependencies` に追加:
    - `jest`（^29 系）
    - `jest-environment-jsdom`（^29）
    - `@types/jest`
    - `@testing-library/react`（^16 系で React 19 対応）
    - `@testing-library/jest-dom`（^6）
    - `@testing-library/user-event`（^14）
    - `@playwright/test`（^1.48 以降。Next.js 16 / Node 20 で動作する最新安定版）
- **理由**: Issue 影響範囲セクションに明記された scripts と devDependencies を整備。`ts-jest` は `next/jest` 経由の SWC トランスパイルで代替するため不要（依存最小化）。

### 4. ESLint への Jest / Playwright 環境追加
- **変更**: `/Users/YS/development/matatabi-calculator/eslint.config.mjs`
- **変更箇所**: `defineConfig` の配列に新規エントリ追加
- **変更内容**:
  - 第二要素として `{ files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/__tests__/**/*"], languageOptions: { globals: { ...globals.jest } } }` を追加（`globals` パッケージは ESLint 9 が transitive に持つ。なければ `devDependencies` に追加）。
  - `e2e/` 配下は別エントリで Playwright のグローバル（`test` / `expect`）を定義。
  - `ignores: ["e2e/.playwright/**", "playwright-report/**", "test-results/**"]` を追加して Playwright 出力を lint 対象外に。
- **理由**: 既存の flat config に Jest / Playwright のテストグローバルを宣言しないと `no-undef` 相当の指摘が増える。既存の `argsIgnorePattern: "^_"` ルールはそのまま継承する。

### 5. `.gitignore` への追記
- **変更**: `/Users/YS/development/matatabi-calculator/.gitignore`
- **変更箇所**: 末尾
- **変更内容**:
  - `/playwright-report` / `/test-results` / `/.playwright` を追記。
  - `/coverage` は既存の `# testing` ブロックで既に存在するため流用。
- **理由**: Playwright のレポートと一時成果物が誤コミットされないようにする。

### 6. 計算ロジック単体テスト（カバレッジ 100% 必須）
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/calculation.test.ts`
- **変更箇所**: 新規作成
- **変更内容**: 仕様書 `docs/spec/calculation-logic.md` §5（最終計算式）/ §6（丸めルール）/ §7（スピード警告）/ §9（決定項目チェックリスト）のサンプルケースを 100% カバー。
  - **仕様書 §5 の `@example` 完全一致テスト**: `calculate({ monthlyVendorCost: 1_000_000, repairCost: 500_000, manualWorkerCount: 5, updateWaitMonths: 4.5, insourcingLevel: 0.25 })` → 期待値オブジェクトと完全一致（コードの JSDoc 例と仕様書のクロスチェック）。
  - **5 段階の `insourcingLevel` 全網羅**: 0 / 0.25 / 0.5 / 0.75 / 1.0 各値で `insourcingGap = 1 - insourcingLevel` を検証。`insourcingLevel: 1` で `threeYearSavings === 0`（仕様書 §4.4「完全内製は維持フェーズ」）を確認。
  - **`speedWarning` 境界条件**: `updateWaitMonths` が 2.99 / 3 / 3.01 / 0 のとき `false / true / true / false` を検証（`SPEED_WARNING_THRESHOLD_MONTHS = 3`）。
  - **`speedWarningMonthlyLoss`**: `speedWarning === false` 時は 0、`true` 時は `monthlyVendorCost * insourcingGap` であること。
  - **デフォルト値フォールバック**: `hourlyWage` / `hoursPerDay` / `daysPerMonth` を未指定で `DEFAULT_*` が適用されること（`annualProfitCreation = manualWorkerCount * 2 * 20 * 12 * 2500`）。
  - **詳細設定オーバーライド**: 3 項目を全て指定したケースで上書きが効くこと。
  - **ガード関数**: `NaN` / `Infinity` / 負値を各入力に与え、結果が 0 / フォールバック値になること（`safeNum` / `clampAmount` / `normalizeInsourcingLevel` の網羅）。
  - **不正な `insourcingLevel`**: `as` キャストで侵入する 0.7 や `NaN` を渡し、`normalizeInsourcingLevel` が安全側 0 にフォールバックすること。
  - **`manYenToYen` / `yenToManYen`**: 0 / 1 / 10_000 / 負値 / `NaN` のラウンドトリップ。
- **理由**: Issue カバレッジ目標「計算ロジック 100%」を確実に達成し、仕様書の数値根拠と実装の乖離を CI で即座に検出する。

### 7. フォーマッタ単体テスト
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/format.test.ts`
- **変更箇所**: 新規作成
- **変更内容**:
  - `formatManYen`: `0` → "0万円"、`15_000` → "2万円"、`1_350_000` → "135万円"、`NaN` → "0万円"、`-100` → "0万円"、`Infinity` → "0万円"。仕様書 §6「ゼロ値はハイフン置換しない」の確認。
  - `formatManYenCompact`: `1_350_000` → "135万円"、`10_000_000_000` → "10億円"、`10_001_000_000` → "10億100万円"（`OKU_THRESHOLD_MAN_YEN` 境界）。
  - `formatYen` / `formatPercent`（`fractionDigits` 0 / 1 / 末尾 0 除去 / 0 値の "0%" フォールバック）/ `formatHumanCount`。
- **理由**: 表示層の二重防御（NaN / 負値）と `OKU_THRESHOLD_MAN_YEN` 境界の回帰検出。

### 8. ユーティリティ単体テスト
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/cn.test.ts`
- **変更箇所**: 新規作成
- **変更内容**: `cn("a", undefined, false, null, "b")` → `"a b"`、空配列 → `""`、`cn(undefined)` → `""`。
- **理由**: Issue 本文の `src/lib/utils.ts` 想定対象は本プロジェクトでは `cn.ts` に該当する。極小だが、`InputForm` / `WarningBanner` / `DashboardView` 全てが依存する単一の真実の源のためカバーする。

### 9. メッセージ／ファイル名ユーティリティ単体テスト
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/messages.test.ts`
- **変更箇所**: 新規作成
- **変更内容**:
  - `buildCriticalOpportunityLossSubtext(1_200_000)` → "現在、月額 120 万円相当の機会損失が発生中"
  - `buildCriticalOpportunityLossSubtext(0)` → フォールバック文言
  - `buildCriticalOpportunityLossMessage` の `headline` が `"CRITICAL OPPORTUNITY LOSS"` 不変（仕様書 `docs/spec/warning-copy.md` §3.1）。
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/pdfFilename.test.ts`
- **変更内容**: `buildPdfFilename(new Date("2026-04-23T15:30:00+09:00"))` → `"matatabi-roi-20260423-1530.pdf"`、JST 固定の確認（UTC 入力でも JST 換算）。
- **理由**: `WarningBanner` / PDF ダウンロード経路の入力契約を固定。

### 10. アナリティクス単体テスト
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/analytics.test.ts`
- **変更箇所**: 新規作成
- **変更内容**:
  - `trackEvent` / `trackPageView` が no-op で例外を投げないこと。
  - `isAnalyticsEnabled` の真偽は `process.env.NEXT_PUBLIC_CF_BEACON_TOKEN` の有無に従う（モジュール初期化時に評価されるため `jest.isolateModules` でモジュールを再ロードして検証）。
- **理由**: 将来 GA4 併用や副作用追加が入った時の回帰検出ポイントを先置き。

### 11. `useCountUp` フック単体テスト
- **新規**: `/Users/YS/development/matatabi-calculator/src/hooks/useCountUp.test.ts`
- **変更箇所**: 新規作成
- **変更内容**: `@testing-library/react` の `renderHook` + `act` を使用。
  - 初期値 0 から target=10000 に向けて補間（`jest.useFakeTimers()` + 手動 `requestAnimationFrame` モックで時間を進め `easeOutCubic` の中間値を確認）。
  - `prefers-reduced-motion: reduce` のとき即時 target が返る（`window.matchMedia` モックの `matches: true` バリアント）。
  - `enabled: false` で停止し、現在値が保持される。
  - `target` を `NaN` / `Infinity` で渡したとき rAF を起動せず、現在値を保持する。
  - アンマウント時に `cancelAnimationFrame` が呼ばれる（モックスパイで検証）。
- **理由**: `ResultDashboard` のヒーロー数値演出の回帰防止。仕様書 `docs/spec/result-dashboard.md` §6.1 / §6.3 / §6.4 を機械化。

### 12. `InputForm` コンポーネントテスト
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/InputForm.test.tsx`
- **変更箇所**: 新規作成
- **変更内容**: `@testing-library/react` + `@testing-library/user-event`。
  - **送信成功パス**: 5 項目を入力 → `manYenToYen` 適用後の `CalculationInput` で `onSubmit` が呼ばれる（`monthlyVendorCost: 500_000` etc）。
  - **バリデーション**: 月額未入力で submit → `role="alert"` メッセージが出現し `onSubmit` が呼ばれない。最大値超過 / 負値 / 非整数（"abc"）も同様。
  - **エラーフォーカス**: 複数フィールドエラー時に `FIELD_ORDER` の最初のエラーフィールドにフォーカスが当たる。
  - **手作業人数ステッパー**: `+` / `-` ボタンで値が増減し、0 で `-` が disabled、1000 で `+` が disabled。
  - **セグメントコントロール**: 内製化状況の 5 ボタンが `aria-checked` を正しく切り替え、選択値が submit される。
  - **アクセシビリティ**: `aria-required` / `aria-invalid` / `aria-describedby` の配線が適切。
- **理由**: 5 項目の入力契約と `manYenToYen` 変換の単一の真実の源を保証。

### 13. `WarningBanner` コンポーネントテスト
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/WarningBanner.test.tsx`
- **変更箇所**: 新規作成
- **変更内容**:
  - `message` を渡して headline / subtext が DOM に出現すること。
  - `role="alert"` 属性付与の確認（暗黙 `aria-live="assertive"`）。
  - `className` props の合成が機能すること（既定クラス + 追加クラス）。
- **理由**: 仕様書 `docs/spec/warning-copy.md` §6 の純表示層契約を保証。条件分岐は親（`CalculatePageClient`）責務のため E2E と統合的に検証。

### 14. `ResultDashboard` / `DashboardView` コンポーネントテスト
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/DashboardView.test.tsx`
- **変更箇所**: 新規作成
- **変更内容**: 描画層 (`DashboardView`) を直接レンダリングして検証（コンテナの副作用を切り離せる利点を活かす）。
  - **3 カード表示**: ヒーロー（`formatManYenCompact`）/ 補助 2 カードが `result` の値で描画される。
  - **`isFullyInsourced` 分岐**: `insourcingLevel === 1` で「削減余地は 0 万円」テキストが出現。
  - **`isPartiallyInsourced` 分岐**: `insourcingLevel === 0.25` で内製化注記（`75%`）が出現。
  - **`headerSlot`**: `<WarningBanner />` を JSX で渡したとき DOM に出現する。
  - **PDF ボタン**: `isGeneratingPdf=true` で `aria-busy="true"` / disabled / "PDF生成中…" 表示。`onDownloadPdf` が click で呼ばれる。
  - **`onResetRequest`**: 未指定時は再診断ボタン非表示、指定時は表示 + click で呼び出される。
  - **`pdfError`**: 文字列を渡すと `role="alert"` で表示される。
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.test.tsx`
- **変更内容**: コンテナの副作用部分のみ検証。`generatePdf` を `jest.mock("@/lib/pdf")` でモックし、`handleDownloadPdf` が `pdfError` を 5 秒で消去する `setTimeout` ロジック、二重起動防止 (`isGeneratingPdfRef`) を `jest.useFakeTimers()` で検証。
- **理由**: 仕様書 §10.2 の 3 層分離を活かし、純粋描画層と副作用層を別ファイルでテストすることで責務境界を保つ。

### 15. Playwright 設定
- **新規**: `/Users/YS/development/matatabi-calculator/playwright.config.ts`
- **変更箇所**: 新規作成
- **変更内容**:
  - `testDir: "./e2e"`
  - `use: { baseURL: "http://localhost:3000", trace: "on-first-retry", acceptDownloads: true }`（PDF ダウンロード検証のため `acceptDownloads` を有効化）
  - `webServer: { command: "npm run build && npx serve out -p 3000", port: 3000, reuseExistingServer: !process.env.CI, timeout: 180_000 }`（`output: "export"` 構成のため `next start` は使わず静的サーバを起動。`serve` は `devDependencies` に追加）
  - `projects`: chromium / webkit / firefox の 3 ブラウザ（Issue 要件「クロスブラウザ」）。
  - `reporter: [["list"], ["html", { open: "never" }]]`、`fullyParallel: true`、`forbidOnly: !!process.env.CI`、`retries: process.env.CI ? 2 : 0`。
- **理由**: Issue 受け入れ条件「クロスブラウザで Playwright が動く」「`output: "export"` ビルド成果物に対する E2E」を両立。

### 16. Playwright ゴールデンパス E2E
- **新規**: `/Users/YS/development/matatabi-calculator/e2e/golden-path.spec.ts`
- **変更箇所**: 新規作成
- **変更内容**:
  - **シナリオ 1**: `/` を開き、ヒーロー CTA「いますぐ計算を始める」をクリック → `/calculate` へ遷移し、`h1: "ROI 診断"` が表示されることを assert。
  - **シナリオ 2**: 5 項目入力（月額 50 / 改修 30 / 手作業 5 / 「3〜6ヶ月」/ 「一部内製」）→ 「診断する」ボタン押下 → `region[aria-label="ROI 診断結果"]` が表示され、ヒーロー数値「3 年間のトータルインパクト」と止血/利益の値が表示されることを assert（万円表記の正規表現 `/\d+万円/`）。
  - **シナリオ 3**: 「3〜6ヶ月」選択時に WarningBanner（`role="alert"` の "CRITICAL OPPORTUNITY LOSS" headline）が表示されることを assert。
  - **シナリオ 4**: PDF ダウンロードボタンをクリック → `page.waitForEvent("download")` でダウンロードが発火し、ファイル名が `matatabi-roi-\d{8}-\d{4}\.pdf` パターンに一致することを assert。
  - **シナリオ 5（任意）**: 「再診断する」で `submitted` がリセットされ、`InputForm` が再表示されることを assert。
- **理由**: Issue 受け入れ条件「ゴールデンパスが完走する」を充足。クロスブラウザで PDF 生成（html2canvas + jsPDF）の互換性も検証できる。

### 17. E2E 補助 devDependencies
- **変更**: `/Users/YS/development/matatabi-calculator/package.json`
- **変更箇所**: `devDependencies`
- **変更内容**: `serve`（^14）を追加。`playwright.config.ts` の `webServer.command` で静的サイト配信に使用。
- **理由**: `next.config.mjs` で `output: "export"` を採用しているため `next start` は使えない。README にも明記された運用方針 `npx serve out` を E2E でも踏襲する。

## 設計上の考慮点

### Jest vs Vitest
- Next.js 16 公式が推奨する `next/jest` を採用することで、SWC ベースの高速トランスパイル + 環境変数 / `paths` / `next/font` モックが標準で得られる。Vitest を選ぶと `vite` の追加導入と Next.js 用の手動設定が必要になり、ビルド・依存・CI セットアップの複雑度が増す。

### `output: "export"` と Playwright
- Cloudflare Pages 配信を踏まえると、E2E は本番と同じ静的成果物に対して走らせるのが最も実態に近い。`next dev` を使うと SSR 経路や HMR を含み、本番ビルド独自の問題（dynamic import の挙動差）を見逃す。`webServer` を `npm run build && npx serve out` に固定する設計とした。

### 3 層分離されたダッシュボードのテスト戦略
- `DashboardView`（pure）/ `ResultDashboard`（コンテナ）/ `PdfDashboard` の責務分離が既に効いているため、テストも層別に分割する。`DashboardView` は副作用ゼロのため props 直接注入で網羅、`ResultDashboard` は `generatePdf` モックで副作用パスのみ検証。これにより Recharts のフルレンダリングを `DashboardView` テストに局所化し、`ResultDashboard` テストは `react-testing-library` の lightweight モードで高速化できる。

### モック戦略
- `next/dynamic` で読み込まれる `ResultDashboard`（`CalculatePageClient.tsx` の `dynamic(..., { ssr: false })`）は Jest 環境では SSR フェーズが無いためそのまま動作する。E2E でも `output: "export"` 後の hydration 経路で動く。
- `recharts` の `ResponsiveContainer` は `ResizeObserver` モック（`jest.setup.ts`）で対応。テストでは数値表示の検証のみに留め、SVG パスの厳密検証は行わない（脆い）。
- `html2canvas` / `jspdf` は `ResultDashboard` テストでは `jest.mock("@/lib/pdf")` で `generatePdf` ごとモック化する（重い + canvas API が jsdom に無い）。実際の PDF 生成は Playwright E2E で実ブラウザ検証する。

### カバレッジ閾値の段階導入
- 既存コードベースは未テストのため、初回 PR で `coverageThreshold` を有効化すると `src/components/landing/*` 等の未着手領域で CI が落ちる可能性がある。`collectCoverageFrom` で当面は `src/lib/**` と `src/components/calculate/**` と `src/hooks/**` に限定し、ランディング系は別 Issue で段階的に追加するのが現実的。Issue は「UI 80%+」と幅を持たせており、計算ロジックの 100% を最優先にする本プランの戦略と整合する。

### CI（#49）連携の前提
- `package.json` の `scripts` に `test` / `test:e2e` / `test:coverage` が揃っていれば、CI 側はそれらを呼ぶだけで済む。本 Issue は CI ワークフロー本体の実装は #49 のスコープ。本プランでは `test:e2e:install` も同梱し、CI 初回ジョブで `npx playwright install --with-deps` が呼べるようにする。

## 検証方法

1. `npm install` 後、`npm test` を実行 → 全単体・コンポーネントテストが通ることを確認。
2. `npm run test:coverage` を実行 → `src/lib/calculation.ts` の 4 指標（statements/branches/functions/lines）がいずれも 100、`src/lib/**` / `src/components/calculate/**` / `src/hooks/**` が 80 以上であることを確認。
3. `npx playwright install --with-deps` でブラウザを取得後、`npm run build` で `out/` を生成し `npm run test:e2e` を実行 → chromium / webkit / firefox 全てでゴールデンパスが完走することを確認。
4. ローカルで PDF ダウンロードが Playwright `download` イベントとして捕捉できることを確認（`download.suggestedFilename()` が `matatabi-roi-\d{8}-\d{4}\.pdf` に一致）。
5. `npm run lint` を実行 → テストファイルが ESLint エラーを出さないこと（テスト用 globals が解決されること）。
6. `npm run typecheck` を実行 → `*.test.ts(x)` も含めて型エラーゼロを確認。
7. 計算ロジックのカバレッジ漏れを意図的に作ることでテスト（仕様書 §5 の `@example` 値を 1 つ削除して `npm test` が落ちる）。
8. CI（#49）への連携: `npm test` / `npm run test:e2e` を 1 ステップずつ追加すれば自動実行可能であることを README に追記する想定（CI 実装は別 Issue）。
