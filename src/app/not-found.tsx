import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionEyebrow } from "@/components/landing/SectionEyebrow";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      aria-labelledby="not-found-heading"
      className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 py-20 sm:px-8 sm:py-28"
    >
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 -z-10"
      />
      <Image
        src="/brand/cat-deco-1.svg"
        alt=""
        aria-hidden="true"
        width={160}
        height={160}
        className="pointer-events-none mb-6 h-24 w-24 -rotate-12 opacity-60 animate-fade-up sm:h-28 sm:w-28"
      />
      <div className="animate-fade-up [animation-delay:80ms]">
        <SectionEyebrow number="404" label="Not Found" align="center" />
      </div>
      <h1
        id="not-found-heading"
        className="mt-5 text-balance text-center text-3xl font-bold leading-tight text-ink animate-fade-up [animation-delay:160ms] sm:text-4xl"
      >
        お探しのページは
        <span className="underline-brush">見つかりません</span>
        でした
      </h1>
      <p className="mt-5 max-w-md text-center text-base leading-relaxed text-ink/80 animate-fade-up [animation-delay:240ms]">
        URL のご入力に誤りがあるか、ページが移動・削除された可能性があります。お手数ですが、トップページからお探しください。
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-6 text-base font-medium text-canvas shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 animate-fade-up [animation-delay:320ms]"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        トップページへ戻る
      </Link>
    </main>
  );
}
