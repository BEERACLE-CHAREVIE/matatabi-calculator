# Issue #43 PDF レポート出力機能（PdfDashboard + lib/pdf.ts）実装プラン

## Context
診断結果を A4 1 枚の PDF として保存する機能を実装する。社内共有や決裁資料での利用を想定し、日本語の文字化け防止、印刷時のレイアウト維持、商談現場でのワンクリック動作を要件とする。仕様は `docs/spec/pdf-report.md` で確定済み（html2canvas 主体 + jsPDF 画像貼付方式 / `next/font/local` フォント埋め込み / A4 1 枚レイアウト / `matatabi-roi-{YYYYMMDD}-{HHmm}.pdf` 命名規則 / ワンクリック生成・10 秒タイムアウト）。脆弱性方針は `docs/security/jspdf-vulnerabilities.md` で「全 10 件到達不能」判定済みで、その判定が崩れないよう実装契約 4 点（§7 のレビューチェックリスト）を遵守する。本 Issue 着手時点の現状は、`ResultDashboard` 内に「PDF をダウンロード」ボタンが `disabled` プレースホルダで存在し、`PdfDashboard` / `src/lib/pdf.ts` / `src/lib/pdfFilename.ts` は未作成。

GitHub Issue: #43

---

## 採用方針（重要な前提決定）

- **html2canvas 主体 + jsPDF 画像貼付**: 仕様書 §3.1。`PdfDashboard` の隠し DOM を PNG 化して A4 台紙に貼付。`scale: 2`、画像フォーマット PNG、`useCORS: false`、`backgroundColor: "#ffffff"` 固定（§3.2）。
- **動的マウント方式**: 仕様書 §8.4。常時マウントによる DOM 倍化を避けるため、`isGeneratingPdf` 状態が `true` の間のみ `<PdfDashboard />` をレンダリングする。`next/dynamic({ ssr: false })` でロード遅延も同時に達成。
- **次の dynamic import 戦略**: `src/lib/pdf.ts` 内で `await import("html2canvas")` / `await import("jspdf")` を行い、PDF 生成ボタン押下時に初めてバンドルがロードされる（§10.1〜§10.2 / LCP 1 秒目標保護）。
- **`generatePdf` の関数シグネチャ**: 仕様書 §11.2 の **`{ element, filename }` を受ける形**を正本として採用する。Issue 本文には `generatePdf(input, output): Promise<Blob>` という記述があるが、Blob を返すと `pdf.save()` 呼び出しを呼び出し側へ移譲する必要が生じ、`docs/security/jspdf-vulnerabilities.md §2.1` の遵守事項「`pdf.save(filename)` の `filename` には `buildPdfFilename()` の戻り値以外を渡してはならない」のレビュー粒度が後退する。`generatePdf` 内部で `save()` を完結させ、戻り値は `Promise<void>` とする方が脆弱性レビュー観点と仕様書実装契約の両方に整合する。
- **`PdfDashboard` 専用レイアウト**: 仕様書 §11.1 の JSX を正本として実装する。**`DashboardView` は本 Issue では切り出さず**、現行 `ResultDashboard` の暫定 1 ファイル運用を維持し、`PdfDashboard` 内部に「PDF 専用 JSX（指標カード 3 並列・ヘッダー・フッター・入力サマリー・カテゴリ訴求・免責）」を独立配置する。`ResultDashboard.tsx:9-11` で「`PdfDashboard` 切り出しは Issue #43 着手時に `DashboardView` を抽出する想定」と書かれているが、抽出には Recharts アニメーション無効化スイッチ（`isAnimationActive` / `useCountUp` の `enabled` 制御）の波及修正が必要で、本 Issue で吸収するとレビュー範囲が肥大化する。**抽出は別 Issue とし、本 Issue では PDF 用 JSX を `PdfDashboard` 内に独立記述する**（指標カード数も §5.5 で「PDF 版 3 並列／画面版 2 並列」と差分が確定しており、結局 PDF 側で独自の指標表示を書く必要があるため、`DashboardView` 抽出の便益は限定的）。
- **フォント埋め込み**: 仕様書 §4.1。**`next/font/local` で Noto Sans JP + Inter の subset を `public/fonts/` に配置する** ことが正本だが、subset 化作業（`subset-font` / `fonttools` でのビルド）と実フォントファイルのコミットは「ライセンス確認 + サイズ検証 + コミット運用」の独立した作業性を持つ。本 Issue では **暫定運用として `src/app/layout.tsx` の既存 `next/font/google`（Inter / Noto Sans JP）をそのまま継承し**、PDF DOM の `font-family` カスケード（仕様書 §4.1）を CSS 変数経由で取り込む方針を採る。`next/font/google` は Next.js のビルド時に Google Fonts からフェッチしてローカルにバンドルする挙動（§4.5）で、ランタイム CDN 依存はない。subset 化と `next/font/local` への移行は **§13 将来拡張の派生 Issue として申し送る**（仕様書 §4.5 で `next/font/google` は「ビルド成功が外部サービスに依存する点で `next/font/local` より弱い」とあるが、Cloudflare Pages CI で現状成功している前提で、本 Issue は移行を含めない）。
- **連絡先・ロゴ**: 仕様書 §13.5 / §6.4 に従い、連絡先は **`src/lib/pdfConstants.ts`（新規）に集約**して差し替え可能にする。ロゴは `public/brand/logo-pdf.svg` が既に存在するため、暫定テキストではなく **SVG をそのまま `<img>` で使う**。ただし html2canvas は SVG を `<img src>` 経由で読み込む際に CORS / 同一オリジン解釈に制約があるため、`useCORS: false` 維持のままで安全に描画できることを検証フェーズで確認する（同一オリジン静的配信なので問題ない見込み）。
- **責任分離**: PDF 生成ユーティリティ（`src/lib/pdf.ts`）/ ファイル名生成（`src/lib/pdfFilename.ts`）/ 静的定数（`src/lib/pdfConstants.ts`）/ 描画コンポーネント（`src/components/calculate/PdfDashboard.tsx`）/ ボタン UI 連携（`ResultDashboard.tsx` 修正）の 5 階層に分離。
- **CalculatePageClient ではなく ResultDashboard 内部にボタン状態を持つ**: 仕様書 §11.4 が「`ResultDashboard` が `isGeneratingPdf` 状態を持ち」と明示している。現行は `CalculatePageClient` の `footerSlot` で組み立てているが、状態（生成中フラグ・エラーメッセージ・隠し DOM の `ref`）は `ResultDashboard` 内に閉じ込めるほうが情報局所性が高い。**`CalculatePageClient.tsx` の `footerSlot` を撤廃し、PDF ダウンロードボタン UI と再診断ボタンを `ResultDashboard` 内部に移管**する。再診断ボタンの動作（`setSubmitted(null)`）は `onResetRequest?: () => void` のような callback props 経由で親から注入する。
- **エラーメッセージ表示**: 仕様書 §8.3。インラインメッセージをボタン直下に 5 秒間表示。`useEffect` + `setTimeout` で自動消去。

