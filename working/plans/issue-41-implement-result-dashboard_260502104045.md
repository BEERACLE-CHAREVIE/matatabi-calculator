# 診断結果ダッシュボード ResultDashboard 実装プラン

## Context
`/calculate` の `CalculatePageClient` は現状、`InputForm` の送信値を受け取って開発時のみ JSON ダンプを表示するだけで、ROI 診断結果の可視化が未実装である（`/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.tsx`）。`docs/spec/result-dashboard.md` で確定した「ヒーロー = 3 年間のトータルインパクト / 補助カード 2 枚 / 積み上げ横棒グラフ 1 本 / 警告バナー / PDF ダウンロードボタン」を備えたダッシュボードを実装し、`InputForm` の送信を `calculate()` に渡したうえで結果を表示する。`useCountUp` (#40) と `formatManYen / formatManYenCompact` (#38)、Recharts v2（`package.json` に `^2.15.4` 追加済み）はすでに揃っており、本 Issue は「組み立て」が中心となる。

GitHub Issue: #41

## 採用方針（重要な前提決定）

- **コンポーネント分離**: 仕様書 §10.2 の「描画層 (`DashboardView`) / 画面コンテナ (`ResultDashboard`) / PDF ラッパ (`PdfDashboard`)」分離は、本 Issue では **`ResultDashboard` 1 ファイルに `DashboardView` を内部実装として同居**させる軽量分離に留める。理由は (a) Issue #41 のスコープ要件が `ResultDashboard.tsx` 単体の新規作成であること、(b) `PdfDashboard` は Issue #43（PDF）側のスコープであり、本 Issue では `animated` 切り替え可能な props 設計だけ整えておけば PDF 側で再利用できる、(c) ファイル分割は将来の PDF 実装着手時に低コストで切り出せる。`DashboardView` 抽出は別 Issue で行う前提で TODO コメントを残す。
- **遅延ロード**: 仕様書 §5.3 / §11 R8 に従い、`ResultDashboard` は `next/dynamic` で `ssr: false` 指定の遅延ロード対象とする。読み込み箇所は `CalculatePageClient.tsx`。Recharts のバンドルが診断ページの初回 LCP に影響しないようにする。`ssr: false` は `recharts` の Responsive 系コンポーネントが `ResizeObserver` 等のブラウザ API に依存するため、SSR 段階でのレンダリングを意図的に避ける。
- **`"use client"`**: 仕様書 §11 R1 に従い、`ResultDashboard.tsx` の冒頭に `"use client"` を必ず付与する（`useCountUp` / `useState` / `matchMedia` を使用）。
- **再アニメーション制御**: 仕様書 §6.4 / §11 R7 の `key={hash(result)}` 戦略は、`CalculatePageClient` 側で `<ResultDashboard key={resultKey} ... />` を渡してリマウントを強制する形で実装する。`resultKey` は `JSON.stringify(result)` の単純結合で十分（ハッシュ衝突は意図的にゼロでよい）。
- **WarningBanner / PDF ダウンロードボタン**: 仕様書「スロット」要件は **`headerSlot` / `footerSlot` の 2 つの `ReactNode` props** で受け取る形に確定する。理由は (a) Issue #42（WarningBanner）と Issue #43（PDF）が未着手で具象 API が不確定、(b) `ResultDashboard` 内部で WarningBanner の有無を `result.speedWarning` から自動判定するロジックは Issue #42 側で固める（本 Issue ではあくまで「差し込める器」を作る）、(c) PDF ボタンも親（`CalculatePageClient`）が PDF レイヤを保持するため、ボタン要素自体は親で組み立てて `footerSlot` に流し込むほうが疎結合。 仕様書 §3.4 のレイアウトに沿って、`headerSlot` はヒーローの直上、`footerSlot` はグラフの直下に配置する。なお仕様書 §10.3 の `DashboardViewProps`（`showWarningBanner` / `warningMessage`）は将来の `DashboardView` 切り出し時に再設計する前提で、本 Issue では採用しない（YAGNI）。
- **Recharts のレンダリング戦略**: 仕様書 §4.1 の「積み上げ横棒 1 本」は Recharts の `<BarChart layout="vertical">` + `<Bar stackId="impact">` × 2 で実装。横幅追従は `<ResponsiveContainer width="100%" height={120}>`、モバイル時のみ `height={100}`（`useMediaQuery` 系の自前フックは追加せず、`useState` + `matchMedia` で完結）。
- **凡例とアイコン**: 仕様書 §4.3 の「アイコン + ラベル + 金額（万円）」凡例は Recharts 標準 `<Legend>` の `content` カスタム描画で対応し、`lucide-react` の `PiggyBank` / `Sparkles` を埋め込む。すでに `lucide-react` は依存に追加済み。
- **配色**: 仕様書 §4.2 の「accent 100% / accent 60%」は HEX `#9CAEB8` と RGBA `rgba(156,174,184,0.6)` を Recharts の `fill` props に直接渡す。CSS 変数を介さない方針（`docs/design-tokens.md §2`）に従い、`tailwind.config.ts` から数値を取り出さず、本ファイル内 `const ACCENT_HEX = "#9CAEB8"` で集約する。
- **カウントアップ → 表示**: 仕様書 §9.3 / §6.1 に従い、`useCountUp` の戻り値（円単位の補間値）をヒーローでは `formatManYenCompact`、補助カード／注記／グラフ tickFormatter／ツールチップでは `formatManYen` に通す。グラフ自体は最終値（`result.threeYearSavings` 等）を `data` に渡し、Recharts 側のアニメーション（`animationDuration={800}`）でカード側カウンターと一体感を出す（仕様書 §6.2）。
- **`prefers-reduced-motion`**: ヒーロー・補助カードは `useCountUp` 側で吸収済み（即時最終値）。Recharts 側は `isAnimationActive` props を本コンポーネント内の `matchMedia` 検出値で切り替える。`useCountUp` と同じ検出ロジックを重複させないよう、本コンポーネント内に小さな `useReducedMotion()` 内部フックを切り出す（モジュールスコープ・export なし）。
- **完全内製（止血 = 0）の表示**: 仕様書 §3.3 / §4.4 に従い、止血カードを `formatManYen(0) = "0万円"` 表示にしつつ「現状、理想形に近い運用のため削減余地は 0 万円」の注記に差し替え、グラフは Recharts の自然挙動（止血セグメント消失）に任せる（凡例は維持）。
- **桁爆発時表記**: 仕様書 §9.2 の `formatManYenCompact` 切替は実装済み。ヒーローでのみ使用。
- **テスト**: `package.json` に Vitest / Jest 等が未導入のため、本 Issue でもテスト追加はスコープ外。検証は `npm run typecheck` / `npm run lint` / `npm run build` と、`/calculate` 上の手動目視（375px / 768px / 1280px / `prefers-reduced-motion: reduce`）で担保する。

---

## 変更対象ファイル

### 1. ResultDashboard 本体の新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.tsx`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:

  #### 1-a. ファイル冒頭・ディレクティブ
  - 1 行目に `"use client";`（仕様書 §11 R1）。
  - JSDoc ヘッダで以下を明記（既存 `InputForm.tsx` / `useCountUp.ts` と同じスタイル）:
    - 仕様: `docs/spec/result-dashboard.md` 全体／`docs/design-tokens.md`
    - 設計: 描画層と画面コンテナを 1 ファイルに同居させる暫定構造、PDF 用ラッパ（`PdfDashboard`）切り出しは別 Issue で対応する旨
    - 依存: `recharts`（`BarChart` / `Bar` / `XAxis` / `YAxis` / `Tooltip` / `Legend` / `ResponsiveContainer`）、`lucide-react`（`PiggyBank` / `Sparkles`）、`@/hooks/useCountUp`、`@/lib/format`、`@/lib/calculation`、`@/lib/constants`、`@/components/ui/Card`、`@/lib/cn`

  #### 1-b. import
  ```ts
  import { useEffect, useState, type ReactNode } from "react";
  import {
    Bar,
    BarChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } from "recharts";
  import { PiggyBank, Sparkles } from "lucide-react";
  import { Card } from "@/components/ui/Card";
  import { cn } from "@/lib/cn";
  import { useCountUp } from "@/hooks/useCountUp";
  import { formatManYen, formatManYenCompact, formatPercent } from "@/lib/format";
  import { INSOURCING_LEVELS, type InsourcingLevel } from "@/lib/constants";
  import type { CalculationOutput } from "@/lib/calculation";
  ```

  #### 1-c. 定数（モジュールスコープ）
  - `ACCENT_HEX = "#9CAEB8"`（`tailwind.config.ts` の `accent` と同値、Recharts へ直接渡す）。
  - `ACCENT_60 = "rgba(156, 174, 184, 0.6)"`（仕様書 §4.2）。
  - `BAR_HEIGHT_DESKTOP = 120` / `BAR_HEIGHT_MOBILE = 100`（仕様書 §4.1 / §7.2）。
  - `RECHARTS_ANIM_MS = 800`（仕様書 §6.2）。
  - `MOBILE_QUERY = "(max-width: 639px)"`（Tailwind の `sm` ブレークポイント未満をモバイル扱い、仕様書 §7.1）。
  - `REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"`（`useCountUp` 内と同値）。
  - 凡例ラベル文字列定数（`SAVINGS_LABEL = "3 年間の止血"` / `PROFIT_LABEL = "3 年間の利益創出"`）。

  #### 1-d. 内部 `useReducedMotion` フック
  - モジュール内 private 関数として `function useReducedMotion(): boolean` を定義。
  - `useState(false)` + `useEffect` 内で `window.matchMedia(REDUCED_MOTION_QUERY)` を購読。SSR ガードあり（`typeof window === "undefined"`）。
  - 再利用範囲が本ファイルのみであるため `src/hooks/` には切り出さない（YAGNI）。将来 2 箇所目で必要になった時点で別 Issue で抽出。

  #### 1-e. 内部 `useIsMobile` フック
  - 同じく private 関数で `function useIsMobile(): boolean`。
  - `window.matchMedia(MOBILE_QUERY)` 購読で Recharts の `height` を切り替える。

  #### 1-f. Props 型
  ```ts
  export type ResultDashboardProps = {
    /** calculate() の戻り値（円単位の浮動小数）。 */
    result: CalculationOutput;
    /** 内製化注記（仕様書 §3.3）の表示制御に使用。 */
    insourcingLevel: InsourcingLevel;
    /**
     * 警告バナー差し込み口（仕様書 §3.4 / §8）。
     * 親が WarningBanner（Issue #42）を組み立てて渡す。
     * undefined の場合はバナー領域を描画しない。
     */
    headerSlot?: ReactNode;
    /**
     * フッター差し込み口（仕様書 §3.4 / Issue #43 連携）。
     * 親が PDF ダウンロード／再診断ボタンを組み立てて渡す。
     */
    footerSlot?: ReactNode;
    className?: string;
  };
  ```

  #### 1-g. 内部派生値の算出
  - `const reducedMotion = useReducedMotion();`
  - `const isMobile = useIsMobile();`
  - `const animatedSavings = useCountUp(result.threeYearSavings);`
  - `const animatedAnnualProfit = useCountUp(result.annualProfitCreation);`
  - `const animatedThreeYearProfit = useCountUp(result.threeYearProfitCreation);`
  - `const animatedTotal = useCountUp(result.totalThreeYearImpact);`
  - `const insourcingPercent = formatPercent(insourcingLevel);` （注記用）
  - `const isFullyInsourced = insourcingLevel === 1;`
  - `const isPartiallyInsourced = insourcingLevel > 0 && insourcingLevel < 1;`
  - `const chartHeight = isMobile ? BAR_HEIGHT_MOBILE : BAR_HEIGHT_DESKTOP;`
  - グラフ用 `chartData` は **1 行のみ**:
    ```ts
    const chartData = [
      {
        label: "3年合計",
        savings: result.threeYearSavings,
        profit: result.threeYearProfitCreation,
      },
    ] as const;
    ```

  #### 1-h. JSX 構造（仕様書 §3.4 のワイヤー準拠）
  - ルート: `<div className={cn("mx-auto w-full max-w-[1024px] space-y-4 sm:space-y-6", className)}>` で最大幅・縦余白（モバイル `space-y-4` / SP 以上 `space-y-6`、`docs/design-tokens.md §3` 準拠）。
  - **headerSlot 領域**:
    ```tsx
    {headerSlot ? <div>{headerSlot}</div> : null}
    ```
    - 仕様書 §8.1「`speedWarning = false` のときはバナーを出さず、ヒーローが最上段に繰り上がる」要件を、親が `headerSlot` を `undefined` で渡すことで実現する。
  - **ヒーローカード**: `<Card>` 内に中央寄せで以下を配置:
    - `<p>` 「3 年間のトータルインパクト」見出し（`text-sm font-medium text-ink/80`）。
    - `<p>` カウンター数値（`formatManYenCompact(animatedTotal)`、`text-[clamp(2.5rem,6vw,4rem)] font-bold text-ink`）。
    - `<p>` 「※ 試算上の最大値」フットノート（`text-xs text-ink/60`、仕様書 §3.1）。
    - `aria-live="polite"` を数値要素に付与（カウントアップ完了時のみ最終値が読み上げられる挙動を意識）。
  - **補助カード 2 枚**:
    - 親 `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 sm:max-w-[720px] sm:mx-auto">`（仕様書 §7.2 の `grid-cols-2` / `max-w-[720px]`）。
    - 1 枚目（止血カード）:
      - `<Card>` 内に `<PiggyBank>` アイコン + 見出し「3 年間の止血」、`formatManYen(animatedSavings)` を `text-3xl font-bold text-ink`。
      - 注記領域: `isFullyInsourced` のとき「現状、理想形に近い運用のため削減余地は 0 万円」（`text-xs text-ink/70`）、`isPartiallyInsourced` のとき「既に内製化されている **{insourcingPercent}** 相当分は削減余地から除外済み」（仕様書 §3.3）、`insourcingLevel === 0` のとき注記非表示。
    - 2 枚目（年間創出カード）:
      - `<Card>` 内に `<Sparkles>` アイコン + 見出し「年間の利益創出」、`formatManYen(animatedAnnualProfit)` を `text-3xl font-bold text-ink`。
      - 副次テキスト「× 3 年 = `formatManYen(animatedThreeYearProfit)`」を `text-xs text-ink/70`。
  - **積み上げ横棒グラフ**:
    - `<Card className="mx-auto w-full max-w-[960px]">` 内に `<ResponsiveContainer width="100%" height={chartHeight}>` を配置。
    - `<BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>`。
    - `<XAxis type="number" tickFormatter={(value) => formatManYen(value)} stroke={ACCENT_HEX} />`、`<YAxis type="category" dataKey="label" hide />`（カテゴリ名はカード見出しと重複するため非表示）。
    - `<Tooltip formatter={(value: number) => formatManYen(value)} cursor={{ fill: "rgba(156,174,184,0.08)" }} />`。
    - `<Legend content={renderLegend} verticalAlign="bottom" />` で自前凡例（`PiggyBank` / `Sparkles` + ラベル + `formatManYen` 値）。
    - `<Bar dataKey="savings" name={SAVINGS_LABEL} stackId="impact" fill={ACCENT_HEX} radius={[2, 0, 0, 2]} isAnimationActive={!reducedMotion} animationDuration={RECHARTS_ANIM_MS} />`。
    - `<Bar dataKey="profit" name={PROFIT_LABEL} stackId="impact" fill={ACCENT_60} radius={[0, 2, 2, 0]} isAnimationActive={!reducedMotion} animationDuration={RECHARTS_ANIM_MS} />`。
    - `radius` は `docs/design-tokens.md §4` の `rounded-sm` (2px) と整合。
  - **補足説明テキスト（条件出し分け）**:
    - 完全内製（`isFullyInsourced`）のとき、グラフ直下に小さく「3 年間の利益創出のみで `formatManYen(result.threeYearProfitCreation)` のインパクトが見込めます。」（仕様書 §3.3 を補強）。
    - `result.speedWarning === true` かつ `headerSlot` が未指定のとき（暫定挙動）、`text-xs text-ink/60` で「更新待ち期間が 3 ヶ月以上のため、機会損失が継続中の可能性があります。」を表示。WarningBanner（Issue #42）が完成すれば `headerSlot` で表示されるためこの fallback は段階的に廃止する旨をコメントで明記。
  - **footerSlot 領域**: `{footerSlot ? <div>{footerSlot}</div> : null}`。

  #### 1-i. アクセシビリティ
  - ルート要素に `aria-label="ROI 診断結果"` を設定し、ランドマーク化（`role="region"`）。
  - 各カードの数値要素に `aria-live="polite"` と `aria-atomic="true"` を付け、reduced-motion 時の最終値読み上げを保証。
  - グラフ周辺に `<figure>` + `<figcaption className="sr-only">3 年間の止血と 3 年間の利益創出を積み上げた横棒グラフ。合計が `formatManYen(result.totalThreeYearImpact)`。</figcaption>` を配置し、SVG のみではスクリーンリーダーで意味が伝わらない問題を補う。

- **理由**:
  - 受け入れ条件「仕様書の全指標が表示される」「積み上げ横棒グラフが Recharts で実装され、内製化前後の比較が視認できる」「数値カウントアップアニメーションが動作する（reduced-motion 時は即時表示）」「フォーマッタが正しく適用」「WarningBanner / PDF ボタンの接続点（slot or props）が用意されている」を一括して満たす。
  - `Card` / トークン（`text-ink` / `border-line` / `bg-canvas` / `accent` / `space-y-*`）のみを使うことで `docs/design-tokens.md` を遵守し、既存 `InputForm` の見た目と統一感を保つ。
  - `transform`（スケール変化）や `opacity` のみで GPU 加速を意図し、レイアウト変更を伴うアニメーションは数値カウンターと Recharts 側の `width` 更新（SVG 描画）に閉じ込める。

---

### 2. CalculatePageClient での `calculate()` 接続と `ResultDashboard` 描画
- **変更**: `/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.tsx`
- **変更箇所**: ファイル全体（既存 17 行を全面書き換え）
- **変更内容**:
  - `useState<CalculationInput | null>` を維持しつつ、追加で `useState<CalculationOutput | null>` を持つか、`useMemo` で `submitted` から `calculate()` を実行。商談用途では入力直後に診断結果を即時表示するため、`useMemo` パターンを採用:
    ```tsx
    "use client";
    import dynamic from "next/dynamic";
    import { useMemo, useState } from "react";
    import { InputForm } from "@/components/calculate/InputForm";
    import { Button } from "@/components/ui/Button";
    import { calculate, type CalculationInput } from "@/lib/calculation";
    import type { ResultDashboardProps } from "@/components/calculate/ResultDashboard";

    const ResultDashboard = dynamic<ResultDashboardProps>(
      () =>
        import("@/components/calculate/ResultDashboard").then(
          (mod) => mod.ResultDashboard,
        ),
      { ssr: false },
    );

    export function CalculatePageClient() {
      const [submitted, setSubmitted] = useState<CalculationInput | null>(null);
      const result = useMemo(
        () => (submitted ? calculate(submitted) : null),
        [submitted],
      );
      const resultKey = submitted ? JSON.stringify(submitted) : "";
      return (
        <div className="space-y-8 sm:space-y-12">
          <InputForm onSubmit={setSubmitted} />
          {submitted && result ? (
            <ResultDashboard
              key={resultKey}
              result={result}
              insourcingLevel={submitted.insourcingLevel}
              footerSlot={
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button
                    variant="primary"
                    size="lg"
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="PDF ダウンロード機能は Issue #43 で実装予定"
                  >
                    PDF をダウンロード
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    type="button"
                    onClick={() => setSubmitted(null)}
                  >
                    再診断する
                  </Button>
                </div>
              }
            />
          ) : null}
        </div>
      );
    }
    ```
  - 既存の開発時 JSON ダンプ (`process.env.NODE_ENV === "development"` ブロック) は削除する（`ResultDashboard` で結果が可視化されるため不要）。
  - `next/dynamic` の `ssr: false` で Recharts の初回バンドルをクライアント側にオフロード。型安全のため `ResultDashboardProps` を `dynamic<...>` のジェネリクスに渡す。
  - `key={resultKey}` で「再診断するボタン → 再送信」時にカウンターを 0 から再アニメート（仕様書 §6.4 / §11 R7）。
  - `headerSlot` は本 Issue では渡さない（WarningBanner Issue #42 完了後に親側で組み立てて渡す。`ResultDashboard` 側の補足説明テキスト fallback で `speedWarning` を最低限拾う）。
  - PDF ボタンは Issue #43 で実装するため `disabled` + `aria-disabled` + `title` で接続点を明示。`onClick` ハンドラの実装は Issue #43 のスコープ。
- **理由**:
  - 受け入れ条件「`/calculate` ページから InputForm の送信結果を ResultDashboard へ渡す」「PDF ダウンロードボタンの接続点が用意されている」を満たす。
  - 仕様書 §5.3 の `next/dynamic` 遅延ロード方針を実装に反映。
  - `useMemo` で `calculate()` 結果を派生させることで、入力 → 結果の単方向データフローを保ち、状態の二重保持を回避。

---

### 3. ResultDashboard の barrel export 追加（任意）
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/` に `index.ts` は存在しない（`InputForm.tsx` 単体）。本 Issue では新規 barrel ファイルは作らず、`@/components/calculate/ResultDashboard` を直接 import する方針を維持する。
- **理由**:
  - 既存の `InputForm` も `@/components/calculate/InputForm` 直接 import で運用されており（`CalculatePageClient.tsx`）、整合性を取るため barrel 追加は YAGNI。

---

## 設計上の考慮点

- **PDF 用 `PdfDashboard` の切り出しを後送りする判断**: 仕様書 §10 は `DashboardView` / `ResultDashboard` / `PdfDashboard` の 3 層分離を推奨しているが、`PdfDashboard` は隠し DOM・A4 比率固定・`html2canvas` 連携などが本質で、Issue #43（PDF 実装）に大きく依存する。本 Issue で先回りして 3 層に分けると Issue #43 着手時に props 設計のやり直しが発生する可能性が高いため、「`ResultDashboard` 単一実装 + `animated` 等の差し替えは将来追加」とする。Issue #43 着手時に `DashboardView` を抽出する旨の TODO コメントを `ResultDashboard.tsx` 冒頭 JSDoc に明記する。
- **WarningBanner との結合点**: 現状は `headerSlot` の汎用 `ReactNode` で受ける設計だが、Issue #42 完了時に `<WarningBanner result={result} message={CRITICAL_OPPORTUNITY_LOSS_MESSAGE} />` を親から流し込む形になる。`ResultDashboard` 内で WarningBanner を直接 `import` しない（疎結合）。Issue #42 のレビュー時に「`headerSlot` のままで十分か / `<ResultDashboard warning={result.speedWarning ? ... : null} />` のような専用 props にすべきか」を再検討する余地を残す。
- **桁爆発時のヒーロー font-size**: 仕様書 §7.3 / §8.3 は「警告バナーが 96px を超えたら `font-size` を `clamp` 下限に切り替える」吸収方針を要求しているが、本 Issue ではバナー高さの動的計測ロジックは導入せず（`headerSlot` の高さは親の責務）、`clamp(2.5rem, 6vw, 4rem)` のレスポンシブ追従に任せる。Issue #42 完了後にバナー高さの実測値を踏まえてフォローアップを検討。
- **`useCountUp` の同時実行 (4 個)**: 4 つのカウンターを同時に走らせるため、`requestAnimationFrame` のコールバックが 4 個並行で走る。各々が `setState` を呼ぶため最大 60fps × 4 = 240 setState/sec となるが、React 18 の自動バッチングで同一タイミングのものはまとめられる想定。実機で過剰再レンダーが観測された場合は、ヒーロー 1 つ + カード 2 つに統合（年間／3 年は静的表示にする等）するリファクタを別 Issue で検討。
- **アクセシビリティ**: 仕様書には明記がないが、SVG グラフはスクリーンリーダーから内容が読み取れないため、`<figure>` + `<figcaption className="sr-only">` で「合計 N 万円、内訳は止血 X 万円・3 年創出 Y 万円」を補完する。これは `lucide-react` アイコンに `aria-hidden="true"` を付けるのとセットで、視覚情報と読み上げ情報の整合を取る。
- **GPU 加速の徹底**: ヒーローのカウンターは数値の文字列が変化するだけで `transform` / `opacity` には触れない（フォントサイズは固定）。Recharts のバーは内部的に SVG `width` 属性を補間するため、`transform` ベースではないが、要素数が 2 セグメントのみで GPU 負荷は無視できる。`prefers-reduced-motion` 時は両方ともアニメーションを完全停止するため過剰な再描画は発生しない。
- **テスト未導入の補完策**: 受け入れ条件「375px / 768px / 1280px の各幅で表示崩れがない」は手動目視。Chrome DevTools の Device Mode で 3 サイズ + `prefers-reduced-motion: reduce` のエミュレーションで確認する。

---

## 検証方法
1. `npm run typecheck` を実行し、`ResultDashboard.tsx` / `CalculatePageClient.tsx` の型エラーがないこと（特に `CalculationOutput` / `InsourcingLevel` / Recharts の `Bar` / `Tooltip` の `formatter` 引数型）を確認。
2. `npm run lint` を実行し、ESLint 警告ゼロを確認（未使用 import、`react/jsx-key`、`react-hooks/exhaustive-deps` など）。
3. `npm run build` で Next.js の本番ビルドが通ること、`next/dynamic` で `ResultDashboard` が独立チャンクに分離されることをビルドログで確認（`recharts` がメインチャンクから外れる）。
4. `npm run dev` で `/calculate` を開き、`InputForm` に基本 5 項目を入力 → 「診断する」押下後にダッシュボードが表示されることを確認。
5. ヒーロー数値・補助カード数値が 0 から目標値へ約 1.2 秒でカウントアップし、Recharts のバーが約 0.8 秒でスライド描画されることを目視確認。
6. ChromeDevTools Device Mode で iPhone SE (375px) / iPad (768px) / Desktop (1280px) の 3 解像度を切替え、レイアウト崩れがないことと、補助カードがスマホ縦で縦スタック・タブレット以上で 2 カード横並びになることを確認。
7. ChromeDevTools Rendering タブで `prefers-reduced-motion: reduce` をエミュレートし、カウンターが即時最終値表示になり、Recharts のバーアニメーションも無効化されることを確認。
8. 内製化状況を 5 段階すべて切り替えて再診断し、(a) 完全ベンダー依存 → 注記非表示、(b) 0.25 / 0.5 / 0.75 → 「既に内製化されている ◯% 相当分は…」注記表示、(c) 完全内製 → 「現状、理想形に近い運用のため削減余地は 0 万円」表示 + グラフが 3 年創出のみの単色バーになる（凡例は構造維持）ことを確認。
9. 更新待ち期間「3〜6ヶ月」「半年〜1年」「1年以上」を選んで `result.speedWarning === true` のとき、補足説明テキストの fallback（暫定）が表示されることを確認。
10. 「再診断する」ボタン押下 → InputForm に戻る → 異なる値で再送信時に `key={resultKey}` の効果でカウンターが 0 から再アニメートすることを確認。
11. PDF ダウンロードボタンが `disabled` + `aria-disabled` で表示され、`title` ツールチップが「Issue #43 で実装予定」になっていることを確認（接続点だけ用意できていること）。
12. 大入力ケース（月額 10,000 万円 / 改修 5,000 万円 / 人数 1,000 人 / 内製化 0）でヒーロー数値が `formatManYenCompact` の「◯億◯万円」表記に切り替わることを確認。
