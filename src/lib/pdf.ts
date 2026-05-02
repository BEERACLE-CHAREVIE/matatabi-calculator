/**
 * PDF 生成ユーティリティ（html2canvas + jsPDF を dynamic import）。
 *
 * - 仕様: docs/spec/pdf-report.md §3.1（html2canvas 主体 + jsPDF 画像貼付）/
 *         §3.2（html2canvas オプション固定）/ §11.2（関数シグネチャ正本）
 * - 脆弱性方針: docs/security/jspdf-vulnerabilities.md §2.1〜§2.3 / §7。
 *
 *   実装契約（レビューチェックリスト）:
 *     1. `pdf.html(...)` は **絶対に呼び出してはならない**（dompurify 系 7 件の到達不能判定の前提）。
 *     2. `addImage` の `imgData` は **html2canvas が生成した dataURL のみ** を渡す。
 *        ユーザー入力や外部 URL は混入させない。
 *     3. `pdf.save(filename)` の `filename` には **`buildPdfFilename()` の戻り値以外を渡さない**
 *        （Path Traversal 到達不能判定の前提）。
 *
 * - 性能設計: 仕様書 §10.1〜§10.2。`html2canvas` / `jspdf` を本ファイル内で dynamic import
 *         することで、PDF 生成ボタンが押されるまで両ライブラリ（合計 ≈ 385KB）を
 *         初回 LCP の経路から外す。
 * - エラーハンドリング: 内部では try/catch しない。失敗は呼び出し側
 *         （`ResultDashboard.handleDownloadPdf`）の try/catch で捕捉する責務分離。
 */

/** A4 縦幅（mm）。jsPDF の単位 `"mm"` で `addImage` の x/y/width/height に使用。 */
const A4_WIDTH_MM = 210;
/** A4 縦長（mm）。 */
const A4_HEIGHT_MM = 297;
/** html2canvas の `scale` 固定値（仕様書 §3.2）。Retina 相当のラスタ解像度を担保する。 */
const HTML2CANVAS_SCALE = 2;

export interface GeneratePdfOptions {
  /** PDF 化する DOM ノード。`PdfDashboard` の `forwardRef` から取得した HTMLElement を渡す。 */
  element: HTMLElement;
  /**
   * 保存ファイル名。`buildPdfFilename()` の戻り値以外を渡してはならない
   * （docs/security/jspdf-vulnerabilities.md §2.1）。
   */
  filename: string;
}

/**
 * 渡された DOM を html2canvas で PNG 化し、A4 1 枚の PDF として保存する。
 *
 * - 戻り値: `Promise<void>`。`pdf.save()` 内部完結のため Blob は返さない
 *           （仕様書 §11.2 / 脆弱性方針 §2.1 のレビュー粒度を維持するため）。
 */
export async function generatePdf(options: GeneratePdfOptions): Promise<void> {
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(options.element, {
    scale: HTML2CANVAS_SCALE,
    useCORS: false,
    backgroundColor: "#ffffff",
  });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new JsPDF("p", "mm", "a4");
  pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
  pdf.save(options.filename);
}
