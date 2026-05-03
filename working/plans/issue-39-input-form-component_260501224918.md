# 診断フォーム InputForm コンポーネント実装プラン

## Context
`/calculate` ページが「準備中」プレースホルダ (`src/app/calculate/page.tsx`) のままで、ROI 診断の入口となる入力フォーム本体が存在しない。仕様は `docs/spec/input-form.md` で確定済み。依存先である共通ユーティリティ（#38）は既にマージ済みで、`src/lib/calculation.ts`（`CalculationInput` / `manYenToYen`）と `src/lib/constants.ts`（`INSOURCING_LEVELS` / `InsourcingLevel` / `DEFAULT_*`）が利用可能。本 Issue では `docs/spec/input-form.md §4` の 5 項目を入力でき、送信時に親へ `CalculationInput`（円単位）を渡す `InputForm` クライアントコンポーネントを実装する。

GitHub Issue: #39

---

## 採用方針（重要な前提決定）

**Issue 本体が要求するのは「5 項目を入力できる InputForm コンポーネント」と「onSubmit プロパティで親へ `CalculationInput` を渡す」最小スコープのフォーム。** 一方 `docs/spec/input-form.md §3.1` は「1 項目 1 ステップ（完全ウィザード方式）+ 確認画面（Step 6）」を最終 UX として規定している。両者の差異について、本 Issue では **「単一画面の縦並びフォーム（5 項目を 1 ページに表示）」を採用**する。理由:

- Issue 本体・実装方針セクションが `useState` ローカル状態と `onSubmit` を 1 コンポーネントで完結させる前提で書かれており、「ウィザード化（複数ステップの状態機械・進捗インジケータ・確認画面・前後遷移・項目別ジャンプリンク）」は明確にスコープ外と読める。
- ウィザード UX は React Hook Form / Zod 等の追加依存が前提で書かれている（仕様書 §6.1「Zod 導入は Issue #6 以降」）が、`package.json` には現時点で `zod` も `react-hook-form` も入っていない。本 Issue でこれらを追加するのは別議論（`#39` のスコープを越える）。
- 仕様書 §11 の「決定項目チェックリスト」と Issue の「受け入れ条件」は粒度が異なり、Issue の受け入れ条件は本フォーム単体で全て満たせる。

**トレードオフ**: 本実装は仕様書 §3 が規定する「ウィザード方式」「進捗『N/5』表示」「確認画面 + 詳細設定アコーディオン」「項目別修正リンク」を満たさない。これらは別 Issue（ウィザード化リファクタ）で対応する前提とし、本 Issue 内のコードはウィザード化時に再利用しやすいよう、項目ごとに小さな `Field` 単位を切り出して構成する。詳細設定 3 項目（時給／1日作業時間／月稼働日数）は、Issue 本文の入力項目（基本 5 項目）に含まれていないため、本 Issue では **未実装**（`CalculationInput` の `hourlyWage` 等は `undefined` で送出 → `calculate()` が `DEFAULT_*` を適用）。詳細設定アコーディオンも別 Issue（または後続コミット）に切り出す。

---

## 変更対象ファイル

