# useSyncExternalStore リファクタによる react-hooks/set-state-in-effect・refs 抑制負債の返済

## Context
PR #65（Next.js 16 メジャー更新）で React 19 / Next.js 16 由来の新 ESLint ルール `react-hooks/set-state-in-effect` および `react-hooks/refs` が既存コードでエラーを出した。移行スコープを最小化するため `eslint-disable-next-line` での局所抑制（合計 4 箇所）で対応したが、本質的には `useSyncExternalStore` への移行が React 19 公式パターンであり、技術的負債として返済する必要がある。本 Issue では (1) matchMedia 同期パターン 3 箇所を `useMediaQuery` 共通フックに統合、(2) `generatedAtRef` を `useState` 化することで、4 件の `eslint-disable-next-line` を全て削除する。

GitHub Issue: #66

## 変更対象ファイル

### 1. `useMediaQuery` 共通フックの新規追加
- **新規**: `/Users/YS/development/matatabi-calculator/src/hooks/useMediaQuery.ts`
- **変更箇所**: 新規ファイル作成（全体）
- **変更内容**:
  - `useSyncExternalStore` ベースで `useMediaQuery(query: string): boolean` を実装し、SSR フォールバックは `false` を返す。
  - `subscribe` ファクトリ関数は `useMemo` でクエリごとに安定参照を生成（`useSyncExternalStore` は subscribe 関数が変わるたびに再購読するため、`useCallback` で `query` 依存にメモ化する必要がある）。
  - `getSnapshot` はクライアント時に `window.matchMedia(query).matches` を返し、`getServerSnapshot` は `false` 固定。
  - 既存ファイル（`useCountUp.ts`）の JSDoc 形式と整合させ、仕様書（`docs/spec/result-dashboard.md §6.3`）への参照コメントを冒頭に記載。
  - 具体的な実装スニペット:

    ```ts
    "use client";

    /**
     * メディアクエリの match 状態を返すフック（`useSyncExternalStore` ベース）。
     *
     * - 仕様: docs/spec/result-dashboard.md §6.3（prefers-reduced-motion 尊重）/
     *         §7（レスポンシブ・mobile breakpoint）
     * - 設計: React 19 公式の外部ストア購読 API `useSyncExternalStore` を用い、
     *         SSR 時は `getServerSnapshot` で `false` を返してハイドレーション後に
     *         `window.matchMedia` の実値で同期する。
     *         `subscribe` は query をクロージャに閉じ込める必要があり、
     *         参照安定化のため `useCallback` で `[query]` 依存メモ化する。
     * - 依存: react（useSyncExternalStore / useCallback）。
     */

    import { useCallback, useSyncExternalStore } from "react";

    function getServerSnapshot(): boolean {
      return false;
    }

    export function useMediaQuery(query: string): boolean {
      const subscribe = useCallback(
        (callback: () => void) => {
          if (typeof window === "undefined" || !window.matchMedia) {
            return () => {};
          }
          const mql = window.matchMedia(query);
          mql.addEventListener("change", callback);
          return () => mql.removeEventListener("change", callback);
        },
        [query],
      );

      const getSnapshot = useCallback((): boolean => {
        if (typeof window === "undefined" || !window.matchMedia) {
          return false;
        }
        return window.matchMedia(query).matches;
      }, [query]);

      return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    }
    ```
- **理由**: 受け入れ条件「`useMediaQuery` フックを `src/hooks/useMediaQuery.ts` として共通化（重複コード削減）」を満たす。React 19 公式の `useSyncExternalStore` は SSR ハイドレーション後の外部ストア購読を `useEffect` 内 `setState` 無しで実現するため、`react-hooks/set-state-in-effect` ルールに違反しない。

### 2. `src/hooks/index.ts` のエクスポート追加
- **変更**: `/Users/YS/development/matatabi-calculator/src/hooks/index.ts`
- **変更箇所**: 末尾に `useMediaQuery` の re-export を追加（現状 1〜2 行目で `useCountUp` のみ export している）。
- **変更内容**: 以下を追記（`useCountUp` のスタイルと統一）。

  ```ts
  export { useMediaQuery } from "./useMediaQuery";
  ```
- **理由**: 既存 `useCountUp` と同じ barrel export 慣習に揃え、`@/hooks` からも `@/hooks/useMediaQuery` からも import 可能にする（ResultDashboard / useCountUp 内では現状直接パスで import しているため、必須ではないが慣習維持のため追加）。

