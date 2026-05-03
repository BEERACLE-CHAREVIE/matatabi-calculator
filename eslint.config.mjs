import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Jest / Playwright 用のテストグローバル。globals パッケージへの依存を増やさず、
// 必要最小限のシンボルだけを手書きで列挙する（テストファイル数が増えても保守容易）。
const jestGlobals = {
  jest: "readonly",
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  beforeAll: "readonly",
  beforeEach: "readonly",
  afterAll: "readonly",
  afterEach: "readonly",
};

const playwrightGlobals = {
  test: "readonly",
  expect: "readonly",
};

export default defineConfig([
  {
    ignores: [
      "playwright-report/**",
      "test-results/**",
      ".playwright/**",
      "coverage/**",
    ],
  },
  {
    extends: [...nextCoreWebVitals, ...nextTypescript],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Jest テストファイル向け globals。
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/__tests__/**/*",
      "jest.setup.ts",
    ],
    languageOptions: {
      globals: jestGlobals,
    },
  },
  {
    // Playwright E2E ファイル向け globals。Jest と同じシンボル名 (`test` / `expect`) を
    // 持つが、Playwright は import 経由で取得する想定のため宣言は最小限。
    files: ["e2e/**/*.ts", "e2e/**/*.spec.ts"],
    languageOptions: {
      globals: playwrightGlobals,
    },
  },
]);
