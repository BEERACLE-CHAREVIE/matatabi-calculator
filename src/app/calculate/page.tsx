import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "ROI 診断",
  description:
    "5 つの質問に答えるだけで、IT コストの止血額と機会損失を診断します。",
  robots: { index: false, follow: true },
};

export default function CalculatePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <article className="space-y-6 text-center">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          診断ツールは現在準備中です
        </h1>
        <p className="text-sm leading-relaxed text-ink/80 sm:text-base">
          ROI 診断ツール本体は Issue #2 / #3 で実装予定です。
          公開準備が整いましたら、改めてご案内いたします。
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-canvas px-4 text-base font-medium text-ink transition-colors duration-150 hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          トップへ戻る
        </Link>
      </article>
    </main>
  );
}
