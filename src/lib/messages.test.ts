/**
 * messages.ts (CRITICAL OPPORTUNITY LOSS 文言生成) の単体テスト。
 *
 * - 仕様: docs/spec/warning-copy.md §3.1 / §7.1 / §7.4 / §9
 */

import {
  CRITICAL_OPPORTUNITY_LOSS_HEADLINE,
  buildCriticalOpportunityLossMessage,
  buildCriticalOpportunityLossSubtext,
} from "./messages";

describe("buildCriticalOpportunityLossSubtext", () => {
  it("正の monthlyLossYen → 万円換算 + 3 桁区切り", () => {
    expect(buildCriticalOpportunityLossSubtext(1_200_000)).toBe(
      "現在、月額 120 万円相当の機会損失が発生中",
    );
  });

  it("3 桁区切りが必要な大きな値", () => {
    expect(buildCriticalOpportunityLossSubtext(15_000_000)).toBe(
      "現在、月額 1,500 万円相当の機会損失が発生中",
    );
  });

  it("0 → フォールバック文言 (§3.3 候補 c)", () => {
    expect(buildCriticalOpportunityLossSubtext(0)).toBe(
      "3ヶ月以上の更新待ちで機会損失が累積中",
    );
  });

  it("負値もフォールバック (二重防御)", () => {
    expect(buildCriticalOpportunityLossSubtext(-100)).toBe(
      "3ヶ月以上の更新待ちで機会損失が累積中",
    );
  });

  it("万円未満は四捨五入される (§7.4)", () => {
    // 15,000 円 → 1.5 万円 → 四捨五入で 2 万円
    expect(buildCriticalOpportunityLossSubtext(15_000)).toBe(
      "現在、月額 2 万円相当の機会損失が発生中",
    );
  });
});

describe("buildCriticalOpportunityLossMessage", () => {
  it("headline は不変の 'CRITICAL OPPORTUNITY LOSS' (§3.1)", () => {
    const message = buildCriticalOpportunityLossMessage(1_200_000);
    expect(message.headline).toBe(CRITICAL_OPPORTUNITY_LOSS_HEADLINE);
    expect(CRITICAL_OPPORTUNITY_LOSS_HEADLINE).toBe("CRITICAL OPPORTUNITY LOSS");
  });

  it("subtext は buildCriticalOpportunityLossSubtext と一致", () => {
    const message = buildCriticalOpportunityLossMessage(1_200_000);
    expect(message.subtext).toBe(buildCriticalOpportunityLossSubtext(1_200_000));
  });

  it("0 入力でも構造化オブジェクトを返す", () => {
    const message = buildCriticalOpportunityLossMessage(0);
    expect(message).toEqual({
      headline: CRITICAL_OPPORTUNITY_LOSS_HEADLINE,
      subtext: "3ヶ月以上の更新待ちで機会損失が累積中",
    });
  });
});
