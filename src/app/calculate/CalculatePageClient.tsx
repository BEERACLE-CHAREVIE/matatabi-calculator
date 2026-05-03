"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CalculateErrorState } from "@/components/calculate/CalculateErrorState";
import { InputForm } from "@/components/calculate/InputForm";
import { WarningBanner } from "@/components/calculate/WarningBanner";
import {
  calculate,
  type CalculationInput,
  type CalculationOutput,
} from "@/lib/calculation";
import { trackEvent } from "@/lib/analytics";
import { buildCriticalOpportunityLossMessage } from "@/lib/messages";
import type { ResultDashboardProps } from "@/components/calculate/ResultDashboard";

const ResultDashboard = dynamic<ResultDashboardProps>(
  () =>
    import("@/components/calculate/ResultDashboard").then(
      (mod) => mod.ResultDashboard,
    ),
  { ssr: false },
);

// Issue #47: `useMemo` 内で throw すると React の同期エラー伝播で親エラーバウンダリ
// (`src/app/error.tsx`) まで飛んでしまうため、判別 union を返す形に変えてエラー自体を
// 「派生値」として扱う。レンダリング自体は常に成功し、`status === "error"` 分岐で
// `CalculateErrorState` を表示する。
type CalculationState =
  | { status: "idle" }
  | { status: "ok"; result: CalculationOutput }
  | { status: "error"; error: Error };

export function CalculatePageClient() {
  const [submitted, setSubmitted] = useState<CalculationInput | null>(null);
  const calcState = useMemo<CalculationState>(() => {
    if (!submitted) return { status: "idle" };
    try {
      return { status: "ok", result: calculate(submitted) };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { status: "error", error };
    }
  }, [submitted]);

  // Issue #47: 計算エラー発生時に Cloudflare Web Analytics へイベント送信。
  // `error.message` には `monthlyVendorCost` 等のユーザー入力値が含まれる可能性が
  // あるため (個人情報リスク)、`message` は送らずイベント名のみ集計する。
  useEffect(() => {
    if (calcState.status !== "error") return;
    console.error("[calculate failed]", calcState.error);
    trackEvent("calculate_error");
  }, [calcState]);

  const resultKey = submitted ? JSON.stringify(submitted) : "";
  // 仕様書 docs/spec/warning-copy.md §4.3.3 の判定フローに準拠。
  // 完全内製顧客 (insourcingLevel === 1) ではバナー自体を非表示にする。
  const showWarningBanner =
    calcState.status === "ok" &&
    !!submitted &&
    calcState.result.speedWarning &&
    submitted.insourcingLevel !== 1;

  return (
    <div className="space-y-8 sm:space-y-12">
      <InputForm onSubmit={setSubmitted} />
      {calcState.status === "ok" && submitted ? (
        <ResultDashboard
          key={resultKey}
          result={calcState.result}
          insourcingLevel={submitted.insourcingLevel}
          inputs={submitted}
          onResetRequest={() => setSubmitted(null)}
          headerSlot={
            showWarningBanner ? (
              <WarningBanner
                message={buildCriticalOpportunityLossMessage(
                  calcState.result.speedWarningMonthlyLoss,
                )}
              />
            ) : undefined
          }
        />
      ) : null}
      {calcState.status === "error" ? (
        <CalculateErrorState
          title="診断結果の計算中にエラーが発生しました"
          description="入力内容を見直して、もう一度お試しください。問題が解消しない場合は時間をおいてお試しください。"
          onRetry={() => setSubmitted(null)}
          retryLabel="もう一度試す"
        />
      ) : null}
    </div>
  );
}
