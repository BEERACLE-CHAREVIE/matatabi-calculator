# 警告バナー WarningBanner コンポーネント実装プラン

## Context
更新待ち期間が 3 ヶ月以上の場合、機会損失の重大性をユーザーに強く伝えるため、結果ダッシュボード上部に「CRITICAL OPPORTUNITY LOSS」警告バナーを表示する。文言・色・タイポ・条件は `docs/spec/warning-copy.md`（実装時の正本）で確定済み。`ResultDashboard` は既に `headerSlot` を備えており、本 Issue では「バナー本体の新規実装」「親コンポーネントでの組み立て」「`CalculationOutput` 型への動的差し込み用フィールド追加」「フェードインアニメーション用 Tailwind 設定追加」を対象とする。
GitHub Issue: #42

## 採用方針（重要な前提決定）
- **props 形状**: 仕様書 §5.1 の「単一 UI + 動的数字差し込み」方針に従い、`severity: "critical" | "warning" | null` ではなく **構造化 `message` props（`{ headline, subtext }`）** を採用する。Issue 本文では `severity` 案も挙がっているが、現行仕様では critical しか存在せず多段化しない決定がなされているため、severity を露出させると不要な抽象化となる。
- **判定の所在**: 表示可否（`speedWarning && insourcingLevel !== 1`）は仕様書 §4.3.3 の擬似コードどおり**親（`CalculatePageClient`）で行い**、非表示時は `headerSlot` 自体を渡さない。`WarningBanner` 自身は「描画専用」とし、null を返す責務を持たない。これにより `ResultDashboard` 側の `{headerSlot ? <div>{headerSlot}</div> : null}` 既存ロジックがそのまま機能し、`Card` 内 line 276-280 の予備注記（バナー非表示時のみ表示される `headerSlot` 不在分岐）も意図どおり動作する。
- **動的差し込み**: 仕様書 §7.1 / §7.3 / §9 に沿って、`CalculationOutput` に `speedWarningMonthlyLoss: number`（円単位）を追加。`buildCriticalOpportunityLossMessage(result.speedWarningMonthlyLoss)` の戻り値を `message` props に渡す。
- **アクセシビリティ**: `role="alert"` を採用（フェードイン直後のマウントで読み上げ起動）。`aria-live="polite"` は `role="alert"` が暗黙に `aria-live="assertive"` を持つため重複付与しない。アイコンは `aria-hidden="true"`。
- **カードコンポーネント**: 既存 `Card` は `bg-canvas border-line/50` で固定スタイルのため、`bg-accent/10 border-accent` を要する警告バナーには流用せず、**独立した `<div>` ベース実装**とする。
- **アニメーション**: `tailwind.config.ts` に `keyframes.fadeIn` と `animation.fadeIn` を新規定義し、`motion-safe:animate-fadeIn` で適用する。代替案（インライン `<style>` / `globals.css` 追記）は後述の理由で不採用。

## 変更対象ファイル

### 1. `CalculationOutput` に `speedWarningMonthlyLoss` を追加
- **変更**: `/Users/YS/development/matatabi-calculator/src/lib/calculation.ts`
- **変更箇所**:
  - `CalculationOutput` インターフェース（lines 52-59）にプロパティ追加
  - 型直前の JSDoc コメント（lines 46-51）に新フィールドの説明追記
  - `calculate()` 関数本体（lines 123-165）の戻り値オブジェクト
- **変更内容**:
  - `CalculationOutput` に `speedWarningMonthlyLoss: number;` を追加（円単位、`speedWarning === true` のときのみ非ゼロ）。
  - `calculate()` 内で `safeNum` 済みの `monthlyVendorCost` と算出済み `insourcingGap` を用い、`const speedWarningMonthlyLoss = updateWaitMonths >= SPEED_WARNING_THRESHOLD_MONTHS ? clampAmount(monthlyVendorCost * insourcingGap) : 0;` を追加。`speedWarning` の真偽値リテラル `updateWaitMonths >= SPEED_WARNING_THRESHOLD_MONTHS` を中間変数 `const speedWarning = ...` に切り出し DRY 化。
  - 戻り値オブジェクトに `speedWarning` と `speedWarningMonthlyLoss` を含める。
- **理由**: 仕様書 §7.3「`CalculationOutput` に `speedWarningMonthlyLoss: number`（円単位）を追加」。バナーで万円四捨五入 + 3 桁区切りに整形するため、計算層は円単位の浮動小数で保持し UI 層で整形する既存方針と整合する。

