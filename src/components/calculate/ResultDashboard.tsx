"use client";

/**
 * ROI 診断結果ダッシュボード。
 *
 * - 仕様: docs/spec/result-dashboard.md §3〜§9（ヒーロー / 補助カード / 積み上げ横棒 /
 *         §6 アニメーション方針 / §9 表示単位）／docs/design-tokens.md §2〜§5
 * - 設計: 仕様書 §10.2 の「描画層 (`DashboardView`) / 画面コンテナ (`ResultDashboard`) /
 *         PDF 用ラッパ (`PdfDashboard`)」3 層分離は本実装では本ファイル 1 つに同居させた
 *         暫定構造で運用する。`PdfDashboard` 切り出しは PDF 実装（Issue #43）着手時に
 *         本ファイルから `DashboardView` を抽出するかたちで対応する想定。
 *         Recharts は SSR 段階で `ResizeObserver` 等のブラウザ API に依存するため、
 *         呼び出し側（CalculatePageClient）で `next/dynamic({ ssr: false })` を経由する。
 * - 依存: recharts（v2 系）／lucide-react／@/hooks/useCountUp／@/lib/format／
 *         @/lib/calculation／@/lib/constants／@/components/ui/Card／@/lib/cn
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PiggyBank, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/hooks/useCountUp";
import { formatManYen, formatManYenCompact, formatPercent } from "@/lib/format";
import type { InsourcingLevel } from "@/lib/constants";
import type { CalculationOutput } from "@/lib/calculation";

const ACCENT_HEX = "#9CAEB8";
const ACCENT_60 = "rgba(156, 174, 184, 0.6)";
const TOOLTIP_CURSOR_FILL = "rgba(156, 174, 184, 0.08)";
const BAR_HEIGHT_DESKTOP = 120;
const BAR_HEIGHT_MOBILE = 100;
const RECHARTS_ANIM_MS = 800;
const MOBILE_QUERY = "(max-width: 639px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SAVINGS_LABEL = "3 年間の止血";
const PROFIT_LABEL = "3 年間の利益創出";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export type ResultDashboardProps = {
  /** calculate() の戻り値（円単位の浮動小数）。 */
  result: CalculationOutput;
  /** 内製化注記（仕様書 §3.3）の表示制御に使用。 */
  insourcingLevel: InsourcingLevel;
  /**
   * 警告バナー差し込み口（仕様書 §3.4 / §8）。
   * 親が WarningBanner（Issue #42）を組み立てて渡す。
   * undefined の場合はバナー領域を描画しない。
   */
  headerSlot?: ReactNode;
  /**
   * フッター差し込み口（仕様書 §3.4 / Issue #43 連携）。
   * 親が PDF ダウンロード／再診断ボタンを組み立てて渡す。
   */
  footerSlot?: ReactNode;
  className?: string;
};

