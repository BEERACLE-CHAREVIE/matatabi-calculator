# 計算ロジック・フォーマッタ・定数の共通ユーティリティ実装プラン

## Context
本プロジェクトは Next.js 14 (App Router) + TypeScript の ROI 診断 Web アプリ「またたび計算機」。`src/lib/calculation.ts` / `src/lib/format.ts` / `src/lib/constants.ts` は未実装で、後続の `InputForm` (#2)、`ResultDashboard` (#4)、`WarningBanner` (#5)、PDF 出力 (#6) 全てが本ユーティリティに依存する。仕様は `docs/spec/calculation-logic.md` で確定済み（固定値・式・丸めルール・スピード警告条件）、フォーマッタの仕様は `docs/spec/result-dashboard.md §9` で確定済み（`formatManYen` / `formatManYenCompact`）、入力値の単位変換ヘルパは `docs/spec/input-form.md §9` で確定済み（`manYenToYen` / `yenToManYen`）。本 Issue ではこれらを純粋関数として TypeScript に落とし込む。

GitHub Issue: #38

---

## 変更対象ファイル

### 1. 計算で使用する定数の集約
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/constants.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - `docs/spec/calculation-logic.md §5` の「定数（固定）」「デフォルト値（ハイブリッドで上書き可）」を export する。値・名称は仕様書と完全一致させる。
    - `MONTHS_IN_PERIOD = 36`（試算期間 = 3 年）
    - `YEARS_IN_PERIOD = 3`
    - `REPAIRS_PER_YEAR = 3`（年あたり改修回数）
    - `MONTHS_PER_YEAR = 12`
    - `DEFAULT_HOURLY_WAGE = 2500`（円/時）
    - `DEFAULT_HOURS_PER_DAY = 2`（時間/日）
    - `DEFAULT_DAYS_PER_MONTH = 20`（日/月）
  - 内製化選択肢を `as const` 配列で公開し、リテラル union 型 `InsourcingLevel` を導出（`§10` 推奨事項）。各要素は `{ value, label, shortLabel, gap }` を持つ。値は `0 / 0.25 / 0.5 / 0.75 / 1.0`、ラベルは `docs/spec/calculation-logic.md §4.1` および `docs/spec/input-form.md §4.5` の対応表をそのまま採用。
    ```ts
    export const INSOURCING_LEVELS = [
      { value: 0,    label: "完全ベンダー依存", shortLabel: "完全依存", gap: 1.0 },
      { value: 0.25, label: "一部内製",         shortLabel: "一部",     gap: 0.75 },
      { value: 0.5,  label: "半分内製",         shortLabel: "半分",     gap: 0.5 },
      { value: 0.75, label: "大半内製",         shortLabel: "大半",     gap: 0.25 },
      { value: 1.0,  label: "完全内製",         shortLabel: "完全",     gap: 0.0 },
    ] as const;
    export type InsourcingLevel = (typeof INSOURCING_LEVELS)[number]["value"];
    ```
  - スピード警告閾値 `SPEED_WARNING_THRESHOLD_MONTHS = 3`（`§7`）。
  - 億円表記切替閾値 `OKU_THRESHOLD_MAN_YEN = 100_000`（10 億円 = 100,000 万円。`docs/spec/result-dashboard.md §9.2` 準拠）。
  - 単位変換係数 `YEN_PER_MAN_YEN = 10_000`。
- **理由**: `any` 不使用・`as const` からの union 導出は仕様書 §10「実行時・型の両面から堅牢化」要件への対応。同じ数値が `calculation.ts` / `format.ts` / 後続フォーム両方で必要となるため一元管理する。

---

### 2. 計算ロジック本体
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/calculation.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - 型定義
    ```ts
    export interface CalculationInput {
      monthlyVendorCost: number;        // 円
      repairCost: number;               // 円
      manualWorkerCount: number;        // 人
      updateWaitMonths: number;         // 月
      insourcingLevel: InsourcingLevel; // 0 | 0.25 | 0.5 | 0.75 | 1.0
      hourlyWage?: number;              // 円/時（未指定時 DEFAULT_HOURLY_WAGE）
      hoursPerDay?: number;             // 時間/日
      daysPerMonth?: number;            // 日/月
    }
    export interface CalculationOutput {
      threeYearSavings: number;         // 円（内部保持）
      annualProfitCreation: number;     // 円
      threeYearProfitCreation: number;  // 円
      totalThreeYearImpact: number;     // 円
      speedWarning: boolean;
      insourcingGap: number;            // 0..1
    }
    ```
    - 注: `Inputs` / `CalculationResult`（仕様書原文）ではなく、Issue 本文が要求する命名 `CalculationInput` / `CalculationOutput` を正式名とする。仕様書側の型名はコメントで併記する。
  - 純粋関数 `calculate(input: CalculationInput): CalculationOutput` を実装。
  - 数値ガード（受け入れ条件「NaN / Infinity / 負の入力で安全にフォールバック」対応）を **計算式適用前** に通す内部ヘルパ `safeNum(n: number, { min = 0, fallback = 0 } = {}): number` を実装：
    - `Number.isFinite(n) === false` または `n < min` の場合 `fallback` を返す。
    - `monthlyVendorCost` / `repairCost` / `manualWorkerCount` / `updateWaitMonths` は `min: 0`、`hourlyWage` / `hoursPerDay` / `daysPerMonth` は `?? DEFAULT_*` で吸収後に `safeNum`。
    - `insourcingLevel` は `INSOURCING_LEVELS.some(l => l.value === input.insourcingLevel)` でメンバーシップチェックし、外れ値は `0`（完全ベンダー依存 = 安全側）にフォールバック。
  - 主要式（`docs/spec/calculation-logic.md §5` の擬似コードと完全一致）:
    - `insourcingGap = 1 - insourcingLevel`
    - `rawSavings = monthlyVendorCost * MONTHS_IN_PERIOD + repairCost * REPAIRS_PER_YEAR * YEARS_IN_PERIOD`
    - `threeYearSavings = rawSavings * insourcingGap`
    - `annualProfitCreation = manualWorkerCount * hoursPerDay * daysPerMonth * MONTHS_PER_YEAR * hourlyWage`
    - `threeYearProfitCreation = annualProfitCreation * YEARS_IN_PERIOD`
    - `totalThreeYearImpact = threeYearSavings + threeYearProfitCreation`
    - `speedWarning = updateWaitMonths >= SPEED_WARNING_THRESHOLD_MONTHS`
  - 出力ガード: 各金額系プロパティは出力直前に `Math.max(0, value)` でクリップし、`Number.isFinite` チェックで NaN/Infinity を `0` 化（`§6` 「負値発生時は 0 として表示」「NaN / Infinity 安全にフォールバック」）。
  - 内部計算は **円単位・浮動小数のまま**で保持し、丸めは行わない（`docs/spec/calculation-logic.md §6` 「内部計算は円単位・浮動小数で保持」）。表示時の万円丸めは `format.ts` 側に閉じ込める。
  - 単位変換ヘルパ（`docs/spec/input-form.md §9.1`）も同ファイルに `manYenToYen(manYen: number): number` / `yenToManYen(yen: number): number` を export。`InputForm` 側からの単一入口とする。
- **理由**: Issue 本文「`CalculationInput` / `CalculationOutput` 型が定義され、すべての関数で `any` を使っていない」「サンプルケースで期待値どおり」「NaN / Infinity / 負の入力で安全にフォールバック」を満たすため。式は仕様書原本と一字一句揃える（説明責任原則）。

---

### 3. フォーマッタ
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/format.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - `formatManYen(yen: number): string`
    - `docs/spec/result-dashboard.md §9.1` 準拠。
    - `Math.round(yen / YEN_PER_MAN_YEN)` で四捨五入 → `toLocaleString("ja-JP")` で 3 桁区切り → `"◯◯万円"` を返す。
    - ゼロ値はそのまま `"0万円"`（ハイフン置換しない）。
    - `Number.isFinite(yen) === false` または `yen < 0` の場合 `"0万円"` を返す（NaN/Infinity/負値ガード）。
  - `formatManYenCompact(yen: number): string`
    - `docs/spec/result-dashboard.md §9.2` 準拠。
    - 万円換算後 `< OKU_THRESHOLD_MAN_YEN`（10 億円 = 100,000 万円）の場合は `formatManYen` 互換出力。
    - それ以上の場合 `oku = Math.floor(manYen / 10_000)`、`remainder = manYen % 10_000`。
      - `remainder === 0` → `"◯億円"`
      - それ以外 → `"◯億◯万円"`（億・万円ともに `toLocaleString("ja-JP")`）。
    - NaN / Infinity / 負値ガードは `formatManYen` と同等。
  - `formatYen(yen: number): string`
    - `"1,234,567 円"` 形式。デバッグ用途・将来 PDF の補助表示用。`Math.round(yen).toLocaleString("ja-JP")` ＋ `" 円"`。NaN ガードあり。
  - `formatPercent(rate: number, fractionDigits = 0): string`
    - `0.75` → `"75%"`。`docs/spec/result-dashboard.md §3.3` の内製化注記用（`insourcingLevel * 100` の % 表示）。
    - `(rate * 100).toFixed(fractionDigits)` の末尾ゼロ除去 ＋ `"%"`。NaN ガード時は `"0%"`。
  - `formatHumanCount(n: number): string`
    - `"5 人"` 等の補助表示。`Math.max(0, Math.round(n)).toLocaleString("ja-JP") + " 人"`。
- **理由**: 受け入れ条件「フォーマッタが『円』『万円』『億円』表記を仕様どおりに切り替えること」と、ダッシュボード／PDF 双方で同一フォーマッタを共有する `§9.3` の「単一の真実の源」要件に対応。NaN/Infinity ガードを Formatter 層にも置くことで、`calculate` 側の保険を二重化する。

---

### 4. ESLint / TypeScript 規約遵守
- **変更**: 上記 3 ファイル全てに以下を徹底
  - `any` 不使用（受け入れ条件）
  - `strict: true`（`tsconfig.json`）配下でのコンパイル成功
  - 既存パターン（`src/lib/cn.ts` / `src/lib/analytics.ts`）に倣い、ファイル冒頭にモジュール役割を JSDoc で記述、関数シグネチャ全てに JSDoc コメントを付与
  - 未使用変数 ESLint ルール（`@typescript-eslint/no-unused-vars`、`argsIgnorePattern: "^_"`）に準拠
  - `import type` を型のみインポートで使用
- **理由**: `.eslintrc.json` / `tsconfig.json` / 既存ファイルの規約に揃え、後続実装で `npm run lint` / `npm run typecheck` を通すため。

---

## 設計上の考慮点

### A. 型名の方針
Issue 本文は `CalculationInput` / `CalculationOutput` を要求し、仕様書 `§5` は `Inputs` / `CalculationResult` を使用している。Issue を正とし、仕様書側の型名は JSDoc に併記して読み手の混乱を防ぐ。

### B. 単位の境界
- **`calculation.ts` の入出力は円単位**。
- **UI 入力値（万円）→ 円**の変換責務は `manYenToYen` に閉じ、後続 `InputForm` 実装が単一入口で利用できるようにする。仕様書 `input-form.md §9` が要求する Test ケース（`1` → `10_000`、`10_000` → `100_000_000` 等）はテスト時に検証。
- **円 → 表示文字列**は `format.ts` が独占。`calculation.ts` は丸めをしない。

### C. NaN / Infinity / 負値の二重防衛
仕様書 `§6` は「負値は計算上発生しない前提」「発生時は `0` として表示」と規定。バグ・上流の不正入力に備え、
- `calculate` 内部で入力時にフォールバック（`safeNum`）
- `calculate` 出力時にクリップ（`Math.max(0, ...)` + `isFinite` ガード）
- `format.ts` でも表示時に最終ガード
の三段で防御する。テスト容易性のため `safeNum` は同モジュール内 private（export しない）に留める。

### D. `as const` パターン
仕様書 `§10` の推奨「`InsourcingLevel` は `as const` 配列からリテラル union 型を導出」を採用。これにより `InputForm` 側のセグメントコントロールも同じ配列をループでき、ラベル文言の二重定義を防ぐ。

### E. 億円表記の境界値
`docs/spec/result-dashboard.md §9.2` の閾値「10 億円 = 100,000 万円」は仕様書 `formatManYenCompact` 擬似コードと完全一致させる。仕様書のロジックに従い:
- `9_999_999_999` 円 → 万円換算で `1_000_000` 未満 → `"1,000,000万円"`（仕様書のサンプル動作通り）。
- `10_000_000_000` 円 → `"10億円"`。
- `10_001_000_000` 円 → `"10億100万円"`。

### F. テスト
本 Issue ではテストランナーが未導入（`package.json` に `jest`/`vitest` なし）。仕様書 §5 のサンプルケースを「JSDoc 例示 + 後続でユニットテスト基盤導入時に移植」する方針として JSDoc に動作例を埋め込む。受け入れ条件「サンプルケースで期待値どおりの結果」は、最低限以下の値で手動検証する：
- **最小値**: `monthlyVendorCost: 10_000`（1 万円）, `repairCost: 0`, `manualWorkerCount: 0`, `updateWaitMonths: 0.5`, `insourcingLevel: 0` → `threeYearSavings = 360_000`、`annualProfitCreation = 0`、`speedWarning = false`。
- **標準値**: `monthlyVendorCost: 1_000_000`（100 万円）, `repairCost: 500_000`, `manualWorkerCount: 5`, `updateWaitMonths: 4.5`, `insourcingLevel: 0.25`, デフォルト値使用 → `rawSavings = 36_000_000 + 4_500_000 = 40_500_000`、`threeYearSavings = 30_375_000`、`annualProfitCreation = 5 * 2 * 20 * 12 * 2_500 = 6_000_000`、`speedWarning = true`。
- **最大値**: `monthlyVendorCost: 100_000_000`（1 億円/月）, `repairCost: 50_000_000`, `manualWorkerCount: 1_000`, `updateWaitMonths: 18`, `insourcingLevel: 0` → `threeYearSavings = 4_050_000_000`、`annualProfitCreation = 1.2e9`、`speedWarning = true`、`formatManYenCompact(totalThreeYearImpact)` が「○億○万円」表記になることを確認。
- **完全内製**: `insourcingLevel: 1.0` → `threeYearSavings = 0`、`annualProfitCreation > 0`（係数を乗算しない）、`insourcingGap = 0` を確認（仕様書 `§4.3` 「創出には乗算しない」検証）。
- **NaN ケース**: `monthlyVendorCost: NaN` → `0` フォールバック → `threeYearSavings = 0`。
- **Infinity ケース**: `manualWorkerCount: Infinity` → `0` フォールバック → `annualProfitCreation = 0`。

### G. 後続 Issue との接続
- `InputForm`（#2）は `CalculationInput` 型・`manYenToYen` ヘルパ・`INSOURCING_LEVELS` を直接参照。
- `ResultDashboard`（#4）は `CalculationOutput`・`formatManYen`・`formatManYenCompact`・`formatPercent` を参照。
- `WarningBanner`（#5）は `output.speedWarning` のみ参照（閾値定数は再 export 不要）。
- `PDF 出力`（#6）はフォーマッタを `ResultDashboard` 経由で間接利用。

---

## 検証方法
1. `npm run typecheck` を実行し、`strict` モードでエラーが 0 であることを確認。
2. `npm run lint` を実行し、`@typescript-eslint/no-unused-vars` 等が通ることを確認。
3. `src/lib/calculation.ts` を一時的に `src/app/calculate/page.tsx`（または開発用スクラッチ）から import し、上記「設計上の考慮点 §F」の最小値 / 標準値 / 最大値 / 完全内製 / NaN / Infinity の 6 ケースをコンソールで実行し、期待値と一致することを確認。
4. `formatManYen(0)` → `"0万円"`、`formatManYen(15_000)` → `"2万円"`、`formatManYen(1_350_000)` → `"135万円"`（仕様書 §6 の例）、`formatManYenCompact(10_000_000_000)` → `"10億円"`、`formatManYenCompact(10_001_000_000)` → `"10億100万円"` を目視確認。
5. `formatManYen(NaN)` / `formatManYen(-100)` / `formatManYen(Infinity)` がいずれも `"0万円"` を返すことを確認。
6. `INSOURCING_LEVELS` から導出した `InsourcingLevel` 型が `0 | 0.25 | 0.5 | 0.75 | 1` のリテラル union になっていることを IDE 上で hover 確認（仕様書 §10 推奨事項）。
7. `manYenToYen(1)` → `10_000`、`manYenToYen(10_000)` → `100_000_000`（`docs/spec/input-form.md §9.3` の必須テストケース）を目視確認。