### 2. メッセージ生成ヘルパの新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/lib/messages.ts`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - JSDoc ヘッダ（仕様: `docs/spec/warning-copy.md §3.1 / §3.3 / §7.1 / §7.4 / §9`、設計: 純粋関数で UI 非依存、依存ゼロ）。
  - `export const CRITICAL_OPPORTUNITY_LOSS_HEADLINE = "CRITICAL OPPORTUNITY LOSS";`
  - `export function buildCriticalOpportunityLossSubtext(monthlyLossYen: number): string` — 仕様書 §7.4 擬似コードどおり。`monthlyLossYen <= 0` でフォールバック `"3ヶ月以上の更新待ちで機会損失が累積中"`、それ以外は `Math.round(monthlyLossYen / 10_000)` を `toLocaleString("ja-JP")` で 3 桁区切り化し `"現在、月額 ${manYen} 万円相当の機会損失が発生中"` を返す。
  - `export function buildCriticalOpportunityLossMessage(monthlyLossYen: number): { headline: string; subtext: string }` — 上記 2 つを束ねる。
  - `export type CriticalOpportunityLossMessage = { headline: string; subtext: string };`（`WarningBanner` の props 型で再利用）。
- **理由**: 仕様書 §7.4 が「実装時の正本」として定めた擬似コードを正規実装する。`format.ts` には円→万円整形が既存だが、ここで要する「`Math.round(yen / 10_000)` + ja-JP ロケール 3 桁区切り + 接頭辞 / 接尾辞付き文字列」はメッセージ専用のため、`messages.ts` に分離して責務を区切る。

### 3. `WarningBanner` コンポーネントの新規作成
- **新規**: `/Users/YS/development/matatabi-calculator/src/components/calculate/WarningBanner.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - `"use client"` 指示子（既存 `calculate/` 配下のコンポーネントが client component の慣習に揃える）。
  - JSDoc ヘッダ（仕様: `docs/spec/warning-copy.md §3〜§7 / §9`、設計: 親側で表示判定済み・本コンポーネントは描画専用、依存: `lucide-react/AlertTriangle`、`@/lib/cn`、`@/lib/messages`（型は構造体のみ参照））。
  - `export type WarningBannerProps = { message: CriticalOpportunityLossMessage; className?: string };`
  - 実装本体: ルート `<div role="alert" className={cn("flex items-start gap-3 rounded-xl border border-accent bg-accent/10 px-4 py-4 sm:px-5 sm:py-5 min-h-[64px] motion-safe:animate-fadeIn", className)}>`。
    - 左側: `<AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-accent mt-0.5" />`（仕様書 §3.2 / §6.1 の 20×20px、`text-accent` を反映。`mt-0.5` で見出しのベースラインに整える）。
    - 右側テキスト群: `<div className="flex flex-col gap-1">` で 2 段。
      - 見出し: `<p className="text-base font-bold uppercase tracking-warning text-ink sm:text-lg">{message.headline}</p>`（仕様書 §3.2 / §6.2 の 16〜18px / 700 / `tracking-warning` / `text-ink` / 全大文字。`uppercase` を付与し将来文字列が変わっても大文字維持）。
      - サブ: `<p className="text-xs leading-relaxed text-ink/80 sm:text-sm">{message.subtext}</p>`（§6.2 のスマホ 12〜13px / デスクトップ 13〜14px / 行間 1.4〜1.5）。
  - `import { AlertTriangle } from "lucide-react";`、`import { cn } from "@/lib/cn";`、`import type { CriticalOpportunityLossMessage } from "@/lib/messages";`。
- **理由**: 仕様書 §3.2 / §3.3 / §6.1 / §6.2 / §6.3 / §6.4 のビジュアル仕様、§4 の表示条件は親で判定済みのため、このコンポーネントは「整形済み message を受け取り描画する」純粋表示コンポーネントとなる。`role="alert"` で受け入れ条件「スクリーンリーダーで適切に読み上げられる」を満たす。

### 4. Tailwind にフェードインアニメーション定義を追加
- **変更**: `/Users/YS/development/matatabi-calculator/tailwind.config.ts`
- **変更箇所**: `theme.extend` セクション（lines 10-50）。`letterSpacing` の隣に `keyframes` と `animation` を追加。
- **変更内容**:
  ```ts
  keyframes: {
    fadeIn: {
      "0%": { opacity: "0" },
      "100%": { opacity: "1" },
    },
  },
  animation: {
    fadeIn: "fadeIn 300ms ease-out both",
  },
  ```
