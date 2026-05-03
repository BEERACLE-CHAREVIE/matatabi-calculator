/**
 * Playwright 設定。
 *
 * - 仕様: working/plans/issue-48-test-suite-jest-rtl-playwright_*.md §15
 * - 設計: `next.config.mjs` の `output: "export"` を踏まえ、E2E は `npm run build` で
 *         生成した `out/` を `serve` で配信した本番同等の静的成果物に対して実行する
 *         （`next start` は `output: "export"` 構成で使えない）。
 * - クロスブラウザ: chromium / firefox / webkit の 3 ブラウザ。
 * - PDF: `acceptDownloads: true` でダウンロード経路を検証可能にする。
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    acceptDownloads: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    // `output: "export"` 構成のため `next start` は使わず serve で静的配信。
    command: "npm run build && npx serve out -p 3000 -s",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
