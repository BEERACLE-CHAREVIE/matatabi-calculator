# 数値カウントアップ用 useCountUp フック実装プラン

## Context
診断結果ダッシュボード（Issue #41 / `ResultDashboard`）の指標カードで、金額系の数値を 0 から目標値までアニメーションでカウントアップする UX を実現するため、再利用可能なフックを実装する。仕様は `docs/spec/result-dashboard.md §6.1`（自前 `useCountUp`、`requestAnimationFrame` ベース、duration **1,200ms**、`easeOutCubic`）と §6.3（`prefers-reduced-motion: reduce` 尊重）で確定済み。本 Issue で実装する `useCountUp` は `ResultDashboard` のヒーロー数値・補助カードのカウンターから呼び出され、補間値（円単位の `number`）を返す。表示時の `formatManYen` / `formatManYenCompact` への接続は呼び出し側（後続 Issue #41）で実装される。

GitHub Issue: #40

## 採用方針（重要な前提決定）

- **配置**: `src/hooks/` ディレクトリは現時点では未作成（既存ディレクトリは `src/app` / `src/components` / `src/lib` のみ）。本 Issue で `src/hooks/` を新規に作り、最初のフックとして `useCountUp.ts` を配置する。先頭に `"use client"` ディレクティブは付けない（フック単体は React Server Component でも import 解析が可能で、呼び出し元コンポーネント側に `"use client"` がある前提。`src/components/calculate/InputForm.tsx` と同じく利用側で境界を引く方針）。
- **テストフレームワーク**: `package.json` に Vitest / Jest / Testing Library のいずれも未導入。本 Issue ではテスト導入はスコープ外とし、検証は `npm run typecheck` / `npm run lint` / `npm run build` と、後続 Issue #41 の結合先で目視検証する方針。テスト基盤導入は別 Issue に委ねる（受け入れ条件「アンマウント時に rAF が確実にキャンセル」「無駄な再レンダーを発生させない」は実装ロジックとレビューで担保）。
- **シグネチャ**: Issue 本文と仕様書 §6.1 に従い `useCountUp(target: number, options?: { duration?: number; easing?: (t: number) => number; enabled?: boolean }): number` で確定。返り値は **円単位の補間値（number）**。表示時の `formatManYen` / `formatManYenCompact` への接続は呼び出し側で行う（仕様書 §6.1「補間単位は円、表示時に万円丸め」、§9.3「補間中は `Math.round(interp / 10_000)` を毎フレーム再計算」）。
- **イージング関数の配置**: `easeOutCubic` は `useCountUp.ts` 内モジュールスコープに **`const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);` として private 定義**し、`options.easing` 未指定時のデフォルトに使う。仕様書 §6.1 が「ease-out」を要求しており、本フック以外で再利用する見込みが現時点で無いため `src/lib` には切り出さない（将来別フックでも使うようになった段階で `src/lib/easing.ts` への抽出をリファクタする）。`easeOutCubic` 自体は名前付きで `export` し、呼び出し側がデフォルト値を再利用したい場合に備える。
- **`enabled=false` の挙動**: アニメーションを開始せず、現在保持している値（最後に確定した `target` または初期 `target`）をそのまま返す。後から `enabled=true` になった際は **その時点の値から target へ補間を再開**する。
- **差分なしの再アニメーション抑制**: `target` が現在値と完全一致する場合は `requestAnimationFrame` を起動せず、`useState` の値も更新しない（受け入れ条件「0 → 0 など差分なしの場合に無駄な再レンダーを発生させない」）。

---

## 変更対象ファイル

