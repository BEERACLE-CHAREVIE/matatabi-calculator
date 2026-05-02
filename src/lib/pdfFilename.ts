/**
 * PDF ダウンロード時のファイル名を組み立てるユーティリティ。
 *
 * - 仕様: docs/spec/pdf-report.md §7.1（命名規則 `matatabi-roi-{YYYYMMDD}-{HHmm}.pdf`）/
 *         §11.3（疑似コード正本）
 * - 脆弱性方針: docs/security/jspdf-vulnerabilities.md §2.1（Path Traversal 到達不能判定）
 *         に従い、**ユーザー入力を一切混入させず**、`Intl.DateTimeFormat("ja-JP",
 *         { timeZone: "Asia/Tokyo" })` の `formatToParts` から抽出した数値文字列のみで
 *         ファイル名を構成する。grep でレビューしやすい単純構造を維持する。
 * - JST 固定: 端末タイムゾーンに依存させないため `timeZone: "Asia/Tokyo"` を明示。
 *
 * @example
 * buildPdfFilename(new Date("2026-04-23T15:30:00+09:00")); // → "matatabi-roi-20260423-1530.pdf"
 */
export function buildPdfFilename(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const ymd = `${get("year")}${get("month")}${get("day")}`;
  const hm = `${get("hour")}${get("minute")}`;
  return `matatabi-roi-${ymd}-${hm}.pdf`;
}
