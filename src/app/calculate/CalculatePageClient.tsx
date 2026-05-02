"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { InputForm } from "@/components/calculate/InputForm";
import { WarningBanner } from "@/components/calculate/WarningBanner";
import { calculate, type CalculationInput } from "@/lib/calculation";
import { buildCriticalOpportunityLossMessage } from "@/lib/messages";
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
  // 仕様書 docs/spec/warning-copy.md §4.3.3 の判定フローに準拠。
  // 完全内製顧客 (insourcingLevel === 1) ではバナー自体を非表示にする。
  const showWarningBanner =
    !!submitted && !!result && result.speedWarning && submitted.insourcingLevel !== 1;

  return (
    <div className="space-y-8 sm:space-y-12">
      <InputForm onSubmit={setSubmitted} />
      {submitted && result ? (
        <ResultDashboard
          key={resultKey}
          result={result}
          insourcingLevel={submitted.insourcingLevel}
          inputs={submitted}
          onResetRequest={() => setSubmitted(null)}
          headerSlot={
            showWarningBanner ? (
              <WarningBanner
                message={buildCriticalOpportunityLossMessage(
                  result.speedWarningMonthlyLoss,
                )}
              />
            ) : undefined
          }
        />
      ) : null}
    </div>
  );
}
