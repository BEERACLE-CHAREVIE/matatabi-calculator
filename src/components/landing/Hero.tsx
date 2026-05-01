import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type HeroProps = {
  headline: string;
  subCopy: string;
  ctaLabel: string;
  ctaHref: string;
  meta?: ReadonlyArray<string>;
};

export function Hero({ headline, subCopy, ctaLabel, ctaHref, meta }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-canvas px-4 py-12 sm:px-8 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(156,174,184,0.18),_transparent_60%)]" />
      <div className="mx-auto grid max-w-screen-xl items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6 sm:space-y-8">
          <h1
            id="hero-heading"
            className="text-balance text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            {headline}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-ink/85 sm:text-lg">
            {subCopy}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={ctaHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-6 text-base font-medium text-canvas transition-colors duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {ctaLabel}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
            {meta && meta.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/70 sm:text-sm">
                {meta.map((item) => (
                  <li
                    key={item}
                    className="before:mr-3 before:text-ink/30 before:content-['・'] first:before:content-none"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-sm items-center justify-center lg:max-w-none">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-full bg-line/20 blur-3xl"
          />
          <Image
            src="/brand/cat-deco-1.svg"
            alt=""
            aria-hidden="true"
            width={400}
            height={400}
            className="h-auto w-full max-w-[360px]"
          />
        </div>
      </div>
    </section>
  );
}
