import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionEyebrow } from "./SectionEyebrow";

export type ClosingCtaProps = {
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * 終端 CTA。dark substrate (ink) に巨大な数字と編集ヘッドラインを配置。
 * Hero と CTA 文言を変えて、二段目の誘導を担う。
 */
export function ClosingCta({
  headline,
  body,
  ctaLabel,
  ctaHref,
}: ClosingCtaProps) {
  return (
    <section
      aria-labelledby="closing-cta-heading"
      className="relative isolate overflow-hidden bg-ink px-4 py-24 text-canvas sm:px-8 sm:py-32"
    >
      {/* 背景グレイン（暗色用に少し強め） */}
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 opacity-30 mix-blend-screen"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(248,246,242,0.08),_transparent_60%),radial-gradient(ellipse_at_85%_120%,_rgba(156,174,184,0.18),_transparent_55%)]"
      />

      {/* 巨大な装飾数字 (右奥) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 top-12 select-none font-display text-[16rem] font-light leading-none text-canvas/[0.05] sm:-right-16 sm:text-[22rem] lg:-right-20 lg:text-[28rem]"
      >
        06
      </div>

      {/* 透かし猫 (低彩度) */}
      <Image
        src="/brand/cat-deco-1.svg"
        alt=""
        aria-hidden="true"
        width={520}
        height={520}
        className="pointer-events-none absolute -left-16 -bottom-12 -z-10 h-72 w-72 -rotate-[12deg] opacity-[0.08] sm:-left-12 sm:h-[26rem] sm:w-[26rem]"
      />

      {/* 縦書きの "fin" マーク (右端) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-24 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-canvas/45 lg:block"
      >
        <span className="tate-gaki block">Filed · 2026 · Matatabi</span>
      </div>

      <div className="relative mx-auto grid max-w-screen-xl gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16">
        <div className="flex flex-col gap-7 sm:gap-10">
          <SectionEyebrow number="06" label="One last thing" variant="canvas" />
          <h2
            id="closing-cta-heading"
            className="text-balance font-mincho text-[2rem] font-medium leading-[1.2] sm:text-[2.6rem] lg:text-[3.4rem] lg:leading-[1.15]"
          >
            {headline}
          </h2>

          {/* horizontal rule + caption */}
          <div
            aria-hidden="true"
            className="flex items-center gap-4"
          >
            <span className="h-px w-16 bg-canvas/40" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-canvas/55">
              §  Closing remarks
            </span>
            <span className="h-px flex-1 bg-canvas/30" />
          </div>

          <p className="max-w-xl text-base leading-[1.85] text-canvas/82 sm:text-[17px]">
            {body}
          </p>

          <Link
            href={ctaHref}
            className="group relative inline-flex h-14 w-fit items-center justify-center gap-3 overflow-hidden rounded-full bg-canvas px-8 text-base font-medium text-ink shadow-floating transition-[transform,box-shadow] duration-300 hover:-translate-y-[2px] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:text-[17px]"
          >
            <span className="relative z-10">{ctaLabel}</span>
            <ArrowRight
              aria-hidden="true"
              className="relative z-10 h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1.5"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          </Link>
        </div>

        {/* 右ブロック: 大きな数字オブジェクト */}
        <aside
          aria-hidden="true"
          className="relative flex flex-col items-start lg:items-end"
        >
          <div className="relative flex flex-col gap-2 rounded-2xl border border-canvas/15 bg-canvas/[0.04] px-7 py-8 backdrop-blur-sm sm:px-9 sm:py-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/55">
              Today · 所要時間
            </span>
            <span className="fig-mono text-[5.6rem] font-light leading-none text-canvas sm:text-[7rem]">
              5<span className="text-canvas/55">′</span>
            </span>
            <span className="font-mincho text-[14px] text-canvas/70">
              for a 3-year roadmap.
            </span>

            {/* 押印風 stamp */}
            <div className="absolute -right-3 -top-3 flex h-16 w-16 rotate-[6deg] flex-col items-center justify-center gap-0.5 rounded-full border border-accent/70 bg-canvas/[0.06] font-mono text-[9px] uppercase leading-none tracking-[0.18em] text-canvas/85">
              <span>FREE</span>
              <span>5 min</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
