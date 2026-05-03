/**
 * `calculate` / `manYenToYen` / `yenToManYen` の単体テスト。
 *
 * - 仕様: docs/spec/calculation-logic.md §5（最終計算式）/ §6（丸めルール）/
 *         §7（スピード警告）/ §9（決定項目チェックリスト）
 * - カバレッジ目標: 100%（branches / functions / lines / statements）。
 *         ガード関数（`safeNum` / `clampAmount` / `normalizeInsourcingLevel`）の
 *         全分岐とフォールバックを網羅する。
 */

import { calculate, manYenToYen, yenToManYen } from "./calculation";
import type { InsourcingLevel } from "./constants";

describe("calculate (仕様書 §5)", () => {
  it("JSDoc @example の数値が仕様書 §5 の擬似コードと一致する", () => {
    // 標準値: 月額 100 万円 / 改修 50 万円 / 5 人 / 4.5 ヶ月 / 一部内製 (0.25)
    const result = calculate({
      monthlyVendorCost: 1_000_000,
      repairCost: 500_000,
      manualWorkerCount: 5,
      updateWaitMonths: 4.5,
      insourcingLevel: 0.25,
    });
    expect(result).toEqual({
      threeYearSavings: 30_375_000,
      annualProfitCreation: 6_000_000,
      threeYearProfitCreation: 18_000_000,
      totalThreeYearImpact: 48_375_000,
      speedWarning: true,
      speedWarningMonthlyLoss: 750_000,
      insourcingGap: 0.75,
    });
  });

  describe("insourcingLevel の 5 段階全網羅 (§4.4)", () => {
    const baseInput = {
      monthlyVendorCost: 1_000_000,
      repairCost: 500_000,
      manualWorkerCount: 5,
      updateWaitMonths: 1,
    };

    it.each<[InsourcingLevel, number]>([
      [0, 1.0],
      [0.25, 0.75],
      [0.5, 0.5],
      [0.75, 0.25],
      [1, 0.0],
    ])("insourcingLevel=%p のとき insourcingGap=%p", (level, gap) => {
      const result = calculate({ ...baseInput, insourcingLevel: level });
      expect(result.insourcingGap).toBeCloseTo(gap, 10);
    });

    it("insourcingLevel=1 (完全内製) のとき threeYearSavings === 0 (§4.4 維持フェーズ)", () => {
      const result = calculate({ ...baseInput, insourcingLevel: 1 });
      expect(result.threeYearSavings).toBe(0);
    });
  });

  describe("speedWarning 境界条件 (§7, SPEED_WARNING_THRESHOLD_MONTHS=3)", () => {
    const baseInput = {
      monthlyVendorCost: 1_000_000,
      repairCost: 500_000,
      manualWorkerCount: 5,
      insourcingLevel: 0 as InsourcingLevel,
    };

    it.each<[number, boolean]>([
      [0, false],
      [2.99, false],
      [3, true],
      [3.01, true],
    ])(
      "updateWaitMonths=%p のとき speedWarning=%p",
      (months, expected) => {
        const result = calculate({ ...baseInput, updateWaitMonths: months });
        expect(result.speedWarning).toBe(expected);
      },
    );
  });

  describe("speedWarningMonthlyLoss", () => {
    it("speedWarning=false のとき 0", () => {
      const result = calculate({
        monthlyVendorCost: 1_000_000,
        repairCost: 0,
        manualWorkerCount: 0,
        updateWaitMonths: 1,
        insourcingLevel: 0,
      });
      expect(result.speedWarningMonthlyLoss).toBe(0);
    });

    it("speedWarning=true のとき monthlyVendorCost * insourcingGap", () => {
      const result = calculate({
        monthlyVendorCost: 1_000_000,
        repairCost: 0,
        manualWorkerCount: 0,
        updateWaitMonths: 4,
        insourcingLevel: 0.25,
      });
      // 1_000_000 * 0.75 = 750_000
      expect(result.speedWarningMonthlyLoss).toBe(750_000);
    });
  });

  describe("デフォルト値フォールバック (DEFAULT_*)", () => {
    it("hourlyWage / hoursPerDay / daysPerMonth 未指定で DEFAULT_* が適用される", () => {
      const result = calculate({
        monthlyVendorCost: 0,
        repairCost: 0,
        manualWorkerCount: 5,
        updateWaitMonths: 0,
        insourcingLevel: 0,
      });
      // 5 人 * 2 h * 20 日 * 12 月 * 2,500 円 = 6,000,000
      expect(result.annualProfitCreation).toBe(6_000_000);
      expect(result.threeYearProfitCreation).toBe(18_000_000);
    });

    it("詳細設定 3 項目を全指定で上書きが効く", () => {
      const result = calculate({
        monthlyVendorCost: 0,
        repairCost: 0,
        manualWorkerCount: 5,
        updateWaitMonths: 0,
        insourcingLevel: 0,
        hourlyWage: 5_000,
        hoursPerDay: 4,
        daysPerMonth: 25,
      });
      // 5 * 4 * 25 * 12 * 5,000 = 30,000,000
      expect(result.annualProfitCreation).toBe(30_000_000);
    });
  });

  describe("ガード関数 (safeNum / clampAmount): NaN / Infinity / 負値", () => {
    it("monthlyVendorCost が NaN → 0 に丸めて計算続行", () => {
      const result = calculate({
        monthlyVendorCost: Number.NaN,
        repairCost: 500_000,
        manualWorkerCount: 5,
        updateWaitMonths: 1,
        insourcingLevel: 0,
      });
      // 月額が 0 扱いなので savings = (0 + 500_000 * 3 * 3) * 1 = 4_500_000
      expect(result.threeYearSavings).toBe(4_500_000);
    });

    it("repairCost が Infinity → 0 にフォールバック", () => {
      const result = calculate({
        monthlyVendorCost: 1_000_000,
        repairCost: Number.POSITIVE_INFINITY,
        manualWorkerCount: 0,
        updateWaitMonths: 0,
        insourcingLevel: 0,
      });
      // 改修費が 0 扱いなので savings = 1_000_000 * 36 * 1 = 36_000_000
      expect(result.threeYearSavings).toBe(36_000_000);
    });

    it("manualWorkerCount が負値 → 0 にフォールバック", () => {
      const result = calculate({
        monthlyVendorCost: 0,
        repairCost: 0,
        manualWorkerCount: -5,
        updateWaitMonths: 0,
        insourcingLevel: 0,
      });
      expect(result.annualProfitCreation).toBe(0);
    });

    it("hourlyWage が NaN で渡されたとき DEFAULT_HOURLY_WAGE にフォールバック", () => {
      const result = calculate({
        monthlyVendorCost: 0,
        repairCost: 0,
        manualWorkerCount: 5,
        updateWaitMonths: 0,
        insourcingLevel: 0,
        hourlyWage: Number.NaN,
      });
      // フォールバックで 2_500 が使われる
      expect(result.annualProfitCreation).toBe(6_000_000);
    });

    it("updateWaitMonths が NaN → 0 にフォールバックして speedWarning=false", () => {
      const result = calculate({
        monthlyVendorCost: 1_000_000,
        repairCost: 0,
        manualWorkerCount: 0,
        updateWaitMonths: Number.NaN,
        insourcingLevel: 0,
      });
      expect(result.speedWarning).toBe(false);
    });

    it("Number.MAX_VALUE 入力でオーバーフローしても clampAmount が Infinity を 0 に丸める", () => {
      // monthlyVendorCost = MAX_VALUE は safeNum を通過するが、
      // MONTHS_IN_PERIOD (36) との乗算で Infinity になり clampAmount の
      // Number.isFinite ガードが発火する。
      // 注: speedWarningMonthlyLoss = monthlyVendorCost * insourcingGap = MAX_VALUE * 1
      //     は finite のまま残るため、ここでは threeYearSavings 系のみ検証する。
      const result = calculate({
        monthlyVendorCost: Number.MAX_VALUE,
        repairCost: 0,
        manualWorkerCount: 0,
        updateWaitMonths: 4,
        insourcingLevel: 0,
      });
      expect(result.threeYearSavings).toBe(0);
      expect(result.totalThreeYearImpact).toBe(0);
    });
  });

  describe("normalizeInsourcingLevel: 不正値 → 0 (完全ベンダー依存)", () => {
    it("0.7 のような未定義値が as キャストで侵入してきても 0 にフォールバック", () => {
      const result = calculate({
        monthlyVendorCost: 1_000_000,
        repairCost: 0,
        manualWorkerCount: 0,
        updateWaitMonths: 0,
        insourcingLevel: 0.7 as InsourcingLevel,
      });
      // フォールバック後は insourcingGap=1 で savings=1_000_000*36=36_000_000
      expect(result.insourcingGap).toBe(1);
      expect(result.threeYearSavings).toBe(36_000_000);
    });

    it("NaN の insourcingLevel も 0 にフォールバック", () => {
      const result = calculate({
        monthlyVendorCost: 1_000_000,
        repairCost: 0,
        manualWorkerCount: 0,
        updateWaitMonths: 0,
        insourcingLevel: Number.NaN as InsourcingLevel,
      });
      expect(result.insourcingGap).toBe(1);
    });
  });
});

describe("manYenToYen / yenToManYen", () => {
  it.each<[number, number]>([
    [0, 0],
    [1, 10_000],
    [10_000, 100_000_000],
    [-1, -10_000],
  ])("manYenToYen(%p) === %p", (input, expected) => {
    expect(manYenToYen(input)).toBe(expected);
  });

  it.each<[number, number]>([
    [0, 0],
    [10_000, 1],
    [100_000_000, 10_000],
    [-10_000, -1],
  ])("yenToManYen(%p) === %p", (input, expected) => {
    expect(yenToManYen(input)).toBe(expected);
  });

  it("ラウンドトリップ: yenToManYen(manYenToYen(n)) === n", () => {
    [0, 1, 100, 1234].forEach((n) => {
      expect(yenToManYen(manYenToYen(n))).toBe(n);
    });
  });

  it("NaN 入力時の挙動 (純粋演算なので NaN を伝搬する)", () => {
    expect(Number.isNaN(manYenToYen(Number.NaN))).toBe(true);
    expect(Number.isNaN(yenToManYen(Number.NaN))).toBe(true);
  });
});