### 1. useCountUp フック本体の新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/hooks/useCountUp.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:

  #### 1-a. ファイル冒頭・JSDoc ヘッダ
  - `"use client"` ディレクティブは付けない（呼び出し側で境界を引く）。
  - 既存ファイル（`src/lib/format.ts` / `src/lib/calculation.ts`）と同様に、JSDoc ヘッダで以下を明記:
    - 仕様: `docs/spec/result-dashboard.md §6.1`（`useCountUp` 実装方針、duration 1,200ms、`easeOutCubic`）/ §6.3（`prefers-reduced-motion: reduce` 尊重）
    - 設計: `requestAnimationFrame` ベースの自前実装、補間単位は円（表示は呼び出し側で `formatManYen` / `formatManYenCompact` に渡す）
    - 依存: 純粋に React hooks のみ（`useEffect` / `useRef` / `useState`）

  #### 1-b. import
  ```ts
  import { useEffect, useRef, useState } from "react";
  ```

  #### 1-c. モジュール定数
  ```ts
  /** カウンターの標準 duration（ミリ秒）。docs/spec/result-dashboard.md §6.1 で確定。 */
  const DEFAULT_DURATION_MS = 1_200;

  /** ease-out cubic。t ∈ [0, 1] を [0, 1] に写像する。 */
  export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  /** prefers-reduced-motion: reduce のメディアクエリ文字列。 */
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  ```

  #### 1-d. オプション型と公開シグネチャ
  ```ts
  export type UseCountUpOptions = {
    /** アニメーション持続時間（ミリ秒）。既定 1,200ms。 */
    duration?: number;
    /** 補間に用いるイージング関数。t ∈ [0, 1] を受け、補間係数 ∈ [0, 1] を返す。既定 easeOutCubic。 */
    easing?: (t: number) => number;
    /** false でアニメーションを停止し、現在値を保持する。既定 true。 */
    enabled?: boolean;
  };

  export function useCountUp(
    target: number,
    options?: UseCountUpOptions,
  ): number;
  ```

  #### 1-e. 内部状態と ref
  - `const [value, setValue] = useState<number>(target);` — 初期値は `target` と同一（マウント直後にアニメーションせず、`useEffect` 内で 0 ⇒ target をアニメートさせる場合は別途 `0` を初期値にする選択肢があるが、仕様書 §6.4「マウント時に 1 回発動」を満たすには初期 `0` のほうが直感的）。**初期値は `0`** とする。理由: ヒーローの「0 万円から目的の値へ」という UX を初回マウント時にも確実に再現するため。リマウントを強制する `key={hash(result)}`（仕様書 §6.4 / §11 R7）と組み合わせて、毎回 0 から立ち上がる。
  - `const rafIdRef = useRef<number | null>(null);` — 進行中の `requestAnimationFrame` ID を保持し、クリーンアップ・再アニメ開始時にキャンセル。
  - `const startTimeRef = useRef<number | null>(null);` — `performance.now()` ベースの開始時刻。
  - `const startValueRef = useRef<number>(0);` — アニメ開始時点での `value`（現在表示値）。`target` 変更時にここから新しい `target` へ補間する（受け入れ条件「target 変更時は現在値からの差分を再アニメーション」）。
  - `const valueRef = useRef<number>(0);` — `setValue` でステート更新する一方、ref にも書き込んで「最新の現在値」を `useEffect` クロージャ越しに同期参照可能にする（次回 `target` 変更時の `startValueRef` の初期化に必要）。

  #### 1-f. `prefers-reduced-motion` 検出
  - 別の `useEffect` で `window.matchMedia(REDUCED_MOTION_QUERY)` を購読し、ローカル state `[reducedMotion, setReducedMotion]` に反映。`change` イベントリスナを登録し、クリーンアップで解除。
  - SSR ガード: `typeof window === "undefined"` のときは `false` 扱い。
  ```ts
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  ```

  #### 1-g. アニメーション本体（`useEffect`）
  - 依存配列: `[target, duration, easing, enabled, reducedMotion]`。
  - フローチャート:
    1. `enabled === false` → 既存 rAF があればキャンセルし、何もしない（現在値保持）。
    2. `reducedMotion === true` → 即時 `setValue(target)` / `valueRef.current = target` し、rAF を起動しない。
    3. 現在値 `valueRef.current === target`（差分なし）→ `setValue` を呼ばずに早期 return（受け入れ条件「0→0 で無駄な再レンダーを発生させない」）。
    4. 通常パス:
       - 進行中の rAF をキャンセル（`rafIdRef.current` に値があれば `cancelAnimationFrame`）。
       - `startValueRef.current = valueRef.current;`
       - `startTimeRef.current = null;`（最初の rAF コールバックで `performance.now()` を代入）。
       - `const tick = (now: number) => { ... }` を定義し、`rafIdRef.current = requestAnimationFrame(tick)` で開始。
       - `tick` 内処理:
         - `startTimeRef.current ??= now;`
         - `const elapsed = now - startTimeRef.current;`
         - `const t = duration <= 0 ? 1 : Math.min(1, elapsed / duration);`
         - `const eased = easingFn(t);`
         - `const interp = startValueRef.current + (target - startValueRef.current) * eased;`
         - `valueRef.current = interp;`
         - `setValue(interp);`
         - `if (t < 1) rafIdRef.current = requestAnimationFrame(tick);`
         - `else { rafIdRef.current = null; valueRef.current = target; setValue(target); }` — 最終フレームで浮動小数誤差を打ち消すため `target` をそのまま代入（仕様書 §11 R3「rAF の最終コールバックで target 値をそのまま `formatManYen(target)` で表示」）。
  - クリーンアップ関数:
    ```ts
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    ```
  - これによりアンマウント時・依存変更時の双方で必ず rAF がキャンセルされる（受け入れ条件「アンマウント時に rAF が確実にキャンセルされ、メモリリークしない」）。

  #### 1-h. options のデフォルト適用
  - `useEffect` の依存配列に object をそのまま入れると、呼び出し側がインラインで `{ duration: 1200 }` を渡したとき毎回参照が変わって再アニメする。これを避けるため、フック先頭で個別の値をローカル変数に展開:
    ```ts
    const duration = options?.duration ?? DEFAULT_DURATION_MS;
    const easingFn = options?.easing ?? easeOutCubic;
    const enabled = options?.enabled ?? true;
    ```
  - 依存配列は `[target, duration, easingFn, enabled, reducedMotion]` とし、`easing` 関数は呼び出し側が `useCallback` または安定参照（`easeOutCubic` 自身など）を渡す前提。Issue 受け入れ条件には「`easing` の参照が変わったら再アニメするか」は明記されていないため、保守的に依存に含める（参照同一なら再起動しない）。
  - JSDoc コメントで「`easing` を毎レンダー新しい関数として渡すと再アニメが走るので、安定参照を渡してください」と注記する。

  #### 1-i. 戻り値
  ```ts
  return value;
  ```

