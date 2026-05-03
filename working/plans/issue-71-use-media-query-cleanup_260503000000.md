# useMediaQuery 後片付け実装計画（メディアクエリ定数共通化 / generatedAt フォールバック堅牢化）

## Context
PR #70（Issue #66）で `useSyncExternalStore` ベースの `useMediaQuery` 共通フックが導入され、`react-hooks/set-state-in-effect` / `react-hooks/refs` の `eslint-disable-next-line` 計 4 件が完全削除された。レビュー時に検出された軽微な負債を本 Issue で返済する。具体的には以下 2 点：

1. `MOBILE_QUERY` / `REDUCED_MOTION_QUERY` の同一文字列が `src/components/calculate/ResultDashboard.tsx`（65-66 行）と `src/hooks/useCountUp.ts`（23 行）で重複定義されている問題を、`src/lib/mediaQueries.ts` 新規追加で集約する。
2. `<PdfDashboard generatedAt={generatedAt ?? new Date()} />` の `?? new Date()` フォールバックは React 19 の自動バッチに依存しており、`isGeneratingPdf && !generatedAt` の中間状態到達時に PDF 表紙の刻印日時とファイル名の `now` がズレる潜在リスクがある。`isGeneratingPdf && generatedAt` の AND 条件描画に変更し、フォールバック自体を消滅させる。

GitHub Issue: #71

## 変更対象ファイル

### 1. メディアクエリ定数を集約する新規 lib ファイルの追加
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/mediaQueries.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - 既存 lib ファイル（`pdfConstants.ts` / `constants.ts`）と整合する JSDoc ヘッダーコメントを冒頭に配置する。具体的には以下のメタ情報を 1 ブロックにまとめる：
    - 仕様: `docs/spec/result-dashboard.md §6.3`（prefers-reduced-motion 尊重）/ `§7`（mobile breakpoint）
    - 設計: `useMediaQuery`（`useSyncExternalStore` ベース）に渡すクエリ文字列の単一の真実の源。`ResultDashboard` と `useCountUp` で同一文字列を別々に保持していた重複を解消する。`tailwind.config.ts` の `sm` ブレークポイント（640px）と整合する `(max-width: 639px)` を使用。
  - 以下 2 定数を `export const` で公開する：
    ```ts
    /** モバイル判定（sm ブレークポイント未満）に使うメディアクエリ文字列。 */
    export const MOBILE_QUERY = "(max-width: 639px)";

    /** prefers-reduced-motion: reduce のメディアクエリ文字列。 */
    export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
    ```
- **理由**: 受け入れ条件の 1 番目「`src/lib/mediaQueries.ts` が作成され、`MOBILE_QUERY` / `REDUCED_MOTION_QUERY` を export している」を満たすため。`src/lib/` 直下の他ファイル（`pdfConstants.ts` / `constants.ts`）と同じ「単一の真実の源」設計指針に揃える。

### 2. `ResultDashboard.tsx` のローカル定義削除と import 切り替え、隠しマウント JSX の条件式変更
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.tsx`
- **変更箇所**:
  - 65-66 行（`MOBILE_QUERY` / `REDUCED_MOTION_QUERY` のローカル定義）
  - 51 行付近（既存 import 群）
  - 370-388 行（`{isGeneratingPdf ? ... : null}` の隠しマウント JSX）
- **変更内容**:
  - 65-66 行のローカル定義 `const MOBILE_QUERY = ...` / `const REDUCED_MOTION_QUERY = ...` を削除する。`ACCENT_HEX` などの他のモジュールスコープ定数は残す。
  - 51 行の `import { useMediaQuery } from "@/hooks/useMediaQuery";` の直後（import 並び順を既存の `@/hooks/...` → `@/lib/...` の順序に揃える観点で 52 行目の `format` import の前後）に以下を追加：
    ```ts
    import { MOBILE_QUERY, REDUCED_MOTION_QUERY } from "@/lib/mediaQueries";
    ```
  - 370-388 行の隠しマウント JSX を以下に書き換える：
    ```tsx
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
    ```
    - 条件を `isGeneratingPdf` 単独から `isGeneratingPdf && generatedAt` に変更し、`generatedAt ?? new Date()` フォールバックを削除する。`generatedAt` が `null` の中間状態では一切描画しない方式に統一。
- **理由**:
  - 受け入れ条件 2「ローカル定義削除と `@/lib/mediaQueries` import への切り替え」を達成。
  - 受け入れ条件 3「`isGeneratingPdf && generatedAt ? ... : null` 形式に書き換え、`?? new Date()` フォールバック削除」を達成。
  - `handleDownloadPdf`（121-154 行）内では `setGeneratedAt(now)` → `setIsGeneratingPdf(true)` の順で連続呼び出しされ、React 19 の自動バッチで 1 レンダーに統合されるため、UI 上の到達不能な中間状態だけが排除される実質等価な変更。一方で `finally` で `setIsGeneratingPdf(false)` → `setGeneratedAt(null)` を呼ぶ際に、エラー経路含めて `generatedAt` が `null` のままユーザーが再クリックした場合にも一貫性が保証される。

### 3. `useCountUp.ts` のローカル定義削除と import 切り替え
- **変更**: `/Users/YS/development/matatabi-calculator/src/hooks/useCountUp.ts`
- **変更箇所**:
  - 22-23 行（JSDoc コメント `/** prefers-reduced-motion: reduce のメディアクエリ文字列。 */` とローカル定義 `const REDUCED_MOTION_QUERY = ...`）
  - 13-14 行（既存 import）
- **変更内容**:
  - 22-23 行のコメントと `const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";` を削除する。
  - 14 行の `import { useMediaQuery } from "./useMediaQuery";` の直後に以下を追加：
    ```ts
    import { REDUCED_MOTION_QUERY } from "@/lib/mediaQueries";
    ```
    - `useCountUp` は `MOBILE_QUERY` を使わないため `REDUCED_MOTION_QUERY` のみを import する。
  - 61 行 `useMediaQuery(REDUCED_MOTION_QUERY)` 自体は変更不要（参照名は同一）。
