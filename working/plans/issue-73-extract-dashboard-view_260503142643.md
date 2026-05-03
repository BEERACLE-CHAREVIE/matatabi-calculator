# DashboardView 抽出による result-dashboard.md §10.2 3 層分離の本実装化

## Context
PR #43（Issue #41）で `ResultDashboard` 実装時、仕様書 `docs/spec/result-dashboard.md §10.2` の「描画層 (`DashboardView`) / 画面コンテナ (`ResultDashboard`) / PDF 用ラッパ (`PdfDashboard`)」3 層分離は本ファイル 1 つに同居させた暫定構造で運用されてきた。`src/components/calculate/ResultDashboard.tsx` 冒頭 JSDoc（L9-12）に「`DashboardView` 抽出は別 Issue として申し送り」と明示的に記載されており、本 Issue でこの申し送りを返済する。PR #66 / #70 / #72 で `useMediaQuery` 周辺のコード負債を返済した流れに続く `ResultDashboard` 周辺の構造的負債解消の最終ピース。

GitHub Issue: #73

## 変更対象ファイル

### 1. `DashboardView` の新規追加（描画層・副作用ゼロの pure component）
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/DashboardView.tsx`
- **変更箇所**: 新規ファイル全体
- **変更内容**:
  - `"use client"` ディレクティブを冒頭に付与（仕様書 §11 R1: SSR 境界）。Recharts の `ResponsiveContainer` は `ResizeObserver` 等のブラウザ API に依存するため、`DashboardView` も client component とする必要がある。
  - 冒頭 JSDoc に「仕様書 §10.2 の描画層」「副作用ゼロ（`useState` / `useEffect` / `useRef` / カスタムフック非使用）」「補間値 4 件は props 受け取り」「`useMemo` のみ描画派生値の計算用に許可」「Recharts SSR 境界・トークン追従・凡例の最終値静的化（現行 L24-26 の論点）」を本体に同等の粒度で記載する（現行 ResultDashboard の冒頭 JSDoc から描画関連部分を引き継ぐ）。
  - 既存 `ResultDashboard.tsx` の以下の import を本ファイルへ移植:
    - `recharts` の `Bar` / `BarChart` / `Legend` / `ResponsiveContainer` / `Tooltip` / `XAxis` / `YAxis`
    - `lucide-react` の `Loader2` / `PiggyBank` / `Sparkles`
    - `@/components/ui/Button`、`@/components/ui/Card`、`@/lib/cn`
    - `@/lib/format` の `formatManYen` / `formatManYenCompact` / `formatPercent`
    - `@/lib/constants` の `InsourcingLevel` 型
    - `@/lib/calculation` の `CalculationOutput` 型
    - `react` の `useMemo`、`type ReactNode`
  - 既存 ResultDashboard L60-67 の描画関連定数を移管:
    - `ACCENT_HEX = "#9CAEB8"`
    - `ACCENT_60 = "rgba(156, 174, 184, 0.6)"`
    - `TOOLTIP_CURSOR_FILL = "rgba(156, 174, 184, 0.08)"`
    - `BAR_HEIGHT_DESKTOP = 120`
    - `BAR_HEIGHT_MOBILE = 100`
    - `RECHARTS_ANIM_MS = 800`
    - `SAVINGS_LABEL = "3 年間の止血"`
    - `PROFIT_LABEL = "3 年間の利益創出"`
  - Props 型 `DashboardViewProps` を export して定義（Issue 本文の決定済み型をそのまま採用）:

    ```ts
    export interface DashboardViewProps {
      result: CalculationOutput;
      insourcingLevel: InsourcingLevel;
      animated: boolean;
      animatedSavings: number;
      animatedAnnualProfit: number;
      animatedThreeYearProfit: number;
      animatedTotal: number;
      isMobile: boolean;
      onDownloadPdf: () => void;
      onResetRequest?: () => void;
      isGeneratingPdf: boolean;
      pdfError: string | null;
      headerSlot?: ReactNode;
      className?: string;
    }
    ```

  - 関数本体は現行 ResultDashboard L160-174 の派生値計算と L176-389 の JSX をそのまま移管:
    - 派生値（描画専用）: `insourcingPercent` / `isFullyInsourced` / `isPartiallyInsourced` / `chartHeight`（`isMobile` props 由来）/ `chartData`（`useMemo` 残置）。現行 L160-163 の計算は副作用ではないため `DashboardView` 側に置く方が描画関心と凝集する。
    - JSX: `<section role="region" aria-label="ROI 診断結果" ...>` 配下のすべて（現行 L176-367）を移管。`<Bar>` の `isAnimationActive` は現行 `!reducedMotion` から `animated` props 直接参照に変更（仕様書 §10.2 / §11 R10 の `animated` 規約と整合）。
    - PDF ダウンロード CTA（現行 L329-367）の `onClick={handleDownloadPdf}` は `onClick={onDownloadPdf}` に、`disabled={isGeneratingPdf}` / `aria-busy={isGeneratingPdf}` / `pdfError` 表示はすべて props 経由参照に書き換え。再診断ボタン（現行 L351-360）も `onClick={onResetRequest}` に書き換え。
    - **隠しマウント JSX（現行 L369-387）は移管しない**: `pdfDashboardRef` / `generatedAt` / `inputs` / `PdfDashboard` import は `DashboardView` に持ち込まず、コンテナ責務として `ResultDashboard` 側に残置する（Issue 本文「採用設計判断」の隠しマウント JSX 方針）。
  - root の `<section>` には `className` props を `cn("mx-auto w-full max-w-[1024px] space-y-4 sm:space-y-6", className)` で結合する（現行 L180-183 の振る舞いを維持）。
- **理由**: 仕様書 §10.2「描画層は副作用なし、props ベース」「`animated` は呼び出し側が必ず明示する」要件を本実装化する。`useCountUp` × 4 の補間値は props で渡すことで `DashboardView` を hook 非依存の pure component に保ちテスト容易性を確保する（Issue 本文「採用設計判断」）。

### 2. `ResultDashboard` のコンテナ責務縮小
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.tsx`
- **変更箇所**:
  - 冒頭 JSDoc（L3-27）
  - import 文（L29-58）
  - コンポーネント本体（L94-390）