---

## 変更対象ファイル

### 1. PDF レポート用静的定数（連絡先・ロゴ）の新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/pdfConstants.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - JSDoc ヘッダで仕様書 `docs/spec/pdf-report.md §6.1〜§6.4 / §13.5` への参照、および「運用で差し替え可能な定数群」であることを明記。
  - `export const PDF_COMPANY_NAME = "株式会社ねこにまたたび";`（§6.2 フッター左端）。
  - `export const PDF_CONTACT_TEXT = "contact@nekonimatatabi.example";`（§6.2 フッター中央。**Issue #14 の連絡先確定までの暫定値**として明記コメント。`example` ドメインで誤配信防止）。
  - `export const PDF_REPORT_TITLE = "ROI診断結果レポート";`（§6.1 ヘッダー中央）。
  - `export const PDF_LOGO_SRC = "/brand/logo-pdf.svg";`（§6.4。`public/brand/` の既存 SVG を参照。`next.config.mjs` の `output: "export"` 構成で静的配信される）。
  - `export const PDF_DISCLAIMER_TEXT`: 仕様書 §5.4 ASCII ワイヤーの「本試算は入力値に基づく理論上の最大値であり、実際の効果を保証するものではありません。」相当の文言。Calculation logic spec の `§6.1` を参照しつつ、A4 内に収まる長さに調整。
  - `export const PDF_CATEGORY_PLACEHOLDER = "{{CATEGORY_MESSAGE}}";`（§13.6。Issue #1 将来拡張で確定するまでのプレースホルダ）。
- **理由**: 仕様書 §13.5 が「連絡先・ロゴ・カテゴリ訴求テキストは差し替え可能な定数として集約」と要求。`PdfDashboard` 内に直書きすると差し替え時に JSX 修正となり、定数集約のほうが運用変更（メールアドレス決定・正式ロゴ完成）への追従コストが低い。

### 2. PDF ファイル名生成ユーティリティの新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/pdfFilename.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - JSDoc ヘッダで仕様書 `docs/spec/pdf-report.md §7.1 / §11.3` および `docs/security/jspdf-vulnerabilities.md §2.1` への参照を明記。「ユーザー入力を一切混入させず、`Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo" })` から抽出した数値文字列のみで構成する」契約を JSDoc に明示し、grep でレビューしやすくする。
  - `export function buildPdfFilename(now: Date = new Date()): string` を仕様書 §11.3 の擬似コードどおり実装:
    ```ts
    export function buildPdfFilename(now: Date = new Date()): string {
      const parts = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(now);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
      const ymd = `${get("year")}${get("month")}${get("day")}`;
      const hm = `${get("hour")}${get("minute")}`;
      return `matatabi-roi-${ymd}-${hm}.pdf`;
    }
    ```
  - `default` 値 `now = new Date()` をテスト容易性のため明示的に引数化（仕様書 §11.3 と一致）。
- **理由**: 仕様書 §7.1 / §11.3 の正本実装。`docs/security/jspdf-vulnerabilities.md §2.1` の「Path Traversal 到達不能判定」が成立する前提。`Intl.DateTimeFormat` を使うことで JST 固定（`timeZone: "Asia/Tokyo"`）と `formatToParts` による安全な数値抽出を両立する。

### 3. PDF 生成ユーティリティ（`generatePdf`）の新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/pdf.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - JSDoc ヘッダで仕様書 `docs/spec/pdf-report.md §3.1 / §3.2 / §11.2` および `docs/security/jspdf-vulnerabilities.md §2.1〜§2.3 / §7` のレビュー観点を明記。「`pdf.html()` を呼ばない / `addImage` の `imgData` は html2canvas 出力 dataURL のみ / `save()` の `filename` は `buildPdfFilename()` 戻り値のみ」の 3 点を契約として記述。
  - `export interface GeneratePdfOptions { element: HTMLElement; filename: string; }`
  - `export async function generatePdf(options: GeneratePdfOptions): Promise<void>`:
    - dynamic import: `const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);`
    - `const canvas = await html2canvas(options.element, { scale: 2, useCORS: false, backgroundColor: "#ffffff" });`
    - `const imgData = canvas.toDataURL("image/png");`
    - `const pdf = new jsPDF("p", "mm", "a4");`
    - `pdf.addImage(imgData, "PNG", 0, 0, 210, 297);`
    - `pdf.save(options.filename);`
  - エラーハンドリングは関数内部では行わず、呼び出し側（`ResultDashboard` の try/catch）に委ねる（責務分離）。
  - 注意コメント: `pdf.html(...)` は **絶対に呼び出してはならない**（dompurify 経由の脆弱性到達回避、`docs/security/jspdf-vulnerabilities.md §2.3 / §7`）。
