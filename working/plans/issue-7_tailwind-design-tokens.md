# Issue #7 実装プラン: Tailwind CSS のデザイントークンを設定する

> **採用パレット確定（2026-04-25）**: 新パレット「洗練されたニュアンス・キャット」を採用する。以降の実装は本プラン §1〜§10 を正として進める。§11（旧パレット案）は不採用のため参照不要。フォローアップ Issue（`docs/spec/*.md` と Issue #7 本文の旧パレット記述置換）は本 Issue とは別に起票する。

## 0. 前提の不整合と採用方針（最優先で読むこと）

本プランを書き始める前に、**Issue #7 本文の記述と、マスター設計書 `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` §3.3 のデザインガイドラインが食い違っている** 点を明示します。

| 観点 | Issue #7 本文 | マスター設計書 §3.3（最新） |
|---|---|---|
| ベース（背景） | `#F8FAFC`（Slate 50） | `#F8F6F2`（オフ・ホワイト） |
| アクセント A | `#3B82F6`（Blue 500） | `#9CAEB8`（ミスティ・ブルー）＝ CTA |
| アクセント B | `#F59E0B`（Amber 500） | （新パレットには存在しない） |
| テキスト | 未指定 | `#72665B`（アッシュ・ブラウン） |
| 境界線 / サブ | 未指定 | `#BEB5AA`（グレージュ） |
| タイポグラフィ | Inter / Noto Sans JP | 同左（Sans-serif） |

マスター設計書 §3.3 には次の注記があります（101 行目）:

> 既存 spec（`docs/spec/result-dashboard.md`, `docs/spec/warning-copy.md`, `docs/spec/pdf-report.md` 等）では旧パレット（Slate 50 / Blue 500 / Amber 500）を参照している箇所が残る。本パレット採用に伴う spec 側の置換はフォローアップ Issue で対応する。

**Issue #7 の本文が旧パレットのまま残置されているのは、上記の「フォローアップで置換」対象の取り漏れ**と判断するのが自然です（`docs/spec/result-dashboard.md:27`・`docs/spec/pdf-report.md:35` 等が旧パレットのままなのと同じ状況）。

### 採用方針（推奨）

**本プランでは新パレット「洗練されたニュアンス・キャット」で実装する第一案を推奨** します。根拠:

1. マスター設計書 §3.3 は「カラーパレット: 案27【洗練されたニュアンス・キャット】」を正として確定している。
2. Tailwind トークン名は全 UI に波及するため、後で旧→新へ置換するコストが `docs/spec/*.md` の文面置換よりはるかに大きい。
3. Issue #7 の注記で挙げられている「旧パレット残置」のパターンと同じ取り漏れと考えられる。

ただし Issue 本文を厳守する選択もあり得るため、§11 末尾に **旧パレット採用時の差分** も併記します。PR 着手前に Issue #7 コメント上で採用パレットの確認（1 行リプライで足りる）を取ることを推奨します。

### フォローアップ Issue への引継ぎメモ

本 Issue で新パレットを採用する場合、以下は本 Issue スコープ外としてフォローアップに送ります:

- `docs/spec/result-dashboard.md`（旧パレット前提の Blue 500 / Amber 500 記述と `#F8FAFC`）
- `docs/spec/pdf-report.md`（同上）
- `docs/spec/warning-copy.md`（Amber 500/600 前提の警告バナー）
- Issue #7 本文の置換（GitHub 上でのタイトル/本文修正、または Issue コメントでの追記）

---

## 1. 概要

Issue #7 のゴールは、Next.js 14 の雛形に対して **「プロジェクトで使うカラー／タイポグラフィを Tailwind のトークンに正規化し、どのコンポーネントからも `bg-base` / `text-text` / `font-sans` のような形でセマンティックに参照できる状態」** を用意することです。機能実装は含まず、後続 Issue（#8 依存ライブラリ追加、#10 共通スタイル展開、#2 の入力フォーム実装、#3 の結果ダッシュボード実装）が揺らぎなくクラス名を書けるだけの土台を作ります。

