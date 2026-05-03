/**
 * analytics.ts の単体テスト。
 *
 * - 観点: trackEvent / trackPageView は no-op で例外を投げない。
 *         isAnalyticsEnabled は process.env.NEXT_PUBLIC_CF_BEACON_TOKEN の有無に従う
 *         （モジュール初期化時に評価されるため `jest.isolateModulesAsync` で再ロード検証）。
 */

describe("analytics", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("isAnalyticsEnabled は CF_BEACON_TOKEN 未設定時 false", async () => {
    delete process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
    await jest.isolateModulesAsync(async () => {
      const mod = await import("./analytics");
      expect(mod.isAnalyticsEnabled).toBe(false);
    });
  });

  it("isAnalyticsEnabled は CF_BEACON_TOKEN 設定時 true", async () => {
    process.env.NEXT_PUBLIC_CF_BEACON_TOKEN = "test-token";
    await jest.isolateModulesAsync(async () => {
      const mod = await import("./analytics");
      expect(mod.isAnalyticsEnabled).toBe(true);
    });
  });

  it("trackEvent / trackPageView は no-op で例外を投げない (token 無し)", async () => {
    delete process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
    await jest.isolateModulesAsync(async () => {
      const mod = await import("./analytics");
      expect(() => mod.trackEvent("test_event", { foo: "bar" })).not.toThrow();
      expect(() => mod.trackPageView("/path")).not.toThrow();
    });
  });

  it("trackEvent / trackPageView は no-op で例外を投げない (token 有り)", async () => {
    process.env.NEXT_PUBLIC_CF_BEACON_TOKEN = "test-token";
    await jest.isolateModulesAsync(async () => {
      const mod = await import("./analytics");
      expect(() => mod.trackEvent("test_event")).not.toThrow();
      expect(() => mod.trackPageView("/")).not.toThrow();
    });
  });
});
