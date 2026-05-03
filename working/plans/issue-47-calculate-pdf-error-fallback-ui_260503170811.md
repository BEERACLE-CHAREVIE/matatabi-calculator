# Issue #47 計算/PDF 生成エラー時のフォールバック UI 整備 実装プラン

## Context
`/calculate` ページでは現状、計算ロジック（`calculate()`）が例外を投げた場合のフォールバック UI が未定義であり、`CalculatePageClient.tsx` の `useMemo(() => calculate(submitted))` は throw をそのまま伝播させて `src/app/error.tsx`（ページ全体置換）に飛ばしてしまう。これは「ハンドル可能なエラー」までページレベルのエラーバウンダリで処理してしまう過剰な UX 劣化であり、ユーザーがフォーム入力をやり直すには再読み込みが必要になる。PDF 生成エラーは `ResultDashboard.handleDownloadPdf` 内に try/catch があるものの、5 秒で自動消去される `pdfError` テキストのみで明示的な「再試行」CTA がなく、連続失敗時のエスカレーション（連絡先案内）も存在しない。本 Issue ではこの 2 系統のエラーをページ内で吸収し、`role="alert"` によるスクリーンリーダー通知、リトライ動線、連続失敗エスカレーション、Cloudflare Web Analytics のイベント送信（任意）を整備する。既存の `src/app/error.tsx` は「予期せぬ例外」を担う最終防衛線として温存し、本 Issue で導入するエラー UI は「想定済みかつページ内で処理可能なエラー」のみを扱う。

GitHub Issue: #47

---

## 採用方針（重要な前提決定）

- **責務分離**: 計算エラー UI（フォーム状態への巻き戻し導線を持つカード型メッセージ）と PDF 生成エラー UI（ボタン直下のインラインメッセージ + 再試行 + 連続失敗時のエスカレーション）は文脈と密度が異なるため、共通コンポーネント `CalculateErrorState` には「カード型のエラー表示」のみを抽出し、PDF 側のインラインメッセージは `DashboardView` に直接実装する。
- **エラー境界の置き場**: 計算エラーは `CalculatePageClient.tsx` で吸収する。`useMemo` 内で throw しても React の例外伝播は防げないため、`useMemo` を `try/catch` でラップし戻り値を `{ status: "ok"; result } | { status: "error"; error }` の判別 union 型に変える。これにより `useMemo` の純粋性（再レンダリング時の同一性）を保ちつつ、エラー状態を React state ではなく派生値として扱う（`submitted` が変われば自動で再評価される）。
- **計算エラー時の UI 配置**: `submitted && status === "error"` のケースで `ResultDashboard` の代わりに `CalculateErrorState` をレンダリングし、「もう一度試す」ボタンで `setSubmitted(null)` を呼ぶ。`InputForm` 自体は常に表示されたままにし、ユーザーが入力をすぐ修正できる導線を確保する（`InputForm` は内部 `useState` で値を保持しているため、再診断時に再入力させる必要はない）。
- **PDF 連続失敗カウンタの保持場所**: `ResultDashboard` 内 `useState<number>` で `pdfFailureCount` を管理する。3 回連続失敗時のみ「お問い合わせください」のエスカレーション文言を表示し、成功時は 0 にリセットする。「連続」性を保つためカウンタリセットのトリガは「`generatePdf` 成功時」と「`onResetRequest` 経由のセッション終了時」とする。PDF ボタン押下から 5 秒経過してメッセージが自動消去されるだけではカウンタはリセットしない（「連続」の意味を保つため）。
- **エラーメッセージの自動消去ポリシー変更**: 現状の「5 秒で `pdfError` を null に戻す」挙動は、ユーザーが再試行ボタンを押す前にメッセージが消える可能性があり、Issue が要求する「再試行ボタン併設」と相性が悪い。本 Issue では **エラー表示は自動消去せず、ユーザーアクション（再試行 / 再診断）または成功時にのみクリア**する方針へ変更する。`docs/spec/pdf-report.md §8.3` の「5 秒間表示して自動で消える」記述からは方針変更となるが、再試行ボタン併設仕様（Issue #47）の優先度が高い。`ResultDashboard.test.tsx` の「pdfError は 5 秒で自動消去される」テストは仕様変更に合わせて更新する。
- **アクセシビリティ**: 計算エラー UI は `role="alert"`（暗黙 `aria-live="assertive"`）を付与し、レンダリング直後に支援技術へ通知する。PDF エラーメッセージは既存の `<p role="alert">`（`DashboardView.tsx:292`）を流用し、エスカレーション文言が表示される際には `role="alert"` の同一ノードを文言切替で再通知させる（テキスト変更で再通知が安定しない読み上げ環境への保険として、エスカレーション要素を別 DOM ノードとして条件付きレンダリングし `role="alert"` を持たせる構造に切り替える）。
- **アナリティクス連携（任意）**: `src/lib/analytics.ts` の `trackEvent` は CF Web Analytics 単独採用のため現状 no-op スタブだが、将来 GA4 併用が決まった際の接続点として `calculate_error` / `pdf_generation_error` / `pdf_generation_error_escalated` の 3 イベントを送出する。no-op であっても「呼び出し位置」を実装しておくことで、Issue #14 の解析方針確定後に最小修正で計測可能となる。
- **`src/app/error.tsx` への影響**: 既存の `error.tsx` は本 Issue では一切変更しない。ページ内で吸収できないシステム例外（例: `next/dynamic` 失敗 / `Recharts` の致命的レンダリング失敗）は引き続き `error.tsx` に委ねる。
- **メッセージ文言**: 仕様書 `docs/spec/pdf-report.md §8.3` の既存文言「PDFの生成に失敗しました。ページを再読み込みして再度お試しください。」は再試行ボタン併設に伴い「PDFの生成に失敗しました。再試行してください。」に更新する。エスカレーション文言は「PDF の生成に複数回失敗しました。お手数ですが、お問い合わせフォーム（/contact）からご連絡ください。」とし、`/contact` ページ（`src/app/contact/` 配下）への内部リンクを `next/link` で添える。