- **理由**: 仕様書 §11.2 の正本実装。Issue 本文の `generatePdf(input, output): Promise<Blob>` ではなく **仕様書 §11.2 のシグネチャを優先**する（採用方針セクション参照）。dynamic import により jsPDF + html2canvas の合計約 385KB がボタン押下まで遅延ロードされ、初回 LCP に影響しない（§10.4）。

### 4. PDF 専用ダッシュボードコンポーネント（`PdfDashboard`）の新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/PdfDashboard.tsx`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - `"use client"` 指示子（描画は client side のみで完結。`forwardRef` を使うため）。
  - JSDoc ヘッダで仕様書 `docs/spec/pdf-report.md §3.3 / §5 / §6 / §9 / §11.1 / §11.5` への参照と、「画面表示用ではなく PDF 生成専用 / `position: absolute; left: -9999px;` で隠して描画 / `forwardRef` で外部から DOM を取得可能 / Recharts は `isAnimationActive={false}` 強制」を明記。

  - **import** ブロック:
    ```ts
    import { forwardRef } from "react";
    import { Bar, BarChart, Cell, Legend, ResponsiveContainer, XAxis, YAxis, LabelList } from "recharts";
    import { AlertTriangle, PiggyBank, Sparkles } from "lucide-react";
    import { formatManYen, formatManYenCompact, formatPercent } from "@/lib/format";
    import { buildCriticalOpportunityLossMessage } from "@/lib/messages";
    import { INSOURCING_LEVELS, type InsourcingLevel } from "@/lib/constants";
    import type { CalculationInput, CalculationOutput } from "@/lib/calculation";
    import {
      PDF_COMPANY_NAME, PDF_CONTACT_TEXT, PDF_REPORT_TITLE,
      PDF_LOGO_SRC, PDF_DISCLAIMER_TEXT, PDF_CATEGORY_PLACEHOLDER,
    } from "@/lib/pdfConstants";
    ```

  - **props 型** （仕様書 §11.1 を一部調整）:
    ```ts
    export interface PdfDashboardProps {
      result: CalculationOutput;
      insourcingLevel: InsourcingLevel;
      inputs: CalculationInput; // 円単位（生成日時に万円換算で表示）
      generatedAt: Date;
    }
    ```

  - **A4 比率寸法定数**（モジュールスコープ）:
    - `const A4_WIDTH_MM = 210;` / `const A4_HEIGHT_MM = 297;`
    - `const PDF_BAR_HEIGHT_PX = 100;`（A4 グラフ枠 42mm に収める固定値、`isMobile` 判定不要）
    - 配色定数: 画面版 `ResultDashboard` の `ACCENT_HEX = "#9CAEB8"` と一致させる（`tailwind.config.ts` の `accent` トークンと同値）。

  - **コンポーネント本体** （`forwardRef<HTMLDivElement, PdfDashboardProps>`）:
    - ルート要素は `<div ref={ref} role="document" aria-hidden="true">`（隠し DOM のためスクリーンリーダーから除外）。
    - **インラインスタイル**で A4 比率と `font-family` を当てる（Tailwind の任意値だと html2canvas の `getComputedStyle` 解決時にズレる経験則的リスクがあるため、寸法に関わる箇所は inline style で明示）:
      ```tsx
      style={{
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        backgroundColor: "#FFFFFF",
        color: "#72665B",
        fontFamily: "var(--font-inter), var(--font-noto-sans-jp), sans-serif",
        padding: "15mm",
        boxSizing: "border-box",
      }}
      ```

    - **判定**:
      - `const showWarningBanner = result.speedWarning && insourcingLevel !== 1;`（仕様書 §11.1 / `warning-copy.md §4.3.3` と整合）。
      - `const warningMessage = showWarningBanner ? buildCriticalOpportunityLossMessage(result.speedWarningMonthlyLoss) : null;`
      - `const insourcingPercent = formatPercent(insourcingLevel);`
      - `updateWaitLabel`: 仕様書 §5.4 の `(※)` 注記に従い、`InputForm` の `UPDATE_WAIT_OPTIONS` と同じマッピングで代表値→ラベル変換（**`InputForm` 内の private 配列を import できないため、本ファイル内に同等の `UPDATE_WAIT_LABELS` 配列を再定義**。仕様書 §11.1 / §5.4 の `(※)` 注記準拠）。
      - `insourcingLabel`: `INSOURCING_LEVELS.find((entry) => entry.value === insourcingLevel)?.label ?? "—"`。

    - **JSX 構造**（仕様書 §5.4 ASCII ワイヤーを上から順に実装）:
      1. **ヘッダー**（高さ 18mm、下端に Slate 細線）:
         - 左端 12×12mm: `<img src={PDF_LOGO_SRC} alt="" width={48} height={48} style={{ width: "12mm", height: "12mm" }} />`
         - 中央: `<h1 style={{ fontSize: "14pt", fontWeight: 700 }}>{PDF_REPORT_TITLE}</h1>`
         - 右端: `生成日時 {formatPdfDateTime(generatedAt)}`（10pt）。`formatPdfDateTime` はファイル内の private helper として `Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })` で `2026-04-23 15:30` 形式に整形。
      2. **警告バナー**（条件付き 14mm）:
         - `showWarningBanner ? <PdfWarningBanner message={warningMessage!} /> : null`
         - `PdfWarningBanner` は同ファイル内のローカルコンポーネント（独立切り出しはしない）。仕様書 §5.3「警告バナー高さ 14mm / 見出し 12pt / サブ 10pt」に従う。`bg-accent/10` の代替として inline style `backgroundColor: "rgba(156, 174, 184, 0.10)"`、`border: "1px solid #9CAEB8"`、`borderRadius: "4px"`。`AlertTriangle` アイコン (Lucide) + 見出し（uppercase / `letterSpacing: "0.06em"` / 12pt / 700）+ サブ（10pt）。
      3. **表紙訴求**（42mm）: `<div>` 内に `3年間のトータルインパクト` + `formatManYenCompact(result.totalThreeYearImpact)` を 32pt で表示。桁爆発（`OKU_THRESHOLD_MAN_YEN` 越え）時はフォントサイズを 24pt に自動降格（条件分岐: `result.totalThreeYearImpact / YEN_PER_MAN_YEN >= OKU_THRESHOLD_MAN_YEN ? "24pt" : "32pt"`）。仕様書 §5.3 / §9.2 の通り `※ 試算上の最大値` 注記を 10pt で添える。
      4. **指標カード 3 並列**（34mm、§5.5）: `<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6mm" }}>` で 3 並列。各カードは枠線 + padding（縦 6mm / 横 5mm）。
         - カード A: 「3 年間の止血」 + `formatManYen(result.threeYearSavings)` + `0 < insourcingLevel < 1` のとき「内製化 ◯% 相当分を除外済み」注記
         - カード B: 「年間の利益創出」 + `formatManYen(result.annualProfitCreation)`
         - カード C: 「3 年間の利益創出」 + `formatManYen(result.threeYearProfitCreation)`
      5. **積み上げ横棒グラフ**（42mm）:
         - `ResponsiveContainer` で width 100%、height `PDF_BAR_HEIGHT_PX`。
         - `BarChart` `layout="vertical"` で `chartData = [{ label: "3年合計", savings: result.threeYearSavings, profit: result.threeYearProfitCreation }]`。
         - **重要**: `<Bar isAnimationActive={false}>` を必ず指定（仕様書 §3.3 / §9.1）。`useCountUp` も使わない（即時最終値）。
         - 凡例（`Legend`）は `ResultDashboard.tsx:220-246` の `content` カスタム凡例 JSX を流用しつつ、`<LabelList>` で常時バー上に金額ラベルを表示（仕様書 §9.2「凡例の金額ラベルを常時表示に切替」）。
      6. **カテゴリ訴求**（14mm）: `<p>{PDF_CATEGORY_PLACEHOLDER}</p>` をプレースホルダとして表示（§13.6）。
      7. **入力サマリー**（40mm、§5.4 ASCII ワイヤー準拠）: `<dl>` 形式で 6 行（月額ベンダー費用 / 単発改修費用 / 手作業人数 / 更新待ち期間 / 内製化状況 / 詳細設定）。値の整形は `formatManYen` / `inputs.monthlyVendorCost` 円→万円換算で行う（`yenToManYen` または `Math.round(inputs.monthlyVendorCost / YEN_PER_MAN_YEN)` を直接使用）。
      8. **免責**（8mm）: `<p style={{ fontSize: "8pt" }}>{PDF_DISCLAIMER_TEXT}</p>`
      9. **フッター**（13mm、上端に Slate 細線）:
         - 左: `{PDF_COMPANY_NAME}` (10pt)
         - 中央: `{PDF_CONTACT_TEXT}` (9pt)
         - 右: `1 / 1` (9pt、§6.2 で固定)
  - **エクスポート**: `export const PdfDashboard = forwardRef<HTMLDivElement, PdfDashboardProps>(function PdfDashboard(...) { ... });`
