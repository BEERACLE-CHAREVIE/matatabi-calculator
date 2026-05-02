"use client";

/**
 * PDF 生成専用ダッシュボード（A4 縦 1 枚レイアウト）。
 *
 * - 仕様: docs/spec/pdf-report.md §3.3（描画責任）/ §5（レイアウト）/ §6（ヘッダー・フッター）/
 *         §9（Recharts 設定）/ §11.1（JSX 正本）/ §11.5（隠しマウント方針）
 * - 設計:
 *   - 画面用 `ResultDashboard` とは別 JSX。指標カードは画面 2 並列／PDF 3 並列で
 *     差分が確定しており（仕様書 §5.5）、`DashboardView` 抽出は別 Issue として分離する。
 *   - 親（`ResultDashboard`）が `isGeneratingPdf` の間だけ
 *     `position: absolute; left: -9999px;` で本コンポーネントをマウントし、
 *     `forwardRef` 経由で取得した DOM ノードを `generatePdf({ element })` に渡す（§8.4）。
 *   - 寸法（A4 210×297mm）と `font-family` カスケードはインラインスタイルで明示する。
 *     Tailwind の任意値だと html2canvas の `getComputedStyle` 解決時にズレる経験則的リスクが
 *     あるため、PDF レイアウトに関わる寸法・色は inline style を採用。
 *   - Recharts は `isAnimationActive={false}` を必ず指定（仕様書 §3.3 / §9.1）。
 *     アニメーション中に html2canvas が描画すると中間状態が PDF に焼きつく。
 *   - スクリーンリーダーに重複読み上げを避けるため `aria-hidden="true"`。
 */

import { forwardRef } from "react";
import {
  Bar,
  BarChart,
  LabelList,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, PiggyBank, Sparkles } from "lucide-react";
import { formatManYen, formatManYenCompact, formatPercent } from "@/lib/format";
import {
  INSOURCING_LEVELS,
  OKU_THRESHOLD_MAN_YEN,
  YEN_PER_MAN_YEN,
  type InsourcingLevel,
} from "@/lib/constants";
import type { CalculationInput, CalculationOutput } from "@/lib/calculation";
import { buildCriticalOpportunityLossMessage } from "@/lib/messages";
import {
  PDF_CATEGORY_PLACEHOLDER,
  PDF_COMPANY_NAME,
  PDF_CONTACT_TEXT,
  PDF_DISCLAIMER_TEXT,
  PDF_LOGO_SRC,
  PDF_REPORT_TITLE,
} from "@/lib/pdfConstants";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PDF_BAR_HEIGHT_PX = 100;

const ACCENT_HEX = "#9CAEB8";
const ACCENT_60 = "rgba(156, 174, 184, 0.6)";
const ACCENT_BG_10 = "rgba(156, 174, 184, 0.10)";
const INK_HEX = "#72665B";
const LINE_HEX = "#E5E1DA";
const WHITE_HEX = "#FFFFFF";

const SAVINGS_LABEL = "3 年間の止血";
const PROFIT_LABEL = "3 年間の利益創出";

/**
 * 更新待ち期間の代表値→ラベル変換。`InputForm` の `UPDATE_WAIT_OPTIONS` と同一マッピングを
 * 仕様書 §5.4 の `(※)` 注記準拠で再定義する。InputForm 側は private 配列のため import 不可。
 */
const UPDATE_WAIT_LABELS: Array<{ value: number; label: string }> = [
  { value: 0.5, label: "すぐ対応（〜1ヶ月）" },
  { value: 1.5, label: "1〜2ヶ月" },
  { value: 4.5, label: "3〜6ヶ月" },
  { value: 9, label: "半年〜1年" },
  { value: 18, label: "1年以上" },
];

/** 端末タイムゾーンに依存させず JST 固定で「YYYY-MM-DD HH:mm」を生成。 */
function formatPdfDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function findUpdateWaitLabel(value: number): string {
  return UPDATE_WAIT_LABELS.find((entry) => entry.value === value)?.label ?? "—";
}

function findInsourcingLabel(level: InsourcingLevel): string {
  return INSOURCING_LEVELS.find((entry) => entry.value === level)?.label ?? "—";
}

export interface PdfDashboardProps {
  result: CalculationOutput;
  insourcingLevel: InsourcingLevel;
  /** UI 入力値（円単位）。PDF 入力サマリー表示に万円換算で利用する。 */
  inputs: CalculationInput;
  /** ファイル生成時刻。ヘッダー右端の「生成日時」表示と整合させるため親から注入。 */
  generatedAt: Date;
}

interface PdfWarningBannerProps {
  headline: string;
  subtext: string;
}

