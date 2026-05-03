/**
 * PdfDashboard 関連ヘルパーのユニットテスト（Issue #85）。
 *
 * - 仕様: docs/spec/pdf-report.md §5.3 / §9.2 / §11.1
 * - 観点: html2canvas / jsPDF を介する SVG 出力 (LabelList / Legend) は jsdom では
 *         完全再現できないため、テストは「formatter / value 算出ヘルパーの単体検証」に絞る。
 *         実機での被り確認は受け入れ条件（PR チェックリスト）でカバーする。
 */

import {
  formatBarLabel,
  formatMetricCardValue,
  metricCardValueFontSize,
} from "./PdfDashboard";

describe("formatBarLabel: insideLeft / insideRight ラベルの段階降格", () => {
  it("比率 8% 未満は空文字を返す（描画抑制）", () => {
    // 1万円 / 1000万円 = 0.001 → 0.1%、十分小さい
    expect(formatBarLabel(10_000, 10_000_000)).toBe("");
    // 5%（旧閾値）相当でも空文字
    expect(formatBarLabel(50, 1000)).toBe("");
  });

  it("比率 8〜18% は formatManYenCompact を返す（短縮万円・億表記）", () => {
    // 10% 相当: 100万円 / 1000万円
    expect(formatBarLabel(1_000_000, 10_000_000)).toBe("100万円");
  });

  it("比率 18% 以上は formatManYen を返す（通常の桁区切り表記）", () => {
    // 50% 相当: 500万円 / 1000万円
    expect(formatBarLabel(5_000_000, 10_000_000)).toBe("500万円");
  });

  it("totalImpact が 0 以下の場合は空文字（ゼロ除算回避）", () => {
    expect(formatBarLabel(100, 0)).toBe("");
    expect(formatBarLabel(100, -1)).toBe("");
  });

  it("8% 境界: 直下は空文字、直上は表示", () => {
    // 7.99%（799 / 10,000）→ 空文字
    expect(formatBarLabel(799, 10_000)).toBe("");
    // 8.01%（801 / 10,000）→ 表示（ratio 8〜18% は compact 経路、801 円は 0 万円表記）
    expect(formatBarLabel(801, 10_000)).not.toBe("");
  });

  it("18% 境界: 直下と直上ともに同じ「○○万円」表現になる経路で経路差を確認", () => {
    // 17.99% → compact 経路
    expect(formatBarLabel(17_990_000, 100_000_000)).toBe("1,799万円");
    // 18.01% → manYen 経路
    expect(formatBarLabel(18_010_000, 100_000_000)).toBe("1,801万円");
  });

  it("億円超の桁爆発ケースで compact 経路が「◯億◯万円」を返す", () => {
    // value = 12 億円（12_000_000_000 円）、totalImpact = 100 億円 → 比率 12%（compact 経路）
    expect(formatBarLabel(12_000_000_000, 100_000_000_000)).toBe("12億円");
  });
});

describe("formatMetricCardValue: 億円表記への自動降格", () => {
  it("OKU_THRESHOLD_MAN_YEN 直下（< 10 億円）は formatManYen を返す", () => {
    // 9 億 9999 万円 = 999_990_000 円。manYen = 99,999 < 100,000（閾値）
    expect(formatMetricCardValue(999_990_000)).toBe("99,999万円");
  });

  it("OKU_THRESHOLD_MAN_YEN 直上（>= 10 億円）は formatManYenCompact に降格する", () => {
    // 10 億円ちょうど
    expect(formatMetricCardValue(10_000_000_000)).toBe("10億円");
    // 10 億 10 万円
    expect(formatMetricCardValue(10_000_100_000)).toBe("10億10万円");
  });

  it("通常ケース（万円台）は formatManYen の桁区切り出力をそのまま返す", () => {
    expect(formatMetricCardValue(30_375_000)).toBe("3,038万円");
    expect(formatMetricCardValue(0)).toBe("0万円");
  });

  it("NaN / Infinity / 負値は formatManYen のフォールバック「0万円」を返す", () => {
    expect(formatMetricCardValue(Number.NaN)).toBe("0万円");
    expect(formatMetricCardValue(Number.POSITIVE_INFINITY)).toBe("0万円");
    expect(formatMetricCardValue(-1)).toBe("0万円");
  });
});

describe("metricCardValueFontSize: 値長に応じた段階フォントサイズ", () => {
  it("8 文字以下は 16pt", () => {
    // "0万円" (3 chars) / "3,038万円" (7 chars) / "30,000万円" (8 chars: 境界)
    expect(metricCardValueFontSize("0万円")).toBe("16pt");
    expect(metricCardValueFontSize("3,038万円")).toBe("16pt");
    expect(metricCardValueFontSize("30,000万円")).toBe("16pt");
  });

  it("9〜11 文字は 14pt", () => {
    // "123,456万円" (9 chars: 境界) / "1,234,567万円" (11 chars: 境界)
    expect(metricCardValueFontSize("123,456万円")).toBe("14pt");
    expect(metricCardValueFontSize("1,234,567万円")).toBe("14pt");
  });

  it("12 文字以上は 13pt（億円表記の桁爆発を想定）", () => {
    // "12,345,678万円" (12 chars: 境界) / "1,234億5,678万円" (13 chars)
    expect(metricCardValueFontSize("12,345,678万円")).toBe("13pt");
    expect(metricCardValueFontSize("1,234億5,678万円")).toBe("13pt");
  });
});
