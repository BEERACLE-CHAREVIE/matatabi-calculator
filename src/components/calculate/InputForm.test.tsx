/**
 * InputForm コンポーネントテスト。
 *
 * - 仕様: docs/spec/input-form.md §4 / §6 / §8 / §9
 * - 観点: 5 項目入力 → manYenToYen 変換後の onSubmit / バリデーション / フォーカス /
 *         ステッパー / セグメントコントロール (aria-checked) / アクセシビリティ。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputForm } from "./InputForm";

function renderForm() {
  const onSubmit = jest.fn();
  render(<InputForm onSubmit={onSubmit} />);
  return { onSubmit };
}

describe("InputForm: 送信成功パス", () => {
  it("5 項目入力 → manYenToYen 適用後の CalculationInput で onSubmit が呼ばれる", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/月額ベンダー費用/), "50");
    await user.type(screen.getByLabelText(/改修費用/), "30");
    await user.type(screen.getByLabelText(/手作業に従事する人数/), "5");
    await user.click(screen.getByRole("radio", { name: "3〜6ヶ月" }));
    await user.click(screen.getByRole("radio", { name: /一部内製/ }));

    await user.click(screen.getByRole("button", { name: "診断する" }));

    expect(onSubmit).toHaveBeenCalledWith({
      monthlyVendorCost: 500_000, // 50 万円 → 500_000 円
      repairCost: 300_000,
      manualWorkerCount: 5,
      updateWaitMonths: 4.5,
      insourcingLevel: 0.25,
    });
  });

  it("月額ベンダー費用 0 万円が受理され onSubmit に 0 が渡る", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/月額ベンダー費用/), "0");
    await user.type(screen.getByLabelText(/改修費用/), "30");
    await user.type(screen.getByLabelText(/手作業に従事する人数/), "5");
    await user.click(screen.getByRole("radio", { name: "3〜6ヶ月" }));
    await user.click(screen.getByRole("radio", { name: /一部内製/ }));

    await user.click(screen.getByRole("button", { name: "診断する" }));

    expect(onSubmit).toHaveBeenCalledWith({
      monthlyVendorCost: 0,
      repairCost: 300_000,
      manualWorkerCount: 5,
      updateWaitMonths: 4.5,
      insourcingLevel: 0.25,
    });
  });
});

describe("InputForm: バリデーション", () => {
  it("月額未入力で submit → role=alert が出現し onSubmit は呼ばれない", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.click(screen.getByRole("button", { name: "診断する" }));

    expect(
      screen.getByText("月額費用を入力してください"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("月額が範囲外 (10001) でエラー", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.type(screen.getByLabelText(/月額ベンダー費用/), "10001");
    await user.click(screen.getByRole("button", { name: "診断する" }));
    expect(
      screen.getByText("10,000 万円以下で入力してください"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("月額が下限境界外 (-1) でエラー", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.type(screen.getByLabelText(/月額ベンダー費用/), "-1");
    await user.click(screen.getByRole("button", { name: "診断する" }));
    expect(
      screen.getByText("0 万円以上で入力してください"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("複数フィールドエラー時は FIELD_ORDER の最初のエラーフィールドにフォーカス", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "診断する" }));
    expect(screen.getByLabelText(/月額ベンダー費用/)).toHaveFocus();
  });
});

describe("InputForm: 手作業人数ステッパー", () => {
  it("初期状態 (空) では '−' ボタンが disabled", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "1 人減らす" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1 人増やす" })).toBeEnabled();
  });

  it("'+' クリックで値が増加し、'−' で減少する", async () => {
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(
      /手作業に従事する人数/,
    ) as HTMLInputElement;

    await user.click(screen.getByRole("button", { name: "1 人増やす" }));
    expect(input.value).toBe("1");
    await user.click(screen.getByRole("button", { name: "1 人増やす" }));
    expect(input.value).toBe("2");
    await user.click(screen.getByRole("button", { name: "1 人減らす" }));
    expect(input.value).toBe("1");
  });

  it("値が 1000 (上限) のとき '+' が disabled", async () => {
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(/手作業に従事する人数/);
    await user.type(input, "1000");
    expect(screen.getByRole("button", { name: "1 人増やす" })).toBeDisabled();
  });
});

describe("InputForm: セグメントコントロール", () => {
  it("aria-checked が選択ボタンで true に切り替わる", async () => {
    const user = userEvent.setup();
    renderForm();
    const buttons = screen.getAllByRole("radio");
    const updateWait3to6 = buttons.find(
      (b) => b.textContent === "3〜6ヶ月",
    )!;
    expect(updateWait3to6).toHaveAttribute("aria-checked", "false");
    await user.click(updateWait3to6);
    expect(updateWait3to6).toHaveAttribute("aria-checked", "true");
  });
});

describe("InputForm: アクセシビリティ", () => {
  it("基本入力に aria-required と aria-invalid (false) が付与", () => {
    renderForm();
    const monthly = screen.getByLabelText(/月額ベンダー費用/);
    expect(monthly).toHaveAttribute("aria-required", "true");
    expect(monthly).toHaveAttribute("aria-invalid", "false");
  });

  it("エラー発生時に aria-invalid が true、aria-describedby にエラー ID が含まれる", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "診断する" }));
    const monthly = screen.getByLabelText(/月額ベンダー費用/);
    expect(monthly).toHaveAttribute("aria-invalid", "true");
    expect(monthly.getAttribute("aria-describedby")).toContain("error");
  });
});
