# Issue #34 実装プラン: `/` をマーケティング LP として本デザイン化（コピー・FAQ・OGP 含む）

## Context

現状の `/`（`src/app/page.tsx`）はデザイントークン確認用のプレースホルダ（5 セクションの TODO プレビュー）であり、本番公開・営業利用前にマーケティング LP として作り直す必要がある。本 Issue では以下のアーキテクチャ判断も同時に確定する。

- `/` = マーケティング LP（本 Issue のスコープ）
- `/calculate` = 診断ツール本体（ルーティング配置のみ確定。実装は後続 Issue #2 / #3 / #4 / #5）
- Hero と終端 CTA「計算を始める」は `/calculate` へ遷移

デザイントークン（Issue #7 / #10 で確定済み: canvas / ink / line / accent + spacing / radius / shadow 運用ルール）と UI 雛形（`Button` / `Card` / `Footer`）を最大限活用し、新規追加は LP 用セクションコンポーネントと汎用 Accordion のみとする。

GitHub Issue: #34

---

## 変更対象ファイル

### 1. ルートページをマーケティング LP として再構築

- **変更**: `/Users/YS/development/matatabi-calculator/src/app/page.tsx`
- **変更箇所**: ファイル全体（現在の `Home` コンポーネントの `<main>` 内すべて、計 116 行を全置換）
- **変更内容**:
  - 既存の TODO 5 セクション（カラー / 角丸・シャドウ / タイポ / Button / Card プレビュー）を完全撤去。
  - 以下 6 セクション（Footer は `layout.tsx` 側で全ページ共通配置済みのため LP 内では描画しない）を縦に積む構造に書き換え:
    1. `<Hero>`
    2. `<ProblemSection>`
    3. `<ValuePropSection>`
    4. `<HowItWorks>`
    5. `<FAQ>`
    6. `<ClosingCta>`（終端 CTA。Hero と差別化した文言で「計算を始める」へ再誘導）
  - ページレベルの `metadata` を `/` 専用に上書きする `export const metadata: Metadata` を追加（layout.tsx 側のデフォルトを継承しつつ、`alternates.canonical: "/"`、`openGraph.url: "/"`、`twitter.images: ["/opengraph-image.png"]` 等を補強。`title` / `description` は LP 訴求向けにチューニング）。
  - `<main>` のラッパは `mx-auto max-w-screen-xl` ベースとし、各セクションが横幅制御を内部で持てるよう `<main className="flex flex-col">` のシンプル構造にする。背景装飾は Hero 内部で `public/brand/cat-deco-1.svg` を `<Image>` または `<svg>` で配置（`aria-hidden="true"`、`docs/brand/README.md` の運用ルールに従う）。
- **理由**: Issue 受け入れ条件 #1（TODO 5 セクション撤去 → LP 7 セクション表示）および #3（`metadata` API でメタタグ設定）を満たす。Footer は `src/app/layout.tsx` で既に全ページ共通描画されているため LP 内で再呼び出ししない（重複防止）。

### 2. `/calculate` プレースホルダ Route の新設

- **新規**: `/Users/YS/development/matatabi-calculator/src/app/calculate/page.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - `"use client"` は不要（純粋な静的プレースホルダ）。
  - `metadata` を最小限設定（`title: "ROI 診断 | またたび計算機"` / `description: "5 つの質問に答えるだけで、IT コストの止血額と機会損失を診断します。"` / `robots: { index: false, follow: true }` ※プレースホルダ段階では `noindex` で本 LP との重複ヒットを避ける。Issue #2 完了時に `index: true` に切替）。
  - 本文は中央寄せの簡素な案内（`<main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">`）で、見出し「診断ツールは現在準備中です」、本文「Issue #2 / #3 で実装予定です。」、`<Link href="/">` で LP へ戻る導線を設置。
  - 既存 `src/app/privacy/page.tsx` と同等の構造（`<main>` + `<article>` + 戻りリンク）を踏襲して書式を統一。
