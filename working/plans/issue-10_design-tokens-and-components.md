# Issue #10 実装プラン: デザインガイドラインをコードに落とし込む（spacing / radius / shadow / typography トークンと共通コンポーネント雛形）

## 0. このプランの性格 / スコープ宣言

本プランは、Issue #6（Next.js 雛形）/ Issue #7（カラートークン + フォント）/ Issue #8（依存ライブラリ追加）/ Issue #9（ブランド素材）に続く **5 番目の「土台 Issue」** のためのプランです。本 Issue が完了することで、後続の機能実装 Issue（`InputForm` / `ResultDashboard` / `WarningBanner` / `PdfDashboard`）が **「クラス名で迷わずに書ける」** 状態になります。

本 Issue の唯一のゴール:

> **「Tailwind の `theme.extend` に余白・角丸・シャドウ・タイポグラフィ用トークンを追加し、`globals.css` に共通の base スタイル（`focus-visible` リング等）を整え、`src/components/ui/` 配下に最小限の Button / Card 雛形（再利用可能、Tailwind クラスベース）を配置する」** までをリポジトリ上に確定させる。

この境界の特徴は、**Issue #7 がカラー軸だけを引いたのに対し、本 Issue は残りの軸（spacing / radius / shadow / typography 補強）をまとめて引きつつ、初めて `src/components/` を生やす点** にあります。Issue #8 が「依存追加だけで実コードを書かない」、Issue #9 が「素材ファイルを置くだけで実 UI に貼り込まない」と境界を切ったのと同じ思想で、本 Issue は **「トークン + 共通雛形コンポーネントだけで、機能コンポーネントは書かない」** と切ります。

### 0.1 本 Issue のスコープ外（明示）

| 項目 | 担当 |
|---|---|
| `InputForm` / `ResultDashboard` / `WarningBanner` / `PdfDashboard` の実装 | フェーズ 2 の実装 Issue（#2 / #3 / #4 / #5 仕様準拠） |
| shadcn/ui の導入（`npx shadcn-ui init`） | 採用しない（§8.1 で却下） |
| Radix UI / Headless UI の導入 | 採用しない（同上） |
| ダークモード（`darkMode: 'class'` / `prefers-color-scheme: dark`） | マスター設計書 §3.3 でライト固定のため不採用 |
| i18n（多言語切替）と関連トークン（`textOrientation` 等） | プロジェクト範囲外 |
| `tailwind-merge` / `class-variance-authority` の導入 | 不採用（§8.4 で極小自前 `cn` を選択） |
| アニメーションプリセット（`transitionDuration` / `transitionTimingFunction` のフルセット） | 後続実装 Issue で必要に応じて段階追加 |
| スクロール挙動（`scroll-behavior: smooth`） | 商談画面では不要のため不採用 |
| `Input` / `Select` / `Textarea` 等のフォーム部品ラッパ | Issue #2（input-form 実装）が必要に応じて追加 |
| `Skeleton` / `Spinner` 等のローディング系雛形 | 必要発生時に別 Issue で起票 |
| `tailwindcss-animate` プラグイン | 不採用（依存範囲を Issue #8 で固めた 4 本に保つ） |

### 0.2 隣接 Issue とのスコープ整理

本 Issue は Issue #9（ブランド素材） / 後続「Layout 共通コンポーネント実装 Issue」 / Issue #22（spec 旧パレット置換）と隣接する。責務を以下に切り分ける:

| 領域 | 担当 |
|---|---|
| カラートークン（canvas / ink / line / accent） | Issue #7（実装済み） |
| ロゴ / ファビコン / OGP / 猫モチーフ素材の物理ファイル | Issue #9（実装済み） |
| **余白 / 角丸 / シャドウ / タイポ補強のトークン化** | **本 Issue #10** |
| **`globals.css` の base 拡張（`focus-visible` / `font-feature-settings`）** | **本 Issue #10** |
| **`src/components/ui/Button.tsx` / `Card.tsx` の雛形** | **本 Issue #10** |
| **`src/lib/cn.ts` の極小ヘルパ** | **本 Issue #10** |
| **`docs/design-tokens.md` の運用ルール記述** | **本 Issue #10** |
| Layout 共通コンポーネント（Header / Footer / 背景装飾差し込み） | 後続「Layout 共通コンポーネント実装 Issue」 |
| ヘッダー部品で `logo-header.svg` を `<img>` 表示する実装 | 同上 |
| `docs/spec/result-dashboard.md` / `pdf-report.md` / `warning-copy.md` の旧パレット参照を新パレットに置換 | Issue #22（別途起票済み） |
| Recharts のカラー定数（`fill="#9CAEB8"` 等）の実装 | Issue #3 の本実装フェーズ |
| `useReducedMotion` 等の motion 配慮実装 | spec 側で確定済み、各実装 Issue で対応 |

> 本 Issue の PR は「トークン拡張 + base スタイル + 雛形 2 種 + ヘルパ + 運用ドキュメント + プレビュー更新」だけで完結し、**機能コンポーネントへの貼り込みは行わない**。

---

## 1. 概要（What / Why / 下流影響）

### 1.1 What（成果物）

本 Issue で確定するのは以下のリポジトリ差分:

- 既存ファイル更新: `tailwind.config.ts` — `theme.extend` に `boxShadow` / `letterSpacing` / `ringColor` / `ringWidth` / `ringOffsetColor` を追加
- 既存ファイル更新: `src/app/globals.css` — `@layer base` に `*:focus-visible` リング統一 / `body` の `font-feature-settings: "palt" 1` / `text-rendering: optimizeLegibility` を追加
- 既存ファイル更新: `src/app/page.tsx` — Issue #7 のカラースウォッチに加えて、shadow / radius / Button / Card のプレビューを追加（後続 Issue でページごと差し替え予定）
- 新規ファイル: `src/components/ui/Button.tsx`
- 新規ファイル: `src/components/ui/Card.tsx`
- 新規ファイル: `src/components/ui/index.ts`（Re-export）
- 新規ファイル: `src/lib/cn.ts`（極小 `cn` ヘルパ）
- 新規ファイル: `docs/design-tokens.md`（運用ルール / 用途マッピング / Pros-Cons の意思決定ログ）

### 1.2 Why（重要性 / 下流影響）

本 Issue を飛ばしたまま機能実装 Issue（#2 / #3 / #4 / #5）に進むと、次のような不可逆な揺れが各 PR に滲出します:

- **角丸と padding がコンポーネントごとにブレる** — 「`InputForm` のカードは `rounded-xl p-6`、`ResultDashboard` のカードは `rounded-2xl p-5`、`WarningBanner` は `rounded-lg p-4`」のような微妙な差異が PR ごとに発生し、PR レビューで「なぜここは `rounded-lg`？」が頻出する。後で揃えようとすると複数 PR にまたがる修正になる。
- **シャドウのトーンが揃わない** — Tailwind デフォルトの `shadow-md` は黒ベースでブランド「やわらかい / ニュアンス」の質感に合わず、コンポーネントごとに独自に `shadow-[0_2px_8px_rgba(0,0,0,0.08)]` 等のアドホック値が散在する。
- **フォーカスリングがバラバラ** — `focus-visible` のリング色を実装 Issue ごとに各自決めると、「`Button` は `ring-blue-500`、`Input` は `outline-2`、`Card` 内のリンクはデフォルト青リング」のような不整合が出る。a11y のベースラインが揃わない。
- **`Card` / `Button` が各 Issue で個別実装され、ファイル数だけ増える** — `result-dashboard` 用カードと `input-form` 用カードが別実装になり、後で共通化する余計な PR が生える。
- **「`Card` ってどう書くの？」が常に質問になる** — 仕様書 (`docs/spec/result-dashboard.md`) は「カード間余白 24px」「カード padding 縦 6mm（PDF）」等の運用ルールを書いているが、**Tailwind クラスとしての具体形（`p-6 rounded-xl shadow-card`）は誰も書いていない**。この翻訳を本 Issue が行う。

### 1.3 後続 Issue がどのトークン / 雛形に依存するか（マッピング）

| トークン / 雛形 | 直接消費する後続 Issue / 場所 |
|---|---|
| `boxShadow.card` / `card-hover` | Issue #2（InputForm カード）/ Issue #3（ResultDashboard 補助カード）/ Issue #5（PdfDashboard カード）/ 後続 Layout コンポーネント |
| `boxShadow.floating` | Issue #4（モーダル等が必要になった場合）/ 後続 Toast / Tooltip 系 |
| `letterSpacing.warning` | Issue #4（WarningBanner 見出し `CRITICAL OPPORTUNITY LOSS` 相当の見出しに使用） |
| `ringColor.DEFAULT` / `ringWidth.DEFAULT` / `ringOffsetColor.DEFAULT` | 全インタラクティブ要素（Button / Input / Link / TabIndex 持ち要素） |
| `Button` 雛形 | CTA / セカンダリ / モーダルアクション / ダウンロード（Issue #5） |
| `Card` 雛形 | InputForm カード / ResultDashboard 補助カード / WarningBanner ベース |
| `cn` ヘルパ | Button / Card / 後続全 React コンポーネント |
| `docs/design-tokens.md` | レビュアーが「クラス名選択の根拠」を参照する場 |

### 1.4 PR レビュー観点での価値

PR レビューで頻出する以下の指摘を、本 Issue を経由することで **ドキュメント参照で即決着できる** 状態にする:

- 「カードの角丸は `rounded-lg` でいいですか？」 → `docs/design-tokens.md` の「角丸の用途マッピング」を参照: card は `rounded-xl`
- 「シャドウどれ使えば？」 → `boxShadow.card` を使う、hover は `card-hover`
- 「フォーカスリング青のままだけど」 → `globals.css` の `*:focus-visible` で accent 色リングが既に当たっている
- 「ボタンの primary / secondary 切り分けは？」 → `Button` 雛形の variant prop で確定済み

---

## 2. 余白（Spacing）スケールの確定

### 2.1 論点

Tailwind デフォルトスケール（`0.25rem = 4px` 刻み、`spacing-0` 〜 `spacing-96`）を **そのまま採用** するか、マスター設計書「余白の活用」「大人の余裕」に寄せたカスタムスケールを **追加** するか。

既存 spec の数値も再確認:
- `docs/spec/result-dashboard.md`: セクション間 `space-y-6`（24px）、スマホ `space-y-4`（16px）、カード間 24px、最大幅 `max-w-[1024px]`（既に Tailwind 任意値）
- `docs/spec/pdf-report.md`: PDF はミリ単位設計（mm）。画面 px / rem 系とは独立した寸法系
- `docs/spec/warning-copy.md`: 警告バナーの水平 padding 24px / 16px、アイコン-テキスト間 12px

これらの数値はいずれも Tailwind デフォルトで表現可能（`px-6 px-4 gap-3`）。

