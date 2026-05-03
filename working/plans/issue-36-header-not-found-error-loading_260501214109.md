# Issue #36 実装プラン: Header / 404 / error / loading の整備（公開準備の残ピース）

## Context

Issue #34 の本デザイン化により `/` のマーケティング LP は完成したが、本番公開・営業利用前の App Router 規約ファイル群（Header / `not-found.tsx` / `error.tsx` / `loading.tsx`）が未整備。商談先に URL を共有する前のブランド体験として致命的な穴であり、特に以下が課題:

- グローバル Header 非存在 → ロゴ / トップ復帰動線 / 診断 CTA 入口がページ固有の Hero に依存
- `not-found.tsx` 未配置 → URL 直打ち時に Next.js デフォルトの英語 404 が表示されブランド毀損
- `error.tsx` 未配置 → 想定外エラー時に Next.js デフォルト英語画面
- `loading.tsx` 未配置 → 将来 Suspense 境界導入時に空白画面

`/calculate` 本実装（Issue #2 / #3）、警告バナー（Issue #4）、PDF レポート（Issue #5）、`/privacy` / `/terms` のドラフト警告バナー撤去、ロゴ / OGP 暫定アセット差し替えはいずれも別 Issue のため本 Issue のスコープ外。Issue #34 で確立したアートディレクション（編集記号 eyebrow / グレイン / ブラシ下線 / 猫モチーフ / `animate-fade-up`）を踏襲し、サイト全体の体験を統一する。

GitHub Issue: #36

---

## 変更対象ファイル

### 1. Header コンポーネントの新規作成

- **新規**: `/Users/YS/development/matatabi-calculator/src/components/ui/Header.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - サーバーコンポーネント（`"use client"` 不要）。`forwardRef` は不要（呼び出しは `RootLayout` 直下のみ、`Footer` と同方針）。
  - props 設計:
    ```ts
    export type HeroNavCtaConfig = {
      label: string;       // デスクトップ表示時のラベル
      shortLabel?: string; // モバイル表示時の短縮ラベル（任意。未指定時は label を使用）
      href: string;        // 遷移先（既定値は呼び出し側で "/calculate"）
    };
    export type HeaderProps = {
      className?: string;          // 任意。RootLayout 側で sticky 挙動を変えたい場合の上書き用
      cta?: HeroNavCtaConfig;      // 任意。未指定時は内部で既定の "診断を始める" / "/calculate" を使う
    };
    ```
    > 既定値運用の理由: `RootLayout` で全ページ共通描画する際、毎回コピーを渡さずに済む。コピー差し替えや A/B テスト時のみ props で上書きする。
  - 構造:
    - 外殻: `<header role="banner" className="sticky top-0 z-40 border-b border-line/30 bg-canvas/80 backdrop-blur-sm">`。`sticky` は Tailwind の `position: sticky` ユーティリティ。`backdrop-blur-sm` は WebKit プレフィックス出力済（Tailwind 3.4 の標準動作）。
    - 内側: `<div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:h-16 sm:px-8">`（高さ 56px / 64px）。
    - 左: `<Link href="/" aria-label="またたび計算機 トップページ">` で `next/image` の `<Image src="/brand/logo-header.svg" alt="" aria-hidden="true" width={200} height={40} priority className="h-7 w-auto sm:h-8" />` をラップ。`aria-label` を `Link` 側で持ち、Image 側は `alt=""` + `aria-hidden` にしてアクセシブル名重複を回避。
    - 右: `<Link href={cta.href} className={...}>` で Issue #34 の secondary 系統スタイル `border border-line bg-canvas text-ink hover:bg-line/30` を再構築する CTA。`size="sm"` 相当（`h-9 px-3 text-sm sm:h-10 sm:px-4 sm:text-base`）。`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2` を付与。
    - 右 CTA のラベル切替: 既定値 `{ label: "診断を始める", shortLabel: "診断 →", href: "/calculate" }`。レンダリングは `<span className="sm:hidden">{cta.shortLabel ?? cta.label}</span><span className="hidden sm:inline">{cta.label}</span>` の二重描画方式（CSS のみで Hydration ミスマッチを起こさない）。
    - 右 CTA 内のアイコン: `lucide-react` の `ArrowRight` を `<ArrowRight aria-hidden="true" className="hidden h-4 w-4 sm:inline-block" />` で sm 以上のみ表示。モバイルではラベル末尾の「→」文字で代替（短縮形 "診断 →"）。
  - className 構成例:
    ```tsx
    <Link
      href={cta.href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "border border-line bg-canvas text-ink hover:bg-line/30",
        "transition-colors duration-150",
        "h-9 px-3 text-sm sm:h-10 sm:px-4 sm:text-base",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      )}
    >
    ```
  - a11y:
    - ロゴ `Link` に `aria-label="またたび計算機 トップページ"`（`docs/brand/README.md` の SVG 内蔵テキスト依存問題回避のため、SVG 単体の文字に頼らずアクセシブル名は `aria-label` で確定）。
    - `<header role="banner">` を明示（`<header>` 直下が `<body>` でない場合に備えた保険）。
    - `prefers-reduced-motion` 対応: backdrop-blur や sticky は動作系ではないため追加対応不要。`globals.css` の `@media (prefers-reduced-motion: reduce)` は `animate-fade-up` のみ抑制しているため Header に影響なし。