- **理由**: Issue 受け入れ条件 #2（`/calculate` ルート追加、Hero / 終端 CTA から遷移可能、プレースホルダ可）を満たす。後続 Issue #2 / #3 が本実装で上書きする前提のため、構造を最小化して将来差し替えコストをゼロにする。

### 3. ルートレイアウトのメタデータ強化

- **変更**: `/Users/YS/development/matatabi-calculator/src/app/layout.tsx`
- **変更箇所**: 28〜46 行目の `export const metadata: Metadata`
- **変更内容**:
  - `metadataBase` は維持（環境変数 `NEXT_PUBLIC_SITE_URL` 既存）。
  - `title` を `{ default: "またたび計算機 | IT コスト診断・ROI 試算ツール", template: "%s | またたび計算機" }` 形式に変更（子ページ `metadata.title` がフォーマット適用されるよう）。
  - `description` を 120〜160 文字の LP 標準形に拡張（後述「コピー本文ドラフト」§ メタ description 案を採用）。
  - `keywords: ["ROI", "IT コスト削減", "AI 駆動開発", "ベンダー依存", "中小企業"]` を追加。
  - `alternates: { canonical: "/" }` を追加（Footer 配下の LP がデフォルト canonical）。
  - `openGraph.images` は明示しない（`src/app/opengraph-image.png` 規約により Next.js が自動付与）。`twitter.images: ["/opengraph-image.png"]` のみ明示（Issue #9 plan §9.3 の指針に従いビルド環境差異に備える）。
  - `robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }` を追加。
- **理由**: Issue 受け入れ条件 #3（title / description / canonical / OG タグ設定）と Lighthouse SEO ≥ 95（受け入れ条件 #5）の達成。`title.template` 化は後続ページ（privacy / terms / calculate）の `title` を簡潔に書ける副次効果がある。

### 4. Hero セクション

- **新規**: `/Users/YS/development/matatabi-calculator/src/components/landing/Hero.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - サーバーコンポーネント（`"use client"` なし）。
  - props 設計:
    ```ts
    export type HeroProps = {
      headline: string;        // 必須、A 案文言を page.tsx で渡す
      subCopy: string;         // 必須
      ctaLabel: string;        // 必須
      ctaHref: string;         // 必須（既定値は呼び出し側で "/calculate"）
      meta?: ReadonlyArray<string>; // 任意。例: ["所要 5 分", "無料", "登録不要"]
    };
    ```
  - 構造: `<section>` 内に左右 2 カラム（モバイルは縦積み）。左に `<h1>` 見出し / サブコピー / CTA `<Link>` を `Button` スタイルで描画 / 補助メタ（`<ul>` 中点区切り）。右側に `public/brand/cat-deco-1.svg` を `next/image` の `<Image src="/brand/cat-deco-1.svg" width={400} height={400} priority alt="" aria-hidden />` で配置（`next.config.mjs` で `images.unoptimized: true` のため SVG をそのまま提供）。
  - CTA は `<Link href={ctaHref} className={...}>` を `Button` のクラスで描画する（`Button` は `<button>` ネイティブのため、`<Link>` はラップしない方針が `docs/design-tokens.md` §8.1 で明示されている）。具体的には Button のクラスを抜き出した CTA 用のローカル `cn(...)` で同等スタイルを当てる。
  - 背景: `bg-canvas` ベース + 微弱なグラデーション or 装飾 SVG。`docs/design-tokens.md` §3 のヒーロー上下余白 `py-12 sm:py-20` を採用、左右 `px-4 sm:px-8`。
  - h1 のフォントサイズは `text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance`（タイポトークンは Tailwind デフォルト使用、`text-balance` は `globals.css` の `@layer utilities` で既に定義済み）。
- **理由**: LP のファーストビュー。Issue 「ページ構成 #1」で求められる「キャッチ見出し / サブコピー / Button (primary, lg) / 補助メタ」を網羅。`<h1>` を 1 ページ 1 個（受け入れ条件 #6 / 見出し階層）に保つため、他セクションは `<h2>` から開始。

### 5. 課題提示セクション

- **新規**: `/Users/YS/development/matatabi-calculator/src/components/landing/ProblemSection.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - サーバーコンポーネント。
  - props 設計:
    ```ts
    type ProblemItem = { title: string; body: string; icon: ReactNode };
    export type ProblemSectionProps = { items: ReadonlyArray<ProblemItem> }; // 通常 3 件
    ```
  - 構造: `<section>` の `<h2>` + リード文 + `<ul>` 3 カラム（`grid grid-cols-1 gap-6 sm:grid-cols-3`）。各アイテムは既存 `Card` で囲み、`lucide-react` の暫定アイコン（`AlertTriangle` / `Hourglass` / `Coins` 等）を `text-accent` で描画。
  - 余白規約は `docs/design-tokens.md` §3 に従い `py-16 sm:py-20`、カード内は `p-6` デフォルト、`space-y-3`。
  - 猫モチーフはアイコン横に `cat-deco-1.svg` の縮小版を背景透かしで重ねる検討（`frontend-design` スキル併用時に判定）。