- **理由**:
  - 受け入れ条件 5 件すべてを直接的に満たす実装になっている:
    1. **target 変更で滑らかに補間**: `useEffect` 依存配列の `target`、`startValueRef.current = valueRef.current` で現在値からの差分を再アニメ。
    2. **`prefers-reduced-motion: reduce` で即時 target**: §1-f / §1-g step 2 で実装。
    3. **アンマウント時 rAF キャンセル**: §1-g クリーンアップ関数で実装。
    4. **`enabled=false` で停止**: §1-g step 1 で実装。
    5. **差分なし時の無駄な再レンダー抑制**: §1-g step 3 で実装。
  - 仕様書 §6.1（duration 1,200ms / `easeOutCubic`）と §6.3（`matchMedia` 検出）に完全準拠。
  - 既存 `src/lib/*.ts` のスタイル（JSDoc ヘッダ、`docs/spec/*.md` への参照、モジュール定数の前置、`as const` / 名前付き export）を踏襲。

---

### 2. （任意）バレル export の追加
- **新規（任意）**: `/Users/YS/development/matatabi-calculator/src/hooks/index.ts`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  ```ts
  export { useCountUp, easeOutCubic } from "./useCountUp";
  export type { UseCountUpOptions } from "./useCountUp";
  ```
- **理由**:
  - `src/components/ui/index.ts` と同等のバレル export 慣行に揃える。
  - 後続 Issue #41 で `import { useCountUp } from "@/hooks";` と書けるようにする。
  - 単一フックのみのため必須ではないが、`src/hooks/` ディレクトリの最初のファイルとして規約を確立する意味で追加する。

---

## 設計上の考慮点

### A. 初期値を `0` にする判断
仕様書 §6.4 は「マウント時に 1 回発動」を要求しており、ヒーローカウンタが「0 万円から目的の値へ」立ち上がる UX が前提。`useState<number>(target)` で初期化すると初回マウントでアニメが起きないため、初期値は `0` 固定とする。target の初期値が `0` の場合は §1-g step 3 の差分なし判定で rAF が起動せず、無駄な再レンダーは発生しない。仕様書 §6.4 の「再診断時の再発動」は呼び出し側で `key={hash(result)}` を付与することでリマウントを強制する設計（仕様書 §11 R7）。

### B. `valueRef` と `setValue` の二重保持
`setValue` は React の state なので、同じ `useEffect` 内のクロージャから「最新の現在値」を読むのが難しい（state はレンダー毎にスナップショット）。`valueRef.current` を併用することで、次回 `target` 変更時に「直前のフレームで計算した補間値」から新 target へ続けて補間できる。仕様書 §11 R3 の「rAF の最終コールバックで target をそのまま」も `valueRef.current = target;` と併せて実現。

### C. `easing` の参照同一性
`useCallback` を使わない呼び出し側がインラインで `(t) => 1 - Math.pow(1 - t, 3)` を渡すと毎レンダー再アニメが走る。これを完全に防ぐには `useRef` で初回の easing 関数を凍結する設計もありうるが、Issue 本文の「差し替え可能」要件と「再レンダー抑制」要件は競合しうる。本実装は「default `easeOutCubic` を export しているので呼び出し側はそれを直接使うか `useCallback` で安定化する」前提とし、JSDoc に注記する保守的な設計を採用。

### D. SSR 境界
本フックは `"use client"` を付けない。`useEffect` を使うので、呼び出すコンポーネントは Client Component（`"use client"` 必須）である必要がある。仕様書 §11 R1（`ResultDashboard` / `DashboardView` は `"use client"` 必須）と整合。SSR 中はフックが呼ばれず、`window.matchMedia` の参照も発生しない。

