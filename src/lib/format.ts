/**
 * 数値・通貨・パーセント・人数の表示フォーマッタ群。
 *
 * - 仕様: docs/spec/result-dashboard.md §9.1（formatManYen）/ §9.2（formatManYenCompact）
 *         docs/spec/calculation-logic.md §6（万円四捨五入・ゼロ値はハイフン置換しない）
 * - 設計: ダッシュボードと PDF で同一フォーマッタを共有する「単一の真実の源」。
 *         calculation.ts 側でも入力ガードしているが、表示層でも NaN / Infinity / 負値を
 *         安全側にフォールバックして二重防御する。
 */

import { OKU_THRESHOLD_MAN_YEN, YEN_PER_MAN_YEN } from "./constants";

const ZERO_MAN_YEN = "0万円";
const ZERO_YEN = "0円";
const ZERO_PERCENT = "0%";
const ZERO_HUMAN = "0 人";

/**
 * 円単位の値を「◯◯万円」形式に変換する。万円単位で四捨五入し、3 桁区切り。
 * NaN / Infinity / 負値は `"0万円"` を返す。
 *
 * @example
 * formatManYen(0);          // → "0万円"
 * formatManYen(15_000);     // → "2万円"
 * formatManYen(1_350_000);  // → "135万円"
 * formatManYen(NaN);        // → "0万円"
 * formatManYen(-100);       // → "0万円"
 */
export function formatManYen(yen: number): string {
  if (!Number.isFinite(yen) || yen < 0) return ZERO_MAN_YEN;
  const manYen = Math.round(yen / YEN_PER_MAN_YEN);
  return `${manYen.toLocaleString("ja-JP")}万円`;
}

/**
 * ヒーロー数値専用の大桁対応フォーマッタ。万円換算後の値が
 * `OKU_THRESHOLD_MAN_YEN`（10 億円相当）以上のとき「◯億◯万円」表記に切り替える。
 * NaN / Infinity / 負値は `"0万円"` を返す。
 *
 * @example
 * formatManYenCompact(1_350_000);       // → "135万円"
 * formatManYenCompact(10_000_000_000);  // → "10億円"
 * formatManYenCompact(10_001_000_000);  // → "10億100万円"
 */
export function formatManYenCompact(yen: number): string {
  if (!Number.isFinite(yen) || yen < 0) return ZERO_MAN_YEN;
  const manYen = Math.round(yen / YEN_PER_MAN_YEN);
  if (manYen < OKU_THRESHOLD_MAN_YEN) {
    return `${manYen.toLocaleString("ja-JP")}万円`;
  }
  const oku = Math.floor(manYen / OKU_THRESHOLD_MAN_YEN);
  const remainder = manYen % OKU_THRESHOLD_MAN_YEN;
  if (remainder === 0) {
    return `${oku.toLocaleString("ja-JP")}億円`;
  }
  return `${oku.toLocaleString("ja-JP")}億${remainder.toLocaleString("ja-JP")}万円`;
}

/**
 * 円単位の値を「1,234,567円」形式に変換する。デバッグ・PDF 補助表示用。
 * `formatManYen` と表記を揃えるため通貨単位の前にスペースを入れない。
 * NaN / Infinity / 負値は `"0円"` を返す。
 */
export function formatYen(yen: number): string {
  if (!Number.isFinite(yen) || yen < 0) return ZERO_YEN;
  return `${Math.round(yen).toLocaleString("ja-JP")}円`;
}

/**
 * 比率（0..1）をパーセント表記に変換する。`fractionDigits` で小数桁を制御し、
 * 末尾の不要なゼロを除去して返す。NaN / Infinity / 負値は `"0%"` を返す。
 *
 * @example
 * formatPercent(0.75);     // → "75%"
 * formatPercent(0.123, 1); // → "12.3%"
 */
export function formatPercent(rate: number, fractionDigits = 0): string {
  if (!Number.isFinite(rate) || rate < 0) return ZERO_PERCENT;
  const fixed = (rate * 100).toFixed(fractionDigits);
  // fractionDigits > 0 のとき末尾の不要な 0 と小数点を除去する。
  // 値が 0 のときは regex が全文字を削除してしまうため、空文字なら "0" にフォールバック。
  const trimmed =
    fractionDigits > 0 ? fixed.replace(/\.?0+$/, "") || "0" : fixed;
  return `${trimmed}%`;
}

/**
 * 人数を「◯ 人」形式に変換する。負値・NaN・Infinity は `"0 人"`。
 */
export function formatHumanCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ZERO_HUMAN;
  return `${Math.round(n).toLocaleString("ja-JP")} 人`;
}