---

## 変更対象ファイル

### 1. 共通エラー UI コンポーネントの新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/CalculateErrorState.tsx`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - 先頭 `"use client"` 指示子を付与（ボタンクリックハンドラを受けるため client component。ただしフックは使用しない pure component）。
  - JSDoc ヘッダで「Issue #47 / 計算エラー時のフォールバック UI / `role="alert"` を付与してスクリーンリーダー通知 / 再試行 CTA を必須 props として要求」を明記。
  - props 型:
    ```ts
    export interface CalculateErrorStateProps {
      /** スクリーンリーダーに読み上げられる本文。デフォルト文言は呼び出し側で組み立てる。 */
      title: string;
      /** 補足説明（任意）。再試行を促す導線文言など。 */
      description?: string;
      /** 「もう一度試す」ボタン押下時のコールバック。 */
      onRetry: () => void;
      /** 再試行ボタンのラベル（既定は「もう一度試す」）。 */
      retryLabel?: string;
      className?: string;
    }
    ```
  - JSX 構造: `Card`（既存 `@/components/ui/Card`）をルートに、`role="alert"` と `aria-live="assertive"` を付与（`role="alert"` の暗黙 live 領域で十分だが iOS VoiceOver 等で確実性のため両方記述する WarningBanner 慣行に倣う）。`AlertCircle`（lucide-react、`InputForm` で既に採用）+ 見出し（`text-base font-bold text-ink`）+ 説明（`text-sm text-ink/80`）+ プライマリボタン（既存 `@/components/ui/Button` の `variant="primary" size="lg"`）の 4 要素で構成。
  - エクスポート: `export function CalculateErrorState({ ... }: CalculateErrorStateProps): JSX.Element`。
