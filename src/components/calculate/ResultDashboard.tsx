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
 * - 依存: @/hooks/useCountUp／@/hooks/useMediaQuery／@/lib/mediaQueries／
 *         @/lib/calculation／@/lib/constants／@/lib/pdf（dynamic import 内蔵）／
 *         @/lib/pdfFilename／./DashboardView／./PdfDashboard
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_QUERY, REDUCED_MOTION_QUERY } from "@/lib/mediaQueries";
import type { InsourcingLevel } from "@/lib/constants";
import type { CalculationInput, CalculationOutput } from "@/lib/calculation";
import { generatePdf } from "@/lib/pdf";
import { buildPdfFilename } from "@/lib/pdfFilename";
import { DashboardView } from "./DashboardView";
import { PdfDashboard } from "./PdfDashboard";

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
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const pdfDashboardRef = useRef<HTMLDivElement | null>(null);
  // 早期 return 用に最新フラグを ref で保持し、`useCallback` の deps を空にして
  // ハンドラ参照を安定させる（`<Button onClick>` の不要な props 変化を抑制）。
  const isGeneratingPdfRef = useRef(false);

  // 仕様書 docs/spec/pdf-report.md §8.3: エラーメッセージは 5 秒で自動消去。
  useEffect(() => {
    if (!pdfError) return;
    const tid = setTimeout(() => setPdfError(null), 5000);
    return () => clearTimeout(tid);
  }, [pdfError]);

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
    } catch (err) {
      // 仕様書 §8.3: コンソールに詳細を出力しつつ、UI には固定文言を表示。
      console.error("[PDF generation failed]", err);
      setPdfError(
        "PDFの生成に失敗しました。ページを再読み込みして再度お試しください。",
      );
    } finally {
      setIsGeneratingPdf(false);
      setGeneratedAt(null);
      isGeneratingPdfRef.current = false;
    }
  }, []);

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
        onResetRequest={onResetRequest}
        isGeneratingPdf={isGeneratingPdf}
        pdfError={pdfError}
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
