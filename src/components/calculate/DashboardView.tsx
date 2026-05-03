"use client";

/**
 * ROI 診断結果ダッシュボードの描画層（仕様書 docs/spec/result-dashboard.md §10.2）。
 *
 * - 仕様: docs/spec/result-dashboard.md §3〜§9 / §10.2 / §6 / §9
 *         docs/design-tokens.md §2〜§5
 * - 設計: 副作用ゼロの pure component。`useState` / `useEffect` / `useRef` /
 *         カスタムフック（`useCountUp` / `useMediaQuery` 等）は一切使用しない。
 *         アニメーション補間値・isMobile・animated はコンテナ (`ResultDashboard`) から
 *         props 経由で受け取る。`useMemo` のみ描画派生値の最適化用に許容。
 * - トークン追従: `ACCENT_HEX` / `ACCENT_60` / `TOOLTIP_CURSOR_FILL` は `accent` (#9CAEB8)
 *         と同値の手書き定数。`docs/design-tokens.md §2` の「CSS 変数を挟まない」方針。
 */

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatManYen, formatManYenCompact, formatPercent } from "@/lib/format";
import type { InsourcingLevel } from "@/lib/constants";
import type { CalculationOutput } from "@/lib/calculation";

const ACCENT_HEX = "#9CAEB8";
const ACCENT_60 = "rgba(156, 174, 184, 0.6)";
const TOOLTIP_CURSOR_FILL = "rgba(156, 174, 184, 0.08)";
const BAR_HEIGHT_DESKTOP = 120;
const BAR_HEIGHT_MOBILE = 100;
const RECHARTS_ANIM_MS = 800;
const SAVINGS_LABEL = "3 年間の止血";
const PROFIT_LABEL = "3 年間の利益創出";

export interface DashboardViewProps {
  result: CalculationOutput;
  insourcingLevel: InsourcingLevel;
  animated: boolean;
  animatedSavings: number;
  animatedAnnualProfit: number;
  animatedThreeYearProfit: number;
  animatedTotal: number;
  isMobile: boolean;
  onDownloadPdf: () => void;
  onPdfRetry: () => void;
  onResetRequest?: () => void;
  isGeneratingPdf: boolean;
  pdfError: string | null;
  pdfErrorIsEscalated: boolean;
  headerSlot?: ReactNode;
  className?: string;
}

