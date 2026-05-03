/**
 * ROI 診断のゴールデンパス E2E。
 *
 * - 仕様: working/plans/issue-48-test-suite-jest-rtl-playwright_*.md §16
 * - シナリオ:
 *   1. `/` のヒーロー CTA → `/calculate` 遷移
 *   2. 5 項目入力 → 結果ダッシュボード表示 (totalThreeYearImpact など)
 *   3. 「3〜6ヶ月」選択時に CRITICAL OPPORTUNITY LOSS バナーが出現
 *   4. PDF ダウンロードボタン → `download` イベントとファイル名パターン一致
 *   5. 「再診断する」で InputForm が再表示される
 */

import { expect, test } from "@playwright/test";

test.describe("ROI 診断ゴールデンパス", () => {
  test("ランディング → 計算ページ遷移 → 5 項目入力 → 結果表示 → PDF → 再診断", async ({
    page,
  }) => {
    // (1) ランディング → CTA
    await page.goto("/");
    await page.getByRole("link", { name: "いますぐ計算を始める" }).first().click();
    await expect(page).toHaveURL(/\/calculate/);
    await expect(page.getByRole("heading", { name: "ROI 診断", level: 1 })).toBeVisible();

    // (2) 5 項目入力
    await page.getByLabel(/月額ベンダー費用/).fill("50");
    await page.getByLabel(/改修費用/).fill("30");
    await page.getByLabel(/手作業に従事する人数/).fill("5");
    await page.getByRole("radio", { name: "3〜6ヶ月" }).click();
    await page.getByRole("radio", { name: /一部内製/ }).click();
    await page.getByRole("button", { name: "診断する" }).click();

    // 結果ダッシュボード
    const resultRegion = page.getByRole("region", { name: "ROI 診断結果" });
    await expect(resultRegion).toBeVisible();
    await expect(resultRegion.getByText(/3 年間のトータルインパクト/)).toBeVisible();
    // ヒーロー数値の万円表記
    await expect(resultRegion.getByText(/万円/).first()).toBeVisible();

    // (3) WarningBanner (3〜6ヶ月 = updateWaitMonths 4.5 でトリガ)
    await expect(
      resultRegion.getByText("CRITICAL OPPORTUNITY LOSS"),
    ).toBeVisible();

    // (4) PDF ダウンロード
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /PDF をダウンロード/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^matatabi-roi-\d{8}-\d{4}\.pdf$/,
    );

    // (5) 再診断
    await page.getByRole("button", { name: "再診断する" }).click();
    await expect(page.getByLabel(/月額ベンダー費用/)).toBeVisible();
    await expect(resultRegion).not.toBeVisible();
  });
});