- **理由**: 仕様書 §6.4「フェードイン 300ms のみ」に対応。`motion-safe:animate-fadeIn` を `WarningBanner` のルートに付与することで、`prefers-reduced-motion: reduce` 時は Tailwind の `motion-safe:` バリアントが自動的にクラス適用を抑止し、JS フック不要で reduced-motion 対応が完結する。
- **代替案不採用理由**:
  - インライン `<style>` 内 `@keyframes`: コンポーネントごとにスタイルを散らかし、SSR 時の重複出力リスクあり。
  - `globals.css` への `@keyframes fadeIn` 直書き: Tailwind 側の `theme.extend.animation` で管理した方が `motion-safe:` バリアントとの組み合わせが自然で、`tailwind.config.ts` を読めば全アニメ一覧が把握できる。

### 5. `CalculatePageClient` から WarningBanner を組み立てて差し込み
- **変更**: `/Users/YS/development/matatabi-calculator/src/app/calculate/CalculatePageClient.tsx`
- **変更箇所**: import ブロック（lines 1-8）と `<ResultDashboard />` の props（lines 30-56）。
- **変更内容**:
  - `import { WarningBanner } from "@/components/calculate/WarningBanner";` と `import { buildCriticalOpportunityLossMessage } from "@/lib/messages";` を追加。
  - `result` が非 null の枝で `const showWarningBanner = result.speedWarning && submitted.insourcingLevel !== 1;`（仕様書 §4.3.3）を算出。
  - `<ResultDashboard />` に `headerSlot={ showWarningBanner ? <WarningBanner message={buildCriticalOpportunityLossMessage(result.speedWarningMonthlyLoss)} /> : undefined }` を追加。
- **理由**: 仕様書 §4.3 / §5.1 / §7 の「親で判定 → 構造化メッセージを生成 → 描画専用コンポーネントに渡す」分担に従う。`ResultDashboard` 側は `headerSlot` 受け口が既に整っており、ダッシュボード本体への変更は不要。

### 6. `ResultDashboard.tsx` は変更しない（明示的に意図確認）
- **変更なし**: `/Users/YS/development/matatabi-calculator/src/components/calculate/ResultDashboard.tsx`
- **判断理由**:
  - `headerSlot` プロパティと `{headerSlot ? <div>{headerSlot}</div> : null}` 描画は既に存在（lines 86-90, 139）。
  - lines 276-280 の予備注記 `{result.speedWarning && !headerSlot ? <p ...>更新待ち期間が 3 ヶ月以上のため、機会損失が継続中の可能性があります。</p> : null}` は、本 Issue 実装後に `insourcingLevel === 1`（バナー非表示・`headerSlot` 渡されない）かつ `speedWarning === true` のケースでのみ意味を持つ「予備テキスト」として機能する。本 Issue では削除しない。
  - `ACCENT_HEX` 定数（line 43）も無関係。

## 設計上の考慮点

- **`severity` props 案を採用しない理由**: Issue 本文では `severity: "critical" | "warning" | null` または「`CalculationOutput` から判定するヘルパー関数を呼ぶ」案が示されているが、仕様書 §5.1 が「単一 UI + 動的数字差し込み（多段化しない）」と確定している。severity を受け入れると将来の warning レベル追加に備えた抽象を作ったように見えるが、現仕様には critical しかなく、null は親側で「`headerSlot` を渡さない」で表現する方が表示判定の所在が明確になる。`message` 構造化 props 案は以下の利点で勝る:
  - 文言生成（円 → 万円整形 + フォールバック）を `messages.ts` の純粋関数にカプセル化でき、ユニットテスト可能。
  - WarningBanner は描画のみ担当する純表示コンポーネントとなり、責務が単一になる。
  - 仕様書 §7.4 の擬似コード `buildCriticalOpportunityLossMessage` の戻り値型（`{ headline, subtext }`）と直結し、仕様書追従が物理的に明示される。