- **理由**: Issue 本文「場合により新規: `src/components/calculate/CalculateErrorState.tsx`（共通エラー UI を切り出す）」に対応。`InputForm.tsx` のフィールドエラー UI（`<p role="alert">` + `AlertCircle`）と整合する見た目を維持しつつ、再試行ボタンを内包する「カード型」として一段階重量級の UI を提供する。`Card` を使うことで `ResultDashboard` の表示と同じ枠で差し替え可能になる。

### 2. CalculatePageClient で計算エラーを吸収
- **変更**: `/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.tsx`
- **変更箇所**:
  - import ブロック（lines 1-9）: `CalculateErrorState` を新規 import。`useEffect` を追加（`trackEvent` 呼び出しのため）。`trackEvent` を `@/lib/analytics` から import。
  - `useMemo` 部（lines 21-24）: 戻り値を判別 union 型化する `try/catch` ラップに変更。
  - レンダリング JSX（lines 31-53）: `submitted` が存在し計算結果が error の場合に `CalculateErrorState` を表示する分岐を追加。
- **変更内容**:
  - `useMemo` を以下の形に変更:
    ```ts
    type CalculationState =
      | { status: "idle" }
      | { status: "ok"; result: CalculationOutput }
      | { status: "error"; error: Error };

    const calcState = useMemo<CalculationState>(() => {
      if (!submitted) return { status: "idle" };
      try {
        return { status: "ok", result: calculate(submitted) };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return { status: "error", error };
      }
    }, [submitted]);
    ```
  - 「現在の `result` を参照していた箇所」（`showWarningBanner` の判定 / `ResultDashboard` への注入）を `calcState.status === "ok"` のガード下にだけ存在させる。
  - error 状態時の `useEffect` を追加し、`calculate_error` イベントを `trackEvent` で送出（`trackEvent` の引数に `error.message` を含めると個人情報混入リスクがあるため、`message` は送らず `name` のみ）:
    ```ts
    useEffect(() => {
      if (calcState.status !== "error") return;
      console.error("[calculate failed]", calcState.error);
      trackEvent("calculate_error");
    }, [calcState]);
    ```
  - JSX 分岐を以下に変更:
    ```tsx
    return (
      <div className="space-y-8 sm:space-y-12">
        <InputForm onSubmit={setSubmitted} />
        {calcState.status === "ok" ? (
          <ResultDashboard
            key={resultKey}
            result={calcState.result}
            insourcingLevel={submitted!.insourcingLevel}
            inputs={submitted!}
            onResetRequest={() => setSubmitted(null)}
            headerSlot={
              showWarningBanner ? (
                <WarningBanner
                  message={buildCriticalOpportunityLossMessage(
                    calcState.result.speedWarningMonthlyLoss,
                  )}
                />
              ) : undefined
            }
          />
        ) : null}
        {calcState.status === "error" ? (
          <CalculateErrorState
            title="診断結果の計算中にエラーが発生しました"
            description="入力内容を見直して、もう一度お試しください。問題が解消しない場合は時間をおいてお試しください。"
            onRetry={() => setSubmitted(null)}
            retryLabel="もう一度試す"
          />
        ) : null}
      </div>
    );
    ```
  - `showWarningBanner` の判定式を `calcState.status === "ok"` ガード内に移動:
    ```ts
    const showWarningBanner =
      calcState.status === "ok" &&
      !!submitted &&
      calcState.result.speedWarning &&
      submitted.insourcingLevel !== 1;
    ```