- **理由**: ターゲット（中小企業の経営者・役員）の痛みを言語化し、LP の課題提示パートを構成する。

### 6. 提供価値セクション

- **新規**: `/Users/YS/development/matatabi-calculator/src/components/landing/ValuePropSection.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - サーバーコンポーネント。
  - props 設計:
    ```ts
    type ValueItem = { title: string; body: string; icon: ReactNode };
    export type ValuePropSectionProps = { items: ReadonlyArray<ValueItem> }; // 3 件
    ```
  - 構造: `ProblemSection` と類似の 3 カラムだが、`Card` を `bg-line/10 border-line/40` で着色し「課題（前セクション）→ 解決（本セクション）」の対比を作る。
  - アイコンは `Calculator` / `TrendingDown` / `FileDown` 等を `lucide-react` から採用。
- **理由**: 計算機の提供価値（ROI 試算 / 機会損失の可視化 / PDF 出力）を 3 軸で提示。

### 7. 使い方 3 ステップ

- **新規**: `/Users/YS/development/matatabi-calculator/src/components/landing/HowItWorks.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - サーバーコンポーネント。
  - props 設計:
    ```ts
    type Step = { stepNumber: number; title: string; body: string };
    export type HowItWorksProps = { steps: ReadonlyArray<Step> }; // 3 件
    ```
  - 構造: 番号付きの横並びフロー（モバイルは縦積み）。各ステップ番号は `rounded-full bg-accent text-canvas h-12 w-12 flex items-center justify-center text-xl font-bold`。タイトル + 本文を縦に配置。ステップ間は `→` アイコン（`ArrowRight` from `lucide-react`、モバイルでは `ArrowDown`）。
  - h2 は「3 ステップで完了」、3 ステップは「① 5 つの質問に答える」「② 結果ダッシュボードを確認」「③ PDF レポートをダウンロード」。
- **理由**: 利用イメージを具体化し、LP からの離脱を防ぐ。

### 8. FAQ セクション

