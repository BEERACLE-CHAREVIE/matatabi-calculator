/**
 * Jest 設定（next/jest プリセット）。
 *
 * - 仕様: working/plans/issue-48-test-suite-jest-rtl-playwright_*.md §1
 * - 設計: Next.js 16 公式の `next/jest` を採用し、SWC ベースのトランスパイル・
 *         環境変数読み込み・`paths` 解決を継承する。Vitest を選ばない理由は
 *         同プラン §「Jest vs Vitest」を参照。
 *         `.mjs` 形式を採用するのは、`.ts` 設定ファイルだと ts-node を追加導入する必要があり
 *         「依存最小」方針 (src/lib/cn.ts JSDoc) に反するため。
 * - カバレッジ閾値: `src/lib/calculation.ts` は 100%、その他は段階導入のため
 *         `src/lib/**` / `src/hooks/**` / `src/components/calculate/**` に限定して 80%。
 *         ランディング（`src/components/landing/**`）は別 Issue で段階追加予定。
 */

import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/out/",
    "/e2e/",
    "/playwright-report/",
    "/test-results/",
  ],
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "src/hooks/**/*.{ts,tsx}",
    "src/components/calculate/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    // PDF 経路は html2canvas / jsPDF を dynamic import するため jsdom では実行不能。
    // ゴールデンパス E2E (e2e/golden-path.spec.ts) で実ブラウザ検証する。
    "!src/lib/pdf.ts",
    "!src/lib/pdfConstants.ts",
    "!src/components/calculate/PdfDashboard.tsx",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "src/lib/calculation.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

export default createJestConfig(customConfig);