- **変更内容**:
  - **JSDoc 更新**:
    - L9-12 の「3 層分離は本ファイル 1 つに同居させた暫定構造で運用する。`DashboardView` 抽出は別 Issue として申し送り」を削除し、現状の 3 層分離（`DashboardView` 抽出済み）を反映した記述に書き換え。
    - L24-26 の「凡例の表示値」記述は描画関心の議題のため、本ファイルからは削除し `DashboardView.tsx` の JSDoc に移管。
    - 残す論点（コンテナ責務）: PDF 隠しマウントの `position: absolute; left: -9999px` 戦略、`useMediaQuery(REDUCED_MOTION_QUERY)` で `animated={!reducedMotion}` を導出する責務、`useCountUp` × 4 をコンテナで実行する根拠（pure 描画層を保つため）、Recharts の SSR 境界（CalculatePageClient 側 `next/dynamic({ ssr: false })`）。
  - **import 整理**:
    - 削除: `recharts` の各 import / `lucide-react` の `PiggyBank` / `Sparkles` / `@/components/ui/Button` / `@/components/ui/Card` / `@/lib/cn` / `@/lib/format` の `formatManYen` / `formatManYenCompact` / `formatPercent` の各 import。
    - 残す: `useCallback` / `useEffect` / `useRef` / `useState` / `type ReactNode`、`useMediaQuery`、`MOBILE_QUERY` / `REDUCED_MOTION_QUERY`、`useCountUp`、`generatePdf`、`buildPdfFilename`、`PdfDashboard`、`InsourcingLevel`、`CalculationInput` / `CalculationOutput`。
    - 追加: `./DashboardView` から `DashboardView` を import（`useMemo` / `Loader2` 等の使用箇所がコンテナ側から消えるため、それらの import は不要になる点に注意）。
  - **描画関連定数の削除**: L60-67 の `ACCENT_HEX` 等 8 件の定数は `DashboardView.tsx` に移管したため本ファイルからは全て削除。
  - **本体の構成変更**:
    - L102: `useMediaQuery(REDUCED_MOTION_QUERY)` → 残置（`animated` 算出用）。
    - L103: `useMediaQuery(MOBILE_QUERY)` → 残置（props で `DashboardView` に注入）。
    - L105-111: `useState` × 3（`isGeneratingPdf` / `pdfError` / `generatedAt`）／`useRef` × 2（`pdfDashboardRef` / `isGeneratingPdfRef`）→ 残置。
    - L114-118: `useEffect`（`pdfError` 自動消去）→ 残置。
    - L120-153: `handleDownloadPdf` の `useCallback` → 残置（コメント・実装ともに変更なし）。
    - L155-158: `useCountUp` × 4 → 残置（補間値を `DashboardView` の props として下流に渡す）。
    - L160-174: 派生値計算（`insourcingPercent` / `isFullyInsourced` / `isPartiallyInsourced` / `chartHeight` / `chartData`）→ **削除**（`DashboardView` 側に移動）。
    - L176-388: JSX 全体 → 以下の構造に置き換える:

      ```tsx
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
      ```

    - 隠しマウント JSX（現行 L369-387）はコンテナに残す（`pdfDashboardRef` / `generatedAt` state / `inputs` がコンテナ責務のため）。Fragment ラップで `DashboardView` と並列配置する。`role="region"` / `aria-label` は `DashboardView` 内 `<section>` が保持するため Fragment ラップで支障なし。
  - `ResultDashboardProps` 型（L69-92）は不変。`inputs` props は隠しマウントの `<PdfDashboard>` で引き続き使用するため残す。