- **新規**: `/Users/YS/development/matatabi-calculator/src/components/landing/FAQ.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - サーバーコンポーネント。Accordion は子コンポーネントで `"use client"`。
  - props 設計:
    ```ts
    type FaqItem = { question: string; answer: string };
    export type FAQProps = { items: ReadonlyArray<FaqItem> }; // 4〜6 件
    ```
  - 構造: `<section>` + `<h2>「よくあるご質問」</h2>` + `<Accordion items={items} />`。
  - 内側は `Accordion` コンポーネントを使用（次項参照）。
- **理由**: 安心材料の提示と SEO（FAQ Page スキーマは将来対応、本 Issue では `<details>` 系のセマンティクスのみ確保）。

### 9. 汎用 Accordion コンポーネント

- **新規**: `/Users/YS/development/matatabi-calculator/src/components/ui/Accordion.tsx`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - **実装方針**: 受け入れ条件 #4「キーボード操作（Tab / Enter / Space）対応」を最も低コストで満たすため、ネイティブ `<details>` / `<summary>` を採用する。`useState` ベースの自前実装より a11y 標準準拠が優位。
  - props 設計:
    ```ts
    export type AccordionItem = {
      id: string;            // 必須（key とアンカー用）
      question: string;
      answer: string;
    };
    export type AccordionProps = {
      items: ReadonlyArray<AccordionItem>;
      className?: string;
    };
    ```
  - 構造: `<ul className="space-y-3">` の各 `<li>` に `<details className="group rounded-xl border border-line/50 bg-canvas shadow-card">` + `<summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-medium text-ink list-none [&::-webkit-details-marker]:hidden">{question}<ChevronDown className="transition-transform group-open:rotate-180" /></summary>` + `<div className="px-6 pb-4 text-sm text-ink/80 leading-relaxed">{answer}</div>`。
  - 既存 `Card` を `<details>` で代替するため `Card` は呼ばないが、視覚スタイルは Card と一致させ統一感を保つ（`docs/design-tokens.md` §4 / §5）。
  - サーバーコンポーネントとして実装可能（`<details>` ネイティブ動作のため `"use client"` 不要）。
  - `Accordion` を `src/components/ui/index.ts` に re-export 追加（既存 `Button` / `Card` / `Footer` と同様）。
- **理由**: Issue 受け入れ条件 #4「キーボード操作対応」と「汎用」要求を最小コストで満たす。`<details>` はブラウザネイティブで Tab / Enter / Space を標準サポートし、追加の JS が不要なため Lighthouse Performance / Accessibility スコアにも好影響。

### 10. 終端 CTA セクション

- **新規**: `/Users/YS/development/matatabi-calculator/src/components/landing/ClosingCta.tsx`
- **変更箇所**: 新規ファイル（コンポーネント名: `ClosingCta`）
- **変更内容**:
  - サーバーコンポーネント。
  - props 設計:
    ```ts
    export type ClosingCtaProps = {
      headline: string;
      body: string;
      ctaLabel: string;
      ctaHref: string;
    };
    ```
  - 構造: `<section className="bg-line/15 py-16 sm:py-20">` で背景色を切り替え（前セクションとの分離感）+ 中央寄せ `<h2>` + 本文 + Hero と異なる文言の CTA `<Link>`（Hero は「いますぐ計算を始める」、終端は「3 分で診断する」など）。
- **理由**: Issue 「ページ構成 #6」と「終端 CTA は Hero と異なる文言で再度誘導」要件を満たし、離脱防止の二段目 CTA を確保。

### 11. 仕様書側のメンテ（URL 例の `/calculate` ベース改訂）

- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/input-form.md`
- **変更箇所**: 全文 grep で URL 表記を確認。`/`（ルート）で InputForm を提示する記述があれば `/calculate` に書き換える（具体的にはスクリーンショット記述や URL 例の節）。
- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/result-dashboard.md`
- **変更箇所**: 同上。`/result` 等のサブルート言及があれば「Issue #3 で確定」と注記しつつ、当面 `/calculate` 内表示を前提とする旨を追記。
- **変更内容**: `/calculate` を仕様書側の正本パスに統一。
- **理由**: Issue 「仕様書側のメンテ」要求事項。後続 Issue #2 / #3 着手時の参照パスを統一する。

### 12. （条件付き）`docs/design-tokens.md` の Button primary コントラスト判定更新

- **変更（条件付き）**: `/Users/YS/development/matatabi-calculator/docs/design-tokens.md`
- **変更箇所**: §10 暫定 vs 確定の境界、`Button primary のコントラスト比` 行
- **変更内容**: Hero CTA で実際にプレビューしてコントラスト比 4.5:1 未満と判明した場合、ステータスを「要検討」→「確定」に更新し、採用案（(a) `text-ink` への変更 / (b) `bg-ink` への切替 / (c) パレット再調整）を反映。
- **理由**: Issue 受け入れ条件 #6（Hero CTA コントラスト比 WCAG AA 4.5:1 以上、不足時はトークン更新）。`#9CAEB8`（accent）on `#F8F6F2`（canvas）は約 1.8:1 で AA 不適合の可能性が高く、Hero では `text-canvas` を `text-ink` に切替、または `bg-ink text-canvas` に差し替える対応が現実的（WCAG コントラスト比計算: `#72665B` on `#F8F6F2` ≒ 5.0:1、AA 適合）。