- **理由**: 受け入れ条件 #1（全ページに Header）/ #2（ロゴ → `/`、CTA → `/calculate`）/ #5（独自 HEX 不混入）/ #6（focus ring 2px）/ #8（375 / 768 / 1280px 崩れなし）/ #10（reduced-motion 対応）を満たす。`Footer` と同じ最小設計（`forwardRef` なし、`variant` なし、外部依存ゼロ）に揃え、`docs/design-tokens.md` §8.1 / §8.2 の YAGNI 原則を継承する。

### 2. Header の re-export 追加

- **変更**: `/Users/YS/development/matatabi-calculator/src/components/ui/index.ts`
- **変更箇所**: ファイル末尾（現状 9 行、`Footer` / `Accordion` 等を re-export している直後に追記）
- **変更内容**:
  ```ts
  export { Header } from "./Header";
  export type { HeaderProps, HeroNavCtaConfig } from "./Header";
  ```
- **理由**: 既存 `Button` / `Card` / `Footer` / `Accordion` と同パターンで一括 re-export。`@/components/ui` からの import 経路を統一し、Issue #34 plan §1 と同様のバレル設計を継続する。

### 3. RootLayout に Header を組込

- **変更**: `/Users/YS/development/matatabi-calculator/src/app/layout.tsx`
- **変更箇所**:
  - import 行（4 行目: `import { Footer } from "@/components/ui/Footer";` の直前または直後）
  - 81〜84 行目の `<div className="flex min-h-screen flex-col">` 内（Footer の前に Header を追加）
- **変更内容**:
  - import 追加: `import { Header } from "@/components/ui/Header";`（Footer の import パターンを踏襲）。
  - レイアウト構造:
    ```tsx
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
    ```
  - Header は props を渡さず既定値（CTA = `/calculate` / "診断を始める"）で動作させる。
- **理由**: 受け入れ条件 #1（全ページに Header）。`Footer` の配置パターン（`flex min-h-screen flex-col` の最上部に積む）を踏襲しつつ Header の sticky 挙動は CSS 側で完結。`<div className="flex-1">` で main コンテンツが残余高さを取る既存挙動は維持される（sticky な Header は通常フローから外れない、`position: sticky` は親フレックスのレイアウト計算に影響しない）。

### 4. `src/app/not-found.tsx` の新規作成

