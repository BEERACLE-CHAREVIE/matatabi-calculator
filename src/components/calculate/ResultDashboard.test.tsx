/**
 * ResultDashboard (画面コンテナ) コンポーネントテスト。
 *
 * - 仕様: docs/spec/result-dashboard.md §10.2（コンテナ責務）/
 *         docs/spec/pdf-report.md §8（PDF 生成フロー）/ §8.3（5 秒自動消去）
 * - 戦略: pure な描画は DashboardView.test.tsx に委譲し、本テストは副作用層
 *         （pdfError 5 秒消去 / 二重起動防止 / generatePdf モック呼び出し）に絞る。
 *         PdfDashboard と @/lib/pdf を jest.mock で差し替え、html2canvas / jsPDF を回避。
 *         PdfDashboard のモックは forwardRef を実装し、ResultDashboard 側の
 *         `pdfDashboardRef` に実 DOM ノードを渡す（generatePdf 呼び出しの前提）。
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultDashboard } from "./ResultDashboard";
import type { CalculationOutput } from "@/lib/calculation";
import type { InsourcingLevel } from "@/lib/constants";

jest.mock("./PdfDashboard", () => {
  const React = jest.requireActual("react") as typeof import("react");
  const PdfDashboardMock = React.forwardRef<HTMLDivElement>((_props, ref) =>
    React.createElement("div", { ref, "data-testid": "pdf-dashboard-mock" }),
  );
  PdfDashboardMock.displayName = "PdfDashboardMock";
  return { PdfDashboard: PdfDashboardMock };
});

const generatePdfMock = jest.fn();
jest.mock("@/lib/pdf", () => ({
  generatePdf: (...args: unknown[]) => generatePdfMock(...args),
}));

const result: CalculationOutput = {
  threeYearSavings: 30_375_000,
  annualProfitCreation: 6_000_000,
  threeYearProfitCreation: 18_000_000,
  totalThreeYearImpact: 48_375_000,
  speedWarning: false,
  speedWarningMonthlyLoss: 0,
  insourcingGap: 0.75,
};

const inputs = {
  monthlyVendorCost: 1_000_000,
  repairCost: 500_000,
  manualWorkerCount: 5,
  updateWaitMonths: 1,
  insourcingLevel: 0.25 as InsourcingLevel,
};

beforeEach(() => {
  generatePdfMock.mockReset();
});

afterEach(() => {
  // useFakeTimers を有効にしたままテストが終わると後続テストが固まるため必ず復帰。
  jest.useRealTimers();
});

describe("ResultDashboard: PDF 生成フロー", () => {
  it("PDF ボタンを押すと generatePdf が呼ばれる (成功パス)", async () => {
    generatePdfMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ResultDashboard
        result={result}
        insourcingLevel={0.25 as InsourcingLevel}
        inputs={inputs}
      />,
    );

    await user.click(screen.getByRole("button", { name: /PDF をダウンロード/ }));
    // handleDownloadPdf 内の rAF×2 chain (jest.setup.ts で setTimeout(16ms) スタブ) を待つ。
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalled());

    const callArg = generatePdfMock.mock.calls[0][0];
    expect(callArg).toHaveProperty("element");
    expect(callArg).toHaveProperty("filename");
    expect(callArg.filename).toMatch(/^matatabi-roi-\d{8}-\d{4}\.pdf$/);
  });

  it("生成中は再クリックしても二重起動しない (isGeneratingPdfRef ガードを fireEvent で検証)", async () => {
    let resolveFn: (() => void) | null = null;
    generatePdfMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <ResultDashboard
        result={result}
        insourcingLevel={0.25 as InsourcingLevel}
        inputs={inputs}
      />,
    );

    const btn = screen.getByRole("button", { name: /PDF をダウンロード/ });
    await user.click(btn);
    // generatePdf 呼び出しまで待機 (rAF×2 chain 経由)
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(1));

    // (1) 第 1 防壁: ボタンが disabled 化されること (UI 層の二重起動防止)
    const generatingBtn = await screen.findByRole("button", {
      name: /PDF生成中/,
    });
    expect(generatingBtn).toBeDisabled();
    expect(generatingBtn).toHaveAttribute("aria-busy", "true");

    // (2) 第 2 防壁: disabled を無視した直接発火でも `isGeneratingPdfRef` ガードが弾く
    // (UI 層をすり抜けるケース、例えば外部からの programmatic dispatchEvent への保険)
    fireEvent.click(generatingBtn);
    fireEvent.click(generatingBtn);
    // 短い猶予で flush しても呼び出し回数が増えないことを確認
    await new Promise((r) => setTimeout(r, 50));
    expect(generatePdfMock).toHaveBeenCalledTimes(1);

    // クリーンアップ: pending Promise を解決して unmount を待つ
    await act(async () => {
      resolveFn?.();
    });
  });

  it("pdfError は 5 秒で自動消去される (§8.3)", async () => {
    generatePdfMock.mockRejectedValue(new Error("boom"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <ResultDashboard
        result={result}
        insourcingLevel={0.25 as InsourcingLevel}
        inputs={inputs}
      />,
    );

    await user.click(screen.getByRole("button", { name: /PDF をダウンロード/ }));

    // エラー文言が出現するまで待機 (rejected Promise + setTimeout を react が flush)
    await waitFor(() =>
      expect(
        screen.getByText(
          "PDFの生成に失敗しました。ページを再読み込みして再度お試しください。",
        ),
      ).toBeInTheDocument(),
    );

    // 5 秒後に消えることを実時間で待機 (waitFor の既定タイムアウト 1 秒では足りないため拡張)
    await waitFor(
      () =>
        expect(
          screen.queryByText(
            "PDFの生成に失敗しました。ページを再読み込みして再度お試しください。",
          ),
        ).not.toBeInTheDocument(),
      { timeout: 6_000, interval: 200 },
    );

    errorSpy.mockRestore();
  }, 10_000);
});

describe("ResultDashboard: onResetRequest", () => {
  it("指定すると再診断ボタンが描画され、クリックで呼ばれる", async () => {
    const onResetRequest = jest.fn();
    const user = userEvent.setup();
    render(
      <ResultDashboard
        result={result}
        insourcingLevel={0.25 as InsourcingLevel}
        inputs={inputs}
        onResetRequest={onResetRequest}
      />,
    );
    await user.click(screen.getByRole("button", { name: "再診断する" }));
    expect(onResetRequest).toHaveBeenCalledTimes(1);
  });
});
