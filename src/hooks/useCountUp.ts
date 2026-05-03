/**
 * 数値カウントアップアニメーション用カスタムフック。
 *
 * - 仕様: docs/spec/result-dashboard.md §6.1（自前 useCountUp / requestAnimationFrame ベース /
 *         duration 1,200ms / easeOutCubic）/ §6.3（prefers-reduced-motion: reduce 尊重）/
 *         §6.4（マウント時に 1 回発動・再診断時はリマウントで再発動）
 * - 設計: requestAnimationFrame ベースの自前実装。補間単位は円（number）で、
 *         表示時に呼び出し側で formatManYen / formatManYenCompact に渡す（仕様書 §9.1 / §9.2）。
 *         マウント時は 0 から target へ立ち上げるため初期値を 0 で固定する。
 * - 依存: 純粋に React hooks のみ（useEffect / useRef / useState）。
 */

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";
import { REDUCED_MOTION_QUERY } from "@/lib/mediaQueries";

/** カウンターの標準 duration（ミリ秒）。docs/spec/result-dashboard.md §6.1 で確定。 */
const DEFAULT_DURATION_MS = 1_200;

/** ease-out cubic。t ∈ [0, 1] を [0, 1] に写像する。 */
export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export type UseCountUpOptions = {
  /** アニメーション持続時間（ミリ秒）。既定 1,200ms。 */
  duration?: number;
  /**
   * 補間に用いるイージング関数。t ∈ [0, 1] を受け、補間係数 ∈ [0, 1] を返す。既定 easeOutCubic。
   * 毎レンダー新しい関数参照を渡すと再アニメが走るため、安定参照（モジュールスコープ関数 /
   * useCallback でメモ化したもの）を渡すこと。
   */
  easing?: (t: number) => number;
  /** false でアニメーションを停止し、現在値を保持する。既定 true。 */
  enabled?: boolean;
};

/**
 * `target` 値が変化したとき、現在値から滑らかに補間するアニメーションを返すフック。
 *
 * - 初期値は 0（仕様書 §6.4「マウント時に 1 回発動」）。target が 0 のままならアニメは発動せず再レンダーも起きない。
 * - target 変更時は現在値からの差分で再アニメーション。
 * - prefers-reduced-motion: reduce のときは即時 target を返し rAF を起動しない。
 * - enabled=false で停止。再開時はその時点の値から target へ補間を再開。
 * - アンマウント・依存変更時にクリーンアップ関数で cancelAnimationFrame を実行しメモリリークを防ぐ。
 *
 * @param target アニメーションの目標値（円単位）。
 * @param options duration / easing / enabled のオプション。
 * @returns 補間中の現在値（円単位の number）。
 */
export function useCountUp(
  target: number,
  options?: UseCountUpOptions,
): number {
  const duration = options?.duration ?? DEFAULT_DURATION_MS;
  const easingFn = options?.easing ?? easeOutCubic;
  const enabled = options?.enabled ?? true;

  // 初期値 0 はマウント時の 0 → target 立ち上げアニメ（仕様書 §6.4）を実現するための固定値。
  const [value, setValue] = useState<number>(0);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(0);
  const valueRef = useRef<number>(0);

  useEffect(() => {
    // target が NaN / Infinity の場合は rAF を起動せず現在値を保持する。
    // NaN === NaN が常に false となり毎フレーム再アニメが走るのを防ぐためのガード
    // （表示層 src/lib/format.ts:30 の Number.isFinite 防御方針と整合）。
    if (!Number.isFinite(target)) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    if (!enabled) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    if (reducedMotion) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (valueRef.current !== target) {
        valueRef.current = target;
        setValue(target);
      }
      return;
    }

    if (valueRef.current === target) {
      return;
    }

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    startValueRef.current = valueRef.current;
    startTimeRef.current = null;

    const tick = (now: number) => {
      startTimeRef.current ??= now;
      const elapsed = now - startTimeRef.current;
      const progress = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
      const eased = easingFn(progress);
      const interp =
        startValueRef.current + (target - startValueRef.current) * eased;

      if (progress < 1) {
        valueRef.current = interp;
        setValue(interp);
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        valueRef.current = target;
        setValue(target);
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [target, duration, easingFn, enabled, reducedMotion]);

  return value;
}