### 2.2 選択肢

#### 選択肢 A: Tailwind デフォルトスケールをそのまま採用（カスタムキー追加なし）— **推奨**

- **Pros**:
  - 既存 spec の全数値が Tailwind デフォルト（4 / 8 / 12 / 16 / 24 / 48px = `1` / `2` / `3` / `4` / `6` / `12`）で表現できる。新規キー不要。
  - 学習コスト最小（チームメンバーが Tailwind ドキュメントをそのまま参照可能）。
  - 後続 PR レビューで「`p-6` は何 px？」と質問されない（Tailwind 標準）。
  - Tailwind ネイティブの拡張性（`p-6` が既に存在することによる任意値ジェネレータ恩恵）を損なわない。
  - **「大人の余裕」は数値そのものではなく運用ルール（"section gap = `space-y-6` 基調、card padding = `p-6` / モバイル `p-4`"）で実現できる**。
- **Cons**:
  - 「ブランド固有の余白尺度」感が弱い。誰でも `p-3` `p-5` 等を書けるため、運用ルールの徹底は別途ドキュメントに頼る必要がある。
  - 「`section-gap`」のようなセマンティック名で書きたいニーズには応えられない。

#### 選択肢 B: セマンティックなカスタムキーを追加（`spacing.section: '1.5rem'` / `spacing.card: '1.5rem'` 等）

- **Pros**:
  - `p-card` `space-y-section` のような意味のある名前が書ける。
  - 後で全体のリズムを変えたい場合（例: section gap を 32px に拡大）に 1 箇所変更で済む。
- **Cons**:
  - Tailwind デフォルトの `p-6` と数値が一致するキー（`p-card = 1.5rem = 24px`）を二重定義することになり、コードベース内に **「同じ値を指す 2 つの書き方」** が混在する。grep 性が落ちる。
  - 後続実装 Issue でレビュアーが「`p-card` と `p-6` どっち使うのが正？」と毎回確認する必要が出る。
  - 「`p-card` を使ったが、card 内のサブ要素にも同じ余白が要る場合 `p-card-inner` も足したい」のように **キーが増殖しやすい**。
  - Tailwind の `space-x-` / `space-y-` / `gap-` / `p-` / `m-` のすべてに対して同じセマンティックキーが解決されるため、命名衝突を避けるのが難しい。

#### 選択肢 C: ベース 8px の専用スケールへ全面切替（`4px = 0.5` / `8px = 1` の 8px グリッド系）

- **Pros**: 8px グリッドで設計するデザインシステム文化に揃う。
- **Cons**:
  - Tailwind デフォルト前提のクラス名（`p-4 = 16px`）と意味がズレる。プロジェクトに新規参画する開発者が `p-4` を「16px」と直感する Tailwind 標準慣習に反する。
  - 既存 `src/app/page.tsx` `src/app/layout.tsx` の `p-8` `gap-10` 等を全て解釈し直す必要がある。
  - 規模に対し過剰。

### 2.3 推奨

**選択肢 A（Tailwind デフォルトスケールをそのまま採用）** を推奨する。

`tailwind.config.ts` の `theme.extend.spacing` には **何も追加しない**。代わりに `docs/design-tokens.md` に運用ルールを明文化:

| 用途 | 推奨クラス | 数値 |
|---|---|---|
| セクション間（縦） | `space-y-6`（モバイル `space-y-4`） | 24px / 16px |
| カード間（縦） | `gap-6`（モバイル `gap-4`） | 24px / 16px |
| カード padding | `p-6`（モバイル `p-4`） | 24px / 16px |
| カード内見出しと本文の間 | `space-y-3` または `mb-3` | 12px |
| インライン要素間（アイコン + テキスト） | `gap-2` または `gap-3` | 8px / 12px |
| ヒーロー上下余白（ResultDashboard） | `py-12`（モバイル `py-8`） | 48px / 32px |
| ページ全体の左右マージン | `px-6`（モバイル `px-4`） | 24px / 16px |
| 最大幅（ダッシュボード） | `max-w-[1024px]` | spec 確定値、任意値で書く |
| 最大幅（グラフ） | `max-w-[960px]` | 同上 |
| 最大幅（補助カード） | `max-w-[720px]` | 同上 |

> 任意値（`max-w-[1024px]` 等）は Tailwind が自動生成するため `theme.extend` への登録は不要。後続実装 Issue で 3 箇所以上で同じ任意値を書くことが分かったら、その時点でセマンティックキー化を検討する別 Issue を起票する。

---

## 3. 角丸（Border Radius）スケールの確定

### 3.1 論点

Tailwind デフォルト（`rounded-sm` 2px / `rounded` 4px / `rounded-md` 6px / `rounded-lg` 8px / `rounded-xl` 12px / `rounded-2xl` 16px / `rounded-3xl` 24px / `rounded-full`）を採用するか、用途別のセマンティックキー（`rounded-card` / `rounded-control` 等）を足すか。

ブランド「大人の余裕 / 洗練 / B2B プロフェッショナル」に合う角丸サイズの選定:
- `rounded-sm` (2px) `rounded` (4px): やや古風な印象、グラフのバー / 細い装飾向き
- `rounded-md` (6px): フォーム入力 / ボタンの定番。実用的。
- `rounded-lg` (8px): 中規模カード / バッジ。やや控えめ。
- `rounded-xl` (12px): カード（デフォルト）。「大人の余裕」に最も合う。
- `rounded-2xl` (16px): 大型カード / モーダル / ヒーローブロック。
- `rounded-full`: バッジ / アバター / ピル型ボタン。

### 3.2 選択肢

#### 選択肢 A: Tailwind デフォルト + 用途マッピングをドキュメント化（カスタムキー追加なし）— **推奨**

- **Pros**:
  - Tailwind の合成クラス文化（`rounded-xl` を見れば 12px と即決）に整合。
  - grep 性が高い（`rounded-xl` で検索すると全カードがヒット）。
  - 学習コスト最小。
  - 後続実装 Issue で `Card` 雛形を使えば自動的に `rounded-xl` が適用されるため、揃えるための強制力は雛形側で担保できる。
- **Cons**:
  - 「ブランドの曲率」を 1 箇所で管理したくなった場合（例: 全カードの角丸を 12 → 14 に変えたい）、全 `rounded-xl` を grep して `rounded-[14px]` に置換する必要がある。ただし `Card` 雛形を経由していれば 1 箇所変更で済む。

#### 選択肢 B: セマンティックキーを薄く追加（`borderRadius: { card: '0.75rem', control: '0.375rem' }`）

- **Pros**:
  - `rounded-card` で意味が即決まる。デザイントークンとしての品位が増す。
  - 全カードの曲率を 1 箇所で変えられる。
- **Cons**:
  - Tailwind デフォルト `rounded-xl`（12px）と `borderRadius.card`（`0.75rem` = 12px）が同じ値を指す **二重定義** になる。「`rounded-xl` と `rounded-card` どっちが正？」がレビュー観点で発生。
  - 雛形 `Card` を経由する限り、セマンティックキーの恩恵は雛形内で完結する（外側で `rounded-card` を直接書く機会がほぼない）。投資対効果が薄い。

#### 選択肢 C: 全用途を変更（デフォルトスケールを上書き）

- **Cons**: Tailwind 既定挙動を破壊し、新規参画者の学習コストが急上昇。不採用。

### 3.3 推奨

**選択肢 A（Tailwind デフォルト + 用途マッピングをドキュメント化、カスタムキーは追加しない）** を推奨する。

`tailwind.config.ts` の `theme.extend.borderRadius` には **何も追加しない**。代わりに `docs/design-tokens.md` に用途マッピングを明文化:

| 用途 | 推奨クラス | 数値 | 理由 |
|---|---|---|---|
| ボタン / 入力フィールド | `rounded-md` | 6px | 実用的、業務系 UI の標準 |
| Tab / Pill 型ボタン | `rounded-full` | — | 切替系ボタンを視覚的に区別 |
| カード（デフォルト） | `rounded-xl` | 12px | 「大人の余裕」を表現 |
| カード（大型 / ヒーロー） | `rounded-2xl` | 16px | ResultDashboard 主要カード等 |
| バッジ / タグ | `rounded-full` | — | バッジは丸ピル型で統一 |
| グラフのバー先端 | `rounded-sm` | 2px | Recharts の `<Bar radius={[2,2,0,0]}>` に対応 |
| 警告バナー | `rounded-xl` | 12px | カードと同じトーンで統一 |
| モーダル / シート | `rounded-2xl`（デスクトップ）/ `rounded-t-2xl`（モバイルボトムシート） | 16px | 必要発生時に追加 |

> 雛形 `Card` のデフォルト角丸は `rounded-xl`。`<Card variant="hero">` を将来追加するなら `rounded-2xl` に切り替える設計余地を残す（本 Issue では `variant` を実装しない、§8.2 参照）。

---

## 4. シャドウ（Box Shadow）スケールの確定

### 4.1 論点

Tailwind デフォルトのシャドウ（`shadow-sm` / `shadow` / `shadow-md` / `shadow-lg` / `shadow-xl` / `shadow-2xl`）は **黒（rgba(0,0,0,...)) ベース** で、強すぎる + 「やわらかい / ニュアンス」のブランドに合わない可能性が高い。Tailwind デフォルトのまま使うか、ink（`#72665B`）ベースのカスタムシャドウを追加するか。

### 4.2 選択肢

#### 選択肢 A: Tailwind デフォルトに加えて、ink ベースのカスタムシャドウを 3 種追加 — **推奨**

`boxShadow` キーに `card` / `card-hover` / `floating` の 3 種を追加:

```ts
boxShadow: {
  card: "0 1px 2px 0 rgba(114, 102, 91, 0.05), 0 1px 3px 0 rgba(114, 102, 91, 0.04)",
  "card-hover": "0 4px 12px -2px rgba(114, 102, 91, 0.10), 0 2px 4px 0 rgba(114, 102, 91, 0.06)",
  floating: "0 12px 24px -4px rgba(114, 102, 91, 0.12)",
},
```

数値根拠:
- ink `#72665B` を rgba 化して透明度 4〜12% で運用（黒ベースより柔らかく、canvas `#F8F6F2` 上で目立ちすぎない）。
- `card`: デフォルトの静止カード。Tailwind `shadow-sm` 相当の控えめな影だが、色味だけ ink 側に寄せる。
- `card-hover`: ホバー時に持ち上がる感じ。`shadow-md` 程度の強度。
- `floating`: モーダル / トースト / ドロップダウン等の「浮いている」表現。`shadow-xl` 程度。