本 Issue の責任範囲:

- Tailwind の `theme.extend.colors` にパレットを登録
- `next/font/google` から Inter と Noto Sans JP を読み込み、Tailwind の `theme.extend.fontFamily.sans` に反映
- `src/app/globals.css` を新パレット前提に整理
- `src/app/page.tsx` を新トークンで書き換え、カラースウォッチ + フォントサンプルを足して視認確認できる最小サンプルを用意

本 Issue のスコープ外（Issue #10 / #8 / #9 へ委譲）:

- 余白（spacing）・角丸（borderRadius）・シャドウ（boxShadow）のトークン化 → **#10**
- `lucide-react` / `recharts` / `jspdf` / `html2canvas` の追加 → **#8**
- ロゴ・ファビコン・OGP・猫モチーフ素材 → **#9**

---

## 2. 採用カラートークン定義

### 2.1 命名戦略

Tailwind 標準の `slate-500` や `blue-500` のような **カラースケール命名** に寄せるか、ユースケース寄りの **セマンティック命名** にするかが最大の判断ポイント。

以下のハイブリッド方式を推奨します:

- **パレット名そのまま（中立キー）**: `offwhite` / `ash` / `greige` / `misty`
- **ロール別エイリアス（セマンティックキー）**: `base` / `text` / `border` / `accent`

エイリアスを併設する理由:

- 設計書 §3.3 がそもそも「役割」基準でパレットを定義している。`bg-base` / `text-text` / `border-border` と書けるのがレビュー可読性に有利。
- 将来「アクセントカラーを差し替えたい」となったときに `accent` の指す HEX だけ変えれば済む。
- 同時に中立キー（`bg-misty` など）も残すことで「CTA 以外で限定的にアクセント色を使いたい」場合にも対応可能。

### 2.2 HEX 直書き vs CSS 変数経由

**HEX 直書きを推奨**（Tailwind の `theme.extend.colors` に HEX を直接書き、CSS 変数は挟まない）。理由:

- 現状の `globals.css` にある `--background` / `--foreground` は `prefers-color-scheme: dark` でダーク上書きするためだけに存在するが、設計書にダークモード指定はなく（むしろ `result-dashboard.md:413` に「現時点ではライトモード前提」と明記）、CSS 変数で差し替える動機がない。
- CSS 変数経由にすると、PDF 生成（`html2canvas`）や Recharts の `fill={...}` などで JS 側から色を参照する際に `getComputedStyle` が必要になり複雑化する。HEX を `tailwind.config.ts` に集約すると `import colors from '@/styles/colors'` 的な再利用に進化させやすい（本 Issue では実施しないが拡張余地を残す）。
- `text-balance` 等のユーティリティは残すが、`:root` の `--background` / `--foreground` 定義と `@media (prefers-color-scheme: dark)` ブロックは削除する。

