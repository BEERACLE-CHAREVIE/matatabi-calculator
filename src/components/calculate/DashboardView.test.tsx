/**
 * DashboardView (描画層) コンポーネントテスト。
 *
 * - 仕様: docs/spec/result-dashboard.md §3〜§9 / §10.2（3 層分離の描画層）
 * - 観点: 副作用ゼロの pure component に props を直接注入し、表示分岐
 *         （isFullyInsourced / isPartiallyInsourced / PDF ボタン状態 / pdfError 等）
 *         を網羅。Recharts の描画自体は ResizeObserver モック (jest.setup.ts) で起動可能だが、
 *         数値表示のみを assert 対象とし SVG パスは検証しない (脆い)。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WarningBanner } from "./WarningBanner";
import { DashboardView } from "./DashboardView";
import type { CalculationOutput } from "@/lib/calculation";
import type { InsourcingLevel } from "@/lib/constants";

const baseResult: CalculationOutput = {
  threeYearSavings: 30_375_000,
  annualProfitCreation: 6_000_000,
  threeYearProfitCreation: 18_000_000,
  totalThreeYearImpact: 48_375_000,
  speedWarning: true,
  speedWarningMonthlyLoss: 750_000,
  insourcingGap: 0.75,
};

function renderView(overrides: Partial<React.ComponentProps<typeof DashboardView>> = {}) {
  const onDownloadPdf = jest.fn();
  const onPdfRetry = jest.fn();
  render(
    <DashboardView
      result={baseResult}
      insourcingLevel={0.25 as InsourcingLevel}
      animated={false}
      animatedSavings={baseResult.threeYearSavings}
      animatedAnnualProfit={baseResult.annualProfitCreation}
      animatedThreeYearProfit={baseResult.threeYearProfitCreation}
      animatedTotal={baseResult.totalThreeYearImpact}
      isMobile={false}
      onDownloadPdf={onDownloadPdf}
      onPdfRetry={onPdfRetry}
      isGeneratingPdf={false}
      pdfError={null}
      pdfErrorIsEscalated={false}
      {...overrides}
    />,
  );
  return { onDownloadPdf, onPdfRetry };
}

describe("DashboardView: 3 カード表示", () => {
  it("ヒーロー / 止血 / 利益カードが描画される", () => {
    renderView();
    // ヒーロー (formatManYenCompact: 4837万5千 → 4838万円)
    expect(screen.getByText("4,838万円")).toBeInTheDocument();
    // 止血 (formatManYen: 30,375,000 → 3038万円)
    expect(screen.getByText("3,038万円")).toBeInTheDocument();
    // 年間利益 (6,000,000 → 600万円) と 3 年合計 (1800万円)
    expect(screen.getByText("600万円")).toBeInTheDocument();
    expect(screen.getByText(/× 3 年/)).toBeInTheDocument();
  });
});

describe("DashboardView: insourcingLevel 分岐", () => {
  it("insourcingLevel === 1 のとき '削減余地は 0 万円' テキストが出現", () => {
    renderView({
      insourcingLevel: 1 as InsourcingLevel,
      result: { ...baseResult, threeYearSavings: 0 },
      animatedSavings: 0,
    });
    expect(
      screen.getByText(/削減余地は 0 万円/),
    ).toBeInTheDocument();
  });

  it("insourcingLevel === 0.25 のとき内製化注記が出現し insourcingPercent (25%) が strong で示される", () => {
    renderView({ insourcingLevel: 0.25 as InsourcingLevel });
    expect(screen.getByText(/既に内製化されている/)).toBeInTheDocument();
    // formatPercent(0.25) = "25%" を strong タグで表示する仕様
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("insourcingLevel === 0 のとき内製化注記は出ない", () => {
    renderView({ insourcingLevel: 0 as InsourcingLevel });
    expect(screen.queryByText(/既に内製化されている/)).not.toBeInTheDocument();
  });
});

describe("DashboardView: headerSlot", () => {
  it("WarningBanner を JSX で渡すと DOM に出現", () => {
    renderView({
      headerSlot: (
        <WarningBanner
          message={{
            headline: "CRITICAL OPPORTUNITY LOSS",
            subtext: "test",
          }}
        />
      ),
    });
    // DashboardView 内に渡された WarningBanner の role="alert" を取得
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    expect(screen.getByText("CRITICAL OPPORTUNITY LOSS")).toBeInTheDocument();
  });
});

describe("DashboardView: PDF ボタン", () => {
  it("isGeneratingPdf=false: クリックで onDownloadPdf が呼ばれる", async () => {
    const user = userEvent.setup();
    const { onDownloadPdf } = renderView();
    await user.click(screen.getByRole("button", { name: /PDF をダウンロード/ }));
    expect(onDownloadPdf).toHaveBeenCalledTimes(1);
  });

  it("isGeneratingPdf=true: aria-busy=true / disabled / 'PDF生成中…'", () => {
    renderView({ isGeneratingPdf: true });
    const btn = screen.getByRole("button", { name: /PDF生成中/ });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
  });

  it("pdfError があると role='alert' で表示 + 再試行ボタンが描画される (Issue #47)", () => {
    renderView({ pdfError: "PDF 生成失敗" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("PDF 生成失敗");
    expect(
      screen.getByRole("button", { name: /再試行/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "お問い合わせフォームへ" }),
    ).not.toBeInTheDocument();
  });

  it("pdfErrorIsEscalated=true でお問い合わせリンクが描画され、再試行ボタンは非表示 (Issue #47)", () => {
    renderView({
      pdfError: "PDF の生成に複数回失敗しました。",
      pdfErrorIsEscalated: true,
    });
    const link = screen.getByRole("link", { name: "お問い合わせフォームへ" });
    expect(link).toHaveAttribute("href", "/contact");
    expect(
      screen.queryByRole("button", { name: /再試行/ }),
    ).not.toBeInTheDocument();
  });

  it("再試行ボタンクリックで onPdfRetry が呼ばれる (Issue #47)", async () => {
    const user = userEvent.setup();
    const { onPdfRetry } = renderView({ pdfError: "PDF 生成失敗" });
    await user.click(screen.getByRole("button", { name: /再試行/ }));
    expect(onPdfRetry).toHaveBeenCalledTimes(1);
  });
});

describe("DashboardView: onResetRequest", () => {
  it("未指定時は再診断ボタン非表示", () => {
    renderView();
    expect(
      screen.queryByRole("button", { name: "再診断する" }),
    ).not.toBeInTheDocument();
  });

  it("指定時は表示 + click で呼び出される", async () => {
    const user = userEvent.setup();
    const onResetRequest = jest.fn();
    renderView({ onResetRequest });
    await user.click(screen.getByRole("button", { name: "再診断する" }));
    expect(onResetRequest).toHaveBeenCalledTimes(1);
  });
});