### 3. `ResultDashboard.tsx` の `useReducedMotion` / `useIsMobile` を `useMediaQuery` に置換
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.tsx`
- **変更箇所**:
  - L29-36: import 文の修正（`useEffect` を残しつつ、新規に `useMediaQuery` を追加）。
  - L65-66: `MOBILE_QUERY` / `REDUCED_MOTION_QUERY` 定数は維持（呼び出し側の引数として再利用）。
  - L69-97: ローカル定義の `useReducedMotion` / `useIsMobile` を **削除**（合計 29 行）。これにより `eslint-disable-next-line react-hooks/set-state-in-effect`（L75 / L90）も同時に削除される。
  - L132-133: 呼び出し箇所を以下に置換。

    ```ts
    const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
    const isMobile = useMediaQuery(MOBILE_QUERY);
    ```
- **変更内容**:
  - import に `useMediaQuery` を追加（パス: `@/hooks/useMediaQuery`、もしくは barrel `@/hooks` 経由）。`useEffect` import は L144（pdfError 自動消去）と handleDownloadPdf 内では使用していないため、L82（reducedMotion 用 useEffect）/ L97（isMobile 用 useEffect）の削除後も `pdfError` の effect で残す（L144-148 で使用中）ので残置。
  - `useReducedMotion` / `useIsMobile` 関数定義を削除し、関連の eslint-disable コメントも削除。
- **理由**: 受け入れ条件「`eslint-disable-next-line react-hooks/set-state-in-effect` が `ResultDashboard.tsx` から 0 件になる」を満たす。`useMediaQuery` 共通化により重複ロジック（matchMedia 購読・SSR ガード・初期値同期）が解消される。

### 4. `useCountUp.ts` の `reducedMotion` 検出を `useMediaQuery` に置換
- **変更**: `/Users/YS/development/matatabi-calculator/src/hooks/useCountUp.ts`
- **変更箇所**:
  - L13: `import { useEffect, useRef, useState } from "react";` に `useMediaQuery` import 追加（同じディレクトリ内なので `import { useMediaQuery } from "./useMediaQuery";`）。
  - L21-22: `REDUCED_MOTION_QUERY` 定数は **維持**（`useMediaQuery` への引数として再利用）。
  - L60: `const [reducedMotion, setReducedMotion] = useState<boolean>(false);` を削除し、代わりに `const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);` に置換。
  - L67-80: `setReducedMotion` を扱う `useEffect`（matchMedia 購読部分、合計 14 行）を **削除**。これにより L71 の `eslint-disable-next-line react-hooks/set-state-in-effect` も同時に削除される。
  - L82-152 の rAF アニメーション本体の `useEffect` は無変更で、deps に `reducedMotion` が含まれている点もそのまま（`useMediaQuery` の戻り値が変化したら再評価されるため挙動互換）。
- **変更内容**: 上記の通り、`reducedMotion` を `useState` + `useEffect` の手動同期から `useMediaQuery` 経由に置換。
- **理由**: 受け入れ条件「`eslint-disable-next-line react-hooks/set-state-in-effect` が `useCountUp.ts` から 0 件になる」を満たす。仕様書 `docs/spec/result-dashboard.md §6.3` の「`prefers-reduced-motion: reduce` のときは即時最終値表示」要件は、`useMediaQuery` の値が真の場合に L102-112 の「即時 target を valueRef にセットして rAF を起動しない」ロジックにそのまま流れるため、挙動に変更なし。

### 5. `ResultDashboard.tsx` の `generatedAtRef` を `useState` 化
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.tsx`
- **変更箇所**:
  - L138: `const generatedAtRef = useRef<Date | null>(null);` を削除。
  - L135-141 ブロック直後: `const [generatedAt, setGeneratedAt] = useState<Date | null>(null);` を追加。
  - L150-183（`handleDownloadPdf` 全体）: 以下の変更を加える。
    - L154-156: `const generatedAt = new Date(); generatedAtRef.current = generatedAt; setIsGeneratingPdf(true);` を `const now = new Date(); setGeneratedAt(now); setIsGeneratingPdf(true);` に置換。`buildPdfFilename(generatedAt)`（L170）→ `buildPdfFilename(now)` に変更（state は非同期反映でこの場では参照できないためローカル変数を使用）。
    - L178-181: `finally` ブロックで `setIsGeneratingPdf(false); generatedAtRef.current = null; isGeneratingPdfRef.current = false;` を `setIsGeneratingPdf(false); setGeneratedAt(null); isGeneratingPdfRef.current = false;` に置換。
  - L399-419 の隠しマウント JSX: `generatedAt={generatedAtRef.current ?? new Date()}` を `generatedAt={generatedAt ?? new Date()}` に置換し、`// eslint-disable-next-line react-hooks/refs` コメントも削除。
- **変更内容**:
  - `generatedAtRef`（ref）を撤廃し、`useState<Date | null>` で `generatedAt` を保持。
  - PDF 生成開始時 `setGeneratedAt(now)` → `isGeneratingPdf=true` の順で state 更新（React 19 の自動バッチで同一レンダーに反映され、`PdfDashboard` の初回マウント時に `generatedAt` も解決済みになる）。
  - PDF 生成完了/失敗時の `finally` で `setGeneratedAt(null)` をセットしてアンマウントと同期。
  - フォールバック `?? new Date()` は state が null（理論上ありえないが TypeScript の null 安全のため）に備えて維持。
