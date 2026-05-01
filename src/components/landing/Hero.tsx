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

/**
 * Hero セクション。
 *
 * Headline は 2 行構成を前提に、後半行の `accentWord` を手書き風ブラシ下線
 * (`.underline-brush`) で囲って強調する。`accentWord` を含まないコピーが
 * 渡された場合はフォールバックでプレーン表示。
 */
const HEADLINE_ACCENT_WORD = "数字";

export function Hero({ headline, subCopy, ctaLabel, ctaHref, meta }: HeroProps) {
  const accentIndex = headline.indexOf(HEADLINE_ACCENT_WORD);
  const headlineNode =
    accentIndex >= 0 ? (
      <>
        {headline.slice(0, accentIndex)}
        <span className="underline-brush">{HEADLINE_ACCENT_WORD}</span>
        {headline.slice(accentIndex + HEADLINE_ACCENT_WORD.length)}
      </>
    ) : (
      headline
    );

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-canvas px-4 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20 lg:pb-32 lg:pt-24"
    >
      {/* 背景の柔らかな放射グラデーション (accent 18%) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_85%_-10%,_rgba(156,174,184,0.22),_transparent_55%),radial-gradient(ellipse_at_-5%_110%,_rgba(190,181,170,0.18),_transparent_60%)]"
      />
      {/* 紙質グレインのオーバーレイ */}
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 -z-10 opacity-100"
      />

      {/* 左下の小さな猫モチーフ (装飾、回転 -12°) */}
      <Image
        src="/brand/cat-deco-1.svg"
        alt=""
        aria-hidden="true"
        width={120}
        height={120}
        className="pointer-events-none absolute -bottom-4 left-[-1.5rem] -z-10 h-24 w-24 -rotate-12 opacity-30 sm:bottom-6 sm:left-6 sm:h-28 sm:w-28 lg:h-32 lg:w-32"
      />

      <div className="relative mx-auto grid max-w-screen-xl items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-8 sm:gap-10">
          <div className="animate-fade-up [animation-delay:60ms]">
            <SectionEyebrow number="01" label="Welcome" />
          </div>

          <h1
            id="hero-heading"
            className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[5.25rem] lg:leading-[1.05] animate-fade-up [animation-delay:160ms]"
          >
            {headlineNode}
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-ink/85 sm:text-lg sm:leading-relaxed animate-fade-up [animation-delay:280ms]">
            {subCopy}
          </p>

          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7 animate-fade-up [animation-delay:400ms]">
            <Link
              href={ctaHref}
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-md bg-ink px-7 text-base font-medium text-canvas shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-lg"
            >
              {ctaLabel}
              <ArrowRight
                aria-hidden="true"
                className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
            {meta && meta.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/65 sm:text-[13px]">
                {meta.map((item) => (
                  <li
                    key={item}
                    className="before:mr-3 before:text-line before:content-['/'] first:before:content-none"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {/* 右側: メイン猫モチーフ。柔らかな影とリング装飾を伴う */}
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center lg:max-w-none animate-fade-up [animation-delay:200ms]">
          <div
            aria-hidden="true"
            className="absolute inset-6 -z-10 rounded-full bg-line/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-8 inset-y-12 -z-10 rounded-full border border-line/40"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-2 inset-y-6 -z-10 rounded-full border border-dashed border-line/30"
          />
          <Image
            src="/brand/cat-deco-1.svg"
            alt=""
            aria-hidden="true"
            width={420}
            height={420}
            className="h-auto w-full max-w-[380px] rotate-[4deg] drop-shadow-[0_18px_30px_rgba(114,102,91,0.10)]"
          />
        </div>
      </div>
    </section>
  );
}
