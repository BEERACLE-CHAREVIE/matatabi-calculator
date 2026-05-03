/**
 * CalculatePageClient コンポーネントテスト（Issue #47）。
 *
 * - 仕様: Issue #47「`/calculate` ページの計算/PDF 生成エラー時のフォールバック UI 整備」
 *         のうち「計算エラーをページ内で吸収して `CalculateErrorState` を描画する」分岐を担保。
 * - 戦略: `calculate` を `jest.mock` で差し替えて throw を再現する。
 *         `manYenToYen` は `jest.requireActual` で実装維持し、フォーム送信フローを通す。
 *         `ResultDashboard` を軽量モックに差し替えることで、本テストは
 *         「エラー時に ResultDashboard が描画されないこと / CalculateErrorState が描画されること」のみに集中する
 *         （Recharts / html2canvas 等の重い依存を回避）。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const calculateMock = jest.fn();

jest.mock("@/lib/calculation", () => {
  const actual = jest.requireActual("@/lib/calculation");
  return {
    ...actual,
    calculate: (...args: unknown[]) => calculateMock(...args),
  };
});

jest.mock("@/components/calculate/ResultDashboard", () => ({
  ResultDashboard: () => <div data-testid="result-dashboard-mock" />,
}));

// `next/dynamic` の実体は jest 環境で Promise resolve を要するため、
// テストでは同期コンポーネントを返すスタブに差し替える。本テストは
// 「計算エラー時に ResultDashboard ではなく CalculateErrorState が描画されること」
// が主眼のため、ResultDashboard 側に渡る props は無視する。
jest.mock("next/dynamic", () => () => {
  const Mock = () => <div data-testid="result-dashboard-mock" />;
  Mock.displayName = "ResultDashboardDynamicMock";
  return Mock;
});

import { CalculatePageClient } from "./CalculatePageClient";

async function fillFormAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/月額ベンダー費用/), "100");
  await user.type(screen.getByLabelText(/改修費用/), "30");
  await user.type(screen.getByLabelText(/手作業に従事する人数/), "5");
  // 更新待ち期間: 1〜2ヶ月 (UPDATE_WAIT_OPTIONS の 2 番目)
  await user.click(screen.getByRole("radio", { name: "1〜2ヶ月" }));
  // 内製化: 一部内製 (mobile では label 表示)
  await user.click(screen.getByRole("radio", { name: /一部/ }));
  await user.click(screen.getByRole("button", { name: "診断する" }));
}

beforeEach(() => {
  calculateMock.mockReset();
});

describe("CalculatePageClient: 計算エラー吸収 (Issue #47)", () => {
  it("calculate が throw した場合 CalculateErrorState が表示される", async () => {
    calculateMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<CalculatePageClient />);
    await fillFormAndSubmit();

    expect(
      await screen.findByText("診断結果の計算中にエラーが発生しました"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "もう一度試す" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("result-dashboard-mock"),
    ).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("「もう一度試す」クリックで CalculateErrorState が消え InputForm のみ残る", async () => {
    calculateMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    render(<CalculatePageClient />);
    await fillFormAndSubmit();

    const retryButton = await screen.findByRole("button", {
      name: "もう一度試す",
    });
    await user.click(retryButton);

    expect(
      screen.queryByText("診断結果の計算中にエラーが発生しました"),
    ).not.toBeInTheDocument();
    // InputForm は引き続き残存（送信ボタンがレンダリングされ続ける）
    expect(
      screen.getByRole("button", { name: "診断する" }),
    ).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("エラー UI が role=\"alert\" で支援技術に通知される", async () => {
    calculateMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<CalculatePageClient />);
    await fillFormAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("診断結果の計算中にエラーが発生しました");

    errorSpy.mockRestore();
  });
});
