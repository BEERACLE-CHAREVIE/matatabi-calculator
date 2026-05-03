/**
 * メディアクエリ文字列定数の集約。
 *
 * - 仕様: docs/spec/result-dashboard.md §6.3（prefers-reduced-motion 尊重）/
 *         §7（mobile breakpoint）
 * - 設計: `useMediaQuery`（`useSyncExternalStore` ベース）に渡すクエリ文字列の
 *         単一の真実の源。`ResultDashboard` と `useCountUp` で同一文字列を別々に
 *         保持していた重複を解消する。`tailwind.config.ts` の `sm` ブレークポイント
 *         （640px）と整合する `(max-width: 639px)` を使用。
 */

/** モバイル判定（sm ブレークポイント未満）に使うメディアクエリ文字列。 */
export const MOBILE_QUERY = "(max-width: 639px)";

/** prefers-reduced-motion: reduce のメディアクエリ文字列。 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
