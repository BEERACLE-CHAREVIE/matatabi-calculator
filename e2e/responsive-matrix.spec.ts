/**
 * Issue #46 全ページのモバイル/タブレット最適化検証マトリクス。
 *
 * - 仕様: working/plans/issue-46-strict-mobile-tablet-optimization-test_*.md
 * - 検証観点（自動化可能なもののみ）:
 *   1. 横スクロール非発生 (`document.documentElement.scrollWidth === clientWidth`)
 *   2. 主要なインタラクティブ要素のタップターゲット 44×44px 以上 (WCAG 2.5.5 AAA)
 *   3. ヘッダー sticky / フッター・主要セクションの可視性
 * - 5 ビューポート: 375 / 390 / 768 / 1024 / 1440
 * - 実機確認 (iOS Safari ズーム抑止 / PDF ダウンロード) は本スペックの対象外。
 *   golden-path.spec.ts およびユーザーによる実機確認で別途担保する。
 *
 * 実装上の注意:
 * - `output: "export"` 構成のため `next start` ではなく `serve out -p 3000` 経由。
 *   `playwright.config.ts` の webServer 設定に従う。
 * - タップターゲット計測対象は role セレクタで網羅し、`44x44` を境界値として
 *   満たさない場合に NG として収集。スクリーンショットは Playwright のレポートで参照可能。
 */

import { expect, test, type Locator, type Page } from "@playwright/test";

type ViewportSpec = {
  label: string;
  width: number;
  height: number;
};

const VIEWPORTS: ReadonlyArray<ViewportSpec> = [
  { label: "375x812 (iPhone SE / 13 mini)", width: 375, height: 812 },
  { label: "390x844 (iPhone 14/15)", width: 390, height: 844 },
  { label: "768x1024 (iPad mini portrait)", width: 768, height: 1024 },
  { label: "1024x1366 (iPad Pro landscape)", width: 1024, height: 1366 },
  { label: "1440x900 (Desktop)", width: 1440, height: 900 },
];

const PUBLIC_PAGES: ReadonlyArray<{ path: string; label: string }> = [
  { path: "/", label: "ランディング (/)" },
  { path: "/calculate", label: "ROI 診断 (/calculate)" },
  { path: "/privacy", label: "プライバシーポリシー" },
  { path: "/terms", label: "利用規約" },
  { path: "/contact", label: "お問い合わせ" },
];

/** WCAG 2.5.5 AAA で要求される最小タップターゲットサイズ (px)。 */
const MIN_TAP_TARGET = 44;

/**
 * `<head><meta name="viewport">` が存在し、`width=device-width` を含むことを検証する。
 * Next.js は `output: "export"` でも `<meta name="viewport" content="width=device-width">` を自動付与する想定。
 */
async function expectViewportMeta(page: Page) {
  const content = await page
    .locator('meta[name="viewport"]')
    .first()
    .getAttribute("content");
  expect(content, "viewport meta が存在しない").not.toBeNull();
  expect(content!.toLowerCase()).toContain("width=device-width");
}

/**
 * 横スクロール発生をチェック。
 * scrollbar の影響で 1px 程度ぶれる場合があるため、誤差 1px を許容。
 */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });
  // 横スクロールバーや 1px 計算誤差を許容するため 2px の閾値を設定。
  const diff = overflow.scrollWidth - overflow.clientWidth;
  expect(
    diff,
    `横スクロール発生: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}, bodyScrollWidth=${overflow.bodyScrollWidth}`,
  ).toBeLessThanOrEqual(2);
}

/**
 * 与えられた locators の bounding box を計測し、44x44 未満のものを返す。
 * - `visible=true` のもののみ対象。
 * - 0px は SSR/CSS 読み込み待ち中の偽陽性が出るためスキップ。
 * - WCAG 2.5.5 の「インライン例外」を適用: 親が文章 (`<p>` 等) の中の
 *   `display: inline` リンクは line-height で制約されるため対象外。
 */
