/**
 * pdfFilename.ts (PDF ファイル名生成) の単体テスト。
 *
 * - 仕様: docs/spec/pdf-report.md §7.1（命名規則）/ §11.3（疑似コード正本）
 * - 観点: JST 固定 (端末タイムゾーン非依存) / `matatabi-roi-{YYYYMMDD}-{HHmm}.pdf` 形式。
 */

import { buildPdfFilename } from "./pdfFilename";

describe("buildPdfFilename", () => {
  it("JST 入力 → 命名規則どおり", () => {
    const date = new Date("2026-04-23T15:30:00+09:00");
    expect(buildPdfFilename(date)).toBe("matatabi-roi-20260423-1530.pdf");
  });

  it("UTC 入力でも JST 換算される", () => {
    // 2026-04-23T06:30:00Z = 2026-04-23T15:30:00+09:00
    const date = new Date("2026-04-23T06:30:00Z");
    expect(buildPdfFilename(date)).toBe("matatabi-roi-20260423-1530.pdf");
  });

  it("日付跨ぎ (UTC 23:00 → JST 翌日 08:00)", () => {
    // 2026-04-23T23:00:00Z = 2026-04-24T08:00:00+09:00
    const date = new Date("2026-04-23T23:00:00Z");
    expect(buildPdfFilename(date)).toBe("matatabi-roi-20260424-0800.pdf");
  });

  it("引数省略時は現在時刻を使用 (パターン一致のみ確認)", () => {
    const filename = buildPdfFilename();
    expect(filename).toMatch(/^matatabi-roi-\d{8}-\d{4}\.pdf$/);
  });

  it("0 時 0 分のとき 0 埋めされる", () => {
    const date = new Date("2026-01-05T00:05:00+09:00");
    expect(buildPdfFilename(date)).toBe("matatabi-roi-20260105-0005.pdf");
  });
});
