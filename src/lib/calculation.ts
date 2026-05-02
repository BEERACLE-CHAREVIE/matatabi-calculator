/**
 * ROI 診断アプリ「またたび計算機」の計算ロジック本体。
 *
 * - 仕様: docs/spec/calculation-logic.md §5（最終計算式）/ §6（丸めルール）/ §7（スピード警告）
 *         docs/spec/input-form.md §9（単位変換）
 * - 原則: 純粋関数。UI に依存しない。内部計算は円単位・浮動小数のまま保持し、
 *         丸め・単位文字列付与は format.ts に閉じ込める。
 * - ガード: NaN / Infinity / 負値は受け入れ不能とし、フォールバック 0 を返す
 *           （仕様書 §6「負値発生時は 0 として表示」）。
 */

import {
  DEFAULT_DAYS_PER_MONTH,
  DEFAULT_HOURLY_WAGE,
  DEFAULT_HOURS_PER_DAY,
  INSOURCING_LEVELS,
  MONTHS_IN_PERIOD,
  MONTHS_PER_YEAR,
  REPAIRS_PER_YEAR,
  SPEED_WARNING_THRESHOLD_MONTHS,
  YEARS_IN_PERIOD,
  YEN_PER_MAN_YEN,
} from "./constants";
import type { InsourcingLevel } from "./constants";

/**
 * 計算入力。仕様書 §5 の `Inputs` 型に対応。
 *
 * - 単位はすべて円（`monthlyVendorCost` / `repairCost` / `hourlyWage`）または
 *   人 / 月 / 時間 / 日。UI 側の万円入力は `manYenToYen` で変換してから渡すこと。
 * - `hourlyWage` / `hoursPerDay` / `daysPerMonth` は詳細設定（オプション）。
 *   未指定時は constants.ts の `DEFAULT_*` を使用する。
 */
export interface CalculationInput {
  monthlyVendorCost: number;
  repairCost: number;
  manualWorkerCount: number;
  updateWaitMonths: number;
  insourcingLevel: InsourcingLevel;
  hourlyWage?: number;
  hoursPerDay?: number;
  daysPerMonth?: number;
}

/**
 * 計算結果。仕様書 §5 の `CalculationResult` 型に対応。
 *
 * - 金額系プロパティはすべて円単位の浮動小数。表示時に format.ts で万円丸めする。
 * - `speedWarning`: `updateWaitMonths >= 3` で `true`（仕様書 §7）。
 * - `speedWarningMonthlyLoss`: 警告バナーへ動的差し込みする月額機会損失（円単位）。
 *   `speedWarning === true` のとき `monthlyVendorCost * insourcingGap`、それ以外は 0
 *   （docs/spec/warning-copy.md §7.1 / §7.3）。
 * - `insourcingGap`: `1 - insourcingLevel`（0..1）。止血額への乗算係数。
 */
export interface CalculationOutput {
  threeYearSavings: number;
  annualProfitCreation: number;
  threeYearProfitCreation: number;
  totalThreeYearImpact: number;
  speedWarning: boolean;
  speedWarningMonthlyLoss: number;
  insourcingGap: number;
}

/**
 * 数値を安全な範囲に正規化する。NaN / Infinity / `min` 未満の値は `fallback` に置換する。
 * 仕様書 §6「負値発生時は 0 として表示」「NaN / Infinity に安全にフォールバック」を実現する内部ヘルパ。
 */
function safeNum(
  value: number,
  options: { min?: number; fallback?: number } = {},
): number {
  const { min = 0, fallback = 0 } = options;
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return fallback;
  return value;
}

/**
 * `insourcingLevel` が `INSOURCING_LEVELS` の値域に属するか検証し、外れ値は安全側
 * （`0` = 完全ベンダー依存）にフォールバックする。`as` キャストで上流から不正値が
 * 流入したケースに備える。
 */
function normalizeInsourcingLevel(level: InsourcingLevel): InsourcingLevel {
  const isValid = INSOURCING_LEVELS.some((entry) => entry.value === level);
  return isValid ? level : 0;
}

/**
 * 計算結果の金額系プロパティを最終クリップする。NaN / Infinity / 負値を 0 に丸める。
 */
function clampAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
}