- **Pros**:
  - canvas `#F8F6F2`（オフホワイト）背景上で黒シャドウは「画面内に黒い濁りがある」感を生む。ink ベース rgba にすることでブランドの統一感が高まる。
  - 雛形 `Card` を `shadow-card` で固定し、hover で `card-hover` に切り替える運用ができる。
  - Tailwind デフォルト（`shadow-sm` 等）も併用可能。本トークンは「特に意識して使う場面」のみで使う指針にできる。
- **Cons**:
  - 数値（`0 1px 2px 0 rgba(...)`）が Tailwind デフォルトと近接して「どっちを使うべき？」が発生し得る。`docs/design-tokens.md` で「カードには必ず `shadow-card` / `shadow-card-hover` / `shadow-floating` のいずれかを使う、Tailwind デフォルトは原則使わない」と運用を明文化することで対処。
  - 暫定値のため、実際の Card / Button が画面に並んだ際の見え方で再調整が発生する可能性。§21 R3 に申し送り。

#### 選択肢 B: Tailwind デフォルトのみで運用（カスタムなし）

- **Pros**: 設定追加なし、最小コスト。
- **Cons**:
  - 黒ベースのシャドウが canvas に濁って見える視覚的問題が残る。
  - 後続実装 Issue で各々が `shadow-[0_2px_8px_rgba(114,102,91,0.08)]` のような任意値を散発的に書き始め、統一されない。
  - 「やわらかい / ニュアンス」の質感が出ない。

#### 選択肢 C: シャドウ自体を使わず、border + 余白で立体感を出す（フラット設計）

- **Pros**: フラット系デザインとして潔い。
- **Cons**:
  - マスター設計書 §3.3「余白を活用しつつカードでセクション分割」のニュアンスとは整合するが、PDF 出力時の「カードのまとまり感」が border のみだと弱い。
  - Recharts の補助カードや WarningBanner で立体感を 0 にすると区切りが弱くなる。
  - 後続実装で「やっぱり影が要る」となった場合に再度トークン追加が必要になる。

### 4.3 推奨

**選択肢 A（ink ベースのカスタムシャドウ 3 種を追加 + Tailwind デフォルトも併用可）** を推奨する。`docs/design-tokens.md` に用途マッピングを書く:

| 用途 | 推奨クラス | 値（ink ベース rgba） |
|---|---|---|
| カード（静止） | `shadow-card` | `0 1px 2px ..., 0 1px 3px ...` |
| カード（hover） | `hover:shadow-card-hover` | `0 4px 12px ..., 0 2px 4px ...` |
| モーダル / トースト / ドロップダウン | `shadow-floating` | `0 12px 24px -4px ...` |
| グラフ / 入力フィールド | shadow なし（border + 余白で表現） | — |
| 警告バナー | shadow なし（border + 背景色 で表現） | — |

> Tailwind デフォルト（`shadow-sm` / `shadow-md` 等）は **原則使わない** とする。例外的に必要になった時点で `docs/design-tokens.md` を更新する運用。

---

## 5. タイポグラフィ補強（Font Size / Line Height / Letter Spacing）

### 5.1 論点

Tailwind デフォルト fontSize スケール（`text-xs` 0.75rem / `text-sm` 0.875rem / `text-base` 1rem / `text-lg` 1.125rem / `text-xl` 1.25rem / 〜 `text-9xl`）を採用するか、警告バナー専用の letter-spacing やヒーロー数値の clamp() フォントサイズをカスタムキー化するか。

既存 spec の参照値:
- `docs/spec/warning-copy.md`: `letter-spacing: 0.05em〜0.08em`（`CRITICAL OPPORTUNITY LOSS` 見出し用）
- `docs/spec/result-dashboard.md`: ヒーロー数値 `clamp(2.5rem, 6vw, 4rem)`

### 5.2 選択肢

#### 選択肢 A: Tailwind デフォルト fontSize 採用 + `letterSpacing.warning` のみ追加、ヒーロー clamp は実装側で個別に書く — **推奨**

- **Pros**:
  - `text-base` `text-lg` 等の Tailwind 慣習を保つ。
  - `letterSpacing.warning: '0.06em'` を 1 キー足すだけで spec の `0.05em〜0.08em` 範囲の中央値を採用できる。`tracking-warning` で書ける。
  - ヒーロー数値の `clamp(2.5rem, 6vw, 4rem)` は **ResultDashboard 内でのみ 1 回しか使わない** ため、`fontSize.hero` のような専用キーは過剰。実装 Issue（#3）で `text-[clamp(2.5rem,6vw,4rem)]` または `style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}` で個別に書く方が、トークンの責務範囲を明確にできる。
- **Cons**:
  - ヒーロー数値を将来 InputForm の合計表示などで再利用したくなった時点で、`fontSize.hero` 化のリファクタが要る。ただしその時点で「2 箇所目の使用」が出てから対応する方が早期最適化を避けられる。

#### 選択肢 B: `fontSize.hero: ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1' }]` を追加

- **Pros**: `text-hero` の 1 クラスで意味が決まる。
- **Cons**:
  - Tailwind の `fontSize` は `[size, { lineHeight, letterSpacing, fontWeight }]` の配列形式で複合定義できるが、本ケースは fontSize しか必要ないため恩恵が薄い。
  - 1 回しか使わないキーをトークンに登録するのは「使われていないトークンが増える」アンチパターンの入口。

#### 選択肢 C: タイポグラフィ全体をプロジェクト独自スケール（`text-display` / `text-headline` / `text-body` / `text-caption` 等）に再構築

- **Cons**:
  - Tailwind 既定を破棄するコストが大きい。
  - spec 側は Tailwind 慣習（`text-sm` `text-base`）で書かれている箇所もあり、整合のためには spec の書き換えも要る。Issue #22 のスコープを膨張させる。

### 5.3 推奨

**選択肢 A** を推奨。`tailwind.config.ts` の `theme.extend` に追加するタイポ系キーは:

```ts
letterSpacing: {
  warning: "0.06em",
},
```

のみ。`fontSize` / `lineHeight` への追加は行わない。ヒーロー clamp は ResultDashboard 実装 Issue で `text-[clamp(2.5rem,6vw,4rem)]` として個別に書く。

> `tracking-warning` は警告バナー見出しで使う想定。WarningBanner 実装 Issue（#4）の見出しに `<h2 className="font-bold tracking-warning uppercase">CRITICAL OPPORTUNITY LOSS</h2>` のように使われる。本 Issue ではトークン定義のみ。

---

## 6. その他のトークン群

### 6.1 `borderWidth`

Tailwind デフォルト（0 / 1 / 2 / 4 / 8）で十分。spec 側に「3px」「6px」のような中間値は出てこない。**追加しない**。

### 6.2 `ringWidth` / `ringColor` / `ringOffsetColor`（focus-visible リング）

a11y のベースラインとして全インタラクティブ要素に統一フォーカスリングを当てる。リング色は `accent`（`#9CAEB8`）ベース、リング幅 `2px`、オフセット色は `canvas`（`#F8F6F2`）。

`tailwind.config.ts` 追加:
```ts
ringColor: { DEFAULT: "#9CAEB8" },
ringWidth: { DEFAULT: "2px" },
ringOffsetColor: { DEFAULT: "#F8F6F2" },
```

これにより `ring` `ring-offset-2` のような単独クラスで accent 色 + canvas オフセットのリングが当たる。

> なお `focus-visible:ring-2` などサイズを明示するクラスは Tailwind 既定の `ringWidth` キー（`0` / `1` / `2` / `4` / `8`）が引き続き使えるため、`ring-2` `ring-offset-2` を使う運用は変えない（`DEFAULT` は `ring` 単体クラスに対する値）。

### 6.3 `outlineColor`

`outline` プロパティを直接使う場面はほぼなく（`ring` で代替）、追加しない。

### 6.4 `screens`（ブレークポイント）

Tailwind デフォルト（sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536）で運用。`docs/spec/result-dashboard.md` のブレークポイント想定（モバイル / タブレット / デスクトップ）と Tailwind 既定が整合。**追加しない**。

### 6.5 `transitionDuration` / `transitionTimingFunction`

アニメーションプリセットは本 Issue では最小限とする（過剰なアニメは設計しない方針）。Tailwind デフォルト（150ms / 200ms / 300ms / 500ms / 700ms / 1000ms）で十分。**追加しない**。

> spec で `useReducedMotion` を要する箇所は spec 側の実装ガイドが確定済みのため、本 Issue ではトークン側で何もしない。

### 6.6 推奨セット

`tailwind.config.ts` の `theme.extend` への追加は **以下のみ**:

| キー | 値 | 用途 |
|---|---|---|
| `boxShadow.card` | ink ベース 5% / 4% rgba（§4.3） | カード静止 |
| `boxShadow.card-hover` | ink ベース 10% / 6% rgba（§4.3） | カード hover |
| `boxShadow.floating` | ink ベース 12% rgba（§4.3） | モーダル / 浮き要素 |
| `letterSpacing.warning` | `0.06em` | 警告バナー見出し |
| `ringColor.DEFAULT` | `#9CAEB8` | accent リング |
| `ringWidth.DEFAULT` | `2px` | リング幅 |
| `ringOffsetColor.DEFAULT` | `#F8F6F2` | canvas オフセット |

`spacing` / `borderRadius` / `fontSize` / `lineHeight` / `screens` / `transitionDuration` / `borderWidth` には何も足さない。

---

## 7. `globals.css` の base スタイル拡張

### 7.1 論点

`@layer base` に何を追加するか。候補:

1. `*:focus-visible` のグローバルリングスタイル統一
2. `body { font-feature-settings: "palt" 1 }`（日本語のプロポーショナル化、可読性向上）
3. `body { text-rendering: optimizeLegibility }`（ペアカーニング・リガチャ有効化）
4. `:root` での CSS 変数定義（カラー HEX を CSS 変数で公開）
5. `scroll-behavior: smooth`
6. `html { -webkit-tap-highlight-color: transparent }`（モバイルでタップ時の青矩形抑制）

### 7.2 各候補の判断

#### (1) `*:focus-visible` グローバルリング — **採用**

a11y のベースラインとして必須。Tailwind preflight は `outline: 2px solid transparent; outline-offset: 2px` を当てており、ブラウザデフォルトのフォーカスインジケータが場合によって出ない。明示的に accent 色リングを当てる。