### 13. （条件付き）robots.txt と sitemap

- **新規（条件付き）**: `/Users/YS/development/matatabi-calculator/src/app/sitemap.ts` および `/Users/YS/development/matatabi-calculator/src/app/robots.ts`
- **変更箇所**: 新規ファイル
- **変更内容**:
  - `sitemap.ts`: Next.js 14 の規約 (`MetadataRoute.Sitemap`) で `/`、`/calculate`、`/privacy`、`/terms` を列挙し、`changeFrequency`、`lastModified`、`priority` を設定。
  - `robots.ts`: `MetadataRoute.Robots` で `User-agent: *` / `Allow: /` / `Sitemap: ${SITE_URL}/sitemap.xml` を設定。
  - `next.config.mjs` で `output: "export"` のため、`app/sitemap.ts` / `app/robots.ts` は **静的書き出し対応**（Next.js 14 ドキュメント上、function 内で `process.env` 参照は問題なし）。
- **理由**: Issue 「3. SEO / OGP」の「`robots.txt` / `sitemap.xml` の整備が必要なら本 Issue で同時対応（要検討）」記述。Lighthouse SEO ≥ 95（受け入れ条件 #5）達成のため、最低限のサイトマップ設置は本 Issue 内で同時対応する。

---

## コピー本文ドラフト（Issue 受け入れ条件 #9 を満たすため Plan 内に下書き）

### Hero 見出し A/B 案

- **A 案**: 「IT コストが減らない理由は、もう数字で見えています。」
  - サブコピー: 「ベンダー費用、改修費、待ち時間。あなたの会社で発生している『止血できる金額』と『取り逃している利益』を、5 つの質問だけで可視化します。」
  - CTA: 「いますぐ計算を始める」
- **B 案**: 「3 分で、御社の IT 投資の『答え合わせ』をします。」
  - サブコピー: 「経営者が答えられる 5 つの質問だけ。AI 時代の内製化で取り戻せる 3 年間のコスト・利益・スピードを、その場で診断します。」
  - CTA: 「無料で診断する」

> **採用方針**: Issue Body 「コピー本文（A/B 案を 2 つ用意）」記載に従い 2 案を Plan に残し、実装時は「ブランドトーン（ふんわり・温かみ）」と「決裁者向け B2B 訴求」を両立する **A 案を初期採用**。レビュー段階で B 案への差し替えが容易なよう、コピーは `page.tsx` 内の定数として直書きする（外部 JSON 化はしない、YAGNI）。

### 補助メタ（Hero CTA 下）

- 「所要 約 5 分」「完全無料」「登録不要」「ブラウザ内で完結（送信なし）」

### 課題提示 3 件

1. **「毎月のベンダー費、何に使われているのか説明できない」**
   見積書の根拠が不明瞭なまま、改修のたびに数十万円が出ていく状態に違和感を覚えていませんか。
2. **「ちょっとした更新が、いつも 1 ヶ月待ち」**
   軽微な改修ですら数週間〜数ヶ月待ち。スピードを失った時間こそが、最大の機会損失です。
3. **「内製化したいが、何から始めるかわからない」**
   AI 駆動開発の選択肢は知っているものの、自社の IT コストに対する効果を数字で示せずにいませんか。

### 提供価値 3 件

1. **3 年間で『止血』できる金額を試算**
   ベンダー費用と改修費を入力するだけで、AI 駆動開発で削減できる 3 年間のコストが即座に算出されます。
2. **手作業で失っている『利益』を可視化**
   人手で行っている定型業務を時給換算し、年間の利益創出ポテンシャルを数値化します。
3. **その場で PDF レポートをダウンロード**
   診断結果は A4 1 枚の PDF として出力。社内稟議や経営会議の資料として、そのまま使えます。

