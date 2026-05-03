/**
 * PdfDashboard 関連ヘルパーのユニットテスト（Issue #85）。
 *
 * - 仕様: docs/spec/pdf-report.md §5.3（指標カード value フォントサイズ + Compact 自動降格） /
 *         §9.2（LabelList の formatter / Legend の wrapperStyle）
 * - 観点: html2canvas / jsPDF を介する SVG 出力（LabelList / Legend）は jsdom で
 *         完全再現できないため、レイアウトリグレッション検出は「export ヘルパーの
 *         単体検証」+「フル render での `toHaveStyle` 検証」の二段構えで行う。
 *         前段は境界値網羅、後段は MetricCard が export ヘルパーを実際に呼んでいることを
 *         担保する役割分担。実機での被り確認は受け入れ条件（PR チェックリスト）でカバー。
 */

import { render, screen } from "@testing-library/react";
import {
  PdfDashboard,
  formatMetricCardValue,
  metricCardValueFontSize,
  pickPdfBarLabel,
} from "./PdfDashboard";
import { formatManYen, formatManYenCompact } from "@/lib/format";
import type { CalculationInput, CalculationOutput } from "@/lib/calculation";
import type { InsourcingLevel } from "@/lib/constants";

const baseInputs: CalculationInput = {
  monthlyVendorCost: 1_000_000,
  repairCost: 500_000,
  manualWorkerCount: 5,
  updateWaitMonths: 1.5,
  insourcingLevel: 0.25 as InsourcingLevel,
};

function renderPdfDashboard(
  resultOverrides: Partial<CalculationOutput>,
  insourcingLevel: InsourcingLevel = 0.25 as InsourcingLevel,
) {
  const result: CalculationOutput = {
    threeYearSavings: 30_375_000,
    annualProfitCreation: 6_000_000,
    threeYearProfitCreation: 18_000_000,
    totalThreeYearImpact: 48_375_000,
    speedWarning: false,
    speedWarningMonthlyLoss: 0,
    insourcingGap: 0.75,
    ...resultOverrides,
  };
  return render(
    <PdfDashboard
      result={result}
      insourcingLevel={insourcingLevel}
      inputs={baseInputs}
      generatedAt={new Date("2026-04-23T15:30:00+09:00")}
    />,
  );
}

describe("pickPdfBarLabel", () => {
  // 比率閾値の境界条件を全て検証することで、Issue #85 で確定した
  // 「< 8% で抑制 / < 18% で Compact / それ以上で標準」のレイアウト契約を固定する。
  const TOTAL = 100_000_000_000; // 10,000,000 万円 = 100 億円相当

  it("total <= 0 のとき空文字を返す（ゼロ除算ガード）", () => {
    expect(pickPdfBarLabel(50, 0)).toBe("");
    expect(pickPdfBarLabel(50, -10)).toBe("");
  });

  it("ratio < 0.08 のとき空文字を返す（衝突抑制）", () => {
    // 7% < 8% 閾値
    expect(pickPdfBarLabel(TOTAL * 0.07, TOTAL)).toBe("");
  });

  it("0.08 <= ratio < 0.18 のとき formatManYenCompact と同一文字列を返す", () => {
    const value = TOTAL * 0.1; // 10%
    expect(pickPdfBarLabel(value, TOTAL)).toBe(formatManYenCompact(value));
  });

  it("0.18 <= ratio のとき formatManYen と同一文字列を返す", () => {
    const value = TOTAL * 0.2; // 20%
    expect(pickPdfBarLabel(value, TOTAL)).toBe(formatManYen(value));
  });

  it("8% / 18% 境界の直下・直上で経路が切り替わる", () => {
    // 7.99%（799 / 10,000）→ 空文字 / 8.01%（801 / 10,000）→ 表示
    expect(pickPdfBarLabel(799, 10_000)).toBe("");
    expect(pickPdfBarLabel(801, 10_000)).not.toBe("");
    // 17.99% → compact 経路 / 18.01% → manYen 経路
    expect(pickPdfBarLabel(17_990_000, 100_000_000)).toBe(
      formatManYenCompact(17_990_000),
    );
    expect(pickPdfBarLabel(18_010_000, 100_000_000)).toBe(
      formatManYen(18_010_000),
    );
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

describe("PdfDashboard: MetricCard が export ヘルパーを実際に呼んでいる", () => {
  // Recharts SVG は jsdom で部分描画失敗する可能性があるため、ここでは
  // MetricCard が `formatMetricCardValue` + `metricCardValueFontSize` を確かに
  // 経由していることだけを「最小限の実 render + toHaveStyle」で担保する。
  it("通常ケース（万円台）は formatManYen 経路 + 16pt が組み合わされる", () => {
    renderPdfDashboard({
      threeYearSavings: 1_000_000,
      annualProfitCreation: 2_000_000,
      threeYearProfitCreation: 3_000_000,
    });
    const valueElement = screen.getByText("100万円");
    expect(valueElement).toHaveStyle({ fontSize: "16pt" });
  });

  it("10 億円超ケースは Compact 降格 + 値長応答フォント縮小が組み合わされる", () => {
    // 12_345_678 万円 = 123億45,678万円 (length 12) → Compact 経路 + 13pt
    renderPdfDashboard({
      threeYearSavings: 123_456_780_000,
      annualProfitCreation: 234_567_890_000,
      threeYearProfitCreation: 345_678_900_000,
    });
    const expectedLabel = formatMetricCardValue(123_456_780_000);
    const valueElement = screen.getByText(expectedLabel);
    expect(valueElement).toHaveStyle({
      fontSize: metricCardValueFontSize(expectedLabel),
    });
  });
});
