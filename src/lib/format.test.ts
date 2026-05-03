/**
 * フォーマッタ単体テスト。
 *
 * - 仕様: docs/spec/result-dashboard.md §9.1 / §9.2、docs/spec/calculation-logic.md §6
 * - 観点: 万円四捨五入 / 二重防御 (NaN / Infinity / 負値) / 億円表記境界 (OKU_THRESHOLD_MAN_YEN)。
 */

import {
  formatHumanCount,
  formatManYen,
  formatManYenCompact,
  formatPercent,
  formatYen,
} from "./format";

describe("formatManYen", () => {
  it.each<[number, string]>([
    [0, "0万円"],
    [15_000, "2万円"], // 1.5 万円 → 四捨五入で 2
    [1_350_000, "135万円"],
    [Number.NaN, "0万円"],
    [-100, "0万円"],
    [Number.POSITIVE_INFINITY, "0万円"],
    [Number.NEGATIVE_INFINITY, "0万円"],
  ])("formatManYen(%p) === %p", (input, expected) => {
    expect(formatManYen(input)).toBe(expected);
  });
});

describe("formatManYenCompact (OKU_THRESHOLD_MAN_YEN=100,000)", () => {
  it.each<[number, string]>([
    [1_350_000, "135万円"],
    [10_000_000_000, "10億円"], // 100,000 万円 = 10 億 (境界一致)
    [10_001_000_000, "10億100万円"],
    [Number.NaN, "0万円"],
    [-100, "0万円"],
    [0, "0万円"],
  ])("formatManYenCompact(%p) === %p", (input, expected) => {
    expect(formatManYenCompact(input)).toBe(expected);
  });

  it("億境界の直前 (99,999 万円) は万円表記のまま", () => {
    // 99,999 万円 = 999,990,000 円。OKU_THRESHOLD_MAN_YEN (100,000) 未満。
    expect(formatManYenCompact(999_990_000)).toBe("99,999万円");
  });
});

describe("formatYen", () => {
  it.each<[number, string]>([
    [0, "0円"],
    [1_234_567, "1,234,567円"],
    [Number.NaN, "0円"],
    [-1, "0円"],
  ])("formatYen(%p) === %p", (input, expected) => {
    expect(formatYen(input)).toBe(expected);
  });
});

describe("formatPercent", () => {
  it("fractionDigits=0 (既定) → 整数%", () => {
    expect(formatPercent(0.75)).toBe("75%");
  });

  it("fractionDigits=1 → 末尾 0 を除去", () => {
    expect(formatPercent(0.123, 1)).toBe("12.3%");
  });

  it("fractionDigits=2 で末尾 0 と小数点を除去", () => {
    expect(formatPercent(0.1, 2)).toBe("10%");
  });

  it("値が 0 のときは fractionDigits>0 でも '0%'", () => {
    expect(formatPercent(0, 2)).toBe("0%");
  });

  it("NaN / 負値 → '0%'", () => {
    expect(formatPercent(Number.NaN)).toBe("0%");
    expect(formatPercent(-0.1)).toBe("0%");
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe("0%");
  });
});

describe("formatHumanCount", () => {
  it.each<[number, string]>([
    [0, "0 人"],
    [5, "5 人"],
    [1234, "1,234 人"],
    [Number.NaN, "0 人"],
    [-1, "0 人"],
  ])("formatHumanCount(%p) === %p", (input, expected) => {
    expect(formatHumanCount(input)).toBe(expected);
  });
});
