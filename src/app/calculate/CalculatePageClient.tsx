"use client";

import { useState } from "react";
import { InputForm } from "@/components/calculate/InputForm";
import type { CalculationInput } from "@/lib/calculation";

export function CalculatePageClient() {
  const [submitted, setSubmitted] = useState<CalculationInput | null>(null);
  return (
    <>
      <InputForm onSubmit={setSubmitted} />
      {submitted && process.env.NODE_ENV === "development" ? (
        <pre className="mt-8 overflow-auto rounded-md border border-line/50 bg-canvas p-4 text-xs text-ink/70">
          {JSON.stringify(submitted, null, 2)}
        </pre>
      ) : null}
    </>
  );
}