- **理由**: Issue 本文「`try/catch` で `calculate()` を囲み、失敗時はエラー状態を保持」「エラー時はカード型のメッセージを表示し『もう一度試す』ボタンでフォーム状態に戻す」に対応。`useMemo` 内で throw すると React の同期エラー伝播で親エラーバウンダリ（`src/app/error.tsx`）まで飛ぶため、判別 union 化が最も影響範囲の小さい改修となる。`onRetry` で `setSubmitted(null)` を呼ぶことで「フォーム状態に戻す」（`submitted=null` ＝ 結果画面非表示）が実現でき、`InputForm` の内部 state は維持されるためユーザーは入力値を保持したまま再診断できる。

### 3. ResultDashboard に PDF 連続失敗カウンタとエラー UI 拡張を追加
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.tsx`
- **変更箇所**:
  - JSDoc ヘッダ（lines 3-26）: PDF エラーハンドリング方針変更（自動消去廃止 / 連続失敗カウンタ / エスカレーション）を追記。
  - import ブロック（lines 28-43）: `trackEvent` を `@/lib/analytics` から追加 import。
  - `ResultDashboard` 関数本体（lines 70-175）:
    - `pdfError` の自動消去 `useEffect`（lines 90-94）を **削除**。
    - `pdfFailureCount` state を新規追加: `const [pdfFailureCount, setPdfFailureCount] = useState(0);`
    - `handleDownloadPdf` の try/catch 部を以下に変更:
      ```ts
      try {
        // ...既存の rAF×2 + generatePdf...
        await generatePdf({ element, filename: buildPdfFilename(now) });
        setPdfFailureCount(0);
      } catch (err) {
        console.error("[PDF generation failed]", err);
        const nextCount = pdfFailureCount + 1;
        setPdfFailureCount(nextCount);
        setPdfError(
          nextCount >= 3
            ? "PDF の生成に複数回失敗しました。お手数ですが、お問い合わせフォームからご連絡ください。"
            : "PDFの生成に失敗しました。再試行してください。",
        );
        trackEvent(
          nextCount >= 3
            ? "pdf_generation_error_escalated"
            : "pdf_generation_error",
        );
      }
      ```
    - `useCallback` の依存配列を `[pdfFailureCount]` に変更（カウンタ参照のため）。`isGeneratingPdfRef` の二重起動防止ロジックは維持。
    - `onResetRequest` プロパティを呼び出すラッパを追加し、再診断時にカウンタもリセット:
      ```ts
      const handleResetRequest = useCallback(() => {
        setPdfError(null);
        setPdfFailureCount(0);
        onResetRequest?.();
      }, [onResetRequest]);
      ```
    - `DashboardView` への props 渡しで `onResetRequest={onResetRequest ? handleResetRequest : undefined}` に変更。新たに `onPdfRetry` と `pdfErrorIsEscalated` を props として注入する。
  - `DashboardView` への props に `onPdfRetry: handleDownloadPdf` と `pdfErrorIsEscalated: pdfFailureCount >= 3` を追加（renderPropsの拡張は §4 で実装）。
- **変更内容**: 上記コードブロックの通り。`pdfError` を null にリセットするタイミングは「再試行ボタン押下時 = `handleDownloadPdf` 開始の `setPdfError(null)`」「再診断ボタン押下時 = `handleResetRequest`」の 2 経路に絞り、自動消去 `setTimeout` は廃止する。
- **理由**: Issue 本文「PDF 生成エラー時にボタン下にエラーメッセージ + 再試行ボタンを表示」「連続失敗（3 回）時は『お問い合わせください』相当のメッセージを出す」に対応。連続失敗カウンタを成功時にリセットすることで、ユーザーが時間をおいて再試行した際の動作を健全に保つ。`trackEvent` の no-op スタブ呼び出しは Issue 受け入れ条件「Cloudflare Web Analytics の trackEvent でイベント送信される（任意）」を満たし、Issue #14 で解析方針が確定したタイミングでスタブを実装に切り替えるだけで計測可能になる。

### 4. DashboardView に PDF 再試行ボタンとエスカレーション文言を実装
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/DashboardView.tsx`
- **変更箇所**:
  - `DashboardViewProps` インタフェース（lines 56-71）: `onPdfRetry: () => void;` と `pdfErrorIsEscalated: boolean;` を追加。
  - PDF ボタン UI 部（lines 258-296）: 再試行ボタンとエスカレーション文言の条件付きレンダリングを追加。
  - import: `next/link` から `Link` を追加 import（`/contact` への内部リンク用）。
