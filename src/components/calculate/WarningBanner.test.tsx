/**
 * WarningBanner コンポーネントテスト。
 *
 * - 仕様: docs/spec/warning-copy.md §6（純表示層契約）/ §9.3（props 型）
 */

import { render, screen } from "@testing-library/react";
import { WarningBanner } from "./WarningBanner";

describe("WarningBanner", () => {
  const message = {
    headline: "CRITICAL OPPORTUNITY LOSS",
    subtext: "現在、月額 75 万円相当の機会損失が発生中",
  };

  it("headline / subtext が DOM に出現", () => {
    render(<WarningBanner message={message} />);
    expect(screen.getByText("CRITICAL OPPORTUNITY LOSS")).toBeInTheDocument();
    expect(
      screen.getByText("現在、月額 75 万円相当の機会損失が発生中"),
    ).toBeInTheDocument();
  });

  it("role='alert' が付与される (暗黙 aria-live='assertive')", () => {
    render(<WarningBanner message={message} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("className props が既定クラスに合成される", () => {
    render(<WarningBanner message={message} className="custom-extra" />);
    const banner = screen.getByRole("alert");
    expect(banner).toHaveClass("custom-extra");
    // 既定クラスも維持される
    expect(banner.className).toContain("border-accent");
  });
});
