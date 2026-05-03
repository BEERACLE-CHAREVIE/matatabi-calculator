import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionEyebrow } from "./SectionEyebrow";

export type HeroProps = {
  headline: string;
  subCopy: string;
  ctaLabel: string;
  ctaHref: string;
  meta?: ReadonlyArray<string>;
};

const HEADLINE_ACCENT_WORD = "数字";

/**
 * Hero — 数字を視覚アンカーに据えた編集型ヒーロー。
 * 左カラム: 章番号 / 縦書きラベル / 大見出し / サブコピー / CTA。
 * 右カラム: 「経営判断のための balance sheet」風の数字カード。
 * 背景: 紙温度のグラデ + グレイン + accent の柔らかい放射。
 */
export function Hero({ headline, subCopy, ctaLabel, ctaHref, meta }: HeroProps) {
  const accentIndex = headline.indexOf(HEADLINE_ACCENT_WORD);
  const headlineNode =
    accentIndex >= 0 ? (
      <>
        {headline.slice(0, accentIndex)}
        <span className="underline-stamp">{HEADLINE_ACCENT_WORD}</span>
        {headline.slice(accentIndex + HEADLINE_ACCENT_WORD.length)}
      </>
    ) : (
      headline
    );

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-paper-warm px-4 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16 lg:pb-36 lg:pt-20"
    >
      {/* 背景: 紙のグレイン + accent 放射 */}
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_88%_-12%,_rgba(156,174,184,0.28),_transparent_55%),radial-gradient(ellipse_at_-8%_115%,_rgba(190,181,170,0.22),_transparent_60%)]"
      />

      {/* 縦書き装飾ラベル (右端、デスクトップのみ) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-24 z-0 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-ink/40 lg:block"
      >
        <span className="tate-gaki block">
          ROI · 2026 · NEKO NI MATATABI
        </span>
      </div>

      {/* 上部のスタンプ風 micro-copy: chapter number + filing date */}
      <div className="mx-auto mb-12 flex max-w-screen-xl items-center justify-between gap-4 text-[11px] sm:mb-16">
        <div className="font-mono uppercase tracking-[0.22em] text-ink/55">
          <span className="fig-mono mr-3 text-accent">¶ 001</span>
          Filing · ROI Diagnostic
        </div>
        <div className="hidden font-mono uppercase tracking-[0.22em] text-ink/45 sm:block">
          / Issued for SMB executives
        </div>
      </div>

      <div className="relative mx-auto grid max-w-screen-xl items-start gap-14 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
        {/* === 左カラム === */}
        <div className="flex flex-col gap-9 sm:gap-12">
          <div className="animate-fade-up [animation-delay:60ms]">
            <SectionEyebrow number="01" label="ROI Diagnostic" />
          </div>

          <h1
            id="hero-heading"
            className="text-balance font-mincho text-[2.4rem] font-medium leading-[1.18] tracking-[0.005em] text-ink sm:text-5xl sm:leading-[1.14] lg:text-[5.4rem] lg:leading-[1.05] animate-fade-up [animation-delay:160ms]"
          >
            {headlineNode}
          </h1>

          {/* horizontal rule with date stamp */}
          <div
            aria-hidden="true"
            className="flex items-center gap-4 animate-fade-up [animation-delay:240ms]"
          >
            <span className="h-px flex-1 bg-line/60" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink/45">
              §  Headline · Issued 2026
            </span>
            <span className="h-px w-10 bg-line/60" />
          </div>

          <p className="max-w-2xl text-base leading-[1.85] text-ink/82 sm:text-[17px] animate-fade-up [animation-delay:320ms]">
            {subCopy}
          </p>

          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8 animate-fade-up [animation-delay:420ms]">
            <Link
              href={ctaHref}
              className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-ink px-8 text-base font-medium text-canvas shadow-card transition-[transform,box-shadow,opacity] duration-300 hover:-translate-y-[2px] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-[17px]"
            >
              <span className="relative z-10">{ctaLabel}</span>
              <ArrowRight
                aria-hidden="true"
                className="relative z-10 h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1.5"
              />
              {/* ボタン内の hover シマー */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
            </Link>
            {meta && meta.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/55">
                {meta.map((item) => (
                  <li
                    key={item}
                    className="before:mr-4 before:text-line before:content-['·'] first:before:content-none"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {/* === 右カラム: balance-sheet 風の数字カード === */}
        <HeroLedger />
      </div>
    </section>
  );
}

/**
 * Hero 右カラム。3 行の "demo balance sheet"。
 * 数字は説得材料の例示であり、本当の試算結果は /calculate で出る。
 */
function HeroLedger() {
  const rows: ReadonlyArray<{
    label: string;
    sub: string;
    figure: string;
    delta: string;
    sign: "plus" | "minus";
  }> = [
    {
      label: "止血額",
      sub: "Bleeding stopped / 年",
      figure: "¥2,400,000",
      delta: "−18.4%",
      sign: "minus",
    },
    {
      label: "機会創出",
      sub: "Upside captured / 年",
      figure: "¥3,600,000",
      delta: "+27.1%",
      sign: "plus",
    },
    {
      label: "投資回収",
      sub: "Payback period",
      figure: "11.4 ヶ月",
      delta: "中央値",
      sign: "plus",
    },
  ];

  return (
    <aside
      aria-hidden="true"
      className="relative w-full animate-fade-up [animation-delay:300ms]"
    >
      {/* 紙の影 */}
      <div className="absolute -inset-2 -z-10 rotate-[1.5deg] rounded-[28px] bg-line/15" />
      <div className="absolute -inset-1 -z-10 -rotate-[0.8deg] rounded-[26px] bg-canvas shadow-floating" />

      <div className="relative overflow-hidden rounded-[24px] border border-line/55 bg-canvas">
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-50" />

        {/* ヘッダ: 伝票風 */}
        <div className="relative flex items-center justify-between border-b border-line/40 px-6 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/55">
              Balance Sheet · Sample
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink/40">
            FY26
          </span>
        </div>

        {/* 行 */}
        <ol className="relative divide-y divide-line/35">
          {rows.map((row, i) => (
            <li
              key={row.label}
              className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 px-6 py-5 sm:px-7 sm:py-6"
            >
              <span className="fig-mono text-[11px] text-ink/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-mincho text-[15px] font-medium text-ink sm:text-base">
                  {row.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  {row.sub}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="fig-mono text-[20px] font-semibold leading-none text-ink sm:text-[26px]">
                  {row.figure}
                </span>
                <span
                  className={[
                    "font-mono text-[10px] uppercase tracking-[0.18em]",
                    row.sign === "plus" ? "text-accent" : "text-ink/55",
                  ].join(" ")}
                >
                  {row.delta}
                </span>
              </div>
            </li>
          ))}
        </ol>

        {/* フッタ: 押印 + brand mark */}
        <div className="relative flex items-center justify-between border-t border-line/40 px-6 py-4 sm:px-7">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">
            Disclaimer · 例示数値
          </span>
          <div className="relative h-12 w-12">
            <Image
              src="/brand/cat-deco-1.svg"
              alt=""
              aria-hidden="true"
              fill
              sizes="48px"
              className="rotate-[8deg] object-contain opacity-40 mix-blend-multiply"
            />
          </div>
        </div>

        {/* 縦書きの "鑑定中" 風スタンプ */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-20 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-ink/35 sm:block"
        >
          <span className="tate-gaki block">
            For Executive · Sample Only
          </span>
        </span>
      </div>
    </aside>
  );
}