- **コントラスト比の見積り**: 背景 `bg-accent/10`（#9CAEB8 の α=0.10）が `bg-canvas`（#F8F6F2）と合成されると概ね #F4F2EE 相当。見出し `text-ink`（#72665B）の対比は約 4.7:1 で WCAG AA（4.5:1）を満たす想定。サブ `text-ink/80`（#72665B α=0.80）は約 4.2:1 となり 14px / 400 では境界線上のため、検証時に DevTools の Accessibility パネルで実測するステップを検証フェーズに含める。サブが境界を割る場合は `text-ink/85` に上げる調整を許容する（仕様書 §6.1 の `text-ink/80` を実装上の起点として保持しつつ、AA 必達条件を優先）。
- **`role="alert"` vs `aria-live="polite"`**: `role="alert"` は暗黙に `aria-live="assertive"`。診断結果は明示的にユーザーが「診断する」を押した直後に出るため、即時通知の `assertive` で問題ない。ノイズ過多と判断された場合のみ将来 `aria-live="polite"` に切り替える余地を残す（コード上はコメントで意図を明示）。
- **アイコンの `aria-hidden`**: 見出しテキストが `CRITICAL OPPORTUNITY LOSS` なので、アイコンを読み上げから外しても情報量は減らない。`role="alert"` 配下では `aria-hidden="true"` で意味を持たないアイコンを排除する。
- **`headerSlot={undefined}` の挙動**: ResultDashboard 側 line 139 の `{headerSlot ? ... : null}` 条件は falsy で false を返すため、明示的に `undefined` を渡せばバナー領域自体が DOM に出ない。

## フォローアップ（本 Issue スコープ外）
- 仕様書 §11.1 / §11.2 / §13.3 に明記された通り、以下は別 PR で対応:
  - `docs/spec/calculation-logic.md §5` に `speedWarningMonthlyLoss: number` 追記
  - `docs/spec/result-dashboard.md §8.2 / §8.3 / §8.5 / §10.3` の文言更新
- 本 Issue では実装契約に必要な型拡張（`CalculationOutput.speedWarningMonthlyLoss`）のみを行い、spec 本体の追記はスコープ外。
- バナーの単体テスト / Storybook 化（プロジェクト現状で test runner / Storybook 未導入のため）は本 Issue では追加しない。
- `globals.css` の `animate-fade-up` を `tailwind.config.ts` 管理へ移行する整理（重複定義の整理）も本 Issue 外。

## 検証方法
1. **静的型検査**: `npx tsc --noEmit` を実行し、`CalculationOutput` 拡張の影響（`ResultDashboard.tsx` の `result` 利用 / 既存呼び出し元 `CalculatePageClient.tsx`）に型エラーが出ないことを確認。
2. **Lint**: `npm run lint`（Next.js 14 標準 ESLint 設定）でエラーゼロを確認。
3. **ビルド**: `npm run build` を実行し、Tailwind の `keyframes`/`animation` 拡張が正しく解釈されてバンドルが成功することを確認。
4. **`npm run dev` 上での目視検証**:
   - 入力例 1: `更新待ち期間 = 4`, `内製化レベル = 0%`, `月額委託費 = 100 万円` → バナー表示・サブテキスト「現在、月額 100 万円相当の機会損失が発生中」が出る。
   - 入力例 2: `更新待ち期間 = 4`, `内製化レベル = 100%` → バナー非表示。`Card` 内の予備注記も非表示（`speedWarning && !headerSlot && insourcingLevel === 1` のケース）。仕様書 §4.3 の「`insourcingLevel === 1` は非表示」を確認。
   - 入力例 3: `更新待ち期間 = 2`, `内製化レベル = 0%` → バナー非表示・`Card` 内予備注記も非表示。
   - 入力例 4: `更新待ち期間 = 4`, `内製化レベル = 50%`, `月額委託費 = 0` → サブテキストがフォールバック「3ヶ月以上の更新待ちで機会損失が累積中」になる（`monthlyLossYen <= 0`）。
5. **アクセシビリティ確認**:
   - DevTools Accessibility パネルで `role="alert"` が出力され、見出し + サブの全テキストが読み上げ対象に含まれることを確認。
   - VoiceOver（macOS）で実機読み上げを 1 度確認し、診断ボタン押下から WarningBanner の発話に至る流れを検証。
   - DevTools の Lighthouse / アクセシビリティタブで `bg-accent/10` 上の `text-ink`、`text-ink/80` のコントラスト比が AA を満たすか実測。割れる場合は `text-ink/80` を `text-ink/85` 〜 `text-ink/90` に微調整。
6. **reduced-motion 検証**: macOS「視差効果を減らす」ON または DevTools Rendering タブで `prefers-reduced-motion: reduce` をエミュレートし、バナー表示時にフェードインが発火しないことを確認（`motion-safe:animate-fadeIn` のクラスが効かなくなる）。
7. **見た目の最終確認**: モバイル幅（375px）/ タブレット幅（768px）/ デスクトップ幅（1024px）で、バナー高 64px〜96px の範囲に収まり、見出しの `tracking-warning`（0.06em）/ uppercase / 700 が利いていることを目視確認。アイコンと見出しが 12px ギャップ（`gap-3` = 0.75rem ≒ 12px）で配置されていることを仕様書 §3.2 と照合。