```css
@layer base {
  *:focus-visible {
    outline: 2px solid #9CAEB8;
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

> Tailwind の `ring` ユーティリティは `box-shadow` ベースだが、グローバルに当てるならネイティブ `outline` プロパティを使う方がレイアウトに影響しない。コンポーネント側で `focus-visible:ring-2 focus-visible:ring-offset-2` を明示する場合はそちらが優先される（`outline: none` を併用）。

#### (2) `body { font-feature-settings: "palt" 1 }` — **採用**

`palt` は日本語の **プロポーショナルメトリクス** を有効化する OpenType 機能。Noto Sans JP は `palt` をサポートしており、有効にすると日本語の句読点・括弧周りの不自然な余白が詰められて可読性が向上する。B2B 商談画面で「文字組みが綺麗」という印象に直結する。

副作用: 数値や英字の幅には影響しない（Inter は `palt` を持たないため無視される）。

#### (3) `body { text-rendering: optimizeLegibility }` — **採用**

リガチャとカーニングを有効化。テキストが多い B2B 画面で可読性が向上。

> パフォーマンス影響は文字数が極端に多いページ（数万文字以上）で発生し得るが、本プロジェクトの画面は最大でも数百文字オーダーのため無視できる。

#### (4) `:root` での CSS 変数定義 — **却下**

Issue #7 §2.2 で「CSS 変数を挟まない」方針を明文化済み（HEX を Tailwind に集約、JS から `getComputedStyle` を使わずに済むよう設計）。本 Issue でこの方針を覆す合理性はないため **却下**。

#### (5) `scroll-behavior: smooth` — **却下**

商談で使う画面で滑らかなスクロールが必要な場面はなく、`prefers-reduced-motion` 配慮も別途要る。**追加しない**。

#### (6) `html { -webkit-tap-highlight-color: transparent }` — **採用（軽量で副作用なし）**

iOS Safari でボタン / リンクをタップした際の青い半透明矩形を抑制し、Tailwind の `active:` バリアント等で表現を統一できる。

### 7.3 採用する `globals.css` の `@layer base` 追加

```css
@layer base {
  html {
    -webkit-tap-highlight-color: transparent;
  }
  body {
    font-feature-settings: "palt" 1;
    text-rendering: optimizeLegibility;
  }
  *:focus-visible {
    outline: 2px solid #9CAEB8;
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

`@layer utilities` の `.text-balance` は既存維持（変更なし）。

> `<body>` の `bg-canvas text-ink` は `layout.tsx` で当てているため、`globals.css` の `@layer base` で `body { background-color: ... }` を重複させない（DRY）。

---

## 8. 共通コンポーネント雛形（`src/components/ui/`）

### 8.1 shadcn/ui 導入 vs 自前最小実装

#### 選択肢 A: shadcn/ui（`npx shadcn-ui init` 後 `Button` / `Card` を generate）

- **Pros**:
  - Radix UI + Tailwind ベースの強力な雛形。型安全な variant、a11y、`asChild` 等が即手に入る。
  - 業界での採用事例が多く、新規参画者が把握しやすい。
- **Cons**:
  - **Issue #8 で固めた依存範囲（lucide-react / jspdf / html2canvas / recharts の 4 本）を逸脱する**。`@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge` の 4 本が暗黙追加される。
  - shadcn は「コードをコピーして自分のリポジトリに置く」方式。本プロジェクトの規模（カードとボタンの 2 種類しか要らない）に対して **生成されるコード量が過剰**。
  - 雛形が全プロジェクトで同じ顔になり、ブランド「洗練されたニュアンス」固有の調整箇所が見つけづらくなる。
  - Cloudflare Pages の Edge ランタイム（Issue #11）で Radix の依存挙動を都度検証する手間が増える。

#### 選択肢 B: 自前最小実装（Tailwind class + `forwardRef` + 自前 `cn` ヘルパ）— **推奨**

- **Pros**:
  - Issue #8 で固めた依存範囲を逸脱しない（追加依存ゼロ）。
  - 本プロジェクトで必要十分（Button / Card の 2 種類のみ）。
  - コード量が極小（各 30〜60 行）。レビューが速い。
  - ブランド固有の調整（`shadow-card`, `rounded-xl`, accent CTA カラー等）が雛形側に直接書かれており、後続 Issue が同じトークンセットで揃う。
- **Cons**:
  - shadcn の `asChild` 相当機能（`<Slot>` で別要素にスタイルを継承させる）が無い。`<Link>` を Button スタイルで描画したい場合に **ラッパで対応** か **Tailwind class を直接付ける** ことになる。本プロジェクトでは現時点でこのニーズが無い。
  - variant prop の型安全を `as const` の手書き Union で書く必要がある（cva 不使用）。

#### 選択肢 C: Headless UI（`@headlessui/react`）+ 自前 Tailwind スタイル

- **Pros**: a11y 強化版。
- **Cons**: 同様に依存追加が発生。Button / Card レベルでは過剰。

### 8.2 推奨: 自前最小実装

**選択肢 B（自前最小実装）** を推奨。雛形コンポーネントの設計:

#### 8.2.1 `Button`

- **Props**: `variant: "primary" | "secondary" | "ghost"`, `size: "sm" | "md" | "lg"`, `className?`, その他 `<button>` のネイティブ属性
- **`asChild` は不要**（Radix Slot 不採用）
- **variant 設計**:
  - `primary`: `bg-accent text-canvas hover:opacity-90`（CTA。「アクセント上の canvas テキスト」のコントラストは Issue #7 §10.5 で「WCAG AA を満たさない可能性あり」と申し送り済みのため、実際の視認性は本 Issue でのプレビューで再確認 → §21 R5 参照）
  - `secondary`: `border border-line bg-canvas text-ink hover:bg-line/30`（控えめ）
  - `ghost`: `bg-transparent text-ink hover:bg-line/20`（カード内のサブアクション向け）
- **size 設計**:
  - `sm`: `h-8 px-3 text-sm rounded-md`
  - `md`: `h-10 px-4 text-base rounded-md`（デフォルト）
  - `lg`: `h-12 px-6 text-base rounded-md`
- **disabled 時**: `disabled:cursor-not-allowed disabled:opacity-50`、`aria-disabled` は `disabled` 属性に従い HTML 標準で済む
- **focus**: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`（リング色は ringColor.DEFAULT で accent）
- **transition**: `transition-colors duration-150`

#### 8.2.2 `Card`

- **Props**: `className?`, `children`, その他 `<div>` のネイティブ属性
- **デフォルトスタイル**: `rounded-xl border border-line/50 bg-canvas shadow-card p-6`
- **モバイル padding 切替**: 雛形側では `p-6` 固定とし、モバイル `p-4` を要するページでは `<Card className="p-4 sm:p-6">` のように **クラス上書き** で運用
  - 雛形が responsive padding を持つと「他のサイズに切り替えたい」要望ごとに props が増殖するため、最小設計を保つ
- **variant は実装しない**（`<Card variant="hero">` のような分岐は本 Issue では不要、後続実装で必要になった時点で追加）

#### 8.2.3 `Input` の最小ラッパ（**本 Issue では含めない**）

- input-form 仕様（Issue #2）で `inputmode="numeric"` 制御や数値フォーマット入力ラッパが要る可能性が高いが、**本 Issue では含めない**
- 理由: フォーム部品は `aria-describedby` でエラー表示と紐付けたり、コントロールド入力を扱うフックを併設する設計余地があり、Button / Card より複雑。Issue #2 実装時に必要に応じて `src/components/ui/Input.tsx` として追加

### 8.3 `cn` ヘルパの設計

#### 選択肢 A: `clsx` + `tailwind-merge` の組合せ（業界標準）

- **Cons**: Issue #8 で固めた依存範囲を逸脱（2 本追加）。

#### 選択肢 B: 極小自前実装（外部依存ゼロ）— **推奨**

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
```

- **Pros**:
  - 外部依存ゼロ。
  - 本プロジェクトの雛形（Button / Card）レベルでは「クラスの条件付き連結」だけできれば十分。
  - 将来 `tailwind-merge` の競合解決（同じプロパティを複数指定して上書きしたいケース）が必要になったら、その時点で `tailwind-merge` を追加する別 Issue を起票すればよい（`cn` の関数シグネチャは互換に保つ）。
- **Cons**:
  - `cn("p-6", "p-4")` を渡すと両方が出力される（`tailwind-merge` のように後勝ちで `p-4` のみにはならない）。最後の指定を勝たせたい用途では Tailwind の生成順依存になり挙動が読みづらい。
  - ただし雛形側で「デフォルトクラス + ユーザー className を末尾に連結」する運用なら、Tailwind の CSS 出力順で後勝ちが自動的に効く（Tailwind は同一プロパティでクラス出現順ではなく、CSS 出力順で勝敗を決める。ユーティリティクラスの重複指定は generally 後勝ちにならない点に注意）。
  - 上記の落とし穴は `docs/design-tokens.md` で「`cn` は単純連結。同じプロパティの上書きが必要な場合は親 className を渡さず、雛形側のクラスを変える方針」と明記して回避する。

#### 選択肢 C: `clsx` のみ追加（`tailwind-merge` 無し）

- **Cons**: 1 本追加に対して恩恵が薄い（`undefined` / `false` フィルタは自前実装で十分）。

### 8.4 推奨

- **`Button` / `Card` は自前最小実装**
- **`Input` は本 Issue では含めない**
- **`cn` は極小自前実装**（外部依存ゼロ）

### 8.5 ファイル配置の意思決定

```
src/
  components/
    ui/
      Button.tsx     ← 新規
      Card.tsx       ← 新規
      index.ts       ← Re-export（任意、§9 参照）
  lib/
    cn.ts            ← 新規（極小実装）
```

ディレクトリ規約:
- `src/components/ui/` — 純粋な UI 雛形（汎用、ドメイン非依存）
- `src/components/` 直下 — 機能コンポーネント（`InputForm.tsx` / `ResultDashboard.tsx` 等、後続 Issue で追加）
- `src/lib/` — ヘルパ / 計算ロジック（`cn.ts` / 後続で `pdf.ts` / `calc.ts` 等）

> shadcn 慣習に倣う命名（`src/components/ui/`）にすることで、将来 shadcn を導入する判断になった場合の差し替えが容易。

---

## 9. ファイル配置とパス（最終形）

```
src/
  components/
    ui/
      Button.tsx              ← 新規
      Card.tsx                ← 新規
      index.ts                ← 新規（Re-export）
  lib/
    cn.ts                     ← 新規
  app/
    globals.css               ← 更新（@layer base 拡張）
    page.tsx                  ← 更新（shadow / radius / Button / Card プレビュー追加）
    layout.tsx                ← 更新なし（Issue #9 で metadata 完了済み）
tailwind.config.ts            ← 更新（boxShadow / letterSpacing / ringColor / ringWidth / ringOffsetColor）
docs/
  design-tokens.md            ← 新規（運用ルール / 用途マッピング / 意思決定ログ）
```

### 9.1 `src/components/ui/index.ts` の要否

**任意採用**を推奨。Re-export パターン:

```ts
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
export { Card } from "./Card";
export type { CardProps } from "./Card";
```

- **Pros**: 後続 Issue で `import { Button, Card } from "@/components/ui"` と書け、import 文がスッキリする。
- **Cons**: barrel ファイルは tree-shake が効きづらいケースが過去にあったが、Next.js 14 / Webpack 5 の現状ではほぼ問題ない（`sideEffects: false` を `package.json` に書く必要はない、本ファイルは ESM の named export のみ）。

### 9.2 import alias

`tsconfig.json` の `paths` で `@/*` が `./src/*` に解決されることを想定（Next.js デフォルト）。本 Issue で `tsconfig.json` の変更は不要。

---

## 10. `tailwind.config.ts` 変更案（具体コード）

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
        // Issue #7 で確定済み（パレット名 + ロール別エイリアス）
        offwhite: "#F8F6F2",
        ash: "#72665B",
        greige: "#BEB5AA",
        misty: "#9CAEB8",

        canvas: "#F8F6F2",
        ink: "#72665B",
        line: "#BEB5AA",
        accent: "#9CAEB8",
      },
      fontFamily: {
        // Issue #7 で確定済み
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-jp)",
          "system-ui",
          "sans-serif",
        ],
      },
      // ▼ Issue #10 で追加
      boxShadow: {
        // ink (#72665B) ベースの rgba。canvas (#F8F6F2) 上で柔らかく見せる
        card: "0 1px 2px 0 rgba(114, 102, 91, 0.05), 0 1px 3px 0 rgba(114, 102, 91, 0.04)",
        "card-hover":
          "0 4px 12px -2px rgba(114, 102, 91, 0.10), 0 2px 4px 0 rgba(114, 102, 91, 0.06)",
        floating: "0 12px 24px -4px rgba(114, 102, 91, 0.12)",
      },
      letterSpacing: {
        // 警告バナー見出し用 (docs/spec/warning-copy.md の 0.05em〜0.08em の中央値)
        warning: "0.06em",
      },
      ringColor: {
        DEFAULT: "#9CAEB8",
      },
      ringWidth: {
        DEFAULT: "2px",
      },
      ringOffsetColor: {
        DEFAULT: "#F8F6F2",
      },
    },
  },
  plugins: [],
};
export default config;
```

注意点:

- `spacing` / `borderRadius` / `fontSize` / `lineHeight` / `borderWidth` / `screens` / `transitionDuration` には **何も足さない**（§2 〜 §6 の判断結果）。
- `colors` / `fontFamily` は Issue #7 で確定済みのため触らない。
- `boxShadow` のキー名 `card-hover` のようにハイフン入りキーはクォート必須（`"card-hover"`）。Tailwind 上では `shadow-card-hover` クラスで参照。
- `ringColor.DEFAULT` を設定すると `ring` 単体クラスで accent 色リングが当たる。`ring-2` `ring-offset-2` は Tailwind 既定の `ringWidth` キー（`2`）を使うため、本拡張の `DEFAULT: "2px"` は `ring` 単体の太さを 2px にする目的（`ring`（DEFAULT）= 2px のリング）。

---

## 11. `globals.css` 変更案（具体コード）

```css
/*
 * 設計方針:
 * - カラーは tailwind.config.ts の theme.extend.colors に HEX 直書きで集約する。
 *   CSS 変数を挟まないことで、JS 側（html2canvas / Recharts 等）から色を
 *   参照したい場合に getComputedStyle を要さない。
 * - ライトモード限定。設計ガイドライン 3.3 にダークモード指定はないため、
 *   prefers-color-scheme: dark のオーバーライドは意図的に置かない。
 * - 背景色・文字色は layout.tsx の <body> クラス (bg-canvas text-ink) で当てる。
 * - Issue #10 で @layer base に focus-visible リング統一 / palt / optimizeLegibility を追加。
 */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    -webkit-tap-highlight-color: transparent;
  }
  body {
    font-feature-settings: "palt" 1;
    text-rendering: optimizeLegibility;
  }
  *:focus-visible {
    outline: 2px solid #9CAEB8;
    outline-offset: 2px;
    border-radius: 2px;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

ポイント:
- `<body>` の `bg-canvas text-ink` は `layout.tsx` で当てているため重複させない（DRY）。
- `*:focus-visible` のリング色は Tailwind トークンと同じ `#9CAEB8` を直書き（`@apply ring` を使うと CSS 変数化が必要になり方針に反する）。
- 雛形 `Button` 等で `focus-visible:ring-2 focus-visible:ring-offset-2` を当てた場合、コンポーネント側のクラスが優先される（`outline-none` を雛形側で併用してネイティブ outline を抑制）。

---

## 12. `src/components/ui/Button.tsx` 雛形コード例

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-canvas hover:opacity-90",
  secondary: "border border-line bg-canvas text-ink hover:bg-line/30",
  ghost: "bg-transparent text-ink hover:bg-line/20",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-6 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...rest}
    />
  );
});
```

ポイント:
- `forwardRef` で ref 透過（後続実装で `useRef<HTMLButtonElement>` を使うケースに対応）。
- `type` 属性のデフォルトを `"button"` に（フォーム内で誤って submit しないため）。
- `className` を末尾連結することで、呼び出し側の上書きが Tailwind の生成順で勝つ余地を残す（同一プロパティの上書きは保証しないが、追加クラス付与は安全）。
- variant / size は `Record<Type, string>` の lookup で型安全。cva 等の追加依存は不要。

---

## 13. `src/components/ui/Card.tsx` 雛形コード例

```tsx
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement>;