### 使い方 3 ステップ

1. **5 つの質問に答える** — 月額ベンダー費用 / 改修費用 / 手作業人数 / 更新待ち期間 / 内製化状況。
2. **結果ダッシュボードを確認** — 3 年間のトータルインパクト、止血額、年間利益創出を一画面で。
3. **PDF レポートをダウンロード** — 経営会議用の A4 1 枚レポートを即時生成、ブラウザ内で完結。

### FAQ（4〜6 件）

1. **Q: 入力したデータはどこかに送信されますか？**
   A: いいえ。すべてお使いのブラウザ内で計算され、当社サーバーや第三者への送信は一切行いません。詳しくはプライバシーポリシーをご確認ください。
2. **Q: 試算結果はどのくらい正確ですか？**
   A: 業界標準値（時給 2,500 円、1 日 2 時間、月 20 営業日、年 3 回改修など）に基づく簡易試算です。実際の効果を保証するものではありませんが、コスト構造の妥当性を判断する初期指標として広くお使いいただけます。
3. **Q: 所要時間はどのくらいですか？**
   A: 5 つの質問に答えるだけで完了し、目安は 3〜5 分程度です。途中で戻って数値を修正することもできます。
4. **Q: PDF レポートはどのような場面で使えますか？**
   A: 社内稟議、経営会議、IT 投資の見直し提案、ベンダーとの交渉材料など、決裁者に数字でメリットを示す必要があるあらゆる場面でご活用いただけます。
5. **Q: スマートフォンやタブレットでも使えますか？**
   A: はい。商談先のタブレットからでも快適にお使いいただけるよう、レスポンシブ対応しています。
6. **Q: 利用に費用はかかりますか？登録は必要ですか？**
   A: 完全無料、登録不要です。サイトを開いてすぐに診断を開始できます。

### メタ情報

- **メタ title**（59 文字以内）: 「またたび計算機 | IT コスト診断・ROI 試算ツール」（30 文字、テンプレ込みで `default` に設定）
- **メタ description**（120〜160 文字）: 「中小企業の経営者向け ROI 診断ツール。月額ベンダー費用や改修費、手作業時間を 5 つの質問に答えるだけで、3 年間で止血できる IT コストと取り逃している利益を試算。結果は PDF で出力でき、登録不要・完全無料でご利用いただけます。」（138 文字）

### 終端 CTA 文言

- 見出し: 「数字を、味方にしませんか。」
- 本文: 「3 年後の IT コストは、今日の判断で変わります。まずは 5 分の診断から。」
- CTA ラベル: 「3 分で診断する」（Hero の「いますぐ計算を始める」と差別化）

---

## 設計上の考慮点

### `frontend-design` スキルとの併用方針

Issue 末尾の「実装スキル指定」に従い、本プランの **実装フェーズ（コード生成）では `frontend-design` スキルを必ず併用** する。具体的な適用ポイント:

- **Hero / 課題 / 提供価値 / 使い方 / FAQ / 終端 CTA の各セクションのレイアウト・装飾デザイン提案** は `frontend-design` を起動して生成する。スキルが返した HTML/JSX の **コピー文言・配色・タイポ階層・スペース運用** は本プランで確定したコピーとデザイントークン（`docs/design-tokens.md` §2〜§7）に必ず読み替える。
- スキル出力を **そのままマージしない**。本リポジトリは:
  - フォントは Inter / Noto Sans JP 固定（`src/app/layout.tsx` で next/font 読込済、変更不可）
  - カラーは canvas / ink / line / accent の 4 ロール固定
  - `tailwind-merge` / `cva` は不採用（`docs/design-tokens.md` §9）
  - `tailwindcss-animate` は不採用（Issue #10 plan §0.1）
  - 状態管理ライブラリ追加禁止（依存は Issue #8 で固めた 4 本のみ）
  という制約があるため、`frontend-design` が提案する豪華な装飾（独自フォント / カスタムシャドウ / 凝ったアニメーション）は **既存トークンへ翻訳した上で** 採用判定する。