- **理由**: 仕様書 §10.2 のコンテナ責務（`useCountUp` / `prefers-reduced-motion` / レスポンシブ制御）に純化する。隠しマウント JSX はコンテナ責務（`pdfDashboardRef` / `generatedAt` / `inputs`）を伴うため `DashboardView` には移さない。受け入れ条件「`useCountUp` / `useMediaQuery` / `useState` / `handleDownloadPdf` はコンテナ側に残る」「JSDoc から『暫定構造』『別 Issue として申し送り』記述が更新（または削除）される」を満たす。

### 3. `PdfDashboard` の不変保証（リファクタ範囲外であることの確認）
- **変更しない**: `/Users/YS/development/matatabi-calculator/src/components/calculate/PdfDashboard.tsx`
- **変更箇所**: なし
- **変更内容**: 本 PR では一切編集しない。
- **理由**: 仕様書 `docs/spec/result-dashboard.md §10.4` および `docs/spec/pdf-report.md §11.4` の方針通り、`PdfDashboard` は `DashboardView` を import せず独立 JSX を維持する（PDF 専用最適化として A4 1 枚レイアウト、指標カード 3 並列、`html2canvas` 互換のインラインスタイル等の自由度確保のため）。受け入れ条件「`PdfDashboard.tsx` は本 PR で変更されない（`DashboardView` を import しない）」と整合。

### 4. `CalculatePageClient` / `useCountUp` / `mediaQueries` の不変保証
- **変更しない**:
  - `/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.tsx`
  - `/Users/YS/development/matatabi-calculator/src/hooks/useCountUp.ts`
  - `/Users/YS/development/matatabi-calculator/src/lib/mediaQueries.ts`
- **変更内容**: 本 PR では編集しない。
- **理由**: `ResultDashboard` の公開 API（`ResultDashboardProps`）は不変。`CalculatePageClient` 側の `next/dynamic({ ssr: false })` 経由の遅延ロード経路も変わらない。`useCountUp` / `mediaQueries` は呼び出し側がコンテナ→そのまま `DashboardView` 描画に流れるだけで内部実装に手を入れる必要はない。

## 設計上の考慮点

