/**
 * UI 表示文言を組み立てるテンプレート関数群。
 *
 * - 仕様: docs/spec/warning-copy.md §3.1（メインフレーズ）/ §3.3（採用文言）/
 *         §7.1〜§7.4（動的差し込み・実装契約）/ §9（エクスポート API）
 * - 設計: 純粋関数のみ。UI / フォーマッタ層に依存しない単一の真実の源。
 *         将来 i18n を導入する際は本ファイルの戻り値型を維持したまま、
 *         呼び出し側を i18n キー差し替え可能な構造に置換する想定（§11.4）。
 * - 単位契約: `monthlyLossYen` は **円単位**で受け取り、関数内で万円換算する。
 */

import { YEN_PER_MAN_YEN } from "./constants";

/**
 * スピード警告の英語見出し。仕様書 §3.1 で確定したブランドフレーズ。
 * 全大文字・不変。
 */
export const CRITICAL_OPPORTUNITY_LOSS_HEADLINE = "CRITICAL OPPORTUNITY LOSS";

/** スピード警告バナーへ渡す構造化メッセージ。仕様書 §9.3 の `warningMessage` 型に対応。 */
export interface CriticalOpportunityLossMessage {
  headline: string;
  subtext: string;
}

/**
 * スピード警告のサブテキスト本文を組み立てる。仕様書 §7.4 の擬似コードを正本実装。
 *
 * - `monthlyLossYen <= 0` のとき: フォールバック文言（仕様書 §3.3 候補 c）。
 * - それ以外: `Math.round(monthlyLossYen / YEN_PER_MAN_YEN)` で万円換算し、
 *   `ja-JP` ロケールの 3 桁区切り整数として差し込む（§7.1 / §7.4）。
 *
 * @example
 * buildCriticalOpportunityLossSubtext(1_200_000); // → "現在、月額 120 万円相当の機会損失が発生中"
 * buildCriticalOpportunityLossSubtext(0);         // → "3ヶ月以上の更新待ちで機会損失が累積中"
 */
export function buildCriticalOpportunityLossSubtext(
  monthlyLossYen: number,
): string {
  if (monthlyLossYen <= 0) {
    return "3ヶ月以上の更新待ちで機会損失が累積中";
  }
  const manYen = Math.round(monthlyLossYen / YEN_PER_MAN_YEN);
  return `現在、月額 ${manYen.toLocaleString("ja-JP")} 万円相当の機会損失が発生中`;
}

/**
 * `WarningBanner` の `message` props にそのまま渡せる構造化オブジェクトを組み立てる。
 * 仕様書 §7.4 / §9.2 の `buildCriticalOpportunityLossMessage` を正本実装。
 *
 * 典型的な呼び出し条件は `speedWarning === true && insourcingLevel !== 1`
 * （仕様書 §4.3.3）。表示可否の判定は呼び出し側（`ResultDashboard` コンテナ）で行い、
 * 本関数自身は文言生成のみを担当する。
 */
export function buildCriticalOpportunityLossMessage(
  monthlyLossYen: number,
): CriticalOpportunityLossMessage {
  return {
    headline: CRITICAL_OPPORTUNITY_LOSS_HEADLINE,
    subtext: buildCriticalOpportunityLossSubtext(monthlyLossYen),
  };
}
