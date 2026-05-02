"use client";

/**
 * スピード警告バナー（CRITICAL OPPORTUNITY LOSS）の描画コンポーネント。
 *
 * - 仕様: docs/spec/warning-copy.md §3（フレーズ）/ §6（ビジュアル）/ §9.3（props 型）
 *         docs/spec/result-dashboard.md §8（バナー UI 骨格）
 * - 設計: 表示可否（speedWarning && insourcingLevel !== 1）は親（CalculatePageClient）で
 *         判定し、本コンポーネントは「整形済み message を受け取り描画する」純表示層。
 *         null を返す責務は持たない（仕様書 §4.3.3 の判定フローに準拠）。
 * - アクセシビリティ: `role="alert"` を付与（暗黙に aria-live="assertive"）。
 *         診断ボタン押下直後に DOM に挿入されるため、即時通知が適切。
 * - アニメーション: `motion-safe:animate-fadeIn` で 300ms フェードイン。
 *         `prefers-reduced-motion: reduce` 時は Tailwind の motion-safe バリアントが
 *         自動的にクラス適用を抑止する（仕様書 §6.4）。
 * - 依存: lucide-react (AlertTriangle) / @/lib/cn / @/lib/messages（型のみ）
 */

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CriticalOpportunityLossMessage } from "@/lib/messages";

export interface WarningBannerProps {
  /** `buildCriticalOpportunityLossMessage()` の戻り値をそのまま渡す。 */
  message: CriticalOpportunityLossMessage;
  className?: string;
}

export function WarningBanner({ message, className }: WarningBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-accent bg-accent/10 px-4 py-4 sm:px-5 sm:py-5",
        "min-h-[64px]",
        "motion-safe:animate-fadeIn",
        className,
      )}
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-accent"
      />
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold uppercase tracking-warning text-ink sm:text-lg">
          {message.headline}
        </p>
        <p className="text-xs leading-relaxed text-ink/80 sm:text-sm">
          {message.subtext}
        </p>
      </div>
    </div>
  );
}