- **理由**: 仕様書 §3.1 / §5 / §6 / §9 / §11.1 の正本実装。`forwardRef` により親（`ResultDashboard`）が DOM ノードを取得し `generatePdf({ element: ref.current!, ... })` に渡せる。`PdfWarningBanner` を独立コンポーネント化せず内部に閉じる理由は、PDF 専用の寸法（14mm / 12pt / 10pt）が画面版 `WarningBanner` と異なるため再利用性が低く、ファイル分割のオーバーヘッドが便益を上回るため。

### 5. ResultDashboard に PDF 生成ボタン UI と状態管理を統合
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.tsx`
- **変更箇所**:
  - 上部 JSDoc ヘッダ（lines 3-23）: PDF 連携の説明追記。
  - import ブロック（lines 25-41）: `useRef` / `useCallback` / `dynamic` 追加、`PdfDashboard` の dynamic import、`generatePdf` / `buildPdfFilename` / `Button` / `Loader2` (lucide) の追加。
  - `ResultDashboardProps` 型（lines 80-97）: 新規 props `inputs: CalculationInput;` と `onResetRequest?: () => void;` を追加し、`footerSlot` を非推奨化（または完全削除）。
  - `ResultDashboard` 関数本体: 状態管理（`isGeneratingPdf` / `pdfError`）、`pdfDashboardRef`、`handleDownloadPdf` ハンドラを追加。`footerSlot` を撤廃し、PDF ダウンロードボタン + 再診断ボタンを内部 JSX で組み立てる。`isGeneratingPdf === true` の間のみ `<PdfDashboard ref={pdfDashboardRef} ... />` を `position: absolute; left: -9999px; top: 0;` で隠してマウント。
- **変更内容**:
  - **import 拡張**（仕様書 §11.4 / §8.4）:
    ```ts
    import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
    import dynamic from "next/dynamic";
    import { Loader2, PiggyBank, Sparkles } from "lucide-react";
    import { Button } from "@/components/ui/Button";
    // ... 既存 import 維持
    import type { CalculationInput, CalculationOutput } from "@/lib/calculation";
    import { generatePdf } from "@/lib/pdf";
    import { buildPdfFilename } from "@/lib/pdfFilename";
    import type { PdfDashboardProps } from "./PdfDashboard";

    const PdfDashboard = dynamic<PdfDashboardProps & { ref?: React.Ref<HTMLDivElement> }>(
      () => import("./PdfDashboard").then((m) => m.PdfDashboard),
      { ssr: false },
    );
    ```
    - **注意**: `next/dynamic` は `forwardRef` をそのまま転送できないため、**`React.lazy` + `Suspense` を使うか、`PdfDashboard` モジュールごと `await import()` で都度ロードする方式**に切り替える可能性あり。実装時に `next/dynamic` の `forwardRef` 互換性を `next 14.2` の挙動で検証し、互換性がない場合は `handleDownloadPdf` 内で `const mod = await import("./PdfDashboard");` してから `ReactDOM.createRoot` 等で動的レンダリングする方式に変更する（Recharts もこの方式と相性がよい）。
    - **採用される実装の優先順位**:
      1. `next/dynamic` + `ref` 転送可能なら最も簡潔。要検証。
      2. 不可なら、PdfDashboard を **`isGeneratingPdf` のレンダリング枝で通常 import** し、ファイル全体としては動的 import を諦める（jsPDF / html2canvas の dynamic import で初回ロードコストはすでに回避済み）。
      3. 最後の選択肢として、`useEffect` 内で `await import("./PdfDashboard")` を行い、`ReactDOM.createRoot` で document.body 配下にマウントする方式（仕様書 §8.4 と互換）。
    - 実装時はオプション 2 を保守的なフォールバックとし、TypeScript / lint / build を通すことを優先する。

  - **`ResultDashboardProps` 型拡張**:
    ```ts
    export type ResultDashboardProps = {
      result: CalculationOutput;
      insourcingLevel: InsourcingLevel;
      inputs: CalculationInput; // 新規: PDF 入力サマリー表示のため
      headerSlot?: ReactNode;
      onResetRequest?: () => void; // 新規: 再診断ボタン用 callback
      className?: string;
    };
    ```
    - `footerSlot?: ReactNode` を削除（破壊的変更だが、唯一の呼び出し元 `CalculatePageClient.tsx` を同 PR で更新するためサーフェス安全）。

  - **状態とハンドラ追加**:
    ```ts
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const pdfDashboardRef = useRef<HTMLDivElement | null>(null);
    const generatedAtRef = useRef<Date | null>(null);

    // エラーメッセージは 5 秒で自動消去 (仕様書 §8.3)
    useEffect(() => {
      if (!pdfError) return;
      const tid = setTimeout(() => setPdfError(null), 5000);
      return () => clearTimeout(tid);
    }, [pdfError]);

    const handleDownloadPdf = useCallback(async () => {
      if (isGeneratingPdf) return;
      setPdfError(null);
      generatedAtRef.current = new Date();
      setIsGeneratingPdf(true);
      try {
        // 仕様書 §8.1: requestAnimationFrame 2 回分待機 (DOM レイアウト確定 + フォント解決)
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        const element = pdfDashboardRef.current;
        if (!element) {
          throw new Error("PdfDashboard element is not mounted");
        }
        await generatePdf({
          element,
          filename: buildPdfFilename(generatedAtRef.current ?? new Date()),
        });
      } catch (err) {
        // 仕様書 §8.3: console.error にエラー詳細を出力
        console.error("[PDF generation failed]", err);
        setPdfError("PDFの生成に失敗しました。ページを再読み込みして再度お試しください。");
      } finally {
        setIsGeneratingPdf(false);
        generatedAtRef.current = null;
      }
    }, [isGeneratingPdf]);
    ```
  - **`footerSlot` 削除と新 footer JSX 追加**: 既存 `{footerSlot ? <div>{footerSlot}</div> : null}` を以下に置換:
    ```tsx
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          variant="primary"
          size="lg"
          type="button"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          aria-busy={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              <span>PDF生成中…</span>
            </>
          ) : (
            <span>PDF をダウンロード</span>
          )}
        </Button>
        {onResetRequest ? (
          <Button variant="secondary" size="lg" type="button" onClick={onResetRequest}>
            再診断する
          </Button>
        ) : null}
      </div>
      {pdfError ? (
        <p role="alert" className="text-sm text-[#B45656]">
          {pdfError}
        </p>
      ) : null}
    </div>
    ```
  - **`PdfDashboard` 隠しマウント JSX**（コンポーネント末尾）:
    ```tsx
    {isGeneratingPdf ? (
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
          generatedAt={generatedAtRef.current ?? new Date()}
        />
      </div>
    ) : null}
    ```
  - **既存 `Card` 内の予備注記**（lines 276-280）: `result.speedWarning && !headerSlot` 条件は本 PR で変更しない（Issue #42 で意図的に残された予備テキストのため）。
- **理由**: 仕様書 §11.4「`ResultDashboard` が `isGeneratingPdf` 状態を持ち、ボタン押下で生成フローを実行する」の正本実装。状態管理を `ResultDashboard` 内部に閉じ込めることで、`CalculatePageClient` の責務は「`InputForm` ⇄ `ResultDashboard` の橋渡し + ヘッダー警告バナー組み立て」のみに整理される。`requestAnimationFrame` 2 回分の待機（§8.1）と `position: absolute; left: -9999px` の隠しマウント（§8.4）は仕様書の必須要件。

### 6. CalculatePageClient の footerSlot 撤廃と inputs / onResetRequest 受け渡し
- **変更**: `/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.tsx`
- **変更箇所**: `<ResultDashboard ... />` を呼び出している箇所（lines 36-71）。
- **変更内容**:
  - `<ResultDashboard>` の props から `footerSlot` 全体（lines 49-70）を削除。
  - 新規 props `inputs={submitted}` と `onResetRequest={() => setSubmitted(null)}` を追加。
  - 既存の `headerSlot` / `key={resultKey}` / `result={result}` / `insourcingLevel={submitted.insourcingLevel}` はそのまま維持。
  - `import { Button } from "@/components/ui/Button";` を削除（このファイルでは未使用になる）。
- **理由**: 変更項目 5 で `ResultDashboard` 内部に PDF ボタン UI と再診断ボタンを移管したため、`CalculatePageClient` の責務は「入力 → 計算 → ダッシュボード描画 + 警告バナー組み立て」のみに整理される。`inputs={submitted}` を渡すことで `PdfDashboard` の入力サマリー表示要件（§5.4）が満たされる。

### 7. （オプション）docs/spec/pdf-report.md §13.5 の連絡先 TBD ノート追記
- **変更なし（本 Issue スコープ外）**: `docs/spec/pdf-report.md`
- **判断理由**: 仕様書 §13.5 が既に「連絡先は `src/lib/pdfConstants.ts`（仮称）の定数として差し替え可能」と明記している。本 Issue では仕様書を改定せず、`pdfConstants.ts` の暫定値であることを **`pdfConstants.ts` 内の JSDoc コメント**で明示するに留める。連絡先の最終値確定は別 Issue。

### 8. （変更なし、明示確認）`tailwind.config.ts` / `globals.css` / `next.config.mjs`
- **変更なし**:
  - `/Users/YS/development/matatabi-calculator/tailwind.config.ts`: `font-family` カスケード（`var(--font-inter), var(--font-noto-sans-jp), system-ui, sans-serif`）が既に設定済み。`PdfDashboard` 内の inline style で同じカスケードを直接指定するため tailwind config 変更は不要。
  - `/Users/YS/development/matatabi-calculator/src/app/globals.css`: フォント変数は `layout.tsx` の `<body>` で `${inter.variable} ${notoSansJp.variable}` として注入済み。`PdfDashboard` は `<body>` 配下にマウントされるため CSS 変数が伝搬する。
  - `/Users/YS/development/matatabi-calculator/next.config.mjs`: `output: "export"` のままで `public/brand/logo-pdf.svg` は静的配信される。dynamic import (`await import("jspdf")`) は Next.js のクライアント側 JS 分割で対応されるため設定変更不要。
- **判断理由**: 既存設定で本 Issue の要件を満たすため、無闇に config を弄らない（最小変更原則）。

### 9. （変更なし、明示確認）`public/fonts/` への subset Noto Sans JP / Inter 配置
- **変更なし**: `/Users/YS/development/matatabi-calculator/public/fonts/`（ディレクトリ自体未作成）
- **判断理由**: 採用方針セクションで述べた通り、現状の `next/font/google`（Inter / Noto Sans JP）を継続使用する。`next/font/google` は Next.js のビルド時に Google Fonts からフェッチしてローカルにバンドルする挙動で、ランタイム CDN 依存はない（仕様書 §4.5 の参考記述）。subset 化と `next/font/local` への移行は別 Issue として申し送る（フォローアップ §1）。

---

## 設計上の考慮点

### `next/dynamic` と `forwardRef` の互換性懸念
- **問題**: `next/dynamic` でラップしたコンポーネントは、内部で `React.lazy` + `Suspense` を使う実装上、`ref` の転送が Next.js のバージョンによって挙動が異なる。`next 14.2` では `forwardRef` を経由する component を dynamic import してもプロパティとしての `ref` は正しく転送される想定だが、TypeScript 型推論で警告が出る可能性がある。
- **対策**:
  1. **第一案**: `next/dynamic` + 通常の `ref` props（`pdfRef={pdfDashboardRef}` のような明示的な props）に切り替え、`PdfDashboard` 内部で `pdfRef?.current = innerDivRef.current` のように forwarding する。
  2. **第二案**: `PdfDashboard` を通常 import に変更し、`isGeneratingPdf` 枝でレンダリング。jsPDF / html2canvas の dynamic import は `src/lib/pdf.ts` 内で確保しているため初回 LCP には影響しない。`PdfDashboard` 自体のバンドルサイズは Recharts がすでに `ResultDashboard` で使われていることから増分 < 5KB の見込み。
- **採用**: 実装時に `next 14.2` の挙動を確認し、簡潔さを優先して **第二案（通常 import）** を初期実装とし、必要に応じて第一案に切り替える。`ResultDashboard.tsx:9-15` の JSDoc も「PDF 用ラッパは `isGeneratingPdf` 時のみ条件付きレンダリング」と整合する。

### Recharts の `ResponsiveContainer` と html2canvas の相性
- **問題**: `ResponsiveContainer` は親要素のサイズを `ResizeObserver` で動的計測して自身のサイズを決定する。隠し DOM (`position: absolute; left: -9999px;`) では親サイズが正常に計測される（`width: 210mm` / `height: 297mm` を inline style で固定しているため）が、初回マウント時に `width=0` で計測されるレースが発生する場合がある。
- **対策**: `requestAnimationFrame` 2 回分の待機（仕様書 §8.1）でレイアウト確定を待つ。それでも問題が残る場合は、`ResponsiveContainer` を使わず `<BarChart width={680} height={100}>` で固定ピクセル指定に切り替える（A4 描画領域 180mm の `scale: 2` で約 1360px → CSS px 換算で 680px）。本 Issue では `ResponsiveContainer` を維持し、検証フェーズで失敗が観測された場合に固定値化する。

### html2canvas の SVG ロゴ描画
- **問題**: `<img src="/brand/logo-pdf.svg">` を html2canvas が描画する際、`useCORS: false` でも同一オリジン（Cloudflare Pages の `output: "export"` 静的配信）であれば canvas の汚染が起きないため問題ない見込み。ただし、開発時 (`npm run dev`) と本番ビルド (`npm run build` + `next start`) で挙動差が出ないことを検証フェーズで確認する。
- **代替案**: SVG が描画されない場合、`<img>` の代わりに **SVG をインライン JSX として埋め込む** 形に切り替える（`logo-pdf.svg` の中身は単純な `<g>` + `<path>` 構成のため、JSX 化は容易）。

### `pdf.html()` を呼ばない契約の維持
- **問題**: 将来の修正で誰かが `pdf.html(...)` を呼ぶと、`docs/security/jspdf-vulnerabilities.md §2.3` の「dompurify 系 7 件は到達不能」判定が崩れる。
- **対策**: `src/lib/pdf.ts` の JSDoc に「`pdf.html(...)` は **絶対に呼び出してはならない**」と明記し、PR レビュー時に grep でチェックできるようにする。`docs/security/jspdf-vulnerabilities.md §7` のレビュー観点リストの 4 項目を本 Issue の PR 説明にも転記する。

### `pdf.save(filename)` の filename 契約
- **問題**: `pdf.save()` に渡す `filename` が `buildPdfFilename()` の戻り値以外（フォーム入力値・URL クエリ等）から生成されると Path Traversal 到達可能になる。
- **対策**: `generatePdf` の引数 `filename: string` に直接ユーザー入力が混入しないことを契約として JSDoc に明記。呼び出し側 `ResultDashboard.handleDownloadPdf` が `buildPdfFilename(generatedAtRef.current)` の戻り値を渡している（変数代入なし、関数呼び出し直結）ことを保証。

### Card コンポーネントを PDF 内で使うか
- **判断**: PDF 内では `Card`（`shadow-card` 付き）を使わない。`docs/design-tokens.md §10` で「PDF 内 (`PdfDashboard`) で `shadow-card` を使うか: 未確定」と明記されており、html2canvas のラスタライズで影が濁る可能性があるため、本 Issue では **`Card` を流用せず inline style + `<div>` で枠線・余白のみ** で構成する。仕様書 §3.2 の `backgroundColor: "#ffffff"` 設定でも canvas 上の影が想定外の色味になることを避ける。

### A4 寸法と html2canvas の `scale: 2` のメモリ計算
- A4 縦 210×297mm を CSS px 相当（`1mm ≈ 3.78px`）で描画 → 約 794×1123 CSS px。`scale: 2` で約 1588×2246 デバイス px ≈ 約 357 万 px²。仕様書 §3.2 の「iPad Safari 制約 16M px²」の 1/45 程度で十分安全。

### エラーメッセージの id とアクセシビリティ
- `pdfError` 表示の `<p role="alert">` は通知用。ボタンと同じコンテナ内に配置することで、スクリーンリーダーが「PDF をダウンロード ボタン → エラーメッセージ」の順で読み上げ可能。

### `WarningBanner` 共通化を見送る理由
- 画面版 `WarningBanner` は `bg-accent/10 border border-accent` の Tailwind class で固定スタイル。PDF 版は寸法（14mm）/ フォントサイズ（12pt + 10pt）/ レイアウト密度が完全に異なるため、共通化すると props で寸法を全て注入する必要がありコスト過大。`PdfDashboard` 内に独立した `PdfWarningBanner` ローカルコンポーネントを置く方が、画面版とのトークン分離が明確。

---

## フォローアップ（本 Issue スコープ外）

1. **`next/font/local` 移行 + Noto Sans JP / Inter subset 化**: 仕様書 §4.1 の正本方針。本 Issue では `next/font/google` 継続。subset 生成スクリプト（`subset-font` または `fonttools`）と `public/fonts/` 配置、`layout.tsx` の `localFont` 化は別 Issue として起票。
2. **`DashboardView` 抽出リファクタ**: `ResultDashboard.tsx:9-11` の JSDoc 申し送り。本 Issue では PdfDashboard を独立 JSX で実装し、共有ベースの抽出は行わない。
3. **連絡先（メールアドレス）の正式値確定**: 仕様書 §13.5。`pdfConstants.ts` の暫定値を Issue #14（アクセス解析）または別運用 Issue で差し替え。
4. **正式ロゴ SVG 配置**: 仕様書 §6.4。`public/brand/logo-pdf.svg` は既存だが、ブランド資産制作 Issue（`#9` 想定）で正式版に差し替え可能。
5. **カテゴリ訴求文言の確定**: 仕様書 §13.6。`PDF_CATEGORY_PLACEHOLDER` を Issue #1 将来拡張で差し替え。
6. **iPad / iOS Safari 実機検証ループ**: 仕様書 §13.4「`scale: 1.5` への降格余地」のトリガ判定（生成成功率 < 95% または 10 秒超え）が観測された場合の対応は別 Issue。
7. **`pdf.html()` を呼ばない契約の CI 化**: 仕様書 §7.1 のレビューチェックを `eslint-plugin-no-restricted-syntax` 等で機械化することは別 Issue。