const baseClasses =
  "rounded-xl border border-line/50 bg-canvas shadow-card p-6";

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} className={cn(baseClasses, className)} {...rest} />;
});
```

ポイント:
- variant / size は持たない（最小設計）。`<Card className="p-4 sm:p-6 shadow-card-hover">` のようにクラス上書きで運用。
- `border-line/50` は Tailwind の不透明度修飾（line 色を 50% 透明）。視覚的に薄い罫線でカード境界を示す。
- `bg-canvas` は `<body>` と同じため、視覚上カードと背景の差は border + shadow が担う。

---

## 14. `src/lib/cn.ts` 極小実装コード例

```ts
/**
 * 条件付き className 連結ヘルパ。
 *
 * - 用途: 雛形コンポーネントのデフォルトクラスと呼び出し側 className を結合する。
 * - 設計: clsx / tailwind-merge を使わない極小実装。外部依存ゼロを維持する。
 *   同一 Tailwind プロパティの上書きが必要な場合は呼び出し側で完全なクラスを
 *   渡さず、雛形側のクラスを構成し直す方針とする (詳細: docs/design-tokens.md)。
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
```

ポイント:
- 引数型を `string | false | null | undefined` に絞ることで、`cn("foo", isActive && "bar")` のような使い方を型安全に表現。
- 配列やオブジェクト記法（`cn({ active: true })`）はサポートしない（必要発生時に拡張）。

---

## 15. `src/app/page.tsx` のプレビュー更新案

Issue #7 のカラースウォッチに加えて、`shadow` / `radius` / `Button` / `Card` のプレビューを並べる。後続 UI 本実装で削除予定の TODO コメント付き。

```tsx
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-8">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">またたび計算機</h1>
        <p className="text-sm sm:text-base">
          現在準備中です。今しばらくお待ちください。
        </p>
        <p className="text-sm text-ink/80">
          The quick brown fox jumps over the lazy cat. 1234567890
        </p>
      </section>

      {/* TODO: UI 本実装時に削除（Issue #2 / #3 / #4 / #5） */}
      <section aria-label="カラートークン プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Color tokens</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded border border-line bg-canvas" />
            <span className="text-xs">canvas / #F8F6F2</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-ink" />
            <span className="text-xs">ink / #72665B</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-line" />
            <span className="text-xs">line / #BEB5AA</span>
          </li>
          <li className="flex flex-col items-center gap-2">
            <span className="h-16 w-full rounded bg-accent" />
            <span className="text-xs">accent / #9CAEB8</span>
          </li>
        </ul>
      </section>

      {/* TODO: UI 本実装時に削除 */}
      <section aria-label="角丸 / シャドウ プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Radius &amp; Shadow tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line/50 bg-canvas p-4 text-center text-xs">
            rounded-md / 6px
          </div>
          <div className="rounded-xl border border-line/50 bg-canvas p-4 text-center text-xs">
            rounded-xl / 12px
          </div>
          <div className="rounded-2xl border border-line/50 bg-canvas p-4 text-center text-xs">
            rounded-2xl / 16px
          </div>
          <div className="rounded-xl bg-canvas p-4 text-center text-xs shadow-card">
            shadow-card
          </div>
          <div className="rounded-xl bg-canvas p-4 text-center text-xs shadow-card-hover">
            shadow-card-hover
          </div>
          <div className="rounded-xl bg-canvas p-4 text-center text-xs shadow-floating">
            shadow-floating
          </div>
        </div>
      </section>

      {/* TODO: UI 本実装時に削除 */}
      <section aria-label="Button プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Button (variant × size)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">Primary sm</Button>
          <Button variant="primary" size="md">Primary md</Button>
          <Button variant="primary" size="lg">Primary lg</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* TODO: UI 本実装時に削除 */}
      <section aria-label="Card プレビュー" className="w-full max-w-xl">
        <h2 className="mb-3 text-sm font-medium">Card</h2>
        <Card>
          <h3 className="mb-2 text-base font-semibold">Card title</h3>
          <p className="text-sm text-ink/80">
            rounded-xl / border-line/50 / shadow-card / p-6 がデフォルト。
            モバイルで padding を縮める場合は className=&quot;p-4 sm:p-6&quot; を渡す。
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm">アクション</Button>
            <Button variant="ghost" size="sm">サブ</Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
```

ポイント:
- 各セクション末尾にスクリーンショット撮影しやすいよう独立配置。
- 全プレビューに `TODO: UI 本実装時に削除` コメントを残し、後続 Issue で `page.tsx` をフルに置き換える前提を明示。
- Button の 6 パターン（primary sm / md / lg / secondary / ghost / disabled）を 1 行に並べて目視確認しやすい構成。
- Card プレビューでは、Card 内に Button を配置することで「カード内のサブアクション」のレイアウトも同時確認。

---

## 16. `docs/design-tokens.md` の構成案

レビュアーや後続実装者が「クラス名選択の根拠」を参照する場として、運用ルールと意思決定ログを 1 ファイルに集約する。

### 16.1 構成（章立て）

```markdown
# またたび計算機 デザイントークン運用ガイド

## 1. このドキュメントの目的
- 各 UI 実装 PR でクラス名選択にブレを出さないための一次情報源。
- カラー（Issue #7）/ 余白・角丸・シャドウ・タイポ補強（Issue #10）の運用ルールをまとめる。
- 暫定値 / 確定値の境界を示す。

## 2. カラー（Issue #7 で確定済み、再掲）
- canvas / ink / line / accent の 4 ロール
- パレット名: offwhite / ash / greige / misty （中立キー、併用可）
- HEX 直書き方針、CSS 変数を挟まない理由