- **新規**: `/Users/YS/development/matatabi-calculator/src/app/not-found.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - サーバーコンポーネント（Next.js App Router 規約: `not-found.tsx` は静的可）。
  - `metadata` 設定:
    ```ts
    export const metadata: Metadata = {
      title: "ページが見つかりません",
      robots: { index: false, follow: false },
    };
    ```
    `layout.tsx` の `title.template` により出力 title は `ページが見つかりません | またたび計算機`。
  - 構造（中央寄せ、Issue #34 のアートディレクション継承）:
    ```tsx
    <main
      aria-labelledby="not-found-heading"
      className="relative flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 sm:px-8 sm:py-28"
    >
      <div aria-hidden="true" className="bg-grain pointer-events-none absolute inset-0 -z-10 opacity-100" />
      <Image
        src="/brand/cat-deco-1.svg"
        alt=""
        aria-hidden="true"
        width={160}
        height={160}
        className="pointer-events-none mb-6 h-24 w-24 -rotate-12 opacity-60 sm:h-28 sm:w-28 animate-fade-up"
      />
      <div className="animate-fade-up [animation-delay:80ms]">
        <SectionEyebrow number="404" label="Not Found" align="center" />
      </div>
      <h1
        id="not-found-heading"
        className="mt-5 text-balance text-3xl font-bold leading-tight text-ink sm:text-4xl animate-fade-up [animation-delay:160ms]"
      >
        お探しのページは<span className="underline-brush">見つかりません</span>でした
      </h1>
      <p className="mt-5 max-w-md text-center text-base leading-relaxed text-ink/80 animate-fade-up [animation-delay:240ms]">
        URL のご入力に誤りがあるか、ページが移動・削除された可能性があります。お手数ですが、トップページからお探しください。
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-6 text-base font-medium text-canvas shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 animate-fade-up [animation-delay:320ms]"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        トップページへ戻る
      </Link>
    </main>
    ```
  - コピー本文（Plan 内で確定）:
    - eyebrow 番号: `404`、ラベル: `Not Found`
    - 見出し: 「お探しのページは見つかりませんでした」（accent ワード `見つかりません` をブラシ下線で強調。Hero の `数字` を強調する `underline-brush` パターン継承）
    - 本文: 「URL のご入力に誤りがあるか、ページが移動・削除された可能性があります。お手数ですが、トップページからお探しください。」
    - CTA ラベル: 「トップページへ戻る」、`href="/"`
- **理由**: 受け入れ条件 #3（日本語 404）/ #5（トークンのみ）/ #6（focus ring）/ #8（レスポンシブ）/ #9（404 は noindex で SEO 計測対象外）。`SectionEyebrow` を 404 番号のラベル付け装置として再利用することで LP のアートディレクションを統一しつつ、視覚的な疎外感を避ける。`underline-brush` / `animate-fade-up` / `cat-deco-1.svg` / `bg-grain` を再利用し独自 CSS は追加しない。

### 5. `src/app/error.tsx` の新規作成

- **新規**: `/Users/YS/development/matatabi-calculator/src/app/error.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - **`"use client"` 必須**（Next.js App Router 規約: `error.tsx` は client component）。
  - props（Next.js 規約）:
    ```ts
    type ErrorPageProps = {
      error: Error & { digest?: string };
      reset: () => void;
    };
    ```
  - `useEffect` で `console.error(error)` を残し、本番でも開発環境のブラウザコンソールにスタックを残す（テレメトリ未配備のため最低限の自助手段。`process.env.NODE_ENV` で抑制してもデバッグ時に困るので無条件で残す）。
  - 構造:
    ```tsx
    "use client";
    import { useEffect } from "react";
    import Image from "next/image";
    import Link from "next/link";
    import { ArrowLeft, RefreshCw } from "lucide-react";
    import { SectionEyebrow } from "@/components/landing/SectionEyebrow";

    export default function ErrorPage({ error, reset }: ErrorPageProps) {
      useEffect(() => {
        console.error(error);
      }, [error]);

      const isDev = process.env.NODE_ENV === "development";

      return (
        <main
          aria-labelledby="error-heading"
          className="relative flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 sm:px-8 sm:py-28"
        >
          <div aria-hidden="true" className="bg-grain pointer-events-none absolute inset-0 -z-10 opacity-100" />
          <Image
            src="/brand/cat-deco-1.svg"
            alt=""
            aria-hidden="true"
            width={160}
            height={160}
            className="pointer-events-none mb-6 h-24 w-24 rotate-6 opacity-50 sm:h-28 sm:w-28 animate-fade-up"
          />
          <div className="animate-fade-up [animation-delay:80ms]">
            <SectionEyebrow number="500" label="Error" align="center" />
          </div>
          <h1
            id="error-heading"
            className="mt-5 text-balance text-3xl font-bold leading-tight text-ink sm:text-4xl animate-fade-up [animation-delay:160ms]"
          >
            申し訳ありません、予期せぬエラーが発生しました
          </h1>
          <p className="mt-5 max-w-md text-center text-base leading-relaxed text-ink/80 animate-fade-up [animation-delay:240ms]">
            一時的な問題の可能性があります。お手数ですが、再読み込みをお試しください。問題が解消しない場合はトップページへお戻りください。
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 animate-fade-up [animation-delay:320ms]">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-6 text-base font-medium text-canvas shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <RefreshCw aria-hidden="true" className="h-5 w-5" />
              再読み込み
            </button>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-canvas px-6 text-base font-medium text-ink transition-colors duration-150 hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              トップページへ戻る
            </Link>
          </div>
          {isDev ? (
            <details className="mt-10 max-w-2xl rounded-xl border border-line/50 bg-canvas p-4 text-left text-xs text-ink/70 shadow-card">
              <summary className="cursor-pointer font-medium text-ink">エラー詳細（開発環境のみ表示）</summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                {error.message}
                {error.digest ? `\n\ndigest: ${error.digest}` : null}
              </pre>
            </details>
          ) : null}
        </main>
      );
    }
    ```
  - コピー本文（Plan 内で確定）:
    - eyebrow 番号: `500`、ラベル: `Error`
    - 見出し: 「申し訳ありません、予期せぬエラーが発生しました」
    - 本文: 「一時的な問題の可能性があります。お手数ですが、再読み込みをお試しください。問題が解消しない場合はトップページへお戻りください。」
    - 主 CTA: 「再読み込み」（`reset()`）
    - 副 CTA: 「トップページへ戻る」（`<Link href="/">`）
  - `error.tsx` は `<button>` を使う唯一の箇所（`reset()` がクライアント関数のため `<Link>` 化不可）。`Button` コンポーネントを import して `variant="primary"` で描画しても良いが、`docs/design-tokens.md` §9 の「クラス再構築運用」に合わせ Hero / 404 / error / loading で見た目を完全に揃えるため、Button コンポーネントは介さず `<button>` に直接クラスを当てる方針（DRY 違反より統一感を優先、Issue #34 plan §「Button を Link で描画する方針」継承）。