### 2.3 `tailwind.config.ts` 変更案

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // パレット名（中立キー）: マスター設計書 §3.3 案27「洗練されたニュアンス・キャット」
        offwhite: "#F8F6F2", // オフ・ホワイト
        ash: "#72665B",      // アッシュ・ブラウン
        greige: "#BEB5AA",   // グレージュ
        misty: "#9CAEB8",    // ミスティ・ブルー

        // ロール別エイリアス（セマンティックキー）
        base: "#F8F6F2",     // 背景
        text: "#72665B",     // 本文テキスト・強調・主線
        border: "#BEB5AA",   // 罫線・サブ背景
        accent: "#9CAEB8",   // CTA・リンク・グラフ強調
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-jp)",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
```

注意点:

- `text` キーは Tailwind の `text-*` プレフィックスと衝突しない（プレフィックスは `color`/`fontSize` 両方の接頭辞だが、`colors.text` のエントリは `text-text` として参照する形になり、Tailwind の名前解決上は問題ない）。ただし可読性で違和感があれば `ink`（文字のインク色）等に改名する案もあり、レビュー時に要相談。本プランでは役割名「テキスト」と 1:1 の `text` を第一候補に置く。
- `border` キーも同様に `border-border` として使う。Tailwind v3 では `border-DEFAULT` を定義すると `border` 単体クラスの色にもなるが、本 Issue では DEFAULT を設定せず明示名利用に統一する（DEFAULT 色は #10 で再検討）。

---

## 3. タイポグラフィ設定

### 3.1 `next/font/google` 導入方針

Next.js 14 標準の `next/font/google` を使用。追加パッケージは不要（`package.json` に載っている Next 14.2.35 に同梱）。

- **Inter**: ラテン文字・数値の可読性を担保（Sans-serif の中で近代的・B2B 向けの質感）
- **Noto Sans JP**: 日本語 UI の本体。フォールバックで Inter の後段に置き、Inter が持たない文字は Noto に渡す。
- `display: 'swap'`: ファーストペイントのブロックを回避（Cloudflare Pages でのビルド時取得に失敗した場合でも fallback が表示される）。
- `subsets`: Inter は `['latin']`、Noto Sans JP は公式に `['latin']` のみサポート（日本語グリフは `preload: false` + `weight` 指定で取得される設計。詳細は Next.js ドキュメント `next/font/google` 参照）。
- `weight`: Inter は `['400', '500', '700']`、Noto Sans JP は `['400', '500', '700']` に絞る。ガイドラインで本文 / 強調 / 見出し程度の段階しか想定しておらず、日本語フォントは特にウェイトあたりのファイルサイズが大きいため 3 種類に留める。
- `variable`: `--font-inter` / `--font-noto-sans-jp` として CSS 変数化し、Tailwind の `theme.extend.fontFamily.sans` に順序付きで差し込む。

### 3.2 フォールバックチェーンの順序

マスター設計書は「Inter **または** Noto Sans JP」と OR で記載しているが、日本語主体 UI である以上実質は両方使う。Inter を先頭、Noto Sans JP を後ろに並べることで:

- ラテン文字（数字含む）は Inter が優先描画
- 日本語文字は Inter に該当グリフがないため自動的に Noto Sans JP にフォールバック
- さらに後段に `system-ui` / `sans-serif` を置いてネットワーク取得失敗時の最終砦とする

### 3.3 `src/app/layout.tsx` 変更案

```tsx
import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false, // 日本語グリフは大きいので事前プリロードしない
});

export const metadata: Metadata = {
  title: "またたび計算機",
  description: "中小企業向け ROI 診断アプリ「またたび計算機」",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} ${notoSansJp.variable} bg-base text-text antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

ポイント:

- `body` の className から Geist 系 variable を除去し、Inter / Noto Sans JP の variable を付与。
- `bg-base text-text` を `<body>` で宣言（ページ個別クラスではなく共通化）することで、以降のページ実装で背景・文字色の明示指定を省略可能。
- `font-sans` は Tailwind のデフォルトで全要素に当たる（Tailwind preflight により `body` は `font-family: inherit` ではなく `font-sans` が効く設定となっているため、`body` クラスに明示しなくてよい）。

---

## 4. 既存 Geist フォントの扱い

**削除を推奨。** 理由:

- Issue #7 のタスク「Inter / Noto Sans JP を next/font で読み込み」は置換の意図（追加ではなく）として読むのが自然。
- Geist はマスター設計書で言及されていない（`create-next-app` のデフォルトに付属していたローカルフォント）。残すとフォールバックチェーンの曖昧化やビルドサイズ増の原因となる。
- Geist Mono は等幅フォントだが、現段階では等幅フォントを使う UI（コードブロック等）がなく、Issue #8 以降で必要になったタイミングで別途追加すれば十分。

### 削除対象

- `src/app/fonts/GeistVF.woff`
- `src/app/fonts/GeistMonoVF.woff`
- `src/app/fonts/` ディレクトリそのもの（空になるため）
- `src/app/layout.tsx` の `localFont` import と `geistSans` / `geistMono` 定義
- `src/app/page.tsx` の `font-[family-name:var(--font-geist-sans)]` クラス

### 影響範囲確認