- **変更内容**:
  - props 受け取り部に `onPdfRetry` と `pdfErrorIsEscalated` を追加。
  - 既存の `pdfError` 表示ブロックを以下に拡張:
    ```tsx
    {pdfError ? (
      <div role="alert" className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#B45656]">{pdfError}</p>
        {pdfErrorIsEscalated ? (
          <Link
            href="/contact"
            className="text-sm font-medium text-ink underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            お問い合わせフォームへ
          </Link>
        ) : (
          <Button
            variant="secondary"
            size="md"
            type="button"
            onClick={onPdfRetry}
            disabled={isGeneratingPdf}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            <span>再試行</span>
          </Button>
        )}
      </div>
    ) : null}
    ```
  - `RefreshCw` を `lucide-react` の import に追加（既に `Loader2`, `PiggyBank`, `Sparkles` は import 済み）。
  - PDF ボタン UI（line 258-290）の `<div className="flex flex-col items-center gap-3">` 構造はそのまま維持し、エラー表示部分のみ差し替える。
- **理由**: Issue 本文「ボタン下にエラーメッセージが出て、再試行できる」「連続失敗（3 回）時は『お問い合わせください』相当のメッセージを出す」に対応。`role="alert"` を `<div>` に付与した上で内部に説明文 + アクション要素（再試行ボタン or 連絡先リンク）を持たせる構造に拡張する。エスカレーション時は `Link` で `/contact`（既存ページ）へ誘導する。`isGeneratingPdf` を `disabled` 条件にすることで、再試行ボタン経由でも二重起動防止ガードが効く。

### 5. ResultDashboard テストの追加・更新
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.test.tsx`
- **変更箇所**:
  - 既存「pdfError は 5 秒で自動消去される (§8.3)」テスト（lines 125-161）: **削除**。仕様変更（自動消去廃止）と整合させる。
  - 新規テストブロック「ResultDashboard: PDF エラー時のリトライと連続失敗エスカレーション」を追加。
- **変更内容**:
  - 削除: `pdfError は 5 秒で自動消去される` テストケース。
  - 追加テストケース 1: `PDF 生成失敗時にエラーメッセージと再試行ボタンが表示される`。
    - `generatePdfMock.mockRejectedValueOnce(new Error("boom"))` で 1 回失敗 → エラー文言「PDFの生成に失敗しました。再試行してください。」と「再試行」ボタンが描画されることを assert。
  - 追加テストケース 2: `再試行ボタンクリックで generatePdf が再呼び出しされる`。
    - 1 回失敗 → 再試行ボタンクリック → `generatePdfMock` が 2 回呼ばれることを assert。
  - 追加テストケース 3: `3 回連続失敗でエスカレーション文言と /contact リンクが表示される`。
    - `mockRejectedValue` で 3 回失敗を発生させ、3 回目以降に「PDF の生成に複数回失敗しました。お手数ですが、お問い合わせフォームからご連絡ください。」と `<a href="/contact">お問い合わせフォームへ</a>` が描画されることを assert。再試行ボタンが消えていることも確認。
  - 追加テストケース 4: `成功時に pdfFailureCount がリセットされる`。
    - 2 回失敗 → 3 回目成功 → 再度 1 回失敗 → エスカレーション文言ではなく通常の「再試行してください」が表示されることを assert（連続性が壊れることの確認）。
  - 追加テストケース 5: `エラーメッセージが role="alert" で通知される`。
    - `screen.getByRole("alert")` でエラー文言にアクセス可能なことを確認。
- **理由**: Issue 受け入れ条件「PDF 生成失敗時にボタン下にエラーメッセージが出て、再試行できる」「エラーメッセージがスクリーンリーダーで通知される（role/aria-live）」「連続失敗（3 回）時は『お問い合わせください』相当のメッセージを出す」を回帰テストで担保する。

### 6. DashboardView テストに新規 props のテストを追加
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/DashboardView.test.tsx`
- **変更箇所**: `renderView` のデフォルト props 拡張、および新規テストブロック追加。
- **変更内容**:
  - `renderView` の DashboardView デフォルト props に `onPdfRetry={jest.fn()}`、`pdfErrorIsEscalated={false}` を追加。
  - 既存「pdfError があると role='alert' で表示」（lines 121-124）を以下に拡張:
    - `pdfError="..."` + `pdfErrorIsEscalated=false` で「再試行」ボタンが描画されること。
    - `pdfError="..."` + `pdfErrorIsEscalated=true` で「お問い合わせフォームへ」リンクが描画され、再試行ボタンが描画されないこと。
  - 追加テストケース: 再試行ボタンクリックで `onPdfRetry` が呼ばれること。
