"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { SectionEyebrow } from "@/components/landing/SectionEyebrow";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <main
      aria-labelledby="error-heading"
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
        className="pointer-events-none mb-6 h-24 w-24 rotate-6 opacity-50 animate-fade-up sm:h-28 sm:w-28"
      />
      <div className="animate-fade-up [animation-delay:80ms]">
        <SectionEyebrow number="500" label="Error" align="center" />
      </div>
      <h1
        id="error-heading"
        className="mt-5 text-balance text-center text-3xl font-bold leading-tight text-ink animate-fade-up [animation-delay:160ms] sm:text-4xl"
      >
        申し訳ありません、予期せぬエラーが発生しました
      </h1>
      <p className="mt-5 max-w-md text-center text-base leading-relaxed text-ink/80 animate-fade-up [animation-delay:240ms]">
        一時的な問題の可能性があります。お手数ですが、再読み込みをお試しください。問題が解消しない場合はトップページへお戻りください。
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 animate-fade-up [animation-delay:320ms] sm:flex-row sm:gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-6 text-base font-medium text-canvas shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <RefreshCw aria-hidden="true" className="h-5 w-5" />
          再読み込み
        </button>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-canvas px-6 text-base font-medium text-ink transition-colors duration-150 hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          トップページへ戻る
        </Link>
      </div>
      {isDev ? (
        <details className="mt-10 max-w-2xl rounded-xl border border-line/50 bg-canvas p-4 text-left text-xs text-ink/70 shadow-card">
          <summary className="cursor-pointer font-medium text-ink">
            エラー詳細（開発環境のみ表示）
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : null}
          </pre>
        </details>
      ) : null}
    </main>
  );
}
