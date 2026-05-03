/**
 * PdfDashboard コンポーネントテスト。
 *
 * - 仕様: docs/spec/pdf-report.md §5.3（指標カード value フォントサイズ） /
 *         §9.2（LabelList の formatter / Legend の wrapperStyle）
 * - 観点: Issue #85 で導入したレイアウトリグレッション防止策
 *         （pickPdfBarLabel の比率閾値 + MetricCard の文字列長応答フォントサイズ）を
 *         単体検証する。Recharts SVG は jsdom で完全描画されないため、props 経由で
 *         渡る formatter / style に絞って検証し、SVG パスには踏み込まない。
 *         `ResultDashboard.test.tsx` は `PdfDashboard` を `jest.mock` で置換するため、
 *         本ファイルが PdfDashboard 自体の単体テストの単一の真実の源となる。
 */

import { render, screen } from "@testing-library/react";
import { PdfDashboard, pickPdfBarLabel } from "./PdfDashboard";
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
});

describe("PdfDashboard: MetricCard の value フォントサイズ", () => {
  it("value 文字列が短い (<=8 文字) ケースは 16pt", () => {
    renderPdfDashboard({
      // 100万円 / 200万円 / 300万円（いずれも len <= 8）
      threeYearSavings: 1_000_000,
      annualProfitCreation: 2_000_000,
      threeYearProfitCreation: 3_000_000,
    });
    const valueElement = screen.getByText("100万円");
    expect(valueElement).toHaveStyle({ fontSize: "16pt" });
  });

  it("value 文字列が長い (>11 文字) ケースは 13pt に縮小される", () => {
    renderPdfDashboard({
      // 12,345,678万円 (len=12) / 98,765,432万円 (len=12) / 76,543,210万円 (len=12)
      // ("12,345,678" = 10 文字 + "万円" = 2 文字 → length 12 で 13pt 閾値を超える)
      threeYearSavings: 123_456_780_000,
      annualProfitCreation: 987_654_320_000,
      threeYearProfitCreation: 765_432_100_000,
    });
    const valueElement = screen.getByText("12,345,678万円");
    expect(valueElement).toHaveStyle({ fontSize: "13pt" });
  });
});