- **理由**: 受け入れ条件 #4（`reset()` 呼び出しとトップ遷移の両動線）/ #5 / #6 / #8。`process.env.NODE_ENV === "development"` 分岐は本番ビルド時に Next.js が dead code elimination で自動削除するため、本番バンドルに `error.message` 表示は混入しない。

### 6. `src/app/loading.tsx` の新規作成

- **新規**: `/Users/YS/development/matatabi-calculator/src/app/loading.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - サーバーコンポーネント（Suspense fallback として使われるため client 化不要）。
  - `output: "export"` で実運用時の発火頻度は低いが、将来 Suspense 境界を入れた際の fallback として最小実装を置く。
  - 構造:
    ```tsx
    import Image from "next/image";

    export default function Loading() {
      return (
        <main
          role="status"
          aria-live="polite"
          aria-label="読み込み中"
          className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 py-20 sm:px-8 sm:py-28"
        >
          <Image
            src="/brand/cat-deco-1.svg"
            alt=""
            aria-hidden="true"
            width={96}
            height={96}
            className="h-16 w-16 animate-pulse opacity-70 motion-safe:animate-spin sm:h-20 sm:w-20"
          />
          <p className="text-sm font-medium text-ink/70 sm:text-base">読み込み中...</p>
          <div aria-hidden="true" className="flex w-full max-w-sm flex-col gap-2">
            <span className="h-3 w-full animate-pulse rounded-md bg-line/30" />
            <span className="h-3 w-3/4 animate-pulse rounded-md bg-line/30" />
          </div>
        </main>
      );
    }
    ```
  - `motion-safe:animate-spin` で `prefers-reduced-motion: reduce` の場合は回転を抑制（Tailwind の `motion-safe:` バリアント標準動作）。代わりに `animate-pulse` のみが残るが、`animate-pulse` も Tailwind 3.4 では `motion-safe` で囲わない限り常時動作するため、`motion-safe:animate-pulse` は付けず「点滅程度の動きは prefers-reduced-motion でも許容」とする運用判断（過剰な抑制を避ける、`globals.css` で `animate-fade-up` のみ明示停止している方針と整合）。
  - `role="status"` + `aria-live="polite"` で SR が「読み込み中」を読み上げる。
  - コピー本文（Plan 内で確定）:
    - 本文: 「読み込み中...」
- **理由**: 受け入れ条件 #1（全ページに Header）と直接関係はないが、App Router 規約ファイル整備の一環。Suspense 境界導入時の白画面回避保険。動きはトークン範囲内で完結。

---

## 設計上の考慮点

### `frontend-design` スキルとの併用方針

Issue 末尾の「実装スキル指定」に従い、本プランの **実装フェーズ（コード生成）では `frontend-design` スキルを必ず併用** する。具体的な適用ポイント:

- **Header の sticky / backdrop-blur / ロゴ + CTA 配置のレイアウト微調整**、**404 / error の中央寄せ装飾レイアウト**、**loading のスケルトン構成** を `frontend-design` 起動時に提案させる。
- ただしスキル出力は **そのままマージしない**。本リポジトリの制約:
  - フォントは Inter / Noto Sans JP のみ（`src/app/layout.tsx` で next/font 読込済）
  - カラーは canvas / ink / line / accent の 4 ロール固定（独自 HEX 禁止）
  - `tailwind-merge` / `cva` 不採用
  - `tailwindcss-animate` 不採用
  - 状態管理ライブラリ追加禁止
- 採用方向性: **Issue #34 で確立した編集記号 / グレイン / ブラシ下線 / 猫モチーフのアートディレクションを継承**。スキル生成プロンプトに「Continuation of an existing 'soft refined Japanese B2B' design system, off-white canvas (#F8F6F2), ash-brown ink (#72665B), greige line (#BEB5AA), misty-blue accent (#9CAEB8), reuse SectionEyebrow + underline-brush + bg-grain + animate-fade-up + cat-deco-1.svg motifs, no new tokens」を含める。

### Issue #34 で導入したユーティリティ・コンポーネントの再利用方針

| アセット | 404 | error | loading | Header |
|---|---|---|---|---|
| `bg-grain` | 採用（背景の紙質感） | 採用（同左） | 不採用（控えめにする） | 不採用（透明感優先） |
| `underline-brush` | 採用（見出し `見つかりません` を強調） | 不採用（エラー時に過剰演出を避ける） | 不採用 | 不採用 |
| `SectionEyebrow` | 採用（`number="404" label="Not Found"`） | 採用（`number="500" label="Error"`） | 不採用（読み込み UI は最小限） | 不採用 |
| `animate-fade-up` | 採用（段階表示） | 採用（同左） | 不採用（loading 自体が動く UI） | 不採用（sticky で常時表示） |
| `cat-deco-1.svg` | 採用（回転 -12°、控えめ） | 採用（回転 +6°、控えめ） | 採用（`animate-spin`） | 不採用（ロゴと競合） |

`SectionEyebrow` を `number="404"` / `number="500"` で再利用することで、LP の「番号 ── ラベル」パターンを 404 / error にも継承し、サイト全体のアートディレクションを統一する。`SectionEyebrow` は `number: string` 型のため数字以外も渡せる（既存実装で型は柔軟）。

### Header の sticky / backdrop-blur 動作確認（`output: "export"` / Safari / iOS）

- `position: sticky` は Safari 13+ / iOS Safari 13+ で完全サポート（caniuse スコア 97%+）。`@supports (position: sticky)` フォールバックは不要。
- `backdrop-filter: blur()` は iOS Safari では `-webkit-backdrop-filter` プレフィックスが必要だが、Tailwind 3.4 の `backdrop-blur-*` ユーティリティは両プレフィックスを自動出力する（生成 CSS で `-webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);` の二行が出る）。
- `output: "export"` は Next.js のビルド出力モードであり、CSS の挙動には影響しない。`next build` 後に出力された `out/_next/static/css/*.css` を grep して `-webkit-backdrop-filter` を含むこと、および `out/index.html` に `<header>` が含まれることをビルド検証で確認する。
- iOS Safari で sticky が崩れる典型ケース「親に `overflow: hidden` がある」「親 flex の `align-items: stretch` で高さが伝播しない」は本実装で発生しない（`<div className="flex min-h-screen flex-col">` 直下の `<header>` で `overflow` 指定なし）。

### Footer / Header の二重描画防止

`src/app/layout.tsx` の `RootLayout` で Header と Footer を全ページ共通で描画する。`src/app/page.tsx` / `src/app/calculate/page.tsx` / `src/app/privacy/page.tsx` / `src/app/terms/page.tsx` のいずれにも `<Header>` を直接呼ばない。Issue #34 plan §「Footer の二重描画防止」と同方針。

### `<Link>` を Button スタイルで描画する方針

`docs/design-tokens.md` §8.1「`asChild`（Radix Slot 相当）は持たない。`<Link>` を Button スタイルで描画したい場合はラップして対応する」に従う。Header CTA / 404 トップ遷移 / error トップ遷移はすべて `<Link>` + Button クラス再構築で実装。`error.tsx` の「再読み込み」のみ `reset()` を呼ぶため `<button>` を使う（クライアントコンポーネント内、唯一の例外）。Button コンポーネント自体を介さない理由は、Hero / ClosingCta / 404 / error で Link / button が混在する際にスタイルを完全に揃えるための運用上の判断（Issue #34 plan で既に確立した方針の継続）。

### 状態管理ライブラリ追加禁止

`error.tsx` の `useEffect` / `reset()` 以外でクライアント状態は持たない。Header の sticky / モバイル CTA 切替は CSS のみ（`hidden sm:inline` パターン）。

---

## 検証方法

### 1. ビルド・型チェック・Lint

- `npm run lint`（受け入れ条件 #7）
- `npm run typecheck`（同上）
- `npm run build`（同上、`output: "export"` で `out/` に静的ファイル出力されること）

### 2. 静的 HTML での Header / 404 / loading の存在確認

- `npm run build` 後、以下を grep で確認:
  - `out/index.html` / `out/calculate.html` / `out/privacy.html` / `out/terms.html` の `<body>` 内に `<header role="banner">` が存在し、`/calculate` への CTA Link と `/` へのロゴ Link が含まれること（受け入れ条件 #1 / #2）
  - `out/404.html` が生成されており、見出し「お探しのページは見つかりませんでした」と CTA「トップページへ戻る」が含まれること（受け入れ条件 #3）
  - `out/404.html` の `<head>` に `<meta name="robots" content="noindex,nofollow">` が含まれること（受け入れ条件 #9）
- `error.tsx` は client component のため `out/` 静的 HTML には初期描画されないが、`out/_next/static/chunks/app/error-*.js` が生成されていることを確認。

### 3. ローカル動作検証（404 / error / loading）

- `npm run build && npx serve out -p 3000` で静的サーバ起動。
- **404 動作確認**: `http://localhost:3000/foo` / `/bar/baz` 等の存在しないパスにアクセスし、日本語の 404 ページが表示されること（Next.js デフォルト英語画面でないこと）。Next.js 静的エクスポート時の挙動として `serve` は `404.html` を fallback として返す。
- **error boundary 動作確認**: `next dev` 環境で一時的に LP 内に `throw new Error("test")` を埋め込み、`error.tsx` がレンダリングされ「再読み込み」ボタンで復帰、トップ遷移リンクで `/` に戻れることを確認（検証後コードを戻す）。本番 `output: "export"` では `error.tsx` のフォールバック発火経路は限定的だが、開発時に動作確認しておくことで Hydration 失敗時の挙動が担保される。
- **loading 動作確認**: `next dev` 環境で `app/page.tsx` を一時的に async + 1 秒 sleep するサーバーコンポーネント化して `loading.tsx` の発火を確認（検証後コードを戻す）。`output: "export"` では実運用時の発火頻度は極めて低いため、開発環境での視認確認のみで受け入れ。

### 4. Lighthouse 計測（受け入れ条件 #9）

- `npm run build && npx serve out -p 3000` でローカル静的サーバ起動。
- Chrome DevTools の Lighthouse タブで以下を **モバイル / Performance + Accessibility + SEO** 設定で計測:
  - `http://localhost:3000/`（Header 含む LP）
  - `http://localhost:3000/foo`（存在しないパスで 404 ページが返るか）
- 目標: モバイル Accessibility ≥ 95 / SEO ≥ 95（404 は `noindex` で SEO 計測対象外、Accessibility は計測対象）。
- 不足時: 見出し階層（404 / error の `<h1>` が 1 個か）/ Image alt（装飾は `alt=""` + `aria-hidden`）/ link name（ロゴリンクの `aria-label`）/ contrast（次項）を見直し、再計測。

### 5. コントラスト比測定（受け入れ条件 #5）

- 対象: Header CTA（`bg-canvas text-ink` ≈ 5.0:1 / `border-line bg-canvas text-ink` も同等）、404 / error 見出し（`text-ink on bg-canvas` ≈ 5.0:1）、404 / error 本文（`text-ink/80 on bg-canvas` ≈ 4.0:1）、loading 本文（`text-ink/70 on bg-canvas` ≈ 3.5:1、補助情報のため許容）。
- 確認手段: Chrome DevTools の Inspect → 要素のスタイル欄でコントラスト比をホバー表示、または <https://webaim.org/resources/contrastchecker/>。
- 不適合があれば `text-ink/70` → `text-ink/80` などで持ち上げる。

### 6. キーボード操作・フォーカスリング検証（受け入れ条件 #6）

- LP / `/calculate` / `/privacy` / `/terms` / 404 / error を開き、Tab キーのみで以下の順に到達可能なこと:
  1. Header ロゴ Link → Header CTA Link → main コンテンツ → Footer Links
- フォーカスリングが accent 色 2px で表示されること（`globals.css` の `*:focus-visible` 設定）。
- Header CTA / 404 CTA / error の「再読み込み」「トップへ戻る」に `focus-visible:ring-2 focus-visible:ring-offset-2` で 2 重リング（outline + ring）が出ることを確認。

### 7. レスポンシブ確認（受け入れ条件 #8）

- Chrome DevTools のレスポンシブモードで 375 / 768 / 1280px の 3 ブレークポイントで以下を目視:
  - Header: ロゴ高さ 28px → 32px、CTA ラベル「診断 →」 → 「診断を始める」、高さ 56 → 64px の切替
  - 404: 猫モチーフ 96px → 112px、見出し 30px → 36px、CTA 中央寄せ
  - error: 同上 + 主/副 CTA が 375px で縦積み、768px+ で横並び
  - loading: スケルトンブロックが画面幅に応じて伸縮、回転アイコンの中央配置維持

### 8. Header の Safari / iOS 動作確認（実機 / 仮想）

- ローカル `npx serve out` 起動後、以下を確認:
  - macOS Safari（最新）でスクロール時に Header が画面上部に固定され、背景に薄いブラー効果（`backdrop-blur-sm`）が発生
  - iOS Safari（実機 or Xcode Simulator）で同様の sticky + blur 動作
  - `prefers-reduced-motion` 設定（macOS: システム環境設定 → アクセシビリティ → ディスプレイ → 視差効果を減らす）で Header に崩れが出ないこと（`globals.css` の `@media (prefers-reduced-motion: reduce)` は `animate-fade-up` のみ抑制、Header に影響なし）
- 実機検証が困難な場合: Cloudflare Pages の Preview デプロイ URL で iPhone 実機から動作確認。

### 9. `frontend-design` 適用結果のクロスチェック

スキル生成結果が以下の制約を逸脱していないことを目視レビュー:

- フォントが Inter / Noto Sans JP のみ
- カラーが canvas / ink / line / accent の HEX 4 種のみ（独自 HEX 混入なし）
- `tailwind.config.ts` への変更がない（本 Issue ではトークン更新なし）
- `tailwindcss-animate` / `clsx` / `tailwind-merge` 等の追加依存がない

---

### Critical Files for Implementation

- `/Users/YS/development/matatabi-calculator/src/components/ui/Header.tsx`
- `/Users/YS/development/matatabi-calculator/src/app/layout.tsx`
- `/Users/YS/development/matatabi-calculator/src/app/not-found.tsx`
- `/Users/YS/development/matatabi-calculator/src/app/error.tsx`
- `/Users/YS/development/matatabi-calculator/src/app/loading.tsx`