- **理由**: `DashboardView` の表示分岐網羅性を保ち、`pdfErrorIsEscalated` の真偽による UI 切替を回帰テストで保護する。

### 7. CalculatePageClient テストの新規作成（既存無し）
- **新規**: `/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.test.tsx`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - JSDoc ヘッダで「Issue #47 / 計算エラー時のフォールバック UI 検証 / `calculate` を jest.mock で差し替えて throw を再現」を明記。
  - `jest.mock("@/lib/calculation", ...)` で `calculate` 関数を `jest.fn()` 化し、`manYenToYen` は `jest.requireActual` で実装維持。
  - `ResultDashboard` を `jest.mock` で軽量モックに差し替え（recharts / html2canvas を回避）。`PdfDashboard` は `ResultDashboard` 経由でモックされるが、本テストでは `ResultDashboard` 自体をモックするため不要。
  - テストケース 1: `calculate が throw した場合 CalculateErrorState が表示される`。
    - `calculate.mockImplementation(() => { throw new Error("boom"); })` 設定 → `InputForm` 経由で送信 → 「診断結果の計算中にエラーが発生しました」+「もう一度試す」ボタンが描画されることを assert。
    - `console.error` を `jest.spyOn` で抑制。
  - テストケース 2: `「もう一度試す」クリックで CalculateErrorState が消え InputForm のみ残る`。
  - テストケース 3: `エラー UI が role="alert" で支援技術に通知される`。
- **理由**: `CalculatePageClient` の計算エラー吸収ロジックを回帰テストで保護する。`InputForm` の実体を含めるためテストは「InputForm に値を入力 → 送信 → エラーが表示される」フローを通す（InputForm 単体テストと重複しないよう、Form 入力は最小限のヘルパで完結させる）。

### 8. README/spec ドキュメントへの注記（任意）
- **変更（任意）**: `/Users/YS/development/matatabi-calculator/docs/spec/pdf-report.md` §8.3
- **変更箇所**: §8.3 の「エラー表示: ボタン直下にインラインメッセージ。**5 秒間表示して自動で消える**。」記述。
- **変更内容**: 「**ユーザーが再試行 / 再診断を実行するか PDF 生成が成功するまで表示し続ける**（Issue #47 で自動消去から手動消去に方針変更）」に更新。連続失敗 3 回時のエスカレーション挙動も追記。
- **理由**: 仕様書と実装の整合性維持。Issue 内では明示要求されていないが、`docs/spec/pdf-report.md` が正本ドキュメントであるため後続レビュー時の混乱を防ぐ。

---

## 設計上の考慮点

