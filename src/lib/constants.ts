/**
 * 計算ロジック・フォーマッタで参照する定数群。
 *
 * - 仕様: docs/spec/calculation-logic.md §5（固定値・デフォルト値）／§4.1（内製化選択肢）
 *         docs/spec/result-dashboard.md §9.2（億円表記閾値）
 *         docs/spec/input-form.md §9.1（万円↔円変換係数）
 * - 設計: 同じ数値が calculation.ts / format.ts / 後続 InputForm から参照されるため、
 *         単一の真実の源として本ファイルに集約する。
 *         INSOURCING_LEVELS は as const 配列からリテラル union 型を導出する
 *         （仕様書 §10「実行時・型の両面から堅牢化」要件）。
 */

/** 試算期間（月）。商品コンセプト「3年間の止血」に結合された固定値。 */
export const MONTHS_IN_PERIOD = 36;

/** 試算年数。`MONTHS_IN_PERIOD / MONTHS_PER_YEAR` と一致する固定値。 */
export const YEARS_IN_PERIOD = 3;

/** 年あたり改修回数（四半期想定で軽微 1 回を除外した固定値）。 */
export const REPAIRS_PER_YEAR = 3;

/** 年あたり月数（暦定数）。 */
export const MONTHS_PER_YEAR = 12;

/** 時給単価デフォルト（円/時）。詳細設定で上書き可。 */
export const DEFAULT_HOURLY_WAGE = 2_500;

/** 1 日あたり手作業時間デフォルト（時間/日）。詳細設定で上書き可。 */
export const DEFAULT_HOURS_PER_DAY = 2;

/** 月あたり稼働日数デフォルト（日/月）。詳細設定で上書き可。 */
export const DEFAULT_DAYS_PER_MONTH = 20;

/** スピード警告発動閾値（月）。`updateWaitMonths >= 3` で警告。 */
export const SPEED_WARNING_THRESHOLD_MONTHS = 3;

/** 万円 ⇄ 円の換算係数（10,000）。 */
export const YEN_PER_MAN_YEN = 10_000;

/**
 * 億円表記切替閾値（万円単位）。
 * `formatManYenCompact` は万円換算後の値が本値以上のとき「◯億◯万円」表記へ切り替える。
 * 100,000 万円 = 10 億円（docs/spec/result-dashboard.md §9.2）。
 */
export const OKU_THRESHOLD_MAN_YEN = 100_000;

/**
 * 内製化状況の選択肢。`as const` でリテラル型を維持し、
 * `value` から union 型 `InsourcingLevel` を導出する。
 *
 * - `value`: 内製化の進捗（0 = 完全ベンダー依存、1.0 = 完全内製）
 * - `gap`: 1 - value（止血額への乗算係数）
 * - `label`: 通常の選択 UI で表示するラベル
 * - `shortLabel`: グラフ凡例など狭い領域での短縮表示用
 *
 * 仕様: docs/spec/calculation-logic.md §4.1
 */
export const INSOURCING_LEVELS = [
  { value: 0, label: "完全ベンダー依存", shortLabel: "完全依存", gap: 1.0 },
  { value: 0.25, label: "一部内製", shortLabel: "一部", gap: 0.75 },
  { value: 0.5, label: "半分内製", shortLabel: "半分", gap: 0.5 },
  { value: 0.75, label: "大半内製", shortLabel: "大半", gap: 0.25 },
  { value: 1.0, label: "完全内製", shortLabel: "完全", gap: 0.0 },
] as const;

/**
 * 内製化状況のリテラル union 型。
 * `0 | 0.25 | 0.5 | 0.75 | 1`
 */
export type InsourcingLevel = (typeof INSOURCING_LEVELS)[number]["value"];
