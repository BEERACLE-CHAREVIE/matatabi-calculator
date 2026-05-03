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
const PDF_BAR_HEIGHT_PX = 120;

const ACCENT_HEX = "#9CAEB8";
const ACCENT_60 = "rgba(156, 174, 184, 0.6)";
const ACCENT_BG_10 = "rgba(156, 174, 184, 0.10)";
const INK_HEX = "#72665B";
const LINE_HEX = "#E5E1DA";
const WHITE_HEX = "#FFFFFF";

const SAVINGS_LABEL = "3 年間の止血";
const PROFIT_LABEL = "3 年間の利益創出";

/**
 * 積み上げ横棒グラフのバー内ラベル文字列を、value / total の比率に応じて
 * 段階的にフォールバックする。`html2canvas` 後の SVG `<text>` は CSS overflow が
 * 効かないため、formatter 段階で文字列の長さ自体を抑制する必要がある。
 *
 * - `total <= 0`: 空文字（ゼロ除算回避 + チャート未描画時の防御）
 * - `ratio < 0.08`: バー幅の 8% 未満では `formatManYen` 5〜6 桁の文字列が
 *   隣接ラベルと衝突するため、描画自体を抑制する
 * - `0.08 ≤ ratio < 0.18`: `formatManYenCompact` の「◯億◯万円」短縮表記に降格
 * - `0.18 ≤ ratio`: 既存の `formatManYen` 表記
 */
export function pickPdfBarLabel(value: number, total: number): string {
  if (total <= 0) return "";
  const ratio = value / total;
  if (ratio < 0.08) return "";
  if (ratio < 0.18) return formatManYenCompact(value);
  return formatManYen(value);
}

/**
 * 指標カード value 表示用のフォーマッタ。万円換算後の値が
 * `OKU_THRESHOLD_MAN_YEN`（10 億円相当）以上の桁爆発時は `formatManYenCompact`
 * へ自動降格する。MetricCard 幅（56mm）+ value 文字列長応答フォントだけでは
 * 「100,000万円」級の長文字列が `textOverflow: ellipsis` で見切れるため、
 * 億円表記に降格して 1 行に収める（Issue #85）。
 */
export function formatMetricCardValue(yen: number): string {
  if (!Number.isFinite(yen) || yen < 0) return formatManYen(yen);
  const manYen = Math.round(yen / YEN_PER_MAN_YEN);
  if (manYen >= OKU_THRESHOLD_MAN_YEN) return formatManYenCompact(yen);
  return formatManYen(yen);
}

/**
 * MetricCard の value 文字数に応じた段階的フォントサイズ（Issue #85）。
 * カード高 34mm + 幅 56mm の枠内に value を 1 行で収めるためのフォールバック。
 * 仕様書 §5.3 の規定 16pt をベースに、桁爆発時のみ縮小する。
 */
export function metricCardValueFontSize(value: string): string {
  if (value.length > 11) return "13pt";
  if (value.length > 8) return "14pt";
  return "16pt";
}

/**
 * 更新待ち期間の代表値→ラベル変換。`InputForm` の `UPDATE_WAIT_OPTIONS` と同一マッピングを
 * 仕様書 §5.4 の `(※)` 注記準拠で再定義する。InputForm 側は private 配列のため import 不可。
 *
 * `as const` で literal の組を保つことで、`InputForm` 側の値が変わった際に手書き複製の
 * 反映漏れを TS エラーとして拾いやすくする（共有型の正式統一は別 Issue で対応）。
 */
