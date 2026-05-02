"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { InputForm } from "@/components/calculate/InputForm";
import { Button } from "@/components/ui/Button";
import { calculate, type CalculationInput } from "@/lib/calculation";
import type { ResultDashboardProps } from "@/components/calculate/ResultDashboard";

const ResultDashboard = dynamic<ResultDashboardProps>(
  () =>
    import("@/components/calculate/ResultDashboard").then(
      (mod) => mod.ResultDashboard,
    ),
  { ssr: false },
);

export function CalculatePageClient() {
  const [submitted, setSubmitted] = useState<CalculationInput | null>(null);
  const result = useMemo(
    () => (submitted ? calculate(submitted) : null),
    [submitted],
  );
  const resultKey = submitted ? JSON.stringify(submitted) : "";

  return (
    <div className="space-y-8 sm:space-y-12">
      <InputForm onSubmit={setSubmitted} />
      {submitted && result ? (
        <ResultDashboard
          key={resultKey}
          result={result}
          insourcingLevel={submitted.insourcingLevel}
          footerSlot={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="primary"
                size="lg"
                type="button"
                disabled
                aria-disabled="true"
                title="PDF ダウンロード機能は Issue #43 で実装予定"
              >
                PDF をダウンロード
              </Button>
              <Button
                variant="secondary"
                size="lg"
                type="button"
                onClick={() => setSubmitted(null)}
              >
                再診断する
              </Button>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