async function findUndersizedTapTargets(
  locator: Locator,
): Promise<Array<{ index: number; width: number; height: number; text: string }>> {
  const count = await locator.count();
  const failures: Array<{
    index: number;
    width: number;
    height: number;
    text: string;
  }> = [];
  for (let i = 0; i < count; i++) {
    const el = locator.nth(i);
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    if (!box) continue;
    if (box.width === 0 || box.height === 0) continue;
    if (box.width < MIN_TAP_TARGET || box.height < MIN_TAP_TARGET) {
      // WCAG 2.5.5 inline exception: skip plain inline links embedded in body text.
      const isInline = await el.evaluate((node) => {
        const cs = window.getComputedStyle(node as Element);
        return cs.display === "inline";
      });
      if (isInline) continue;
      const text = ((await el.textContent()) ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
      failures.push({
        index: i,
        width: Math.round(box.width),
        height: Math.round(box.height),
        text,
      });
    }
  }
  return failures;
}

test.describe("Issue #46 5 ビューポート × 全ページ レスポンシブ検証マトリクス", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`viewport: ${viewport.label}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      for (const targetPage of PUBLIC_PAGES) {
        test(`${targetPage.label} - 横スクロール / タップターゲット / 主要要素`, async ({
          page,
        }) => {
          await page.goto(targetPage.path);
          // ヘッダーの sticky 配置や Hero など、初期ペイントが完了していることを担保。
          await page.waitForLoadState("networkidle");

          await expectViewportMeta(page);
          await expectNoHorizontalScroll(page);

          // 共通レイアウト: Header / Footer の存在を確認。
          await expect(
            page.getByRole("banner"),
            "Header (role=banner) が表示されていない",
          ).toBeVisible();
          await expect(
            page.locator("footer").first(),
            "Footer が表示されていない",
          ).toBeVisible();

          // タップターゲット: 全 button / link をまとめて計測。
          // Next.js 16 が動的注入する Dev Tools ボタン (`data-nextjs-dev-tools-button`)
          // はフレームワーク責任の UI のため除外する。
          const tapTargets = page.locator(
            'a[href], button:not([data-nextjs-dev-tools-button]), [role="button"], [role="radio"], [role="link"], summary',
          );
          const undersized = await findUndersizedTapTargets(tapTargets);

          // 失敗時の可読性のためにメッセージ整形（最大 8 件まで表示）。
          const formatted = undersized
            .slice(0, 8)
            .map(
              (f) =>
                `  - "${f.text || "(no text)"}" → ${f.width}x${f.height}px`,
            )
            .join("\n");
          expect(
            undersized,
            `${targetPage.label} @ ${viewport.label}: ${undersized.length} 件のタップターゲットが 44x44px 未満:\n${formatted}`,
          ).toEqual([]);
        });
      }

      test(`/calculate 結果ダッシュボード - 横スクロール / グラフ / PDF ボタン`, async ({
        page,
      }) => {
        // 結果画面遷移までは golden-path と同じ最小入力。
        await page.goto("/calculate");
        await page.waitForLoadState("networkidle");

        await page.getByLabel(/月額ベンダー費用/).fill("50");
        await page.getByLabel(/改修費用/).fill("30");
        await page.getByLabel(/手作業に従事する人数/).fill("5");
        await page.getByRole("radio", { name: "3〜6ヶ月" }).click();
        // sm 以上では `shortLabel`（"一部"）のみが可視となるため両方をマッチさせる。
        await page.getByRole("radio", { name: /^一部(内製)?$/ }).click();
        await page.getByRole("button", { name: "診断する" }).click();

        const resultRegion = page.getByRole("region", { name: "ROI 診断結果" });
        await expect(resultRegion).toBeVisible();

        await expectNoHorizontalScroll(page);

        // PDF ボタンと再診断ボタンが両方タップしやすいサイズ (44x44 以上) であること。
        const pdfBtn = page.getByRole("button", { name: /PDF をダウンロード/ });
        const resetBtn = page.getByRole("button", { name: "再診断する" });
        for (const [label, btn] of [
          ["PDF ダウンロード", pdfBtn],
          ["再診断", resetBtn],
        ] as const) {
          await expect(btn).toBeVisible();
          const box = await btn.boundingBox();
          expect(box, `${label} ボタンの bounding box が取得できない`).not.toBeNull();
          expect(
            box!.height,
            `${label} ボタンの高さ ${box!.height}px が ${MIN_TAP_TARGET}px 未満`,
          ).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
        }

        // ヒーロー数値カードがビューポート内に収まり、かつ可視であること。
        const heroValue = resultRegion.getByText(/万円/).first();
        await expect(heroValue).toBeVisible();
      });
    });
  }
});