- `src/app/page.tsx:3` の `font-[family-name:var(--font-geist-sans)]` を削除し、`font-sans`（Tailwind デフォルト）に頼る形にする。
- 他に `--font-geist-sans` / `--font-geist-mono` を参照している箇所は雛形 `page.tsx` のみ（git 管理下のソースは上記 3 ファイルのみ）。

---

## 5. `src/app/globals.css` 改修

### 5.1 変更方針

- `:root` の `--background` / `--foreground` 定義を削除（Tailwind トークンに統一）
- `@media (prefers-color-scheme: dark)` ブロックを削除（ライトモード限定のためガイドライン遵守）
- `body` の `color: var(--foreground)` / `background: var(--background)` / `font-family: Arial, Helvetica, sans-serif` を削除（`<body>` の Tailwind クラスで制御）
- `.text-balance` ユーティリティは残す（後続で見出しの balance 表示に使う想定）

### 5.2 変更例

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

これだけに縮退します。`@tailwind base` に preflight が含まれるため、Tailwind 側で `body` のデフォルトスタイルはリセットされ、フォントは `font-sans`（上で設定した Inter → Noto Sans JP → system-ui）で継承されます。

---

## 6. サンプルページでの反映確認

### 6.1 `src/app/page.tsx` 変更案

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-8">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">またたび計算機</h1>
        <p className="text-sm sm:text-base">
          現在準備中です。今しばらくお待ちください。
        </p>
        <p className="text-sm text-text/80">
          The quick brown fox jumps over the lazy cat. 1234567890
        </p>
      </section>

      {/* デザイントークン確認用スウォッチ（後続 Issue #10 で削除予定） */}
      <section aria-label="color tokens preview" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Color tokens</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded border border-border bg-base" />
            <span className="text-xs">base / #F8F6F2</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-text" />
            <span className="text-xs">text / #72665B</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-border" />
            <span className="text-xs">border / #BEB5AA</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-accent" />
            <span className="text-xs">accent / #9CAEB8</span>
          </li>
        </ul>
        <button
          type="button"
          className="mt-6 w-full rounded bg-accent px-4 py-2 font-medium text-base hover:opacity-90"
        >
          CTA サンプル（accent bg / base text）
        </button>
      </section>
    </main>
  );
}
```

ポイント:

- `<body>` で `bg-base text-text` が当たっているため `<main>` 側の bg/text 指定は不要。
- スウォッチは後続 Issue #10 で UI を本実装する際に削除する前提のコメントを残す。
- CTA ボタンで `accent` 背景に対する `base`（オフ・ホワイト）テキストのコントラストが許容できるか視認チェック（設計書 §3.3 は本文で「アクセント上のテキスト色」を明示していないため、視認結果に応じて #10 で再調整余地あり）。

### 6.2 確認チェックリスト

- [ ] ブラウザで `/` を開いたとき `<body>` 全面がオフ・ホワイト `#F8F6F2` で塗られている
- [ ] 本文テキストがアッシュ・ブラウン `#72665B` で描画されている（DevTools の Computed で確認）
- [ ] スウォッチの 4 色が設計書通りの HEX で表示されている
- [ ] 「またたび計算機」の見出しが Noto Sans JP で描画されている（DevTools → Rendered Fonts）
- [ ] "The quick brown fox" 行の英数字が Inter で描画されている（同上、Inter が当たっているか確認）
- [ ] Network タブで Inter と Noto Sans JP のサブセット/ウェイトファイルが取得されている
- [ ] Arial / Helvetica / Geist が Rendered Fonts に出現しない
- [ ] prefers-color-scheme: dark に切り替えても背景色が変化しない（ダーク上書きが除去されていること）

---

## 7. 実装ステップ（順序）