### 1. InputForm 本体の新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/InputForm.tsx`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:

  #### 1-a. ファイル冒頭・ディレクティブ
  - 1 行目に `"use client";`（`useState` を使うクライアントコンポーネント）。
  - JSDoc ヘッダで仕様書 `docs/spec/input-form.md §4`（基本 5 項目）と `§9`（単位変換）への参照、および `CalculationInput` への変換責務を本コンポーネントが負うことを明記。

  #### 1-b. import
  ```ts
  import { useId, useState, type FormEvent } from "react";
  import { Button } from "@/components/ui/Button";
  import { Card } from "@/components/ui/Card";
  import { cn } from "@/lib/cn";
  import { INSOURCING_LEVELS, type InsourcingLevel } from "@/lib/constants";
  import { manYenToYen, type CalculationInput } from "@/lib/calculation";
  ```

  #### 1-c. 定数（モジュールスコープ）
  - 仕様書 §4.4 の更新待ち期間 5 択を、ラベル・代表値込みの `as const` 配列で定義:
    ```ts
    const UPDATE_WAIT_OPTIONS = [
      { value: 0.5,  label: "すぐ対応（〜1ヶ月）" },
      { value: 1.5,  label: "1〜2ヶ月" },
      { value: 4.5,  label: "3〜6ヶ月" },
      { value: 9,    label: "半年〜1年" },
      { value: 18,   label: "1年以上" },
    ] as const;
    type UpdateWaitValue = (typeof UPDATE_WAIT_OPTIONS)[number]["value"];
    ```
  - `INSOURCING_LEVELS` は `@/lib/constants` から再利用（仕様書 §4.5、#38 で確定済み）。

  #### 1-d. フォーム状態の型
  - 入力中は **空欄（未入力）と数値ゼロを区別** する必要があるため、各数値フィールドは `string` で保持し、送信前に `Number()` でパース＋検証する。セレクト系は数値で保持（未選択は `null`）。
    ```ts
    type FormState = {
      monthlyVendorCostManYen: string;
      repairCostManYen: string;
      manualWorkerCount: string;
      updateWaitMonths: UpdateWaitValue | null;
      insourcingLevel: InsourcingLevel | null;
    };
    type FieldKey = keyof FormState;
    type FieldErrors = Partial<Record<FieldKey, string>>;
    ```

  #### 1-e. Props
  ```ts
  export type InputFormProps = {
    onSubmit: (input: CalculationInput) => void;
    className?: string;
  };
  ```

  #### 1-f. 初期状態
  ```ts
  const INITIAL_STATE: FormState = {
    monthlyVendorCostManYen: "",
    repairCostManYen: "",
    manualWorkerCount: "",
    updateWaitMonths: null,
    insourcingLevel: null,
  };
  ```

  #### 1-g. バリデーション関数（純粋関数 `validate(form: FormState)`）
  - 仕様書 §6.4 / §8.3 のエラー文言を **完全一致**で実装:

    | フィールド | 条件 | 文言 |
    |---|---|---|
    | `monthlyVendorCostManYen` | 空欄 | `"月額費用を入力してください"` |
    | `monthlyVendorCostManYen` | 非整数 | `"整数で入力してください"` |
    | `monthlyVendorCostManYen` | `< 1` | `"1 万円以上で入力してください"` |
    | `monthlyVendorCostManYen` | `> 10_000` | `"10,000 万円以下で入力してください"` |
    | `repairCostManYen` | 空欄 | `"改修費用を入力してください（発生していない場合は 0）"` |
    | `repairCostManYen` | 非整数 | `"整数で入力してください"` |
    | `repairCostManYen` | `< 0` | `"0 以上で入力してください"` |
    | `repairCostManYen` | `> 5_000` | `"5,000 万円以下で入力してください"` |
    | `manualWorkerCount` | 空欄 | `"手作業人数を入力してください"` |
    | `manualWorkerCount` | 非整数 | `"整数で入力してください"` |
    | `manualWorkerCount` | `< 0` | `"0 以上で入力してください"` |
    | `manualWorkerCount` | `> 1_000` | `"1,000 人以下で入力してください"` |
    | `updateWaitMonths` | 未選択 | `"選択肢から 1 つ選んでください"` |
    | `insourcingLevel` | 未選択 | `"選択肢から 1 つ選んでください"` |

  - 整数判定は `/^\d+$/.test(s.trim())` で文字列段階で検査し、`Number()` の暗黙変換で `0` と空欄が区別できない問題を回避（負値は `min` チェックで弾く）。

  #### 1-h. UI 構造（JSX 概略）
  - ルートは `<form noValidate onSubmit={handleSubmit}>` を `Card` でラップ。
  - 縦積み（`space-y-6 sm:space-y-8`）で 5 項目を順に表示。
  - 末尾に送信ボタン（`Button variant="primary" size="lg" type="submit"`、ラベル `"診断する"`）を `mt-8` で配置。`className="w-full sm:w-auto"` でモバイル全幅、デスクトップは内容幅。

  #### 1-i. フィールド共通の a11y 構造
  - ID は `useId()` のプレフィクスから派生:
    ```tsx
    const formId = useId();
    const fieldId = (key: FieldKey) => `${formId}-${key}`;
    const errorId = (key: FieldKey) => `${formId}-${key}-error`;
    const helpId  = (key: FieldKey) => `${formId}-${key}-help`;
    ```
  - 各 `<input>` / `<select>` / `<button role="radio">` に以下を付与:
    - `id={fieldId(key)}`
    - `aria-required="true"`
    - `aria-invalid={errors[key] ? "true" : "false"}`
    - `aria-describedby` には help テキストとエラーテキストの ID を半角空白区切りで結合（エラー時のみエラー ID を含める）
  - `<label htmlFor={fieldId(key)}>` で `<input>` 系に関連付け、グループ系（更新待ち / 内製化）は `<fieldset>` + `<legend>` で代替。
  - エラーメッセージは `<p id={errorId(key)} role="alert" className="mt-1 text-sm text-[#B45656]">`。
  - ヘルプ文は `<p id={helpId(key)} className="mt-1 text-xs text-ink/70">`。

  #### 1-j. フィールドごとの具体仕様

  **(1) 月額ベンダー費用 — `monthlyVendorCostManYen`**（仕様書 §4.1）
  - ラベル: `"月額ベンダー費用"`、サフィックス: `"万円／月"`
  - `<input type="number" inputMode="numeric" min={1} max={10000} step={1} placeholder="例: 50">`
  - ヘルプ文: `"現在ベンダーに支払っている IT 関連の月額費用（保守・運用・開発受託等の合計）"`

  **(2) 改修費用 — `repairCostManYen`**（仕様書 §4.2）
  - ラベル: `"改修費用"`、サフィックス: `"万円／回"`
  - `<input type="number" inputMode="numeric" min={0} max={5000} step={1} placeholder="例: 30">`
  - ヘルプ文: `"1 回あたりの改修・機能追加の発注費用。年 3 回想定で試算します"`

  **(3) 手作業人数 — `manualWorkerCount`**（仕様書 §4.3、ステッパー付き）
  - ラベル: `"手作業に従事する人数"`、サフィックス: `"人"`
  - 構造:
    ```tsx
    <div className="flex items-stretch gap-2">
      <button type="button" aria-label="1 人減らす" disabled={value <= 0} onClick={decrement}>−</button>
      <input type="number" inputMode="numeric" min={0} max={1000} step={1} placeholder="例: 5" .../>
      <button type="button" aria-label="1 人増やす" disabled={value >= 1000} onClick={increment}>＋</button>
    </div>
    ```
  - 各ボタンは仕様書 §7.2 のタップ領域 44×44px を満たすため `h-11 w-11`。
  - ヘルプ文: `"手作業・定型業務に従事している人数。AI 自動化の対象人数を試算します"`

  **(4) 更新待ち期間 — `updateWaitMonths`**（仕様書 §4.4）
  - `<fieldset>` + `<legend>` で `"更新待ち期間"` を表示。
  - 内部は `UPDATE_WAIT_OPTIONS` をループした `<button type="button" role="radio" aria-checked={...}>`。
  - レスポンシブ: `<640px` で `flex-col`、`>=640px` で `flex-row flex-wrap`。各ボタンは `min-h-11`。
  - 選択中スタイル: `aria-checked="true"` 時に `bg-ink text-canvas`、未選択時は `border border-line bg-canvas text-ink hover:bg-line/30`。
  - エラー表示位置: `<fieldset>` 直下にグループ全体のエラーとして表示。

  **(5) 内製化状況 — `insourcingLevel`**（仕様書 §4.5）
  - `<fieldset>` + `<legend>` で `"内製化の進捗状況"` を表示。
  - 内部は `INSOURCING_LEVELS` をループした `<button role="radio">`。
  - レスポンシブ:
    - `>=640px` (`sm:`): 5 等分セグメント、`shortLabel` を表示し `title={label}`。
    - `<640px`: ラジオ風縦積み、`label` を表示。
    - 切替実装: `<span className="sm:hidden">{label}</span><span className="hidden sm:inline">{shortLabel}</span>`

  #### 1-k. デザイントークンの適用（直書き禁止）
  - カラー: `bg-canvas` / `text-ink` / `border-line` / `text-ink/70` / `bg-ink` / `text-canvas`（HEX 直書き禁止、エラー赤 `#B45656` のみ任意値で例外）。
  - 角丸: 入力フィールド `rounded-md`、`Card` は内部実装で `rounded-xl`。
  - シャドウ: 入力フィールドは付けない、`Card` は `shadow-card` 既定。
  - 余白: フィールド間 `space-y-6 sm:space-y-8`、ラベルと入力 `space-y-2`、ヘルプ／エラー `mt-1`、フォーム外周 `Card` の `p-6 sm:p-8`。
  - フォーカスリング: 各 input/button に `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`。
  - 入力フィールド共通クラス定数:
    ```ts
    const inputBaseClass =
      "block w-full rounded-md border border-line bg-canvas px-3 h-11 text-base text-ink " +
      "placeholder:text-ink/40 " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      "aria-[invalid=true]:border-[#B45656]";
    ```
  - 高さ `h-11` = 44px（仕様書 §7.2 タップ領域要件）。

  #### 1-l. 送信ハンドラ
  ```ts
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = validate(form);
    if (!result.values) {
      setErrors(result.errors);
      focusFirstError(result.errors);
      return;
    }
    const input: CalculationInput = {
      monthlyVendorCost: manYenToYen(result.values.monthlyVendorCostManYen),
      repairCost:        manYenToYen(result.values.repairCostManYen),
      manualWorkerCount: result.values.manualWorkerCount,
      updateWaitMonths:  result.values.updateWaitMonths,
      insourcingLevel:   result.values.insourcingLevel,
    };
    onSubmit(input);
  };
  ```
  - 送信ボタンは `disabled` を取らない（商談テンポ重視で「押した瞬間にエラーが見える」UX を採用、仕様書 §6.2）。

  #### 1-m. `onBlur` 時のバリデーション（仕様書 §6.2）
  - フィールド離脱時に該当フィールドのみ再検証。`onChange` 中はエラーをクリアする方向のみ（既存エラーをクリアして再点灯させない）。