### E. テスト不在の補完
`package.json` にテストフレームワークが未導入のため、本 Issue ではテストを追加しない。受け入れ条件のうち「rAF キャンセル」「再レンダー抑制」はコードレビューと、後続 Issue #41 での結合検証（DevTools の Performance パネルで rAF が target 到達後にスケジュールされていないこと、`React.Profiler` で不要な再レンダーが起きていないことの目視確認）で担保する。Vitest 導入は別 Issue に委ねる。

### F. `duration: 0` の扱い
仕様書 §6.3 に「`prefers-reduced-motion: reduce` のとき `duration: 0`」と例示あり。`useCountUp` 自体は `duration <= 0` のとき即座に `t = 1` で 1 フレームだけ rAF を回して target 到達させる実装にする（`reducedMotion` パスとほぼ等価だが、rAF を経由するので呼び出しタイミングは 1 フレーム遅れる）。`reducedMotion === true` パスは rAF を経由せず即時 `setValue(target)` するため、本当に「即時」になる。両者は仕様書 §6.3 の「即時最終値表示」と整合。

### G. 補間単位は円（万円ではない）
仕様書 §6.1「補間単位は円単位で補間し、表示時に `formatManYen` で万円に丸める」に従い、本フックは `number`（円）を返す。表示時に `formatManYen(value)` または `formatManYenCompact(value)` に渡すのは呼び出し側（`DashboardView` / `ResultDashboard`、後続 Issue #41）の責務。

### H. パスエイリアス `@/hooks/*` の追加検討
`tsconfig.json` の `paths` には `@/* → ./src/*` が定義済み。`@/hooks/useCountUp` で参照可能なので、`paths` 設定の追加は不要。

### I. ESLint ルールへの配慮
Next.js のデフォルト ESLint 設定（`eslint-config-next`）には `react-hooks/exhaustive-deps` が含まれる。`useEffect` 内の `easingFn` 等の参照を依存配列から落とすと警告が出るため、§1-h のとおり `[target, duration, easingFn, enabled, reducedMotion]` をすべて含める。

---

## 検証方法

1. `npm run typecheck` を実行し `strict` モードで型エラー 0 を確認。`UseCountUpOptions` の `easing` 関数シグネチャ、`useEffect` のクリーンアップ関数の戻り値型などが整合していること。
2. `npm run lint` を実行し、`react-hooks/exhaustive-deps` 警告を含む ESLint エラー 0 を確認。
3. `npm run build` を実行し本番ビルドが成功することを確認（`src/hooks/useCountUp.ts` がツリーシェイクで除去されないこと、`use client` 境界違反がないこと）。
4. **検証用の最小再現スニペットを `src/app/calculate/CalculatePageClient.tsx` に一時的に組み込み**（PR にコミットしない / レビュー後に rollback）、ブラウザで以下を手動確認:
   - 既定: マウント時に 0 → target へ約 1.2 秒で滑らかに補間。easeOutCubic 特有の「最初は速く、終盤に減速」のカーブが目視できる。
   - `target` を途中で変更: 現在の補間値からの差分で再アニメが起こる。
   - `enabled=false` を渡す: 値が更新されず保持される。`true` に戻すとそこから再アニメ。
   - `target` を同値に再設定: React DevTools の Profiler で再レンダーが発生しないこと、`Performance` タブで rAF が起動しないことを確認。
   - macOS の「視覚効果を減らす」を ON: アニメせず即時 target 表示。OFF に戻すと次回 mount で通常アニメに復帰。
5. **アンマウント時の rAF キャンセル検証**:
   - DevTools の `Memory` タブで「Performance monitor → JS heap size」を開き、`useCountUp` を持つコンポーネントを 100 回マウント／アンマウントしてもメモリが線形増加しないことを目視確認。
   - もしくは Chrome DevTools の `Performance` タブで `requestAnimationFrame` のスケジュール件数が、アンマウント後に増えないことを確認。
6. **コードレビュー観点**:
   - `useEffect` のクリーンアップで `cancelAnimationFrame` が必ず呼ばれること（return 文で if-then パターン）。
   - `valueRef` と `setValue` の二重書き込みが、前者は最新値の同期参照、後者はレンダリングトリガという責務分離になっていること。
   - `Math.min(1, elapsed / duration)` で `t > 1` を防いでいること。
   - 最終フレームで `valueRef.current = target; setValue(target);` の代入があること（浮動小数誤差打ち消し）。
   - `"use client"` ディレクティブを付けていない（呼び出し側で境界を引く設計）。
7. `grep -RE "#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}\b" src/hooks/useCountUp.ts` で HEX 直書きが 0 件であることを確認（フックなのでカラー参照は本来発生しないが、念のため）。
8. 後続 Issue #41 着手時にこのフックが `ResultDashboard` の指標カードへ正しく組み込めることを統合的に検証する（本 Issue のスコープ外、申し送り）。
