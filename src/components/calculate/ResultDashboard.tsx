"use client";

/**
 * ROI 診断結果ダッシュボードの画面コンテナ（仕様書 docs/spec/result-dashboard.md §10.2）。
 *
 * - 仕様: docs/spec/result-dashboard.md §10.2（3 層分離）／§6（アニメーション方針）／
 *         docs/spec/pdf-report.md §8（PDF 生成フロー）／§11.4（コンテナ責務）
 * - 設計: 仕様書 §10.2 の「描画層 (`DashboardView`) / 画面コンテナ (`ResultDashboard`) /
 *         PDF 用ラッパ (`PdfDashboard`)」3 層分離を本実装で踏襲する。
 *         コンテナ責務に純化し、副作用と非描画関心のみを保持する:
 *         - `useCountUp` × 4 を実行し補間値を `DashboardView` に props 注入する
 *           （描画層を pure に保ち、PDF 等で `animated={false}` 強制を別経路で容易に再利用可能にする）。
 *         - `useMediaQuery(REDUCED_MOTION_QUERY)` で OS 設定を読み取り、`animated={!reducedMotion}`
 *           を boolean 化して下流に渡す境界を本コンテナに集約する。
 *         - `useMediaQuery(MOBILE_QUERY)` で `isMobile` を導出し、`DashboardView` の
 *           `chartHeight` 切替に注入する（`DashboardView` を hook フリーに保つため）。
 *         - PDF 生成中のみ `PdfDashboard` を `position: absolute; left: -9999px` で
 *           隠しマウントし、`forwardRef` 経由で取得した DOM ノードを `generatePdf()` に渡す。
 *           `pdfDashboardRef` / `generatedAt` state / `inputs` props を伴うため、
 *           隠しマウント JSX は `DashboardView` には移さず本コンテナに残置する。
 *         - Recharts は SSR 段階で `ResizeObserver` 等のブラウザ API に依存するため、
 *           呼び出し側（CalculatePageClient）で `next/dynamic({ ssr: false })` を経由する。
 * - PDF エラーハンドリング (Issue #47):
 *         - 旧仕様の「5 秒で `pdfError` を自動消去」は廃止。再試行ボタン併設仕様
 *           （Issue #47）と論理的に両立しないため、エラー表示は「ユーザーアクション
 *           （再試行 / 再診断）」または「成功時」のみクリアする方針へ変更。
 *         - `pdfFailureCount` を `useState` で保持し、3 回連続失敗時のみエスカレーション
 *           文言（お問い合わせフォーム案内）を表示する。成功時 / 再診断時に 0 リセット。
 *         - `trackEvent` で `pdf_generation_error` / `pdf_generation_error_escalated` を
 *           送出する（CF Web Analytics は no-op スタブだが計測点を実装側に確保する）。
 * - 依存: @/hooks/useCountUp／@/hooks/useMediaQuery／@/lib/mediaQueries／
 *         @/lib/analytics／@/lib/calculation／@/lib/constants／@/lib/pdf（dynamic import 内蔵）／
 *         @/lib/pdfFilename／./DashboardView／./PdfDashboard
 */

import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_QUERY, REDUCED_MOTION_QUERY } from "@/lib/mediaQueries";
import { trackEvent } from "@/lib/analytics";
import type { InsourcingLevel } from "@/lib/constants";
import type { CalculationInput, CalculationOutput } from "@/lib/calculation";
import { generatePdf } from "@/lib/pdf";
import { buildPdfFilename } from "@/lib/pdfFilename";
import { DashboardView } from "./DashboardView";
import { PdfDashboard } from "./PdfDashboard";

// Issue #47: 連続失敗 3 回でエスカレーション文言（お問い合わせ案内）に切替。
const PDF_FAILURE_ESCALATION_THRESHOLD = 3;

export type ResultDashboardProps = {
  /** calculate() の戻り値（円単位の浮動小数）。 */
  result: CalculationOutput;
  /** 内製化注記（仕様書 §3.3）の表示制御に使用。 */
  insourcingLevel: InsourcingLevel;
  /**
   * フォーム入力値（円単位）。`PdfDashboard` の入力サマリー表示に使用する
   * （仕様書 docs/spec/pdf-report.md §5.4）。
   */
  inputs: CalculationInput;
  /**
   * 警告バナー差し込み口（仕様書 §3.4 / §8）。
   * 親が WarningBanner（Issue #42）を組み立てて渡す。
   * undefined の場合はバナー領域を描画しない。
   */
  headerSlot?: ReactNode;
  /**
   * 「再診断する」ボタン押下時のコールバック（仕様書 docs/spec/pdf-report.md §11.4）。
   * 親が `setSubmitted(null)` 等で診断状態のリセットを実行する想定。
   * 未指定の場合は再診断ボタンを描画しない。
   */
  onResetRequest?: () => void;
  className?: string;
};