## 3. 余白の運用ルール
- Tailwind デフォルトスケールをそのまま使う
- 用途別推奨表（§2.3 の表をここに転記）

## 4. 角丸の用途マッピング
- §3.3 の表をここに転記
- カードは rounded-xl 固定（雛形 Card で担保）
- ボタン / 入力は rounded-md
- バッジ / Pill は rounded-full
- グラフバーは rounded-sm

## 5. シャドウの用途マッピング
- §4.3 の表をここに転記
- shadow-card / card-hover / floating の 3 種のみ使う
- Tailwind デフォルト（shadow-md 等）は原則使わない

## 6. タイポグラフィ補強
- letter-spacing.warning = 0.06em の使い場所（WarningBanner の英字見出し）
- ヒーロー数値の clamp() は実装側で個別記述する方針

## 7. フォーカスリング
- グローバルに *:focus-visible で accent 2px outline
- インタラクティブ要素では focus-visible:ring-2 focus-visible:ring-offset-2 で上書き
- リング色 / 太さ / オフセット色は ringColor / ringWidth / ringOffsetColor の DEFAULT で集約

## 8. 共通コンポーネントの variant 一覧
### 8.1 Button
- variant: primary / secondary / ghost
- size: sm / md / lg
- 用途: primary は CTA / secondary は補助 / ghost はカード内サブ

### 8.2 Card
- variant なし（最小設計）
- デフォルト: rounded-xl border-line/50 bg-canvas shadow-card p-6
- モバイル padding: 呼び出し側で className="p-4 sm:p-6" を渡す

## 9. cn ヘルパの使い方
- 単純連結のみ。条件付き連結（false / null / undefined をフィルタ）対応
- tailwind-merge は不採用 → 同一プロパティ上書きが要る場合は雛形クラスを再構築

## 10. 暫定 vs 確定の境界
- spec ファイル（result-dashboard.md / pdf-report.md / warning-copy.md）には旧パレット参照が残る箇所があり、Issue #22 で置換予定
- spec の固有数値（PDF mm 系、最大幅 1024px 等）は spec 側が確定値を持つ。デザイントークン側ではカバーしない
- shadow-card / card-hover / floating の数値は暫定。実 UI が並んだ際の見え方で再調整余地あり

## 11. 意思決定ログ
- spacing カスタムキーを追加しない理由
- borderRadius カスタムキーを追加しない理由
- ink ベースシャドウを採用する理由
- shadcn/ui を採用しない理由
- cn を極小自前実装にする理由
- → 各々 Issue #10 のプラン §2 〜 §8 へリンク
```

### 16.2 推奨実装ボリューム

200〜300 行程度。表組多めで「読まずに引ける」リファレンス性を重視。

---

## 17. アクセシビリティ観点

### 17.1 フォーカスリング

- グローバル: `*:focus-visible` で `outline: 2px solid #9CAEB8`（accent）+ オフセット 2px
- 雛形 Button: `focus-visible:ring-2 focus-visible:ring-offset-2` で `box-shadow` ベースのリング（accent + canvas オフセット）に切替
- 雛形 Card 自体は通常 focusable ではないため、リング指定は内部 Button に委ねる

### 17.2 コントラスト比

- ink (`#72665B`) on canvas (`#F8F6F2`): 約 5.4:1（WCAG AA 適合）
- accent (`#9CAEB8`) on canvas: 約 1.8:1（テキスト用途には不適。背景・装飾でのみ使用）
- canvas on accent (Button primary のテキスト) : 約 1.8:1（**WCAG AA 不適合**）→ §21 R5 申し送り

> Issue #7 §10.5 で既に申し送り済み。本 Issue のプレビューで実物を画面に並べた際に最終判断する。Button primary の text 色を `text-ink`（accent 上に ink テキスト）に変更する選択肢が残る（コントラスト比 約 3.0:1 で AA Large pass、AA Normal は不適合）。最終的には accent 自体の彩度を上げる（Issue #22 でパレット再調整）か、CTA だけ別色（例: ink ベース `bg-ink text-canvas`）にするかの議論を後続 Issue（実装フェーズ #2 / #3）で行う。

### 17.3 `prefers-reduced-motion` 配慮

- 雛形 Button の `transition-colors duration-150` は短時間のため `prefers-reduced-motion: reduce` 環境でも視覚的問題なし。
- 過剰なアニメ（`animate-bounce` 等）はトークンにも雛形にも含めない。

### 17.4 キーボード操作

- 雛形 Button は HTML `<button>` 要素そのもの → Enter / Space で発火、Tab フォーカス可能（HTML 標準挙動）。
- `disabled` 時の挙動: HTML `disabled` 属性に従い、Tab 順序からも外れる。`aria-disabled` 属性は HTML disabled で十分なため不要。
- 雛形 Card は `<div>` ベース → 通常 focusable でない。クリック可能カードを作る場合は `role="button" tabIndex={0}` 付与の判断を実装側に委ねる（雛形では持たない）。

### 17.5 言語属性

- `<html lang="ja">` は Issue #7 で確定済み。本 Issue で変更なし。

---

## 18. 動作確認手順

### 18.1 ローカル開発

```bash
npm run dev
# ブラウザで http://localhost:3000 を開く
```

確認項目:

- [ ] ブラウザで `/` を開いたとき、Issue #7 のカラースウォッチに加えて以下が描画されている:
  - Radius & Shadow tokens プレビュー（rounded-md / xl / 2xl と shadow-card / card-hover / floating の 6 タイル）
  - Button プレビュー（primary sm / md / lg / secondary / ghost / disabled の 6 種）
  - Card プレビュー（rounded-xl + shadow-card 適用）
- [ ] DevTools → Elements で `<button>` のスタイルを確認:
  - `background-color: rgb(156, 174, 184)`（accent）
  - `color: rgb(248, 246, 242)`（canvas）
  - `border-radius: 6px`
  - `transition-property: color, background-color, border-color, ...`
- [ ] DevTools で `<Card>`（`<div class="rounded-xl ...">`）のスタイルを確認:
  - `border-radius: 12px`
  - `box-shadow: 0 1px 2px 0 rgba(114, 102, 91, 0.05), 0 1px 3px 0 rgba(114, 102, 91, 0.04)`
  - `padding: 24px`
  - `border: 1px solid rgba(190, 181, 170, 0.5)`
- [ ] DevTools の Computed で `body` の `font-feature-settings` が `"palt" 1` になっている
- [ ] Tab キーで Button にフォーカスを移動した際、accent 色 2px のリングが描画される
- [ ] Tab キーで Card 内の Button へ移動した際もリングが描画される
- [ ] Button hover 時に `opacity` が変化する（primary）/ `bg-line/30` が当たる（secondary）/ `bg-line/20` が当たる（ghost）
- [ ] Button disabled の場合、cursor が `not-allowed` になり opacity が 50% になる
- [ ] iOS Safari（または DevTools のモバイルエミュレーション）でタップ時に青い半透明矩形が出ない（`-webkit-tap-highlight-color: transparent`）

### 18.2 静的検証

```bash
npm run typecheck
npm run lint
npm run build
```

期待:
- `typecheck` エラー 0 件（`Button` / `Card` / `cn` の型整合確認）
- `lint` エラー 0 件
- `build` 成功（Tailwind の `shadow-card` / `tracking-warning` 等が purge 後も残っていることを `.next/static/css/` で確認）

### 18.3 Tailwind トークン解決の確認

```bash
npm run build
# .next/static/css/*.css を grep
grep -E "rgba\(114, 102, 91" .next/static/css/*.css   # shadow-card 等
grep -E "letter-spacing: 0.06em" .next/static/css/*.css  # tracking-warning
```

両方とも結果が返ること（含まれていることを確認）。

---

## 19. 実装ステップ（順序）

### Step 1. ブランチ作成

```bash
cd /Users/YS/development/matatabi-calculator
git checkout develop
git pull origin develop
git checkout -b feature/design-tokens-and-components_20260425
```

ブランチ名は既存命名規則（`feature/<topic>_<yyyymmdd>`）に従う。

### Step 2. `tailwind.config.ts` 更新（§10 のコード）

`theme.extend` に `boxShadow` / `letterSpacing` / `ringColor` / `ringWidth` / `ringOffsetColor` を追加。`colors` / `fontFamily` は触らない。

### Step 3. `globals.css` 更新（§11 のコード）

`@layer base` ブロックを新規追加（`html` / `body` / `*:focus-visible`）。`@layer utilities` の `.text-balance` は維持。

### Step 4. `src/lib/cn.ts` 新規作成（§14 のコード）

ディレクトリ `src/lib/` を作成し、`cn.ts` を配置。

### Step 5. `src/components/ui/Button.tsx` 新規作成（§12 のコード）

ディレクトリ `src/components/ui/` を作成し、`Button.tsx` を配置。

### Step 6. `src/components/ui/Card.tsx` 新規作成（§13 のコード）

### Step 7. `src/components/ui/index.ts` 新規作成（§9.1 のコード）

### Step 8. `src/app/page.tsx` 更新（§15 のコード）

Issue #7 のスウォッチ部分は維持し、新たに「Radius & Shadow」「Button」「Card」の 3 セクションを追加。

### Step 9. `docs/design-tokens.md` 新規作成（§16 のコード）

### Step 10. 静的検証

```bash
npm run typecheck
npm run lint
npm run build
```

3 つともグリーン確認。

### Step 11. ローカル動作確認（§18.1）

`npm run dev` でプレビューページを目視 / DevTools 確認。スクリーンショットを PR 本文に添付するために 4 セクション分（カラー / radius&shadow / Button / Card）を撮影。

### Step 12. コミット

変更範囲が論理的に不可分のため **1 コミット**を推奨。コミットメッセージ例:

```
feat(design): デザイントークン拡張と共通コンポーネント雛形を追加 (#10)

- tailwind.config.ts: boxShadow (card / card-hover / floating)、
  letterSpacing.warning、ringColor / ringWidth / ringOffsetColor の
  DEFAULT を追加。spacing / borderRadius / fontSize は Tailwind デフォルト
  を維持し、運用ルールで揃える方針。
- globals.css: @layer base に *:focus-visible リング統一、
  body の palt / optimizeLegibility、html の tap-highlight-color none を追加。
- src/components/ui/Button.tsx: variant primary / secondary / ghost、
  size sm / md / lg の最小実装。forwardRef + 自前 cn ヘルパ。
- src/components/ui/Card.tsx: rounded-xl / shadow-card / p-6 のデフォルト。
- src/lib/cn.ts: clsx / tailwind-merge を使わない極小実装。
- docs/design-tokens.md: 運用ルール / 用途マッピング / 意思決定ログ。
- src/app/page.tsx: shadow / radius / Button / Card のプレビューを追加
  （後続 UI 実装で削除予定）。

shadcn/ui は不採用。理由は plans/issue-10_design-tokens-and-components.md §8.1。
本 Issue では機能コンポーネント（InputForm / ResultDashboard 等）は
実装しない。Issue #2 / #3 / #4 / #5 の本実装フェーズで雛形を消費する。
```

