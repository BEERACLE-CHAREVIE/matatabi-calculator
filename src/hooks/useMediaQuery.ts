"use client";

/**
 * メディアクエリの match 状態を返すフック（`useSyncExternalStore` ベース）。
 *
 * - 仕様: docs/spec/result-dashboard.md §6.3（prefers-reduced-motion 尊重）/
 *         §7（レスポンシブ・mobile breakpoint）
 * - 設計: React 19 公式の外部ストア購読 API `useSyncExternalStore` を用い、
 *         SSR 時は `getServerSnapshot` で `false` を返してハイドレーション後に
 *         `window.matchMedia` の実値で同期する。
 *         `subscribe` は query をクロージャに閉じ込める必要があり、
 *         参照安定化のため `useCallback` で `[query]` 依存メモ化する。
 * - 依存: react（useSyncExternalStore / useCallback）。
 */

import { useCallback, useSyncExternalStore } from "react";

function getServerSnapshot(): boolean {
  return false;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = useCallback((): boolean => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