function PdfWarningBanner({ headline, subtext }: PdfWarningBannerProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "3mm",
        padding: "3mm 4mm",
        backgroundColor: ACCENT_BG_10,
        border: `1px solid ${ACCENT_HEX}`,
        borderRadius: "1mm",
        height: "14mm",
        boxSizing: "border-box",
      }}
    >
      <AlertTriangle
        aria-hidden="true"
        width={18}
        height={18}
        color={ACCENT_HEX}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: "12pt",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: INK_HEX,
          }}
        >
          {headline}
        </span>
        <span style={{ fontSize: "10pt", color: INK_HEX }}>{subtext}</span>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  note?: string;
}

function MetricCard({ title, value, note }: MetricCardProps) {
  return (
    <div
      style={{
        border: `1px solid ${LINE_HEX}`,
        borderRadius: "1mm",
        padding: "6mm 5mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: "2mm",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: "10pt", fontWeight: 500, color: INK_HEX }}>
        {title}
      </div>
      <div style={{ fontSize: "16pt", fontWeight: 700, color: INK_HEX }}>
        {value}
      </div>
      {note ? (
        <div style={{ fontSize: "8pt", color: INK_HEX, opacity: 0.7 }}>
          {note}
        </div>
      ) : null}
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "1.5mm 0",
        borderBottom: `1px dotted ${LINE_HEX}`,
        fontSize: "10pt",
        color: INK_HEX,
      }}
    >
      <dt style={{ fontWeight: 500 }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 400 }}>{value}</dd>
    </div>
  );
}