- **理由**: 受け入れ条件「`eslint-disable-next-line react-hooks/refs` が `ResultDashboard.tsx` から 0 件になる」を満たす。React 19 の `react-hooks/refs` ルールはレンダー中の ref 読み出しを禁じる（`PdfDashboard` がレンダーされる JSX 内で `generatedAtRef.current` を読むのが該当）が、state にすればレンダー駆動データとして正規化される。`isGeneratingPdf` と `generatedAt` のセットを同一同期ブロックで実行することで、`<PdfDashboard />` の初回レンダー時に `generatedAt` が確実に最新値で渡る。

## 設計上の考慮点

- **`useSyncExternalStore` の `subscribe` 安定参照**: React は subscribe 関数の参照が変わるたびに再購読する。`query` 引数が変わらない限り subscribe を安定させるため `useCallback(..., [query])` でメモ化する。`useReducedMotion` / `useIsMobile` のように呼び出し側で query 文字列を定数化していれば実質再購読は発生しない。
- **`getSnapshot` の `useCallback` も同様に `[query]` 依存**: `window.matchMedia(query).matches` を毎レンダー評価するが、`useSyncExternalStore` 内部で前回スナップショットと比較して同値なら再レンダーしない（`Object.is` 比較）ため、boolean 値の安定動作は問題なし。
- **`useMediaQuery` のテスタビリティ**: 現状 `useCountUp` にもテストファイルが存在しない（`src/hooks/__tests__` ディレクトリなし）ため、本リファクタでもテスト追加はスコープ外。実機確認で動作保証する受け入れ条件と整合。
- **`generatedAt` の state 化に伴うレンダーフロー**: `setGeneratedAt(now)` と `setIsGeneratingPdf(true)` を同一イベントハンドラ内で連続呼び出しすると React 19 の自動バッチで 1 レンダーに統合される。これにより `<PdfDashboard />` の初回マウント時に `generatedAt={now}` が解決済みで、`generatePdf({ element: ref.current })` 呼び出し時の DOM スナップショットには JST 時刻が刻印された状態が乗る。
- **`generatedAt` のフォールバック `?? new Date()` 維持**: `generatedAt` state が `null` の場合は `<PdfDashboard />` の `isGeneratingPdf` 条件分岐で描画されないため、実質到達しないが TypeScript の null 安全のため残す（呼び出し側の安全網）。
- **`PdfDashboard` 側の `generatedAt: Date` props 型は無変更**: 仕様書 `pdf-report.md §11.1` の `PdfDashboardProps` 契約を破らない。
- **既存 `useEffect` import の維持**: ResultDashboard の `pdfError` 自動消去 effect（L144-148）でまだ `useEffect` を使うため、import 文の `useEffect` は残置する。useCountUp も rAF アニメーション本体で `useEffect` を残すので import 削除不要。
- **`MOBILE_QUERY` / `REDUCED_MOTION_QUERY` 定数の重複**: ResultDashboard と useCountUp の両方で `REDUCED_MOTION_QUERY` を定義しているが、本 Issue ではスコープ外として現状維持（共通化するなら別 Issue）。

## 検証方法

1. **ESLint**: `npm run lint` を実行し、`react-hooks/set-state-in-effect` および `react-hooks/refs` の警告がプロジェクト全体で 0 件であることを確認（受け入れ条件 1, 2, 3）。
2. **型チェック**: `npm run typecheck` を実行し exit 0（受け入れ条件 3）。
3. **ビルド**: `npm run build` を実行し exit 0（受け入れ条件 3）。
4. **`grep -rn "eslint-disable-next-line react-hooks" src/`** で 0 件確認。
5. **reduced-motion 実機確認**: macOS の「アクセシビリティ → 視差効果を減らす」を ON、または DevTools の「Rendering → Emulate CSS media feature prefers-reduced-motion: reduce」を有効化し、`/calculate` で診断実行 → ResultDashboard のカウンターが即時最終値表示、Recharts のバーアニメも無効になることを確認（受け入れ条件 5、仕様書 `result-dashboard.md §6.3`）。
6. **mobile breakpoint 実機確認**: DevTools のレスポンシブモードで幅 < 640px に設定し `/calculate` を表示、`chartHeight` が `BAR_HEIGHT_MOBILE`（100px）になりレスポンシブレイアウトが従来通り切り替わることを確認（受け入れ条件 6、仕様書 `result-dashboard.md §7`）。
7. **PDF 生成実機確認**: `/calculate` で診断 → 「PDF をダウンロード」ボタン押下 → PDF がダウンロードされ、表紙に「生成日時 YYYY/MM/DD HH:MM」が JST で正しく刻印されていること、ファイル名が `matatabi-roi-YYYYMMDD-HHmm.pdf` になっていることを確認（受け入れ条件 7、仕様書 `pdf-report.md §11.4`）。
8. **再診断フローの動作確認**: PDF ダウンロード後に「再診断する」ボタン → フォーム再表示 → 再度診断 → 再度 PDF ダウンロードが連続で動作することを確認（`generatedAt` state の reset サイクルが正しく動くことの保証）。