### Step 13. プッシュと PR 作成

```bash
git push -u origin feature/design-tokens-and-components_20260425
gh pr create --base develop --title "デザイントークン拡張と共通コンポーネント雛形を追加 (#10)" --body "$(cat <<'EOF'
## 概要

Issue #10 に基づき、後続実装 Issue（#2 / #3 / #4 / #5）が
クラス名で迷わずに書けるよう、Tailwind トークンを拡張し
共通コンポーネント雛形を追加した。

## 追加 / 変更

- tailwind.config.ts: boxShadow / letterSpacing / ring 系トークン
- globals.css: @layer base 拡張（focus-visible / palt / optimizeLegibility）
- src/components/ui/Button.tsx (新規)
- src/components/ui/Card.tsx (新規)
- src/components/ui/index.ts (新規)
- src/lib/cn.ts (新規)
- docs/design-tokens.md (新規)
- src/app/page.tsx: プレビューセクション追加

## 意思決定サマリー

- spacing / borderRadius / fontSize のカスタムキーは追加しない（Tailwind
  デフォルト + 運用ルールで揃える）
- ink ベースの shadow を 3 種追加（黒シャドウは canvas 上で濁るため）
- shadcn/ui は採用しない（Issue #8 の依存範囲を逸脱しないため）
- cn は外部依存ゼロの極小自前実装

## スコープ外

- InputForm / ResultDashboard / WarningBanner / PdfDashboard の実装
- Input / Select 等のフォーム部品ラッパ（Issue #2 で必要に応じて追加）
- ダークモード（マスター §3.3 でライト固定）
- spec 旧パレット参照の置換（Issue #22 別途起票）

## 検証

- [x] npm run typecheck (0 errors)
- [x] npm run lint (0 errors)
- [x] npm run build (success)
- [x] `/` でカラー / radius&shadow / Button / Card のプレビュー描画
- [x] DevTools で shadow-card / tracking-warning / focus-visible リングが解決されている
- [x] Tab キーで accent 色のフォーカスリングが描画される

## プラン参照

`working/plans/issue-10_design-tokens-and-components.md`
EOF
)"
```

---

## 20. スコープ外（再掲）

| 項目 | 担当 / 申し送り先 |
|---|---|
| `InputForm` の実装 | Issue #2 の本実装 PR |
| `ResultDashboard` / `Recharts` のカラー定数 | Issue #3 の本実装 PR |
| `WarningBanner` の実装（`tracking-warning` 消費含む） | Issue #4 の本実装 PR |
| `PdfDashboard` の実装（`shadow-card` を PDF 内のカードに適用するか含む） | Issue #5 の本実装 PR |
| Layout 共通コンポーネント（Header / Footer / 背景装飾差し込み） | 後続「Layout 共通コンポーネント実装 Issue」 |
| shadcn/ui の導入 | 採用しない（§8.1） |
| Radix UI / Headless UI の導入 | 採用しない（同上） |
| ダークモード（`darkMode: 'class'`） | マスター設計書 §3.3 でライト固定 |
| i18n（多言語切替） | プロジェクト範囲外 |
| `tailwind-merge` の導入 | 不採用、必要発生時に別 Issue 起票 |
| `class-variance-authority` の導入 | 同上 |
| `tailwindcss-animate` プラグイン | 同上 |
| アニメーションプリセット（`transitionDuration` のフルセット） | 必要発生時に段階追加 |
| スクロール挙動（`scroll-behavior: smooth`） | 商談画面では不要 |
| `Input` / `Select` / `Textarea` / `Label` 雛形 | Issue #2 で必要に応じて追加 |
| `Skeleton` / `Spinner` 雛形 | 必要発生時に別 Issue |
| `Toast` / `Tooltip` / `Modal` 雛形 | 同上 |
| `docs/spec/*.md` の旧パレット参照置換 | Issue #22 で別途対応 |
| Issue #7 本文の旧パレット記述更新 | 同上 |

---

## 21. リスクと申し送り

### R1: shadcn/ui 後発採用時の移行コスト

将来 `Tabs` / `Modal` / `Combobox` 等の複雑な UI が必要になった時点で「自前実装で全部書くのは厳しい → shadcn/ui を導入」という議論が再燃する可能性がある。

- 対策: 雛形（Button / Card）を **薄く保つ**ことで移行を容易にする。`Button` の `variant` は `Record` lookup で型安全だが、cva に書き換えるリファクタは 30 行程度のため後戻りコストは小さい。
- 雛形側で shadcn 互換の API（`asChild` / `forwardRef` の引数型）に寄せる必要は無い。本 Issue では本プロジェクトに必要な API だけに絞る。

### R2: 旧パレット参照を含む spec ファイル

`docs/spec/result-dashboard.md` / `pdf-report.md` / `warning-copy.md` には旧パレット（Slate 50 / Blue 500 / Amber 500）参照が残る。

- 本 Issue では **新パレットを使ったコンポーネント雛形のみ** で運用する（spec の旧パレット記述には触らない）。
- spec の置換は Issue #22 で別途実施（Issue #7 の §0 で確定済み）。
- 後続実装 Issue（#3 / #4 / #5）が spec を読みながら実装する際は「カラーは新パレット（canvas / ink / line / accent）に読み替える」ガイドが Issue #22 マージ後まで必要。本 Issue の `docs/design-tokens.md` §10 にこの読み替えルールを記載する。

### R3: shadow の数値は暫定

`shadow-card` / `card-hover` / `floating` の rgba 透過率（5% / 10% / 12% 等）は **暫定値**。

- 申し送り: 実際の Card / Button が画面に並んだ際の見え方で再調整する旨を `docs/design-tokens.md` §10 に明記。
- 再調整 PR は本 Issue 完了後、Issue #2 / #3 の本実装 PR の中で「気付いたら微調整」運用とする。大きな変更が必要な場合は別 Issue を起票。
- 数値の桁を保守的に保ち、5% 以下 / 12% 以上 への変更は別 Issue で行う運用合意。

### R4: `cn` 極小実装と `tailwind-merge` の競合解決

`cn("p-6", "p-4")` のように同じプロパティを複数指定するとどちらも CSS に出力され、後勝ちは Tailwind の生成順依存。雛形側のクラスを呼び出し側 className で上書きしたいケースで挙動が読みづらい。

- 対策: 雛形コンポーネント側で「呼び出し側に上書きさせるべきプロパティ」を明示的に切り出す。例: `<Card className={...} />` で padding を上書きしたい場合、`<Card className="p-4 sm:p-6" />` のように呼び出し側で完全な padding 指定を渡す（雛形側 `p-6` も同時に出力されるが Tailwind の CSS specificity で同列、出力順依存の挙動となる）。
- これで問題が出る場合は `tailwind-merge` を追加する別 Issue を起票する。`cn` の関数シグネチャは互換に保つため、移行コストは最小。

### R5: Button primary のコントラスト比（accent 上の canvas テキスト）

`bg-accent` (`#9CAEB8`) 上の `text-canvas` (`#F8F6F2`) は WCAG AA を満たさない可能性が高い（コントラスト比 約 1.8:1）。

- 申し送り: Issue #7 §10.5 で同様の懸念を申し送り済み。本 Issue のプレビューページで実物を確認した上で、以下のいずれかを後続 Issue で判断:
  - (a) `Button` primary の text 色を `text-ink` に変更（コントラスト比 約 3.0:1、AA Large は pass）
  - (b) `Button` primary 自体の背景を `bg-ink` に変更し、text 色を `text-canvas` に（コントラスト比 約 5.4:1、AA Normal pass）。アクセントは「リンク色 / グラフ強調」に限定する運用。
  - (c) Issue #22 でパレット自体を再調整（accent の彩度を上げる）
- 本 Issue では雛形を **暫定 (a)（`bg-accent text-canvas`）** で出し、プレビューページで判断材料を作る。

### R6: 雛形 `Card` の `bg-canvas` と `<body>` の `bg-canvas` 重複

カード内が `<body>` と同じ canvas 色で塗られるため、border + shadow がない場合カードが背景に溶ける。

- 対策: 雛形 Card は `border border-line/50 shadow-card` をデフォルトで持つため、視覚的に分離される。border を消したい場合は `<Card className="border-0">` で上書き可能。
- ただし PDF 内で shadow を使うと html2canvas のラスタライズで思わぬ濁りが出る可能性がある。Issue #5 実装時に `<Card className="shadow-none">` で運用する判断余地を残す。

### R7: `*:focus-visible` のグローバルリングが過剰なケース

`*:focus-visible` は **すべての要素**（`<div tabIndex={-1}>` 等を含む）にリングを当てる。プログラム的にフォーカス移動する非インタラクティブ要素にも反応する。

- 対策: 雛形 Button / Card 内で `focus-visible:ring-2 focus-visible:ring-offset-2` を明示し、`focus-visible:outline-none` でネイティブ outline を抑制することで、コンポーネント側の意図的なリングが優先される。
- グローバル outline は「予期しない focusable 要素にリングが出る」セーフティネットとして残す。問題が顕在化したら `*:focus-visible` を `:where(button, a, input, select, textarea, [tabindex]):focus-visible` に絞る別 PR を検討。

### R8: `font-feature-settings: "palt" 1` の副作用

`palt` は日本語フォントの幅を詰めるため、レイアウトが固定幅で組まれている箇所で文字数が変わって見える可能性がある。

- 影響範囲: 日本語の句読点 / 括弧 / 半角スペース周りのみ。本文の文字数や数値表記には影響しない。
- 影響想定: ResultDashboard のヒーロー数値 / 警告バナー本文 / カード見出し等で「思ったより詰まる」可能性あり。実装フェーズで違和感が出たら個別箇所のみ `font-feature-settings: normal` で解除。

### R9: Tailwind の任意値（`max-w-[1024px]` 等）が CSS purge で残るか

`docs/spec/result-dashboard.md` で確定している `max-w-[1024px]` / `max-w-[960px]` / `max-w-[720px]` は Tailwind の任意値構文。`tailwind.config.ts` の `content` パターンに `src/components/**` が含まれているため、後続 Issue で実装するコンポーネント内の任意値も自動的に検出される。

- 確認: 本 Issue では任意値を雛形コードに書かない（Card は `max-w-` を持たない最小設計）ため発火しないが、後続 Issue で `<Card className="max-w-[1024px]">` 等を書いた際に CSS に含まれることを `npm run build` で確認する運用を `docs/design-tokens.md` に記載。