1. `tailwind.config.ts` を §2.3 の内容に差し替え（colors に新パレット + エイリアス、fontFamily.sans に CSS 変数チェーン）。
2. `src/app/layout.tsx` を §3.3 の内容に差し替え（Inter / Noto Sans JP 導入、Geist 削除、`<body>` に `bg-base text-text` 付与）。
3. `src/app/globals.css` を §5.2 の最小構成に縮退。
4. `src/app/page.tsx` を §6.1 の内容に差し替え（Geist クラス除去、スウォッチ追加）。
5. `src/app/fonts/GeistVF.woff` / `GeistMonoVF.woff` / `src/app/fonts/` を削除。
6. `npm run lint` → `npm run typecheck` → `npm run build` を順に実行して全てグリーン確認。
7. `npm run dev` で §6.2 のチェックリスト実行、DevTools のスクリーンショットを Issue コメント or PR 本文に添付。
8. コミットは 1 コミットで可（変更範囲が狭く、機能的に不可分）。PR タイトル例: `feat(design): Tailwind トークンと Inter/Noto Sans JP を設定 (#7)`。

---

## 8. 変更が必要なファイル一覧

変更:
- `/Users/YS/development/matatabi-calculator/tailwind.config.ts`
- `/Users/YS/development/matatabi-calculator/src/app/layout.tsx`
- `/Users/YS/development/matatabi-calculator/src/app/globals.css`
- `/Users/YS/development/matatabi-calculator/src/app/page.tsx`

削除:
- `/Users/YS/development/matatabi-calculator/src/app/fonts/GeistVF.woff`
- `/Users/YS/development/matatabi-calculator/src/app/fonts/GeistMonoVF.woff`
- `/Users/YS/development/matatabi-calculator/src/app/fonts/`（空ディレクトリ）

無変更（参照のみ）:
- `/Users/YS/development/matatabi-calculator/postcss.config.mjs`
- `/Users/YS/development/matatabi-calculator/package.json`（`next/font` は Next 標準なので追加依存なし）
- `/Users/YS/development/matatabi-calculator/tsconfig.json`
- `/Users/YS/development/matatabi-calculator/next.config.mjs`

---

## 9. 動作確認手順

### 9.1 ローカル開発

```bash
npm run dev
# ブラウザで http://localhost:3000 を開く
```

確認項目は §6.2 のチェックリスト。特に以下を必ず実施:

- DevTools → Elements → `<body>` の Computed styles で `background-color` が `rgb(248, 246, 242)` / `color` が `rgb(114, 102, 91)` であること。
- DevTools → Network（Disable cache チェック）で `fonts.gstatic.com` への Inter / Noto Sans JP のフォントリクエストが発生していること（初回ロード時）。`Noto_Sans_JP` は `preload: false` のため HTML `<link rel="preload">` は出ないが、レンダリング時に動的取得される。
- DevTools → Rendered Fonts パネル（Chrome: Elements パネル下部、Rendered Fonts タブ）で見出し要素に "Noto Sans JP" が、英数字要素に "Inter" が表示されていること。
- OS の「外観モード」をダークに切り替えて、画面配色が変わらないこと（`prefers-color-scheme: dark` 除去の回帰テスト）。

### 9.2 静的チェック

```bash
npm run lint       # Next ESLint (eslint-config-next 14.2.35)
npm run typecheck  # tsc --noEmit
npm run build      # 本番ビルドで Tailwind の purge + next/font のビルド時フォント取得を実地確認
```

`npm run build` で次を確認:

- ビルド警告に `next/font` がフォント取得に失敗した旨の警告が出ていないこと。
- `.next/static/media/` 配下に Inter / Noto Sans JP のフォントファイルが出力されていること。
- Geist の woff がビルド成果物に混入していないこと（`grep -r Geist .next/` で 0 件を期待）。

---

## 10. 考慮事項・リスク

### 10.1 旧パレット / 新パレット選択の意思決定（最重要）
§0 参照。PR 着手前に Issue コメントで採用パレットを明示的に確定する。

### 10.2 Tailwind トークン命名の後戻りコスト
`base` / `text` / `border` / `accent` の 4 トークンは全 UI コンポーネントで使われるため、後から名前変更すると全ファイル grep 置換が必要。本 Issue でコミットする前にレビューで命名を確定させること。特に `text` が Tailwind の `text-*` プレフィックスと視覚的に紛らわしい懸念があれば `ink` / `fg` / `primary` に改名する選択肢あり。