const UPDATE_WAIT_LABELS = [
  { value: 0.5, label: "すぐ対応（〜1ヶ月）" },
  { value: 1.5, label: "1〜2ヶ月" },
  { value: 4.5, label: "3〜6ヶ月" },
  { value: 9, label: "半年〜1年" },
  { value: 18, label: "1年以上" },
] as const;

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
        minHeight: "14mm",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      <AlertTriangle
        aria-hidden="true"
        width={18}
        height={18}
        color={ACCENT_HEX}
      />
      {/*
       * headline (12pt) と subtext (10pt) の上下間隔を mm + 無次元 lineHeight で固定し、
       * pt → px → mm の暗黙変換でブラウザ毎にズレる事象を回避する（Issue #85）。
       */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "1mm",
        }}
      >
        <span
          style={{
            fontSize: "12pt",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1.2,
            color: INK_HEX,
          }}
        >
          {headline}
        </span>
        <span style={{ fontSize: "10pt", lineHeight: 1.35, color: INK_HEX }}>
          {subtext}
        </span>
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
  // 仕様書 §5.3 の規定 16pt を維持しつつ、value 文字列が長くなった場合のみ
  // 段階的に縮小して 36mm のカード高さを守る（Issue #85）。
  const valueFontSize = metricCardValueFontSize(value);
  return (
    <div
      style={{
        border: `1px solid ${LINE_HEX}`,
        borderRadius: "1mm",
        padding: "5mm 5mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: "2mm",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "10pt",
          fontWeight: 500,
          color: INK_HEX,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: valueFontSize,
          fontWeight: 700,
          color: INK_HEX,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontVariantNumeric: "tabular-nums",
          // 日本語フォント (Noto Sans JP) は ascent + descent で実効 1.3em 程度を
          // 必要とする。line-height を 1.05 等に圧縮すると上下が clip されて
          // 「数字が半分」現象が起きるため、標準的な 1.3 を維持する（Issue #85）。
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
      {note ? (
        <div
          style={{
            fontSize: "8pt",
            // INK_HEX の 70% 相当の色を直書きする（opacity を避け、html2canvas-pro の
            // 二重アルファ合成バグを回避。Issue #85）。
            color: "#A5988A",
            marginTop: "1mm",
            lineHeight: 1.35,
          }}
        >
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
          // globals.css の `text-rendering: optimizeLegibility` /
          // `font-feature-settings: "palt" 1` を PDF 経路で override する。
          // optimizeLegibility は html2canvas-pro のラスタライズで隣接グリフが
          // サブピクセル単位で重畳して「うっすら二重」に見える原因になる。
          // PDF は静止画像で読みやすさより**ピクセル安定性**を優先するため
          // geometricPrecision に固定し、palt 詰めも無効化する（Issue #85）。
          textRendering: "geometricPrecision",
          fontFeatureSettings: "normal",
        }}
      >
        {/* ヘッダー: 14pt と 10pt のフォント高差で center 揃えがブレるため
            baseline 揃えに固定。ロゴのみ alignSelf: center で別途センタリング（Issue #85）。
            ルート flex column 内で `flexShrink: 0` により他セクションが膨らんでも
            ヘッダーが圧縮されないことを保証（Issue #85 の文字被り regression 対策）。 */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            minHeight: "18mm",
            flexShrink: 0,
            paddingBottom: "3mm",
            borderBottom: `1px solid ${LINE_HEX}`,
            boxSizing: "border-box",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PDF_LOGO_SRC}
            alt=""
            style={{ width: "12mm", height: "12mm", alignSelf: "center" }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: "14pt",
              fontWeight: 700,
              lineHeight: 1,
              color: INK_HEX,
            }}
          >
            {PDF_REPORT_TITLE}
          </h1>
          <span
            style={{
              fontSize: "10pt",
              lineHeight: 1,
              // INK_HEX の 80% 相当の色を直書き（opacity を避けて html2canvas-pro の
              // アルファ合成バグを回避。Issue #85）。
              color: "#8E8278",
              fontVariantNumeric: "tabular-nums",
            }}
          >
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

        {/* ヒーロー（3年間のトータルインパクト）。ルート flex column 内で
            `flexShrink: 0` により他セクションが膨らんでも圧縮されないことを保証。 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2mm",
            minHeight: "42mm",
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "10pt", color: "#8E8278" }}>
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
          <div style={{ fontSize: "10pt", color: "#A99F94" }}>
            ※ 試算上の最大値
          </div>
        </div>

        {/* 指標カード 3 並列。value 文字列が長い場合のみカード高さが伸長する
            (gridAutoRows: minmax(34mm, auto))。下方 note との衝突を物理的に回避（Issue #85）。
            カード間 gap は 5mm に圧縮し、180mm = 56×3 + 6×2 → 56×3 + 5×2 で
            value 横幅にマージンを追加（formatMetricCardValue の Compact 降格と組み合わせて
            「100,000万円」級の長文字列でも 1 行収納）。 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            // 仕様書 §5.3 の規定 34mm をベースに +4mm の余裕を確保し、
            // value の line-height（1.3em × 16pt ≒ 7.4mm）+ ascent/descent +
            // padding 縦 10mm + title 5mm + gap 2mm + (note 4mm) でも
            // box clip 無く収まるようにする（Issue #85）。
            gridAutoRows: "minmax(38mm, auto)",
            gap: "5mm",
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          <MetricCard
            title="3 年間の止血"
            value={formatMetricCardValue(result.threeYearSavings)}
            note={
              isPartiallyInsourced
                ? `内製化 ${insourcingPercent} 相当分を除外済み`
                : undefined
            }
          />
          <MetricCard
            title="年間の利益創出"
            value={formatMetricCardValue(result.annualProfitCreation)}
          />
          <MetricCard
            title="3 年間の利益創出"
            value={formatMetricCardValue(result.threeYearProfitCreation)}
          />
        </div>

        {/* 積み上げ横棒グラフ */}
        <div
          style={{
            minHeight: "42mm",
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          <ResponsiveContainer width="100%" height={PDF_BAR_HEIGHT_PX}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 36, bottom: 8, left: 24 }}
            >
              <XAxis
                type="number"
                tickFormatter={(value: number) => formatManYen(value)}
                stroke={ACCENT_HEX}
              />
              <YAxis type="category" dataKey="label" hide />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ position: "relative", marginTop: "2mm" }}
                content={() => (
                  <ul
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "baseline",
                      gap: "12mm",
                      margin: 0,
                      padding: "2mm 0 0 0",
                      listStyle: "none",
                      fontSize: "9pt",
                      lineHeight: 1.4,
                      color: INK_HEX,
                    }}
                  >
                    <li
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "1mm",
                      }}
                    >
                      <PiggyBank
                        aria-hidden="true"
                        width={14}
                        height={14}
                        color={ACCENT_HEX}
                        style={{ verticalAlign: "middle", flexShrink: 0 }}
                      />
                      <span>{SAVINGS_LABEL}</span>
                      <span
                        style={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatManYen(result.threeYearSavings)}
                      </span>
                    </li>
                    <li
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "1mm",
                      }}
                    >
                      <Sparkles
                        aria-hidden="true"
                        width={14}
                        height={14}
                        color={ACCENT_60}
                        style={{ verticalAlign: "middle", flexShrink: 0 }}
                      />
                      <span>{PROFIT_LABEL}</span>
                      <span
                        style={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
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
                  formatter={(value: number) =>
                    pickPdfBarLabel(
                      value,
                      result.threeYearSavings + result.threeYearProfitCreation,
                    )
                  }
                  style={{
                    fill: WHITE_HEX,
                    fontSize: 10,
                    fontWeight: 600,
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
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
                  formatter={(value: number) =>
                    // バー内ラベルは scale=2 ラスタライズ後に隣接ラベルと衝突しやすい。
                    // pickPdfBarLabel が比率に応じて空文字 / Compact 表記 / 標準表記を
                    // 切り替える（< 8% 抑制、< 18% で Compact、それ以上で標準）。
                    pickPdfBarLabel(
                      value,
                      result.threeYearSavings + result.threeYearProfitCreation,
                    )
                  }
                  style={{
                    fill: INK_HEX,
                    fontSize: 10,
                    fontWeight: 600,
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* カテゴリ訴求（プレースホルダ） */}
        <div
          style={{
            minHeight: "14mm",
            flexShrink: 0,
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

        {/* 入力サマリー。`flexShrink: 0` でルート flex column 内の圧縮を防ぎ、
            最終行 (詳細設定) が直下の disclaimer に縦衝突する事象を回避（Issue #85）。 */}
        <dl
          style={{
            margin: 0,
            padding: 0,
            minHeight: "40mm",
            flexShrink: 0,
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
            value={`${Math.round(
              // `InputForm` 側で整数バリデーション済みだが、`CalculationInput.manualWorkerCount`
              // の型は `number` のため、想定外の小数値が表示に漏れないよう PDF 表示層でも防御的に丸める。
              inputs.manualWorkerCount,
            ).toLocaleString("ja-JP")} 人`}
          />
          <SummaryRow label="更新待ち期間" value={updateWaitLabel} />
          <SummaryRow label="内製化状況" value={insourcingLabel} />
          <SummaryRow label="詳細設定" value={advancedLabel} />
        </dl>

        {/* 免責。`flexShrink: 0` で他セクションと縦衝突しないことを保証。
            `opacity` は html2canvas-pro のラスタ時にサブピクセルでズレた 2 枚の
            アルファ合成が走る経験則的バグがあり、disclaimer の「下部の文字被り」を
            誘発するため、INK_HEX の 70% 相当を直書きカラー (#A5988A) で代替する（Issue #85）。 */}
        <p
          style={{
            margin: 0,
            fontSize: "8pt",
            color: "#A5988A",
            minHeight: "10mm",
            flexShrink: 0,
            lineHeight: 1.5,
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
            minHeight: "13mm",
            flexShrink: 0,
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