export function ResultDashboard({
  result,
  insourcingLevel,
  headerSlot,
  footerSlot,
  className,
}: ResultDashboardProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const animatedSavings = useCountUp(result.threeYearSavings);
  const animatedAnnualProfit = useCountUp(result.annualProfitCreation);
  const animatedThreeYearProfit = useCountUp(result.threeYearProfitCreation);
  const animatedTotal = useCountUp(result.totalThreeYearImpact);

  const insourcingPercent = formatPercent(insourcingLevel);
  const isFullyInsourced = insourcingLevel === 1;
  const isPartiallyInsourced = insourcingLevel > 0 && insourcingLevel < 1;
  const chartHeight = isMobile ? BAR_HEIGHT_MOBILE : BAR_HEIGHT_DESKTOP;

  const chartData = [
    {
      label: "3年合計",
      savings: result.threeYearSavings,
      profit: result.threeYearProfitCreation,
    },
  ];

  return (
    <section
      role="region"
      aria-label="ROI 診断結果"
      className={cn(
        "mx-auto w-full max-w-[1024px] space-y-4 sm:space-y-6",
        className,
      )}
    >
      {headerSlot ? <div>{headerSlot}</div> : null}

      <Card className="py-8 text-center sm:py-12">
        <p className="text-sm font-medium text-ink/80">
          3 年間のトータルインパクト
        </p>
        <p
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 text-[clamp(2.5rem,6vw,4rem)] font-bold leading-tight text-ink"
        >
          {formatManYenCompact(animatedTotal)}
        </p>
        <p className="mt-2 text-xs text-ink/60">※ 試算上の最大値</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:mx-auto sm:max-w-[720px] sm:grid-cols-2 sm:gap-6">
        <Card>
          <div className="flex items-center gap-2 text-ink">
            <PiggyBank aria-hidden="true" className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-medium">3 年間の止血</h3>
          </div>
          <p
            aria-live="polite"
            aria-atomic="true"
            className="mt-3 text-3xl font-bold text-ink"
          >
            {formatManYen(animatedSavings)}
          </p>
          {isFullyInsourced ? (
            <p className="mt-2 text-xs text-ink/70">
              現状、理想形に近い運用のため削減余地は 0 万円
            </p>
          ) : isPartiallyInsourced ? (
            <p className="mt-2 text-xs text-ink/70">
              既に内製化されている <strong>{insourcingPercent}</strong>{" "}
              相当分は削減余地から除外済み
            </p>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-ink">
            <Sparkles aria-hidden="true" className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-medium">年間の利益創出</h3>
          </div>
          <p
            aria-live="polite"
            aria-atomic="true"
            className="mt-3 text-3xl font-bold text-ink"
          >
            {formatManYen(animatedAnnualProfit)}
          </p>
          <p className="mt-2 text-xs text-ink/70">
            × 3 年 = {formatManYen(animatedThreeYearProfit)}
          </p>
        </Card>
      </div>

      <Card className="mx-auto w-full max-w-[960px]">
        <figure className="space-y-3">
          <figcaption className="sr-only">
            3 年間の止血と 3 年間の利益創出を積み上げた横棒グラフ。合計が
            {formatManYen(result.totalThreeYearImpact)}。
          </figcaption>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
            >
              <XAxis
                type="number"
                tickFormatter={(value: number) => formatManYen(value)}
                stroke={ACCENT_HEX}
              />
              <YAxis type="category" dataKey="label" hide />
              <Tooltip
                formatter={(value: number) => formatManYen(value)}
                cursor={{ fill: TOOLTIP_CURSOR_FILL }}
              />
              <Legend
                verticalAlign="bottom"
                content={() => (
                  <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2 text-xs text-ink">
                    <li className="flex items-center gap-2">
                      <PiggyBank
                        aria-hidden="true"
                        className="h-4 w-4 text-accent"
                      />
                      <span>{SAVINGS_LABEL}</span>
                      <span className="font-semibold">
                        {formatManYen(result.threeYearSavings)}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles
                        aria-hidden="true"
                        className="h-4 w-4 text-accent/70"
                      />
                      <span>{PROFIT_LABEL}</span>
                      <span className="font-semibold">
                        {formatManYen(result.threeYearProfitCreation)}
                      </span>
                    </li>
                  </ul>
                )}
              />
              <Bar
                dataKey="savings"
                name={SAVINGS_LABEL}
                stackId="impact"
                fill={ACCENT_HEX}
                radius={[2, 0, 0, 2]}
                isAnimationActive={!reducedMotion}
                animationDuration={RECHARTS_ANIM_MS}
              />
              <Bar
                dataKey="profit"
                name={PROFIT_LABEL}
                stackId="impact"
                fill={ACCENT_60}
                radius={[0, 2, 2, 0]}
                isAnimationActive={!reducedMotion}
                animationDuration={RECHARTS_ANIM_MS}
              />
            </BarChart>
          </ResponsiveContainer>
        </figure>

        {isFullyInsourced ? (
          <p className="mt-3 text-xs text-ink/70">
            3 年間の利益創出のみで{" "}
            {formatManYen(result.threeYearProfitCreation)}{" "}
            のインパクトが見込めます。
          </p>
        ) : null}
        {result.speedWarning && !headerSlot ? (
          <p className="mt-3 text-xs text-ink/60">
            更新待ち期間が 3 ヶ月以上のため、機会損失が継続中の可能性があります。
          </p>
        ) : null}
      </Card>

      {footerSlot ? <div>{footerSlot}</div> : null}
    </section>
  );
}
