/**
 * PDF レポート出力で参照する静的定数群（連絡先・ロゴ・固定文言）。
 *
 * - 仕様: docs/spec/pdf-report.md §6.1 / §6.2 / §6.4 / §13.5 / §13.6
 * - 設計: 「運用で差し替え可能な値」を `PdfDashboard` の JSX から切り離して集約する。
 *         ロゴパス（`PDF_LOGO_SRC`）は `next.config.mjs` の `output: "export"` 静的配信
 *         に乗るため `public/` 配下からの絶対パスで指定する。
 *         連絡先・カテゴリ訴求文言は仕様書 §13.5 / §13.6 で「将来確定」扱いとなっており、
 *         本ファイルの定数値を差し替えるだけで運用に追従できるよう独立させている。
 */

/** PDF フッター左端に表示する社名（仕様書 §6.2）。 */
export const PDF_COMPANY_NAME = "株式会社ねこにまたたび";

/**
 * PDF フッター中央に表示する連絡先（仕様書 §6.2 / §13.5）。
 *
 * Issue #14（アクセス解析）または別運用 Issue で正式値が確定するまでの **暫定値**。
 * 誤配信防止のため `example` ドメインを使用している。確定後はここを差し替える。
 */
export const PDF_CONTACT_TEXT = "contact@nekonimatatabi.example";

/** PDF ヘッダー中央に表示するレポートタイトル（仕様書 §6.1）。 */
export const PDF_REPORT_TITLE = "ROI診断結果レポート";

/**
 * PDF ヘッダー左端に描画するロゴの静的パス（仕様書 §6.4）。
 * `public/brand/logo-pdf.svg` を `next.config.mjs` の `output: "export"` でそのまま静的配信。
 */
export const PDF_LOGO_SRC = "/brand/logo-pdf.svg";

/**
 * PDF 下部の免責文言（仕様書 §5.4 ASCII ワイヤー / docs/spec/calculation-logic.md §6.1）。
 * A4 1 枚に収めるため簡潔に整形する。
 */
export const PDF_DISCLAIMER_TEXT =
  "本試算は入力値に基づく理論上の最大値であり、実際の効果を保証するものではありません。";

/**
 * カテゴリ訴求文言のプレースホルダ（仕様書 §13.6）。
 * Issue #1 の将来拡張で確定するまでの仮文字列。差し替え時はここを更新する。
 */
export const PDF_CATEGORY_PLACEHOLDER =
  "ベンダー依存からの脱却で、IT コストを成長投資へ。";