- **理由**:
  - 受け入れ条件「5 項目すべてが入力可能」「最小値／最大値／バリデーションが仕様どおり」を満たす。
  - `useState` ローカル状態 + `onSubmit` プロパティで親へ `CalculationInput` を渡す Issue 本文の指示そのまま。
  - `Button` / `Card` を活用し、デザイントークンをロール名のみで参照。
  - a11y は `<label>` / `<fieldset>+<legend>` / `aria-required` / `aria-invalid` / `aria-describedby` / `role="alert"` を組み合わせて受け入れ条件を満たす。
  - レスポンシブは内製化状況のセグメント↔ラジオ切替（仕様書 §4.5）、各タップ領域 44×44px 確保（§7.2）。

---

### 2. `/calculate` ページの差し替え
- **変更**: `/Users/YS/development/matatabi-calculator/src/app/calculate/page.tsx`
- **変更箇所**: ファイル全体（プレースホルダ JSX を本フォームに差し替え）
- **変更内容**:
  - `metadata` を export している `page.tsx` は Server Component のまま保持し、本文を `<CalculatePageClient />` に置換する。
  - `Link`／`ArrowLeft` 等のプレースホルダ専用 import は削除。
  - 構造:
    ```tsx
    import type { Metadata } from "next";
    import { CalculatePageClient } from "./CalculatePageClient";

    export const metadata: Metadata = { /* 既存と同じ */ };

    export default function CalculatePage() {
      return (
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
          <header className="mb-8 sm:mb-12 space-y-3">
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">ROI 診断</h1>
            <p className="text-sm leading-relaxed text-ink/80 sm:text-base">
              5 つの質問にお答えいただくと、3 年間の止血額と機会損失を試算します。
            </p>
          </header>
          <CalculatePageClient />
        </main>
      );
    }
    ```