/**
 * ROI 診断の中心関数。仕様書 §5 の擬似コードと一致する純粋関数。
 *
 * 主要式:
 * - `insourcingGap = 1 - insourcingLevel`
 * - `threeYearSavings =
 *      (monthlyVendorCost * MONTHS_IN_PERIOD
 *       + repairCost * REPAIRS_PER_YEAR * YEARS_IN_PERIOD)
 *      * insourcingGap`
 * - `annualProfitCreation =
 *      manualWorkerCount * hoursPerDay * daysPerMonth
 *      * MONTHS_PER_YEAR * hourlyWage`
 * - `threeYearProfitCreation = annualProfitCreation * YEARS_IN_PERIOD`
 * - `totalThreeYearImpact = threeYearSavings + threeYearProfitCreation`
 * - `speedWarning = updateWaitMonths >= SPEED_WARNING_THRESHOLD_MONTHS`
 *
 * @example
 * // 標準値
 * calculate({
 *   monthlyVendorCost: 1_000_000,
 *   repairCost: 500_000,
 *   manualWorkerCount: 5,
 *   updateWaitMonths: 4.5,
 *   insourcingLevel: 0.25,
 * });
 * // → { threeYearSavings: 30_375_000, annualProfitCreation: 6_000_000,
 * //     threeYearProfitCreation: 18_000_000,
 * //     totalThreeYearImpact: 48_375_000, speedWarning: true,
 * //     insourcingGap: 0.75 }
 */
export function calculate(input: CalculationInput): CalculationOutput {
  const monthlyVendorCost = safeNum(input.monthlyVendorCost);
  const repairCost = safeNum(input.repairCost);
  const manualWorkerCount = safeNum(input.manualWorkerCount);
  const updateWaitMonths = safeNum(input.updateWaitMonths);

  const hourlyWage = safeNum(input.hourlyWage ?? DEFAULT_HOURLY_WAGE, {
    fallback: DEFAULT_HOURLY_WAGE,
  });
  const hoursPerDay = safeNum(input.hoursPerDay ?? DEFAULT_HOURS_PER_DAY, {
    fallback: DEFAULT_HOURS_PER_DAY,
  });
  const daysPerMonth = safeNum(input.daysPerMonth ?? DEFAULT_DAYS_PER_MONTH, {
    fallback: DEFAULT_DAYS_PER_MONTH,
  });

  const insourcingLevel = normalizeInsourcingLevel(input.insourcingLevel);
  const insourcingGap = 1 - insourcingLevel;

  const rawSavings =
    monthlyVendorCost * MONTHS_IN_PERIOD +
    repairCost * REPAIRS_PER_YEAR * YEARS_IN_PERIOD;
  const threeYearSavings = clampAmount(rawSavings * insourcingGap);

  const annualProfitCreation = clampAmount(
    manualWorkerCount * hoursPerDay * daysPerMonth * MONTHS_PER_YEAR * hourlyWage,
  );
  const threeYearProfitCreation = clampAmount(
    annualProfitCreation * YEARS_IN_PERIOD,
  );
  const totalThreeYearImpact = clampAmount(
    threeYearSavings + threeYearProfitCreation,
  );

  const speedWarning = updateWaitMonths >= SPEED_WARNING_THRESHOLD_MONTHS;
  const speedWarningMonthlyLoss = speedWarning
    ? clampAmount(monthlyVendorCost * insourcingGap)
    : 0;

  return {
    threeYearSavings,
    annualProfitCreation,
    threeYearProfitCreation,
    totalThreeYearImpact,
    speedWarning,
    speedWarningMonthlyLoss,
    insourcingGap,
  };
}

/**
 * 万円表記の数値を円単位に変換する。UI 入力（万円）→ 計算ロジック（円）の単一入口。
 *
 * @example
 * manYenToYen(1);       // → 10_000
 * manYenToYen(10_000);  // → 100_000_000
 */
export function manYenToYen(manYen: number): number {
  return manYen * YEN_PER_MAN_YEN;
}

/**
 * 円単位の数値を万円表記の数値に変換する。表示文字列化は format.ts 側で行う。
 *
 * @example
 * yenToManYen(10_000);       // → 1
 * yenToManYen(100_000_000);  // → 10_000
 */
export function yenToManYen(yen: number): number {
  return yen / YEN_PER_MAN_YEN;
}
