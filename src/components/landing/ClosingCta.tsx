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

export function ClosingCta({
  headline,
  body,
  ctaLabel,
  ctaHref,
}: ClosingCtaProps) {
  return (
    <section
      aria-labelledby="closing-cta-heading"
      className="relative overflow-hidden bg-ink px-4 py-20 text-canvas sm:px-8 sm:py-28"
    >
      {/* 背景の柔らかな放射 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(248,246,242,0.10),_transparent_60%)]"
      />
      {/* 大きめの透かし猫モチーフ。回転 -8°、低彩度 */}
      <Image
        src="/brand/cat-deco-1.svg"
        alt=""
        aria-hidden="true"
        width={520}
        height={520}
        className="pointer-events-none absolute -right-16 -top-16 -z-10 h-72 w-72 -rotate-[8deg] opacity-[0.07] sm:-right-12 sm:h-96 sm:w-96"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        <SectionEyebrow
          number="06"
          label="最後に"
          align="center"
          variant="canvas"
        />
        <h2
          id="closing-cta-heading"
          className="text-balance text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
        >
          {headline}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-canvas/85 sm:text-lg">
          {body}
        </p>
        <Link
          href={ctaHref}
          className="group inline-flex h-14 items-center justify-center gap-3 rounded-md bg-canvas px-7 text-base font-medium text-ink shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:text-lg"
        >
          {ctaLabel}
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </section>
  );
}