export function ResultDashboard({
  result,
  insourcingLevel,
  inputs,
  headerSlot,
  onResetRequest,
  className,
}: ResultDashboardProps) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  // Issue #47: PDF 生成の連続失敗回数。3 回でエスカレーション文言に切替。
  // 成功時 / 再診断時に 0 リセットし「連続」性を担保する。
  const [pdfFailureCount, setPdfFailureCount] = useState(0);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const pdfDashboardRef = useRef<HTMLDivElement | null>(null);
  // 早期 return 用に最新フラグを ref で保持し、`useCallback` の deps を最小化して
  // ハンドラ参照を安定させる（`<Button onClick>` の不要な props 変化を抑制）。
  const isGeneratingPdfRef = useRef(false);

  const handleDownloadPdf = useCallback(async () => {
    if (isGeneratingPdfRef.current) return;
    isGeneratingPdfRef.current = true;
    setPdfError(null);
    const now = new Date();
    setGeneratedAt(now);
    setIsGeneratingPdf(true);
    try {
      // 仕様書 §8.1: requestAnimationFrame 2 回分待機（DOM レイアウト確定 + フォント解決）。
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve()),
        ),
      );
      const element = pdfDashboardRef.current;
      if (!element) {
        throw new Error("PdfDashboard element is not mounted");
      }
      await generatePdf({
        element,
        filename: buildPdfFilename(now),
      });
      setPdfFailureCount(0);
    } catch (err) {
      // 仕様書 §8.3: コンソールに詳細を出力しつつ、UI には固定文言を表示。
      console.error("[PDF generation failed]", err);
      const nextCount = pdfFailureCount + 1;
      setPdfFailureCount(nextCount);
      setPdfError(
        nextCount >= PDF_FAILURE_ESCALATION_THRESHOLD
          ? "PDF の生成に複数回失敗しました。お手数ですが、お問い合わせフォームからご連絡ください。"
          : "PDFの生成に失敗しました。再試行してください。",
      );
      // Issue #47: `error.message` は個人情報混入リスクがあるためイベント名のみ送出。
      trackEvent(
        nextCount >= PDF_FAILURE_ESCALATION_THRESHOLD
          ? "pdf_generation_error_escalated"
          : "pdf_generation_error",
      );
    } finally {
      setIsGeneratingPdf(false);
      setGeneratedAt(null);
      isGeneratingPdfRef.current = false;
    }
  }, [pdfFailureCount]);

  // Issue #47: 再診断時は PDF エラー表示と連続失敗カウンタを併せてリセット。
  const handleResetRequest = useCallback(() => {
    setPdfError(null);
    setPdfFailureCount(0);
    onResetRequest?.();
  }, [onResetRequest]);

  const animatedSavings = useCountUp(result.threeYearSavings);
  const animatedAnnualProfit = useCountUp(result.annualProfitCreation);
  const animatedThreeYearProfit = useCountUp(result.threeYearProfitCreation);
  const animatedTotal = useCountUp(result.totalThreeYearImpact);

  return (
    <>
      <DashboardView
        result={result}
        insourcingLevel={insourcingLevel}
        animated={!reducedMotion}
        animatedSavings={animatedSavings}
        animatedAnnualProfit={animatedAnnualProfit}
        animatedThreeYearProfit={animatedThreeYearProfit}
        animatedTotal={animatedTotal}
        isMobile={isMobile}
        onDownloadPdf={handleDownloadPdf}
        onPdfRetry={handleDownloadPdf}
        onResetRequest={onResetRequest ? handleResetRequest : undefined}
        isGeneratingPdf={isGeneratingPdf}
        pdfError={pdfError}
        pdfErrorIsEscalated={
          pdfFailureCount >= PDF_FAILURE_ESCALATION_THRESHOLD
        }
        headerSlot={headerSlot}
        className={className}
      />
      {isGeneratingPdf && generatedAt ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            pointerEvents: "none",
          }}
        >
          <PdfDashboard
            ref={pdfDashboardRef}
            result={result}
            insourcingLevel={insourcingLevel}
            inputs={inputs}
            generatedAt={generatedAt}
          />
        </div>
      ) : null}
    </>
  );
}