- **`useMemo` 内 try/catch の妥当性**: React の `useMemo` は再評価時に throw すると親エラーバウンダリへ伝播する。判別 union を返す形に変えることで、エラー自体を「派生値」として扱い、レンダリング自体は常に成功する。これは React 公式が推奨する「erroring during render は最終手段にせよ」の指針とも整合する。
- **計算エラーの実発生確率**: `calculate()` は `safeNum` / `clampAmount` で防御的に書かれており、実際のところ throw する経路は現状ほぼ無い。しかし将来 `INSOURCING_LEVELS` の値域変更や `Intl` 周りで throw が発生する可能性はゼロではなく、また「ハンドル可能エラー UI」を整備する価値は高いため、Issue の方針通り防御層として実装する。
- **PDF 連続失敗カウンタの永続化**: 本実装ではセッション内（コンポーネントマウント中）のみカウントし、ページ遷移やリロードでリセットする。`localStorage` 永続化は「商談現場でのワンクリック PDF」UX を阻害するため不採用。
- **`/contact` ページ経由のエスカレーション**: `src/app/contact/` が既存（Issue #45 関連）であり、`Link` による内部遷移で SPA 的な遷移が可能。外部メールリンク（`mailto:`）ではなく内部ページ経由とすることで、商談中の意図しないメールクライアント起動を避ける。
- **`role="alert"` の重複**: `WarningBanner`（speedWarning 時）と `CalculateErrorState`（計算エラー時）が同時表示されることは構造上ありえない（speedWarning は計算成功時のみ生成）。PDF エラーの `role="alert"` は `WarningBanner` と共存可能だが、用途と表示位置が異なるため複数 alert 領域の併存は許容する。
- **アナリティクスのプライバシー**: `trackEvent` には `error.message` を渡さない。理由はメッセージに `monthlyVendorCost` などのユーザー入力値が含まれる可能性があるため（個人情報リスク）。イベント名のみで集計可能。
- **既存の `5 秒自動消去テスト`削除の互換性影響**: `working/plans/issue-43-implement-pdf-report-output_*` で確定した自動消去仕様を本 Issue で上書きする。Issue #43 の受け入れ条件には「自動消去」が明示されていたが、Issue #47 が要求する「再試行ボタン併設」と論理的に両立しないため、本 Issue で仕様を更新する。

---

## 検証方法

1. `npm run test -- src/app/calculate/CalculatePageClient.test.tsx src/components/calculate/ResultDashboard.test.tsx src/components/calculate/DashboardView.test.tsx` を実行し、新規追加した 3 系統のテストが全て成功することを確認する。
2. `npm run lint` / `npm run typecheck`（または `tsc --noEmit`）が警告ゼロで完了することを確認する。
3. `npm run dev` でローカル起動し、以下を手動確認する:
   - `/calculate` でフォームを入力して送信 → 通常の `ResultDashboard` が表示される（リグレッション無し）。
   - DevTools Console で `window.localStorage` 等を介して `calculate` 関数を一時的に置き換える、または開発環境で `throw` を仕込んだビルドで「エラーカード + もう一度試すボタン」が表示されることを確認。
   - 「もう一度試す」クリックで `InputForm` だけが残ること、入力値が保持されていることを確認。
   - PDF ボタンを押下する際、DevTools の Network タブで html2canvas / jsPDF のロードを失敗させる（あるいは `generatePdf` を一時改変）して、エラー文言と再試行ボタンが表示されることを確認。
   - 3 回連続失敗させて「お問い合わせフォームへ」リンクが表示され、`/contact` に遷移できることを確認。
   - VoiceOver / NVDA でエラー発生時の読み上げを実機確認（`role="alert"` 通知）。
4. `npm run e2e`（Playwright）の既存スイートが retain（既存テストの破壊なし）であることを確認する。
5. `src/app/error.tsx` の挙動が破壊されていないことを確認するため、`/calculate` 以外のページ（例: `/`）で意図的に例外を起こす一時改変を行い、ページレベルエラー画面が引き続き表示されることを確認する。