export const PdfDashboard = forwardRef<HTMLDivElement, PdfDashboardProps>(
  function PdfDashboard(
    { result, insourcingLevel, inputs, generatedAt },
    ref,
  ) {
    const showWarningBanner = result.speedWarning && insourcingLevel !== 1;
    const warningMessage = showWarningBanner
      ? buildCriticalOpportunityLossMessage(result.speedWarningMonthlyLoss)
      : null;

    const insourcingPercent = formatPercent(insourcingLevel);
    const isPartiallyInsourced = insourcingLevel > 0 && insourcingLevel < 1;

    const totalManYen = Math.round(result.totalThreeYearImpact / YEN_PER_MAN_YEN);
    const heroFontSize = totalManYen >= OKU_THRESHOLD_MAN_YEN ? "24pt" : "32pt";

    const monthlyVendorManYen = Math.round(
      inputs.monthlyVendorCost / YEN_PER_MAN_YEN,
    );
    const repairManYen = Math.round(inputs.repairCost / YEN_PER_MAN_YEN);
    const updateWaitLabel = findUpdateWaitLabel(inputs.updateWaitMonths);
    const insourcingLabel = findInsourcingLabel(insourcingLevel);
    const hasAdvancedSettings =
      inputs.hourlyWage !== undefined ||
      inputs.hoursPerDay !== undefined ||
      inputs.daysPerMonth !== undefined;
    const advancedLabel = hasAdvancedSettings ? "カスタム値あり" : "デフォルト値";

    const chartData = [
      {
        label: "3年合計",
        savings: result.threeYearSavings,
        profit: result.threeYearProfitCreation,
      },
    ];

    return (
      <div
        ref={ref}
        role="document"
        aria-hidden="true"
        style={{
          width: `${A4_WIDTH_MM}mm`,
          height: `${A4_HEIGHT_MM}mm`,
          backgroundColor: WHITE_HEX,
          color: INK_HEX,
          fontFamily:
            "var(--font-inter), var(--font-noto-sans-jp), sans-serif",
          padding: "15mm",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "4mm",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "18mm",
            paddingBottom: "3mm",
            borderBottom: `1px solid ${LINE_HEX}`,
            boxSizing: "border-box",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PDF_LOGO_SRC}
            alt=""
            style={{ width: "12mm", height: "12mm" }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: "14pt",
              fontWeight: 700,
              color: INK_HEX,
            }}
          >
            {PDF_REPORT_TITLE}
          </h1>
          <span style={{ fontSize: "10pt", color: INK_HEX, opacity: 0.8 }}>
            生成日時 {formatPdfDateTime(generatedAt)}
          </span>
        </div>

        {/* 警告バナー（条件付き） */}
        {warningMessage ? (
          <PdfWarningBanner
            headline={warningMessage.headline}
            subtext={warningMessage.subtext}
          />
        ) : null}

        {/* ヒーロー（3年間のトータルインパクト） */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2mm",
            height: "42mm",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "10pt", color: INK_HEX, opacity: 0.8 }}>
            3 年間のトータルインパクト
          </div>
          <div
            style={{
              fontSize: heroFontSize,
              fontWeight: 700,
              color: INK_HEX,
              lineHeight: 1.1,
            }}
          >
            {formatManYenCompact(result.totalThreeYearImpact)}
          </div>
          <div style={{ fontSize: "10pt", color: INK_HEX, opacity: 0.6 }}>
            ※ 試算上の最大値
          </div>
        </div>

        {/* 指標カード 3 並列 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "6mm",
            height: "34mm",
            boxSizing: "border-box",
          }}
        >
          <MetricCard
            title="3 年間の止血"
            value={formatManYen(result.threeYearSavings)}
            note={
              isPartiallyInsourced
                ? `内製化 ${insourcingPercent} 相当分を除外済み`
                : undefined
            }
          />
          <MetricCard
            title="年間の利益創出"
            value={formatManYen(result.annualProfitCreation)}
          />
          <MetricCard
            title="3 年間の利益創出"
            value={formatManYen(result.threeYearProfitCreation)}
          />
        </div>

        {/* 積み上げ横棒グラフ */}
        <div style={{ height: "42mm", boxSizing: "border-box" }}>
          <ResponsiveContainer width="100%" height={PDF_BAR_HEIGHT_PX}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
            >
              <XAxis
                type="number"
                tickFormatter={(value: number) => formatManYen(value)}
                stroke={ACCENT_HEX}
              />
              <YAxis type="category" dataKey="label" hide />
              <Legend
                verticalAlign="bottom"
                content={() => (
                  <ul
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "12mm",
                      margin: 0,
                      padding: "2mm 0 0 0",
                      listStyle: "none",
                      fontSize: "9pt",
                      color: INK_HEX,
                    }}
                  >
                    <li
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1mm",
                      }}
                    >
                      <PiggyBank
                        aria-hidden="true"
                        width={12}
                        height={12}
                        color={ACCENT_HEX}
                      />
                      <span>{SAVINGS_LABEL}</span>
                      <span style={{ fontWeight: 600 }}>
                        {formatManYen(result.threeYearSavings)}
                      </span>
                    </li>
                    <li
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1mm",
                      }}
                    >
                      <Sparkles
                        aria-hidden="true"
                        width={12}
                        height={12}
                        color={ACCENT_60}
                      />
                      <span>{PROFIT_LABEL}</span>
                      <span style={{ fontWeight: 600 }}>
                        {formatManYen(result.threeYearProfitCreation)}
                      </span>
                    </li>
                  </ul>
                )}
              />
              <Bar
                dataKey="savings"
                name={SAVINGS_LABEL}
                stackId="impact"
                fill={ACCENT_HEX}
                radius={[2, 0, 0, 2]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="savings"
                  position="insideLeft"
                  formatter={(value: number) => formatManYen(value)}
                  style={{ fill: WHITE_HEX, fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
              <Bar
                dataKey="profit"
                name={PROFIT_LABEL}
                stackId="impact"
                fill={ACCENT_60}
                radius={[0, 2, 2, 0]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="profit"
                  position="insideRight"
                  formatter={(value: number) => formatManYen(value)}
                  style={{ fill: INK_HEX, fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* カテゴリ訴求（プレースホルダ） */}
        <div
          style={{
            height: "14mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11pt",
            color: INK_HEX,
            backgroundColor: ACCENT_BG_10,
            borderRadius: "1mm",
            boxSizing: "border-box",
            padding: "0 6mm",
            textAlign: "center",
          }}
        >
          {PDF_CATEGORY_PLACEHOLDER}
        </div>

        {/* 入力サマリー */}
        <dl
          style={{
            margin: 0,
            padding: 0,
            height: "40mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
          }}
        >
          <SummaryRow
            label="月額ベンダー費用"
            value={`${monthlyVendorManYen.toLocaleString("ja-JP")} 万円／月`}
          />
          <SummaryRow
            label="単発改修費用"
            value={`${repairManYen.toLocaleString("ja-JP")} 万円／回`}
          />
          <SummaryRow
            label="手作業人数"
            value={`${Math.round(inputs.manualWorkerCount).toLocaleString("ja-JP")} 人`}
          />
          <SummaryRow label="更新待ち期間" value={updateWaitLabel} />
          <SummaryRow label="内製化状況" value={insourcingLabel} />
          <SummaryRow label="詳細設定" value={advancedLabel} />
        </dl>

        {/* 免責 */}
        <p
          style={{
            margin: 0,
            fontSize: "8pt",
            color: INK_HEX,
            opacity: 0.7,
            height: "8mm",
            boxSizing: "border-box",
          }}
        >
          {PDF_DISCLAIMER_TEXT}
        </p>

        {/* スペーサー（フッターを下端に押し出す） */}
        <div style={{ flex: 1 }} />

        {/* フッター */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "13mm",
            paddingTop: "3mm",
            borderTop: `1px solid ${LINE_HEX}`,
            boxSizing: "border-box",
            fontSize: "9pt",
            color: INK_HEX,
          }}
        >
          <span style={{ fontSize: "10pt", fontWeight: 500 }}>
            {PDF_COMPANY_NAME}
          </span>
          <span>{PDF_CONTACT_TEXT}</span>
          <span>1 / 1</span>
        </div>
      </div>
    );
  },
);