- 採用方向性の指針: ブランドトーン「ふんわり・温かみ・猫モチーフ」を踏まえ、**maximalism より refined minimalism** 寄りの構成を `frontend-design` に依頼する（生成プロンプトに「Soft, refined Japanese B2B aesthetic with subtle cat motifs, off-white canvas, ash-brown ink, occasional misty-blue accent」を含める）。
- スキルが提案する **動き・マイクロインタラクション** は CSS-only（`transition` / `animation`）に絞る。`useReducedMotion` 等のクライアント JS 介在は本 LP では不要。

### Footer の二重描画防止

`src/app/layout.tsx` の `RootLayout` は既に `<Footer />` を全ページ共通で描画している。本 LP で `Footer` を `page.tsx` 内に再配置すると二重描画になるため、**LP 側では Footer を呼ばない**。Issue Body の「7. Footer（既存 / 既存コンポーネントを継続利用）」はレイアウト側継続利用と読む。

### `Button` を `<Link>` で描画する方針

`docs/design-tokens.md` §8.1 で「`asChild`（Radix Slot 相当）は持たない。`<Link>` を Button スタイルで描画したい場合はラップして対応する」と明示されている。Hero / 終端 CTA / `/calculate` 戻りリンクなど **遷移系 CTA は `<Link>` + Button クラスの再構築** で実装し、`<button>` 要素は使わない（クライアント JS 不要、Lighthouse Performance に有利）。具体的には CTA 用ヘルパは作らず、各セクション内で `cn()` を使ってクラスを組み立てる（DRY を犠牲にしてもファイル数を増やさない方針、`Card` の minimal API と整合）。

### `output: "export"` 制約

`next.config.mjs` で `output: "export"` のため、サーバーアクション・API ルート・ISR は使用不可。本 LP のすべてのコンポーネントは静的に書き出される。`Accordion` は `<details>` ネイティブ動作で動くため、追加クライアント JS なしで成立する。

### Lighthouse スコア達成のための具体策

- Performance ≥ 90: `priority` 属性を Hero 画像のみに付与、それ以外は遅延ロード。`next/font/google` は既に `display: "swap"` 設定済（layout.tsx）。`output: "export"` で全静的なため LCP は CDN 配信時間に依存。
- Accessibility ≥ 95: `<h1>` 1 個、見出し階層遵守、`aria-hidden` を装飾 SVG に付与、CTA リンクの `aria-label` 設定、`focus-visible` リング（`globals.css` 既設）、コントラスト比対応（§12 参照）。
- SEO ≥ 95: `metadata` 強化（§3）、`alternates.canonical`、`robots.ts` / `sitemap.ts` 同時整備（§13）、`<html lang="ja">` 既設、OG / Twitter カード設定。

### 暫定アセットの扱い

`docs/brand/README.md` 通り、ロゴ / 装飾 SVG / OGP 画像はすべて暫定。本 Issue では `public/brand/cat-deco-1.svg` を Hero 装飾に流用するのみ。OGP 本制作差し替えは別 Issue（暫定アセット差し替え Issue 案）で対応する旨をコミットメッセージに明記する。

---

## 検証方法

1. **ビルド・型チェック・Lint**
   - `npm run lint`（受け入れ条件 #7）
   - `npm run typecheck`（同上）
   - `npm run build`（同上、`output: "export"` で `out/` ディレクトリに静的ファイル一式が生成されること）

2. **静的 HTML のメタタグ確認**
   - `npm run build` 後 `out/index.html` を `cat`（または `grep -E "title|description|canonical|og:|twitter:" out/index.html`）で確認し、`metadata` API で設定した値が `<head>` に反映されていることを検証（受け入れ条件 #3）。
   - `out/calculate/index.html` が生成されていることを確認（受け入れ条件 #2）。
   - `out/sitemap.xml` / `out/robots.txt` が生成されていることを確認（§13）。

