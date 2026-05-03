/**
 * useCountUp フックの単体テスト。
 *
 * - 仕様: docs/spec/result-dashboard.md §6.1（自前 useCountUp）/ §6.3（reduced-motion）/
 *         §6.4（マウント時に 1 回発動）
 * - 観点:
 *   - 0 → target への補間（easeOutCubic）
 *   - prefers-reduced-motion: reduce のとき即時 target を返す
 *   - enabled=false で停止
 *   - target が NaN / Infinity のとき rAF を起動しない
 *   - アンマウント時に cancelAnimationFrame が呼ばれる
 */

import { act, renderHook } from "@testing-library/react";
import { easeOutCubic, useCountUp } from "./useCountUp";

describe("easeOutCubic", () => {
  it("t=0 のとき 0 / t=1 のとき 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("中間値 (t=0.5) は単調増加で 0..1 範囲内", () => {
    const v = easeOutCubic(0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
    expect(v).toBeCloseTo(0.875, 5); // 1 - 0.5^3 = 0.875
  });
});

describe("useCountUp", () => {
  let rafSpy: jest.SpyInstance;
  let cancelSpy: jest.SpyInstance;
  let rafQueue: Array<(t: number) => void>;
  let nowMs: number;

  beforeEach(() => {
    rafQueue = [];
    nowMs = 0;
    // requestAnimationFrame を手動制御に置き換え。
    rafSpy = jest
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        rafQueue.push(cb);
        return rafQueue.length;
      });
    cancelSpy = jest
      .spyOn(globalThis, "cancelAnimationFrame")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  /** raf キューを 1 ステップ進める。 */
  const flushRaf = (advanceMs: number) => {
    nowMs += advanceMs;
    const queued = rafQueue;
    rafQueue = [];
    for (const cb of queued) {
      cb(nowMs);
    }
  };

  it("初期値 0 から target=10000 へ補間し、duration 経過で target に到達", () => {
    const { result } = renderHook(() =>
      useCountUp(10_000, { duration: 1_000 }),
    );

    expect(result.current).toBe(0);

    // 1 frame 目: startTime を確定するだけ (elapsed=0、value 据え置き)
    act(() => flushRaf(0));
    // 2 frame 目: elapsed=500 で中間値が 0 < x < 10_000
    act(() => flushRaf(500));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(10_000);

    // duration を超えるまで進めて target に到達。
    act(() => flushRaf(1_000));
    expect(result.current).toBe(10_000);
  });

  it("target=0 のときは rAF を起動しない (初期値 0 と同値)", () => {
    renderHook(() => useCountUp(0));
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("target が NaN のとき rAF を起動しない", () => {
    renderHook(() => useCountUp(Number.NaN));
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("target が Infinity のとき rAF を起動しない", () => {
    renderHook(() => useCountUp(Number.POSITIVE_INFINITY));
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("enabled=false のとき rAF を起動しない", () => {
    renderHook(() => useCountUp(10_000, { enabled: false }));
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("prefers-reduced-motion: reduce のとき即時 target が返る (rAF 起動なし)", () => {
    // matchMedia を reduced-motion=true として上書き。
    const matchMediaMock = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(() => false),
    }));
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: matchMediaMock,
    });

    const { result } = renderHook(() => useCountUp(12_345));
    expect(result.current).toBe(12_345);
    expect(rafSpy).not.toHaveBeenCalled();

    // クリーンアップ: matchMedia を既定に戻す。
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(() => false),
      })),
    });
  });

  it("アンマウント時に cancelAnimationFrame が呼ばれる", () => {
    const { unmount } = renderHook(() =>
      useCountUp(10_000, { duration: 1_000 }),
    );
    // 1 frame 進めて rAF が積まれた状態にする。
    act(() => flushRaf(50));
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("duration <= 0 でも target に到達する (除算ガード)", () => {
    const { result } = renderHook(() => useCountUp(500, { duration: 0 }));
    act(() => flushRaf(0));
    expect(result.current).toBe(500);
  });
});