### R10: `boxShadow` の `card-hover` キー命名（ハイフン問題）

`shadow-card-hover` クラス名は `shadow-{key}` の `key` がハイフンを含むため、`tailwind.config.ts` 上のキー名でクォート必須。grep 検索時にも `card-hover` で正確にヒットする。

- 確認: 雛形 Card で `hover:shadow-card-hover` を当てた際にビルドで生成されることを `npm run build` の `.next/static/css/` 出力で確認。

### R11: `palt` がベンダーごとに挙動差

Webkit / Gecko / Blink の `font-feature-settings` 解釈は概ね揃っているが、極端に古い Safari（iOS 13 以前）で `palt` が無効化される可能性。

- 影響: 本プロジェクトの想定ターゲットは現代的なブラウザ（Chrome / Safari / Firefox 最新）であり、古い Safari は対象外。マスター設計書にもブラウザ要件としては最新版前提の記述。
- 対応不要。

### R12: `src/components/ui/index.ts` の barrel re-export と tree-shake

barrel ファイル経由の named import は Webpack 5 で tree-shake が効くが、稀に edge case でバンドルに余分なコードが含まれる事例が報告されている。

- 対策: 雛形ファイル（`Button.tsx` / `Card.tsx`）は副作用を持たない pure module。`package.json` の `sideEffects: false` 設定は不要（Tailwind のグローバル CSS は別途 import されるため）。
- 後続実装で問題発生時は `import { Button } from "@/components/ui/Button"` のように個別パス import に切り替えるリファクタが可能（barrel の存在が個別 import を妨げない）。

### R13: `cn` の 1 行実装が将来 `tailwind-merge` 化された際の signature 互換

```ts
export function cn(...classes: Array<string | false | null | undefined>): string
```

`tailwind-merge` の `twMerge` は同じ signature（rest 引数で string を受け、string を返す）に対応する。将来 `import { twMerge } from "tailwind-merge"` を `cn` に差し替える場合、API 互換性が保たれる。

- ただし `clsx` の `ClassValue` 型は `Record<string, boolean>` や配列も受けるため、shadcn 慣習の `cn(arg1, { active: isActive }, [conditional])` を後で書きたくなった場合は `cn` の引数型拡張が必要。本 Issue ではこのケースを想定していない。

### R14: `globals.css` の `@layer base` 追加と Tailwind preflight の優先順位

Tailwind の `@layer base` は preflight（リセット CSS）を含む層であり、本 Issue で追加する `*:focus-visible` / `body { font-feature-settings }` 等は preflight より後に評価される。

- preflight の `*, ::before, ::after { border-style: solid; border-color: ...; }` 等とは衝突しない（プロパティが異なる）。
- `body` の `font-feature-settings` / `text-rendering` は preflight に同プロパティの指定がないため上書き衝突なし。
- `*:focus-visible` の `outline` は preflight の `*, *:focus-visible { outline: 2px solid transparent; outline-offset: 2px; }` を上書きする（後勝ち）。意図通り。

### R15: 雛形が将来「`<Card><CardHeader/><CardBody/><CardFooter/></Card>` 系の composition API」に拡張される場合

shadcn 系のカードでは `Card.Header` / `Card.Body` / `Card.Footer` のような composition パターンが使われることがある。本 Issue の雛形は `<Card>` 単体で、内部構造はユーザーの className に委ねる。

- 後続実装で composition が必要になった時点で別 Issue を起票し、`Card.Header` 等を追加するリファクタを行う。本 Issue では先取りしない（YAGNI）。

---

## 22. 完了条件（Definition of Done）

### コード変更

- [ ] `tailwind.config.ts` の `theme.extend` に `boxShadow.card` / `boxShadow.card-hover` / `boxShadow.floating` / `letterSpacing.warning` / `ringColor.DEFAULT` / `ringWidth.DEFAULT` / `ringOffsetColor.DEFAULT` が追加されている
- [ ] `tailwind.config.ts` の `colors` / `fontFamily` は変更されていない（Issue #7 の確定値を維持）
- [ ] `tailwind.config.ts` に `spacing` / `borderRadius` / `fontSize` / `lineHeight` の追加が **無い**
- [ ] `globals.css` の `@layer base` に `html { -webkit-tap-highlight-color }` / `body { font-feature-settings, text-rendering }` / `*:focus-visible { outline }` が追加されている
- [ ] `globals.css` の `@layer utilities` の `.text-balance` は変更されていない
- [ ] `globals.css` に `:root` の CSS 変数追加が **無い**

### 新規ファイル

- [ ] `src/components/ui/Button.tsx` が存在し、variant `primary` / `secondary` / `ghost` と size `sm` / `md` / `lg` を `Record` lookup で実装している
- [ ] `src/components/ui/Card.tsx` が存在し、`rounded-xl border border-line/50 bg-canvas shadow-card p-6` がデフォルトクラス
- [ ] `src/components/ui/index.ts` が存在し、Button / Card の named export と型 export を行っている
- [ ] `src/lib/cn.ts` が存在し、外部依存ゼロの 1 行実装になっている
- [ ] `docs/design-tokens.md` が存在し、§16.1 の章立てを満たしている

### `src/app/page.tsx`

- [ ] Issue #7 のカラースウォッチセクションは維持されている
- [ ] Radius & Shadow tokens プレビューセクションが追加されている
- [ ] Button プレビューセクション（6 種）が追加されている
- [ ] Card プレビューセクションが追加されている
- [ ] 各プレビューに `TODO: UI 本実装時に削除` コメントが残っている

### スコープ厳守

- [ ] `package.json` / `package-lock.json` に変更が **無い**（依存追加なし）
- [ ] `next.config.mjs` に変更が **無い**
- [ ] `src/app/layout.tsx` に変更が **無い**（Issue #9 で確定済みの metadata を保持）
- [ ] `src/components/` 配下に `ui/` 以外のディレクトリ / ファイルが **無い**
- [ ] `src/lib/` 配下に `cn.ts` 以外のファイルが **無い**
- [ ] `public/` 配下に変更が **無い**
- [ ] `docs/spec/` 配下のファイルに変更が **無い**

### 動作確認

- [ ] `npm run typecheck` がエラー 0 件で終了
- [ ] `npm run lint` がエラー 0 件で終了
- [ ] `npm run build` が成功し、`.next/static/css/` に `rgba(114, 102, 91` を含む CSS が出力されている
- [ ] `npm run build` 出力に `letter-spacing: 0.06em` が含まれている
- [ ] `npm run dev` で `/` がプレビュー 4 セクションを描画する
- [ ] DevTools で雛形 Button のスタイルが §18.1 の通り
- [ ] DevTools で雛形 Card のスタイルが §18.1 の通り
- [ ] Tab キーで accent 色のフォーカスリングが描画される
- [ ] OS の「外観モード」をダークに切り替えても画面配色が変わらない（Issue #7 の確定挙動を維持）

### Git / PR

- [ ] ブランチ名が `feature/design-tokens-and-components_20260425`
- [ ] コミットが 1 個（論理的に不可分の変更群）
- [ ] PR が `develop` をベースに作成されている
- [ ] PR 本文に「意思決定サマリー」「スコープ外」「検証結果」「プラン参照」が記載されている
- [ ] PR 本文にプレビューページのスクリーンショット（4 セクション分）が添付されている

---

## 23. 関連ファイル

### 本 Issue で **変更**

- `/Users/YS/development/matatabi-calculator/tailwind.config.ts`
- `/Users/YS/development/matatabi-calculator/src/app/globals.css`
- `/Users/YS/development/matatabi-calculator/src/app/page.tsx`

### 本 Issue で **新規生成**

- `/Users/YS/development/matatabi-calculator/src/components/ui/Button.tsx`
- `/Users/YS/development/matatabi-calculator/src/components/ui/Card.tsx`
- `/Users/YS/development/matatabi-calculator/src/components/ui/index.ts`
- `/Users/YS/development/matatabi-calculator/src/lib/cn.ts`
- `/Users/YS/development/matatabi-calculator/docs/design-tokens.md`

### 本 Issue で **参照のみ**（変更しない）

- `/Users/YS/development/matatabi-calculator/src/app/layout.tsx`（Issue #9 で確定済みの metadata / フォント設定を維持）
- `/Users/YS/development/matatabi-calculator/package.json`（依存追加なし）
- `/Users/YS/development/matatabi-calculator/package-lock.json`（同上）
- `/Users/YS/development/matatabi-calculator/next.config.mjs`（変更なし）
- `/Users/YS/development/matatabi-calculator/tsconfig.json`（変更なし）
- `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` — マスター設計書 §3.3「余白の活用」「大人の余裕」に基づく運用ルールの根拠
- `/Users/YS/development/matatabi-calculator/docs/spec/result-dashboard.md` — `space-y-6` / カード間 24px / 最大幅 1024px / ヒーロー clamp() の確定値
- `/Users/YS/development/matatabi-calculator/docs/spec/pdf-report.md` — PDF mm 系（本 Issue のトークンとは独立）
- `/Users/YS/development/matatabi-calculator/docs/spec/warning-copy.md` — `letter-spacing: 0.05em〜0.08em` の根拠
- `/Users/YS/development/matatabi-calculator/docs/spec/input-form.md` — フォーム部品仕様（本 Issue では Input ラッパを作らない判断材料）
- `/Users/YS/development/matatabi-calculator/working/plans/issue-7_tailwind-design-tokens.md` — カラートークン / フォント / ダークモード非採用方針の根拠
- `/Users/YS/development/matatabi-calculator/working/plans/issue-8_dependencies.md` — 依存範囲を `lucide-react` / `jspdf` / `html2canvas` / `recharts` の 4 本に固める方針（shadcn 不採用 / `tailwind-merge` 不採用の根拠）
- `/Users/YS/development/matatabi-calculator/working/plans/issue-9_brand-assets.md` — `metadata.icons` / `viewport.themeColor` の確定（本 Issue で重複しない確認）

### 後続 Issue で消費される（本 Issue 完了が前提条件）

- `/Users/YS/development/matatabi-calculator/src/components/InputForm.tsx`（Issue #2 本実装、`Card` / `Button` 消費）
- `/Users/YS/development/matatabi-calculator/src/components/ResultDashboard.tsx`（Issue #3 本実装、`Card` / `shadow-card` 消費）
- `/Users/YS/development/matatabi-calculator/src/components/WarningBanner.tsx`（Issue #4 本実装、`tracking-warning` / `Card` 消費）
- `/Users/YS/development/matatabi-calculator/src/components/PdfDashboard.tsx`（Issue #5 本実装、`Card`（shadow なし運用）消費）
- `/Users/YS/development/matatabi-calculator/src/components/Layout/Header.tsx`（後続 Layout 共通コンポーネント実装、`Button` 消費の可能性）
