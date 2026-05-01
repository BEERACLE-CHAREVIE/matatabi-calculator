import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      className="bg-line/15 px-4 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h2
          id="closing-cta-heading"
          className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl"
        >
          {headline}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-ink/80 sm:text-lg">
          {body}
        </p>
        <Link
          href={ctaHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-6 text-base font-medium text-canvas transition-colors duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          {ctaLabel}
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