---

## 検証方法

1. **静的型検査**: `npx tsc --noEmit` を実行し、`ResultDashboardProps` 拡張（新規 `inputs` / `onResetRequest`）が `CalculatePageClient` 側で正しく充足されていること、`PdfDashboard` の forwardRef 型が `useRef<HTMLDivElement | null>` と整合することを確認。
2. **Lint**: `npm run lint` でエラーゼロ。`next/dynamic` の使用箇所と `import` 順序、`use client` 指示子の付与を確認。
3. **ビルド**: `npm run build` を実行し、`output: "export"` 構成でも jsPDF / html2canvas の dynamic import が正しく code split されることを確認（`next build` のサマリで `chunks/jspdf*.js` 等が分離されること）。
4. **`npm run dev` 上での目視検証**:
   - **入力例 1（警告発動）**: 月額委託費 100 万円 / 改修費 30 万円 / 手作業 5 名 / 更新待ち 4.5 ヶ月（「3〜6ヶ月」） / 内製化 0% → 「PDF をダウンロード」ボタン押下 → 「PDF生成中…」表示 → ファイル `matatabi-roi-YYYYMMDD-HHmm.pdf` がダウンロードされる。PDF を開き、警告バナー / トータル / 指標カード 3 並列 / グラフ / 入力サマリー / フッターが A4 1 枚に収まり、日本語が文字化けしないことを目視確認。
   - **入力例 2（警告非発動）**: 更新待ち 0.5 ヶ月（「すぐ対応」） → PDF 内に警告バナーが出ず、ヒーロー数値が上に繰り上がっていることを確認。
   - **入力例 3（完全内製）**: 内製化 100% → 警告バナー非表示・止血カード「0万円」表示・フッターまで通常レイアウトで生成。
   - **入力例 4（桁爆発）**: 月額委託費 10,000 万円 / 改修費 5,000 万円 / 手作業 1,000 名 → ヒーロー数値が `OKU_THRESHOLD_MAN_YEN` を越え `formatManYenCompact` で「◯億◯万円」表記、フォントサイズが 24pt に降格していることを目視確認。
