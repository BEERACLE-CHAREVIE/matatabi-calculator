import type { Metadata } from "next";
import { CalculatePageClient } from "./CalculatePageClient";

export const metadata: Metadata = {
  title: "ROI 診断",
  description:
    "5 つの質問に答えるだけで、IT コストの止血額と機会損失を診断します。",
  robots: { index: false, follow: true },
};

export default function CalculatePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
      <header className="mb-8 space-y-3 sm:mb-12">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">ROI 診断</h1>
        <p className="text-sm leading-relaxed text-ink/80 sm:text-base">
          5 つの質問にお答えいただくと、3 年間の止血額と機会損失を試算します。
        </p>
      </header>
      <CalculatePageClient />
    </main>
  );
}