export function DashboardView({
  result,
  insourcingLevel,
  animated,
  animatedSavings,
  animatedAnnualProfit,
  animatedThreeYearProfit,
  animatedTotal,
  isMobile,
  onDownloadPdf,
  onPdfRetry,
  onResetRequest,
  isGeneratingPdf,
  pdfError,
  pdfErrorIsEscalated,
  headerSlot,
  className,
}: DashboardViewProps) {
  const insourcingPercent = formatPercent(insourcingLevel);
  const isFullyInsourced = insourcingLevel === 1;
  const isPartiallyInsourced = insourcingLevel > 0 && insourcingLevel < 1;
  const chartHeight = isMobile ? BAR_HEIGHT_MOBILE : BAR_HEIGHT_DESKTOP;

  const chartData = useMemo(
    () => [
      {
        label: "3年合計",
        savings: result.threeYearSavings,
        profit: result.threeYearProfitCreation,
      },
    ],
    [result.threeYearSavings, result.threeYearProfitCreation],
  );

  return (
    <section
      role="region"
      aria-label="ROI 診断結果"
      className={cn(
        "mx-auto w-full max-w-[1024px] space-y-5 sm:space-y-6",
        className,
      )}
    >
      {/* 結果セクションのヘッダ */}
      <div className="flex items-center justify-between gap-4 pt-2 text-[11px]">
        <div className="font-mono uppercase tracking-[0.22em] text-ink/55">
          <span className="fig-mono mr-3 text-accent">¶ 003</span>
          Result · Statement
        </div>
        <div className="hidden font-mono uppercase tracking-[0.22em] text-ink/45 sm:block">
          / Generated in browser
        </div>
      </div>

      {headerSlot ? <div>{headerSlot}</div> : null}

      {/* === ヒーロー: 3 年間のトータルインパクト === */}
      <article className="relative overflow-hidden rounded-[28px] border border-line/55 bg-canvas/85 backdrop-blur-[1px] shadow-card">
        <div
          aria-hidden="true"
          className="bg-grain pointer-events-none absolute inset-0 opacity-50"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 top-0 select-none font-display text-[14rem] font-light leading-none text-ink/[0.04] sm:text-[18rem]"
        >
          ¥
        </div>

        <div className="relative flex items-center justify-between border-b border-line/40 px-7 py-4 sm:px-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/55">
              Total Impact · 3 yrs
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink/40">
            FY26 — FY28
          </span>
        </div>

        <div className="relative flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-16">
          <p className="font-mincho text-[14px] font-medium leading-tight text-ink/75 sm:text-[15px]">
            3 年間のトータルインパクト
          </p>
          <p
            aria-live="polite"
            aria-atomic="true"
            className="fig-mono text-[clamp(2.6rem,7vw,4.6rem)] font-light leading-[1.05] text-ink"
          >
            {formatManYenCompact(animatedTotal)}
          </p>
          <div
            aria-hidden="true"
            className="flex items-center gap-3"
          >
            <span className="h-px w-10 bg-line/60" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink/45">
              ※ 試算上の最大値
            </span>
            <span className="h-px w-10 bg-line/60" />
          </div>
        </div>
      </article>

      {/* === 補助カード × 2: 止血 / 利益 === */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
        <ResultCard
          chapter="04"
          eyebrow="Bleeding stopped"
          title="3 年間の止血"
          figure={formatManYen(animatedSavings)}
          accent="ink"
          note={
            isFullyInsourced ? (
              <>現状、理想形に近い運用のため削減余地は 0 万円</>
            ) : isPartiallyInsourced ? (
              <>
                既に内製化されている <strong className="font-mincho text-ink">{insourcingPercent}</strong>{" "}
                相当分は削減余地から除外済み
              </>
            ) : null
          }
        />
        <ResultCard
          chapter="05"
          eyebrow="Upside captured"
          title="年間の利益創出"
          figure={formatManYen(animatedAnnualProfit)}
          accent="accent"
          note={
            <>
              × 3 年 ={" "}
              <span className="fig-mono text-ink">
                {formatManYen(animatedThreeYearProfit)}
              </span>
            </>
          }
        />
      </div>

      {/* === グラフカード === */}
      <article className="relative overflow-hidden rounded-[24px] border border-line/55 bg-canvas/85 backdrop-blur-[1px] shadow-card">
        <div
          aria-hidden="true"
          className="bg-grain pointer-events-none absolute inset-0 opacity-50"
        />
        <div className="relative flex items-center justify-between border-b border-line/40 px-7 py-4 sm:px-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/55">
            <span className="fig-mono mr-3 text-accent">06</span>
            Stacked Distribution
          </span>
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink/40">
            3-year breakdown
          </span>
        </div>

        <figure className="relative space-y-4 px-6 py-7 sm:px-9 sm:py-8">
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
                  <ul className="flex flex-wrap justify-center gap-x-7 gap-y-2 pt-3 text-[12px] text-ink">
                    <li className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-3.5 rounded-sm bg-accent"
                      />
                      <span className="font-mincho">{SAVINGS_LABEL}</span>
                      <span className="fig-mono font-semibold">
                        {formatManYen(result.threeYearSavings)}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-3.5 rounded-sm bg-accent/60"
                      />
                      <span className="font-mincho">{PROFIT_LABEL}</span>
                      <span className="fig-mono font-semibold">
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
                isAnimationActive={animated}
                animationDuration={RECHARTS_ANIM_MS}
              />
              <Bar
                dataKey="profit"
                name={PROFIT_LABEL}
                stackId="impact"
                fill={ACCENT_60}
                radius={[0, 2, 2, 0]}
                isAnimationActive={animated}
                animationDuration={RECHARTS_ANIM_MS}
              />
            </BarChart>
          </ResponsiveContainer>

          {isFullyInsourced ? (
            <p className="text-[12px] leading-relaxed text-ink/65">
              3 年間の利益創出のみで{" "}
              <span className="fig-mono text-ink/85">
                {formatManYen(result.threeYearProfitCreation)}
              </span>{" "}
              のインパクトが見込めます。
            </p>
          ) : null}
          {result.speedWarning && !headerSlot ? (
            <p className="text-[12px] leading-relaxed text-ink/60">
              更新待ち期間が 3 ヶ月以上のため、機会損失が継続中の可能性があります。
            </p>
          ) : null}
        </figure>
      </article>

      {/* === Action row === */}
      <div className="flex flex-col items-center gap-5 pt-2">
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            aria-busy={isGeneratingPdf}
            className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-ink px-8 text-[16px] font-medium text-canvas shadow-card transition-[transform,box-shadow,opacity] duration-300 hover:-translate-y-[2px] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:text-[17px]"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="relative z-10 h-4 w-4 animate-spin"
                />
                <span className="relative z-10">PDF生成中…</span>
              </>
            ) : (
              <>
                <span className="relative z-10">PDF をダウンロード</span>
                <ArrowRight
                  aria-hidden="true"
                  className="relative z-10 h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1.5"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
              </>
            )}
          </button>
          {onResetRequest ? (
            <button
              type="button"
              onClick={onResetRequest}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-line bg-canvas px-7 text-[16px] font-medium text-ink transition-[background-color,border-color,transform] duration-200 hover:-translate-y-[1px] hover:border-ink hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-[17px]"
            >
              再診断する
            </button>
          ) : null}
        </div>
        {pdfError ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-2xl border border-[#B45656]/40 bg-[#B45656]/[0.05] px-6 py-4 text-center"
          >
            <p className="text-sm text-[#B45656]">{pdfError}</p>
            {pdfErrorIsEscalated ? (
              <Link
                href="/contact"
                className="text-sm font-medium text-ink underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                お問い合わせフォームへ
              </Link>
            ) : (
              <button
                type="button"
                onClick={onPdfRetry}
                disabled={isGeneratingPdf}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-canvas px-5 text-sm font-medium text-ink transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                <span>再試行</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * 結果カード (止血 / 利益) の編集レイアウト。
 */
function ResultCard({
  chapter,
  eyebrow,
  title,
  figure,
  accent,
  note,
}: {
  chapter: string;
  eyebrow: string;
  title: string;
  figure: string;
  accent: "ink" | "accent";
  note: ReactNode;
}) {
  return (
    <article className="relative flex flex-col gap-5 overflow-hidden rounded-[24px] border border-line/55 bg-canvas/85 p-7 backdrop-blur-[1px] shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:p-8">
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 opacity-40"
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-[3px]",
          accent === "ink" ? "bg-ink/70" : "bg-accent",
        )}
      />

      <div className="relative flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/55">
          <span className="fig-mono mr-2 text-accent">{chapter}</span>
          {eyebrow}
        </span>
      </div>

      <h3 className="relative font-mincho text-[15px] font-medium text-ink/85">
        {title}
      </h3>

      <p
        aria-live="polite"
        aria-atomic="true"
        className="fig-mono text-[2.4rem] font-light leading-none text-ink sm:text-[2.8rem]"
      >
        {figure}
      </p>

      {note ? (
        <p className="relative text-[12px] leading-relaxed text-ink/65">
          {note}
        </p>
      ) : null}
    </article>
  );
}