5. **エラーハンドリング検証**:
   - DevTools Network タブで意図的に `jspdf` モジュールを `Block request URL` し、ボタンを押下 → エラーメッセージ「PDFの生成に失敗しました…」が 5 秒間表示され、自動消去されることを確認。
   - 同時にコンソールに `[PDF generation failed]` エラーが出ることを確認。
   - エラー後にもう一度ボタンを押すと再試行可能（`isGeneratingPdf` がリセットされている）であることを確認。
6. **二重クリック防止**: 「PDF をダウンロード」ボタンを連続で 3 回素早くクリック → ボタンが `disabled` になり生成は 1 回しか走らないことを確認（仕様書 §8.2）。
7. **クロスブラウザ検証**（受け入れ条件 / 仕様書 §1.1）:
   - **Desktop Chrome 最新**: ダウンロード成功 + PDF 内容確認。
   - **Desktop Safari 最新**: ダウンロード成功 + PDF 内容確認。
   - **Desktop Firefox 最新**: ダウンロード成功 + PDF 内容確認。
   - **iOS Safari（iPhone / iPad 実機 or BrowserStack）**: ダウンロード成功 + ファイルアプリで開ける。生成時間が 10 秒以内に収まることを確認。
8. **ファイル名検証**: 生成された PDF のファイル名が `matatabi-roi-` + 8 桁日付 + `-` + 4 桁時刻 + `.pdf` 形式になっていることを目視確認。複数回生成した場合に分単位で異なる名前が付与されることを確認。
9. **タイムゾーン検証**: ブラウザのタイムゾーン設定を「US/Pacific」等に変更してもファイル名と PDF 内ヘッダーの「生成日時」が JST で表示されることを確認（`Intl.DateTimeFormat` の `timeZone: "Asia/Tokyo"` 固定）。
10. **コンソール警告ゼロ**（受け入れ条件）: PDF 生成完了後にブラウザ DevTools のコンソールに `warning` / `error` が出力されないことを確認。Recharts の `ResponsiveContainer` が `width=0` 警告を出さないこと、html2canvas の CORS 警告が出ないこと、jsPDF のフォント未登録 warning が出ないこと（DOM 側で `font-family` が解決されているため）を重点確認。
11. **脆弱性遵守事項チェック**（`docs/security/jspdf-vulnerabilities.md §7`）:
    - `grep -n "pdf\.html\|jsPDF.prototype.html" src/` で **0 件**を確認。
    - `pdf.save(...)` の引数が `options.filename` のみであることを `src/lib/pdf.ts` のコード目視で確認。
    - `addImage(...)` の `imgData` が `canvas.toDataURL("image/png")` の戻り値のみであることを目視で確認。
    - フォーム入力値が `pdf.text` / `pdf.addImage` / `pdf.save` に直接渡されていないことを目視で確認。
12. **アクセシビリティ確認**: 隠し DOM (`PdfDashboard`) が `aria-hidden="true"` でスクリーンリーダーから除外されていること、PDF ダウンロードボタンが `aria-busy={isGeneratingPdf}` で生成中状態を通知していることを DevTools Accessibility パネルで確認。
13. **メモリリーク確認**: 連続で 10 回 PDF を生成 → DevTools の Memory タブでヒープサイズが線形に増大しないことを確認（`isGeneratingPdf` が `false` に戻るたびに `<PdfDashboard>` がアンマウントされ、Recharts / SVG ノードが GC される）。