- **`reducedMotion` を `animated` に変換する境界**: `useMediaQuery` はコンテナ責務として残置し、`animated={!reducedMotion}` の boolean 化はコンテナで行う。これにより `DashboardView` 側は OS 設定の知識を持たず、props の `animated` のみを参照する pure component になる（仕様書 §10.2 / §11 R10 と整合、PDF で `animated={false}` 強制を別経路で容易に再利用可能な構造を将来確保）。
- **`isMobile` の props 注入**: `chartHeight`（`BAR_HEIGHT_MOBILE` / `BAR_HEIGHT_DESKTOP` 切替）は描画関心だが、`isMobile` 自体はコンテナで `useMediaQuery(MOBILE_QUERY)` から導出して props で渡す。Issue 本文の方針通りで、`DashboardView` を hook フリーに保つ最大の理由となる。
- **`chartData` の `useMemo` を `DashboardView` 側に移すことの妥当性**: `useMemo` は副作用ではなく描画派生値の最適化フックのため、Issue 本文の「副作用ゼロの pure component」基準に抵触しない（受け入れ条件は「`useState` / `useEffect` / `useRef` / カスタムフック」を禁じており、`useMemo` は明示除外）。`result.threeYearSavings` / `result.threeYearProfitCreation` という描画専用の派生値は描画層と凝集させる方がメンテ性が良い。
- **隠しマウント JSX の配置**: `<PdfDashboard ref={pdfDashboardRef} ... />` ブロックは `DashboardView` と兄弟関係で配置する。元の `<section>` 内ではなく Fragment 直下に配置する形に微変更となるが、`position: absolute; left: -9999px` で視覚位置はビューポート外固定、html2canvas は ref 経由で DOM ノード取得するため挙動変化なし。
- **トークン追従コメント**: 現行 L20-23 の `ACCENT_HEX` / `ACCENT_60` / `TOOLTIP_CURSOR_FILL` の `tailwind.config.ts` 連動コメントは `DashboardView.tsx` の JSDoc に転記する（描画関心と凝集）。
- **CalculatePageClient の dynamic import**: `ResultDashboard` を遅延ロードしている経路は不変。`DashboardView.tsx` は `ResultDashboard` の依存として同チャンクに含まれるため、初回 LCP への影響は中立（むしろ JSX 分離で Tree-shake 等の二次効果は無視できる）。
- **PR 本文に明記する事項**: 「PdfDashboard を別立て維持した理由（仕様書 §10.4 準拠）」を記載することが受け入れ条件にあるため、PR 説明欄に「`docs/spec/result-dashboard.md §10.4`：A4 1 枚最適化と html2canvas 互換のため `PdfDashboard` は `DashboardView` を import せず独立 JSX 維持」を明示する。

## 検証方法
1. 静的検証
   - `npm run lint` が exit 0
   - `npm run typecheck` が exit 0（`DashboardViewProps` の型整合・`ResultDashboard` の props 流し込みで `animated: boolean` / `isMobile: boolean` / `pdfError: string | null` の必須化が型レベルで担保されることを確認）
   - `npm run build` が exit 0
2. ブラウザ実機確認（リファクタ前後の挙動等価）
   - 結果ダッシュボードのカウンターアニメーションが標準動作する（`useCountUp` × 4 が `ResultDashboard` で実行され、補間値が `DashboardView` に伝搬してヒーロー / 補助カード × 2 / 3 年合計に反映）
   - 横棒グラフ（積み上げ Recharts）が `animated=true` 時に 800ms アニメーション
   - PDF ダウンロードボタン押下で隠しマウントされた `PdfDashboard` から PDF が生成される（`isGeneratingPdf` / `pdfError` の UI 反映、5 秒で自動消去）
   - 再診断ボタン（`onResetRequest` 指定時のみ表示）が機能する
   - モバイル幅（< 640px）で `chartHeight` が 100px、補助カードが縦スタックになる
   - `prefers-reduced-motion: reduce` 時にカウンターが即時最終値表示・グラフが `isAnimationActive={false}` で即時表示される（`animated={!reducedMotion}` 経路）
   - `headerSlot` で `WarningBanner` が表示される（`speedWarning` 条件下）
3. 構造検証
   - `src/components/calculate/DashboardView.tsx` 内に `useState` / `useEffect` / `useRef` / カスタムフック（`useCountUp` / `useMediaQuery`）の文字列が一切出現しないことを `grep -n "useState\|useEffect\|useRef\|useCountUp\|useMediaQuery" src/components/calculate/DashboardView.tsx` で確認（`useMemo` のみ許容）
   - `src/components/calculate/PdfDashboard.tsx` の git diff が空であることを確認
   - `ResultDashboard.tsx` 冒頭 JSDoc から「暫定構造」「別 Issue として申し送り」の文字列が消えていることを `grep -n "暫定構造\|別 Issue として申し送り" src/components/calculate/ResultDashboard.tsx` で確認（hit 0 件）
