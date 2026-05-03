import type { Metadata } from "next";
import { CalculatePageClient } from "./CalculatePageClient";
import { SectionEyebrow } from "@/components/landing";

export const metadata: Metadata = {
  title: "ROI 診断",
  description:
    "5 つの質問に答えるだけで、IT コストの止血額と機会損失を診断します。",
  robots: { index: false, follow: true },
};

export default function CalculatePage() {
  return (
    <main className="relative isolate overflow-hidden bg-paper-warm">
      {/* 紙テクスチャ */}
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 -z-10 opacity-70"
      />
      {/* accent の柔らかい放射 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_92%_-8%,_rgba(156,174,184,0.22),_transparent_55%),radial-gradient(ellipse_at_-8%_120%,_rgba(190,181,170,0.18),_transparent_60%)]"
      />

      {/* 縦書き装飾 (デスクトップのみ) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-32 z-0 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-ink/40 lg:block"
      >
        <span className="tate-gaki block">
          ROI · Diagnostic Form · 2026
        </span>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16 lg:max-w-4xl">
        {/* 上部 micro-copy */}
        <div className="mb-10 flex items-center justify-between gap-4 text-[11px] sm:mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-ink/55">
            <span className="fig-mono mr-3 text-accent">¶ 002</span>
            Diagnostic · Sheet
          </div>
          <div className="hidden font-mono uppercase tracking-[0.22em] text-ink/45 sm:block">
            / 5 questions · 5 min
          </div>
        </div>

        {/* ヘッダ: 編集風タイトルブロック */}
        <header className="mb-12 flex flex-col gap-6 sm:mb-16 sm:gap-7">
          <SectionEyebrow number="01" label="ROI Diagnostic" />
          <h1 className="text-balance font-mincho text-[2.2rem] font-medium leading-[1.2] text-ink sm:text-[2.6rem] lg:text-[3.2rem] lg:leading-[1.15]">
            ROI 診断
          </h1>
          <div
            aria-hidden="true"
            className="flex items-center gap-4"
          >
            <span className="h-px w-16 bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink/45">
              §  Form · 5 inputs
            </span>
            <span className="h-px flex-1 bg-line/50" />
          </div>
          <p className="max-w-2xl text-[15px] leading-[1.85] text-ink/80 sm:text-base">
            5 つの質問にお答えいただくと、3 年間の止血額と機会損失を試算します。
            データはお使いのブラウザ内で完結し、当社サーバーへ送信されることはありません。
          </p>
        </header>

        <CalculatePageClient />
      </div>
    </main>
  );
}