- **理由**: 受け入れ条件 2「ローカル定義削除と `@/lib/mediaQueries` import への切り替え」を達成。`useMediaQuery` だけ相対パス、`mediaQueries` は `@/lib/...` の絶対 alias と異種混在になるが、`hooks/index.ts` から再エクスポートされている `useMediaQuery` を相対 import している現状を尊重し、最小差分とする。

## 設計上の考慮点

### 等価性とランタイム挙動
- 変更 1（定数集約）: 文字列リテラルが完全一致するため、ランタイム挙動は完全に等価。`useMediaQuery` のキー（`useCallback` の `[query]` 依存）も同値になり、再購読は発生しない。
- 変更 2（`generatedAt` 条件描画）: `handleDownloadPdf` 内で `setGeneratedAt(now)` と `setIsGeneratingPdf(true)` は同一同期処理ブロックで連続呼び出しされ、React 19 の自動バッチで 1 レンダーに統合されるため、`isGeneratingPdf === true && generatedAt === null` の中間状態は通常到達しない。Issue 本文どおり「自動バッチで実質到達不可」だが、防御的に AND 条件にしておくことで、将来の React アップグレードや Suspense / Concurrent 周りの非互換が入ったときにも PDF 表紙とファイル名のタイムスタンプ齟齬を防げる。

### import 並び順
- `ResultDashboard.tsx` の既存 import 群は外部ライブラリ → `@/components/...` → `@/hooks/...` → `@/lib/...` → 同階層相対の順で並んでいる。新規追加 `@/lib/mediaQueries` は 53 行 `import type { InsourcingLevel } from "@/lib/constants";` の直前（`@/lib/...` 群の冒頭）に挿入するのが既存パターンと整合する。ただし既存配置（`@/lib/cn` が `@/components/...` 直後にあり厳密にアルファベット順ではない）を踏まえ、最終位置は実装時に既存秩序に最も馴染む位置を選ぶ。

### コメント言語と JSDoc
- 既存 lib ファイル（`pdfConstants.ts` / `constants.ts` / `cn.ts`）はすべて日本語 JSDoc を冒頭ブロックで提供しており、各 export にも 1 行 JSDoc が付与されている。新規 `mediaQueries.ts` も同様に「ファイルレベル JSDoc + 各定数 1 行 JSDoc」を日本語で提供する。

### 影響範囲の限定
- 既存の `useMediaQuery(MOBILE_QUERY)` / `useMediaQuery(REDUCED_MOTION_QUERY)` 呼び出しの第 1 引数識別子名は不変。`useMediaQuery` フック側の変更は不要。
- 全文検索の結果、`MOBILE_QUERY` / `REDUCED_MOTION_QUERY` の他箇所での重複定義は存在しない（`globals.css` 内の `@media (prefers-reduced-motion: reduce)` は CSS 側の独立記述で別管理）。

## 検証方法
1. `npm run lint` を実行し exit 0 を確認（受け入れ条件 4）。
2. `npm run typecheck` を実行し exit 0 を確認（受け入れ条件 4）。`@/lib/mediaQueries` の path alias 解決と未使用 import がないことを確認。
3. `npm run build` を実行し exit 0 を確認（受け入れ条件 4）。
4. ブラウザで結果ダッシュボードを表示し、以下を手動検証（受け入れ条件 5）：
   - PDF ダウンロードボタンを押下 → PDF が生成される。
   - 生成された PDF を開き、表紙の生成日時とダウンロードファイル名のタイムスタンプ部分が一致する。
   - 連続クリックでもエラーが起きず、ボタンの `disabled` / `aria-busy` の挙動が従来通り。
5. `prefers-reduced-motion: reduce` を OS 設定で有効化し、カウントアップアニメーションが即時 target 表示になることを確認（`useCountUp` 経路の等価性確認）。
6. ウィンドウ幅を 639px 以下に縮めてグラフ高さが `BAR_HEIGHT_MOBILE` (100px) に切り替わることを確認（`MOBILE_QUERY` 経路の等価性確認）。