### 10.3 `next/font/google` のビルド時フォント取得
`next/font/google` はビルド時にフォントファイルをダウンロードするため、オフライン CI 環境では失敗する。Cloudflare Pages のビルド環境はインターネット接続可のため問題ないが、**ローカル CI (act 等) やエアギャップ環境を将来使う場合は `next/font/local` への切り替え** が必要になる。本 Issue スコープでは採用しない。

### 10.4 日本語フォントのビルドサイズ
Noto Sans JP はウェイトあたり ~1MB 級（サブセット後）。3 ウェイト（400/500/700）で合計 ~3MB 前後。`preload: false` にしているため HTML にプリロードリンクは出ないが、初回表示時の FOUT/FOIT が気になる場合は `display: 'swap'` + `font-display: swap` 挙動を確認のこと。ウェイトをさらに絞るなら `400` / `700` の 2 ウェイトに減らす選択肢あり。

### 10.5 CTA テキスト色のコントラスト
アクセント色 `#9CAEB8`（ミスティ・ブルー）上にオフ・ホワイト `#F8F6F2` テキストを載せた場合、コントラスト比は WCAG AA（4.5:1）を満たさない可能性が高い（目視で淡い組み合わせ）。CTA ボタンの最終配色は **#10 / 本実装の個別 Issue で再検討** する旨を PR コメントに残しておく。本 Issue では「トークン整備」に集中し、CTA 視認性の最終判定は持ち込まない。

### 10.6 `text-balance` の CSS 標準サポート
`text-wrap: balance` は 2025 年時点で Chromium / Safari / Firefox の最新版で対応済。IE / 旧 Edge は本プロジェクトの対象外のため問題なし。

### 10.7 フォローアップ Issue の引継ぎメモ

Issue #7 本文と `docs/spec/result-dashboard.md:27`, `docs/spec/pdf-report.md:35,255,258,345-347`, `docs/spec/warning-copy.md:27,86,88,208-210,223,423,494-495` 等に残る旧パレット（Slate 50 / Blue 500 / Amber 500 / Slate 600-700）参照を、新パレット語彙（ベース `#F8F6F2` / アクセント `#9CAEB8` / テキスト `#72665B` / サブ `#BEB5AA`）に置換するフォローアップ Issue を別途起票する。本 Issue の PR 本文にこの引継ぎを明記する。

---

## 11. 旧パレット（Issue #7 文言厳守）を採用する場合の差分

万一の意思決定で旧パレットを選ぶ場合の `tailwind.config.ts` 差分のみ参考として記載。その他（`layout.tsx` / `globals.css` / `page.tsx` のタイポグラフィ関連）は新パレット採用時と同じ。

```ts
// colors 部分のみ差し替え
colors: {
  slate50: "#F8FAFC",   // 背景ベース
  blue500: "#3B82F6",   // アクセント A（Blue 500）
  amber500: "#F59E0B",  // アクセント B（Amber 500）

  base: "#F8FAFC",
  accent: "#3B82F6",      // Blue
  accentWarn: "#F59E0B",  // Amber（警告バナー用）
}
```

この場合、テキスト色トークン（`text`）・境界線トークン（`border`）は設計書側に指定がないため、Issue #10 に委譲する（本 Issue では `<body>` に明示的な text 色は置かず、Tailwind の preflight デフォルトに任せる）。

---

## 12. アウトオブスコープ（再掲）

- **Issue #8**: `lucide-react`, `jspdf`, `html2canvas`, `recharts` の依存追加。
- **Issue #9**: ロゴ・ファビコン・OGP 画像・猫モチーフ素材。
- **Issue #10**: 余白（`theme.extend.spacing`）、角丸（`theme.extend.borderRadius`）、シャドウ（`theme.extend.boxShadow`）、コンポーネント粒度の共通スタイル、ダークモード（採用可否含む）、CTA 等のコントラスト最終調整。
- **フォローアップ Issue（別起票）**: `docs/spec/*.md` と Issue #7 本文の旧パレット記述の新パレット置換。