- **理由**:
  - Issue「影響範囲」の「改修: `src/app/calculate/page.tsx`（プレースホルダから本フォームへ差し替え）」要件を満たす。
  - サーバー/クライアント分離: `metadata` を export している `page.tsx` は Server Component のまま保持し、子に `"use client"` を持たせるのが Next.js 14 のベストプラクティス。

---

### 3. クライアントラッパ（受け皿）の新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.tsx`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  ```tsx
  "use client";
  import { useState } from "react";
  import { InputForm } from "@/components/calculate/InputForm";
  import type { CalculationInput } from "@/lib/calculation";

  export function CalculatePageClient() {
    const [submitted, setSubmitted] = useState<CalculationInput | null>(null);
    return (
      <>
        <InputForm onSubmit={setSubmitted} />
        {submitted && process.env.NODE_ENV === "development" ? (
          <pre className="mt-8 overflow-auto rounded-md border border-line/50 bg-canvas p-4 text-xs text-ink/70">
            {JSON.stringify(submitted, null, 2)}
          </pre>
        ) : null}
      </>
    );
  }
  ```
- **理由**:
  - `page.tsx` を Server Component のまま保つために必要なクライアント境界。
  - 後続 Issue（結果ダッシュボード）はこのファイルを差し替えるだけで進められる。
  - `InputForm` 自体を「親が状態を持ち子は `onSubmit` で値を渡す」純粋な Controlled-on-Submit パターンに保てる（Issue 実装方針どおり）。

---

## 設計上の考慮点

### A. ウィザード方式 vs 単一画面（Issue 指示への明示回答）
仕様書 §3.1 はウィザード（1 項目 1 ステップ）を最終 UX として規定するが、Issue #39 本体はそれを必須化していない。本 Issue は **MVP 単一画面構成** を採用し、ウィザード化（進捗バー、確認画面、項目別修正リンク、戻るボタン）は **別 Issue（後続）** に委ねる。トレードオフは仕様書 §3 の UX を満たさないこと、利点は本 Issue を最小スコープでクローズしつつ後続でリファクタしやすくすること。実装上は項目を意味的に並べ、各フィールドを独立にレンダリングすることで、ウィザード化時に切り出しやすい構造にする。

### B. `useState` のフィールド粒度
全フィールドを 1 つの `FormState` オブジェクトで持つ。5 項目しかなく分割すると冗長になり、親に渡す `CalculationInput` 構築時に 1 オブジェクトで処理しやすい。

### C. 数値入力の文字列保持
`<input type="number">` は空欄が `""`、`Number("")` は `0` になり「未入力」と「ゼロ入力」が区別できない。仕様書 §6.4 は両者で別エラー文言を要求するため、状態は `string` で保持。

### D. エラー文言の正本
仕様書 §8.3 の表をそのままハードコード。商談トーン（敬体・具体値）に既に整っている。本 Issue では文言を変更しない。

### E. Zod を導入しない判断
仕様書 §6.1 は Zod を将来導入と記載、`package.json` には未追加。本 Issue で新規追加するのは別議論で、手書きバリデーションでも受け入れ条件は全て満たせる。Zod 化は別 Issue に委ねる。

### F. 詳細設定 3 項目（時給／1日時間／月稼働日数）
Issue 本文の入力項目は基本 5 項目のみ。`CalculationInput.hourlyWage` 等は `undefined` のまま親に渡し、`calculate()` が `DEFAULT_HOURLY_WAGE = 2500` 等を fallback する（#38 で実装済み）。仕様書 §3.3 の詳細設定アコーディオン UI は別 Issue で対応。

### G. フォーカス管理（送信 NG 時）
バリデーション NG 時、エラーが付いた最初のフィールドへ `document.getElementById(fieldId(firstErrorKey))?.focus()` でフォーカス移動（仕様書 §6.2 要件）。

### H. レスポンシブ確認の境界
- 375px (iPhone SE 等): `Card` の `p-6` と `max-w-3xl` で左右 16px (`px-4`) 確保。フォーム全体は縦長 1 列。内製化状況は縦積み。
- 1280px+: `max-w-3xl` (768px) で中央寄せ、`px-4 sm:px-8` で左右マージン。セグメントコントロールは横並び 5 ボタン。

### I. `aria-describedby` 構築
- 通常時: `aria-describedby={helpId(key)}`
- エラー時: `aria-describedby={`${helpId(key)} ${errorId(key)}`}`
- `cn()` 結合: `aria-describedby={cn(helpId(key), errors[key] && errorId(key)) || undefined}`

### J. `Button` の `disabled` 属性は使わない
仕様書 §6.2 と Issue 受け入れ条件「値が無効な状態では送信ボタンが押せない、**または** 送信時に明示エラー」のうち後者を採用。`disabled` で押下不可にすると、なぜ押せないかの理由提示が困難。送信時に最初のエラーフィールドへフォーカス＋エラー表示が UX として優位。

### K. `lucide-react` アイコンの使用
仕様書 §8.2 はエラーに「赤文字 + アイコン」を要求。`lucide-react` の `AlertCircle` をエラー文言の前にインライン配置（`h-4 w-4 inline mr-1`）。ライブラリは既に依存に含まれる。

---

## 検証方法

1. `npm run typecheck` を実行し `strict` モードでエラーが 0 であることを確認。
2. `npm run lint` を実行し ESLint エラーが 0 であることを確認。
3. `npm run build` を実行し本番ビルドが成功することを確認。
4. `npm run dev` で `http://localhost:3000/calculate` を開き、以下を手動検証:
   - **5 項目入力可能**: いずれも入力 / 選択ができる。
   - **数値入力の min/max**:
     - 月額ベンダー費用: `0` → `"1 万円以上で入力してください"`、`10001` → `"10,000 万円以下で入力してください"`、空欄 → `"月額費用を入力してください"`。
     - 改修費用: 空欄 → `"改修費用を入力してください（発生していない場合は 0）"`、`5001` → `"5,000 万円以下で入力してください"`、`-1` → `"0 以上で入力してください"`。
     - 手作業人数: `1.5` → `"整数で入力してください"`、`1001` → `"1,000 人以下で入力してください"`、空欄 → `"手作業人数を入力してください"`。
   - **セレクト未選択**: 更新待ち期間 / 内製化状況の片方を未選択のまま送信 → グループ下に `"選択肢から 1 つ選んでください"` 表示。
   - **正常系**: `monthlyVendorCostManYen=50, repairCostManYen=30, manualWorkerCount=5, updateWaitMonths=4.5, insourcingLevel=0.25` で送信 → コンソールに `{ monthlyVendorCost: 500_000, repairCost: 300_000, manualWorkerCount: 5, updateWaitMonths: 4.5, insourcingLevel: 0.25 }` が出ることを確認。
   - **手作業人数ステッパー**: − ボタンで `0` で `disabled`、＋ ボタンで `1000` で `disabled` を確認。
   - **内製化状況のレスポンシブ**: ブラウザ幅 639px → 縦積みフルラベル、640px+ → 横並び短縮ラベル。
5. **スクリーンリーダー検証**（VoiceOver / NVDA 推奨）:
   - 各フィールドにフォーカス → ラベル + サフィックス + ヘルプ文が読み上げられる。
   - エラー発生時 → `role="alert"` で読み上げ、`aria-describedby` でフィールドの説明として連結される。
   - `aria-required="true"` が "必須" として読み上げられる。
6. **デザイントークン検証**:
   - `grep -RE "#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}\b" src/components/calculate/InputForm.tsx` で HEX 直書きが `#B45656`（エラー専用赤）以外に存在しないことを確認。
   - `Card` / `Button` のデフォルトクラスが上書きされていないこと。
7. **375px ↔ 1280px+ 表示確認**: Chrome DevTools の Device Toolbar で 375 / 768 / 1024 / 1280 / 1440 px の各幅でレイアウト崩れがないことを目視確認。
8. **フォーカスリング**: Tab キーで巡回し、accent (#9CAEB8) 2px のリングが各 input / button / segment ボタンに表示されることを確認。
