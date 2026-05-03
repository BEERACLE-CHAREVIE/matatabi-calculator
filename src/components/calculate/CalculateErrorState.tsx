"use client";

/**
 * 計算エラー時のフォールバック UI（Issue #47）。
 *
 * - 仕様: Issue #47「`/calculate` ページの計算/PDF 生成エラー時のフォールバック UI 整備」
 *         のうち「計算エラー時のカード型メッセージ + 再試行 CTA」を担う共通コンポーネント。
 * - 設計: pure な見た目層。フックは使わず、`onRetry` を必須 props として受け取る。
 *         `role="alert"` + `aria-live="assertive"` を Card ルートに付与し、
 *         レンダリング直後にスクリーンリーダーへ通知する（`role="alert"` の暗黙 live 領域に
 *         加え、iOS VoiceOver 等で確実性を高めるため `WarningBanner` の慣行に合わせて両方記述）。
 * - 適用範囲: `useMemo` 内 try/catch で計算が失敗したときに `ResultDashboard` の代わりに
 *         描画される「ハンドル可能エラー」専用 UI。`src/app/error.tsx`（ページ全体置換）は
 *         本コンポーネントの守備範囲外（システム例外用の最終防衛線として温存）。
 * - 依存: lucide-react (AlertCircle)／@/components/ui/Card／@/components/ui/Button／@/lib/cn
 */

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export interface CalculateErrorStateProps {
  /** スクリーンリーダーに読み上げられる本文。デフォルト文言は呼び出し側で組み立てる。 */
  title: string;
  /** 補足説明（任意）。再試行を促す導線文言など。 */
  description?: string;
  /** 「もう一度試す」ボタン押下時のコールバック。 */
  onRetry: () => void;
  /** 再試行ボタンのラベル（既定は「もう一度試す」）。 */
  retryLabel?: string;
  className?: string;
}

export function CalculateErrorState({
  title,
  description,
  onRetry,
  retryLabel = "もう一度試す",
  className,
}: CalculateErrorStateProps) {
  return (
    <Card
      role="alert"
      aria-live="assertive"
      className={cn(
        "mx-auto w-full max-w-[720px] flex flex-col items-center gap-4 text-center",
        className,
      )}
    >
      <AlertCircle aria-hidden="true" className="h-8 w-8 text-[#B45656]" />
      <div className="space-y-2">
        <p className="text-base font-bold text-ink">{title}</p>
        {description ? (
          <p className="text-sm text-ink/80">{description}</p>
        ) : null}
      </div>
      <Button variant="primary" size="lg" type="button" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Card>
  );
}