3. **Lighthouse 計測手順**（受け入れ条件 #5）
   - `npm run build && npx serve out -p 3000` でローカル静的サーバ起動。
   - Chrome DevTools の Lighthouse タブで `http://localhost:3000/` を **モバイル / Performance + Accessibility + SEO** 設定で計測。
   - 目標: Performance ≥ 90 / Accessibility ≥ 95 / SEO ≥ 95。
   - 不足時は対象指標（LCP / CLS / 画像 alt / heading order 等）を改善した上で再計測。

4. **コントラスト比測定**（受け入れ条件 #6）
   - Chrome DevTools の Inspect → 要素のスタイル欄でコントラスト比をホバー表示確認、または <https://webaim.org/resources/contrastchecker/> に実装後の前景 / 背景色を入力。
   - 対象: Hero CTA、終端 CTA、`<h1>`、本文、補助メタ。
   - 目標: 4.5:1 以上（小さい文字）、3:1 以上（18px 以上または太字）。
   - `#9CAEB8` on `#F8F6F2` が AA 不適合の場合は §12 に従い `text-ink` または `bg-ink` 系へ切替し、`docs/design-tokens.md` を更新。

5. **キーボード操作検証**（受け入れ条件 #4）
   - LP を開き、Tab キーのみで Hero CTA → 課題セクション → 提供価値 → 使い方 → FAQ → 終端 CTA → Footer の順に到達可能なこと（順序が DOM 順と一致）。
   - FAQ の各項目（`<summary>`）に Tab で到達後、Enter / Space で開閉できること。
   - フォーカスリング（accent 2px outline）が `globals.css` の設定どおり全ての focusable 要素に表示されること。

6. **レスポンシブ確認**（受け入れ条件 #8）
   - Chrome DevTools のレスポンシブモードで 375px（iPhone SE 相当）/ 768px（iPad 相当）/ 1280px（デスクトップ）の 3 ブレークポイントで全セクションのレイアウト崩れがないことを目視確認。
   - 確認観点: Hero の左右カラム → 縦積み切替、課題 / 提供価値の 3 カラム → 1 カラム切替、使い方ステップの矢印方向、FAQ アコーディオンの幅、終端 CTA の余白。

7. **OGP プレビュー**（受け入れ条件 #10）
   - 本 Issue PR デプロイ後（Cloudflare Pages プレビュー URL が発行された段階）、Twitter Card Validator（<https://cards-dev.twitter.com/validator>）と Facebook Sharing Debugger（<https://developers.facebook.com/tools/debug/>）に URL を投入。
   - `og:image` / `twitter:image` が `/opengraph-image.png`（暫定 1200×630）を指していること、タイトル・description が表示されることを確認。

8. **コピーレビュー**（受け入れ条件 #9）
   - 本プランに記載した Hero A/B 案、課題 3 件、提供価値 3 件、使い方 3 ステップ、FAQ 6 件、メタ description を Issue PR レビューに添付し、ステークホルダー（プロジェクトオーナー）に承認を得る。
   - 承認後の差分は `page.tsx` 内のコピー定数直書き部分の変更のみで吸収可能（コンポーネント構造に影響しない設計）。

9. **追加: `frontend-design` 適用結果のクロスチェック**
   - スキル生成結果が以下の制約を逸脱していないことを目視レビュー:
     - フォントが Inter / Noto Sans JP のみ（layout.tsx で読込済の 2 種以外を使っていないか）
     - カラーが canvas / ink / line / accent の HEX 4 種のみ（独自 HEX が混入していないか）
     - `tailwind.config.ts` への変更が発生していないか（本 Issue ではトークン更新は §12 の条件付き Button コントラスト対応のみ）

---

### Critical Files for Implementation

- `/Users/YS/development/matatabi-calculator/src/app/page.tsx`
- `/Users/YS/development/matatabi-calculator/src/app/layout.tsx`
- `/Users/YS/development/matatabi-calculator/src/app/calculate/page.tsx`
- `/Users/YS/development/matatabi-calculator/src/components/landing/Hero.tsx`
- `/Users/YS/development/matatabi-calculator/src/components/ui/Accordion.tsx`
