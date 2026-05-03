/**
 * Jest 共通セットアップ。
 *
 * - 仕様: working/plans/issue-48-test-suite-jest-rtl-playwright_*.md §2
 * - 役割: jsdom が実装しないブラウザ API（`matchMedia` / `IntersectionObserver` /
 *         `ResizeObserver`）と、`useCountUp` テストで上書きしたい
 *         `requestAnimationFrame` / `cancelAnimationFrame` のフォールバックを単一の真実の源として注入する。
 *         各テストで重複定義しないことが目的。
 */

import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// matchMedia: useMediaQuery (src/hooks/useMediaQuery.ts) と useCountUp が依存。
// ---------------------------------------------------------------------------
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(), // 旧 API（過去ブラウザ互換）
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(() => false),
  })),
});

// ---------------------------------------------------------------------------
// IntersectionObserver: ランディング系コンポーネント（将来）の RTL レンダリング向け。
// ---------------------------------------------------------------------------
class MockIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];
}
(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// ---------------------------------------------------------------------------
// ResizeObserver: Recharts の ResponsiveContainer が依存。
// ---------------------------------------------------------------------------
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// ---------------------------------------------------------------------------
// requestAnimationFrame / cancelAnimationFrame:
// jsdom は実装するが、useCountUp テストでは jest.useFakeTimers() と組み合わせて
// 時間を進めるためスタブで上書きする。テスト側で再上書き可能。
// ---------------------------------------------------------------------------
globalThis.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
  return setTimeout(() => cb(performance.now()), 16) as unknown as number;
}) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = ((id: number): void => {
  clearTimeout(id as unknown as NodeJS.Timeout);
}) as typeof cancelAnimationFrame;
