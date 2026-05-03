/**
 * ResultDashboard (画面コンテナ) コンポーネントテスト。
 *
 * - 仕様: docs/spec/result-dashboard.md §10.2（コンテナ責務）/
 *         docs/spec/pdf-report.md §8（PDF 生成フロー）/
 *         Issue #47（計算/PDF 生成エラー時のフォールバック UI 整備）
 * - 戦略: pure な描画は DashboardView.test.tsx に委譲し、本テストは副作用層
 *         （二重起動防止 / generatePdf モック呼び出し / 連続失敗エスカレーション）に絞る。
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

});

describe("ResultDashboard: PDF エラー時のリトライと連続失敗エスカレーション (Issue #47)", () => {
  const ERROR_MESSAGE_NORMAL = "PDFの生成に失敗しました。再試行してください。";
  const ERROR_MESSAGE_ESCALATED =
    "PDF の生成に複数回失敗しました。お手数ですが、お問い合わせフォームからご連絡ください。";

  it("PDF 生成失敗時にエラーメッセージと再試行ボタンが表示される", async () => {
    generatePdfMock.mockRejectedValueOnce(new Error("boom"));
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

    await waitFor(() =>
      expect(screen.getByText(ERROR_MESSAGE_NORMAL)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /再試行/ }),
    ).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("再試行ボタンクリックで generatePdf が再呼び出しされる", async () => {
    generatePdfMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
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
    await waitFor(() =>
      expect(screen.getByText(ERROR_MESSAGE_NORMAL)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /再試行/ }));
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(2));

    errorSpy.mockRestore();
  });

  it("3 回連続失敗でエスカレーション文言と /contact リンクが表示される", async () => {
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
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(1));
    await screen.findByText(ERROR_MESSAGE_NORMAL);

    await user.click(screen.getByRole("button", { name: /再試行/ }));
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(2));
    await screen.findByText(ERROR_MESSAGE_NORMAL);

    await user.click(screen.getByRole("button", { name: /再試行/ }));
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(3));
    await screen.findByText(ERROR_MESSAGE_ESCALATED);

    const contactLink = screen.getByRole("link", { name: "お問い合わせフォームへ" });
    expect(contactLink).toHaveAttribute("href", "/contact");
    expect(
      screen.queryByRole("button", { name: /再試行/ }),
    ).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("成功時に pdfFailureCount がリセットされる (連続性が壊れる)", async () => {
    generatePdfMock
      .mockRejectedValueOnce(new Error("boom-1"))
      .mockRejectedValueOnce(new Error("boom-2"))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom-4"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <ResultDashboard
        result={result}
        insourcingLevel={0.25 as InsourcingLevel}
        inputs={inputs}
      />,
    );

    // 1 回目失敗
    await user.click(screen.getByRole("button", { name: /PDF をダウンロード/ }));
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(1));
    await screen.findByText(ERROR_MESSAGE_NORMAL);

    // 2 回目失敗
    await user.click(screen.getByRole("button", { name: /再試行/ }));
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(2));
    await screen.findByText(ERROR_MESSAGE_NORMAL);

    // 3 回目成功 (カウンタ 0 リセット)
    await user.click(screen.getByRole("button", { name: /再試行/ }));
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(screen.queryByText(ERROR_MESSAGE_NORMAL)).not.toBeInTheDocument(),
    );

    // 4 回目失敗 → エスカレーション文言ではなく通常文言が出る
    await user.click(screen.getByRole("button", { name: /PDF をダウンロード/ }));
    await waitFor(() => expect(generatePdfMock).toHaveBeenCalledTimes(4));
    await screen.findByText(ERROR_MESSAGE_NORMAL);
    expect(screen.queryByText(ERROR_MESSAGE_ESCALATED)).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("エラーメッセージが role=\"alert\" で支援技術に通知される", async () => {
    generatePdfMock.mockRejectedValueOnce(new Error("boom"));
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
    await waitFor(() =>
      expect(screen.getByText(ERROR_MESSAGE_NORMAL)).toBeInTheDocument(),
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(ERROR_MESSAGE_NORMAL);

    errorSpy.mockRestore();
  });
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
