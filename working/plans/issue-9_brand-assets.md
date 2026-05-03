# Issue #9 実装プラン: ロゴ・猫モチーフ素材を用意する

## 0. このプランの性格 / スコープ宣言

本プランは、**「ブランド素材の物理ファイル一式を `public/` 配下に正規の置き場で配備し、`src/app/layout.tsx` の `metadata` をブランド対応に拡張する」までを境界**として扱う Issue です。Issue #6（Next.js 雛形）・Issue #7（Tailwind トークン）・Issue #8（依存追加）に続く 4 番目の「土台 Issue」であり、依存ライブラリ追加と並行して進められます。

本 Issue の唯一のゴール:

> **「後続 Issue（Layout 共通コンポーネント実装、PdfDashboard 実装、Cloudflare Pages 公開）が、ブランド素材を `import` または `<img src>` または `metadata.icons.icon` 等で **物理パスを指すだけで参照できる状態**」** をリポジトリ上に確定させる。

そのため本プランの判断軸は次の 4 点に集約されます:

1. **何の素材を用意するか** — Issue 本文に列挙される 5 種類（ヘッダー用ロゴ / PDF 用ロゴ / ファビコン / OGP 画像 / 猫モチーフ装飾 SVG）+ ライセンス整備。これは「選定」ではなく「**形式・寸法・パス・暫定 vs 本制作の意思決定**」に集中する。
2. **どこに置くか** — Next.js App Router の `app/icon.*` 規約 vs `public/` 直置き、`public/brand/` のディレクトリ命名、`docs/brand/` の権利記録の置き場所。
3. **`src/app/layout.tsx` の `metadata` をどこまで拡張するか** — `metadataBase` / `openGraph` / `twitter` / `icons` / `viewport.themeColor` の必要十分な内容。
4. **何を本 Issue に含めないか** — Layout 共通コンポーネントの実装、背景装飾 SVG の DOM 差し込み、`@vercel/og` 動的 OG 画像、ダークモード／印刷フルカラーバリアント、ロゴガイドライン書面など。これらは **後続 Issue に委譲する** ことを §10 で明示する。

### 0.1 Issue #10 とのスコープ整理

Issue #10（デザインガイドラインをコードに落とし込む）と本 Issue は隣接領域を扱うため、**事前に責務を切り分け**ます。

| 領域 | 担当 |
|---|---|
| カラートークン（canvas / ink / line / accent） | Issue #7（実装済み） |
| 余白 / 角丸 / シャドウのトークン化、コンポーネント粒度の共通スタイル | Issue #10 |
| ロゴ SVG / ファビコン / OGP / 猫モチーフ SVG の **物理ファイル制作・配備** | **本 Issue #9** |
| `metadata.openGraph` / `metadata.icons` の宣言 | **本 Issue #9** |
| 背景装飾 SVG を実 DOM（Layout 共通コンポーネントの背景）に **差し込む実装** | 後続「Layout 共通コンポーネント実装 Issue」（または #10 の延長で扱う場合は明記） |
| ヘッダー部品で `logo-header.svg` を `<img>` または React コンポーネントとして表示する実装 | 同上 |
| PDF ヘッダーで `logo-pdf.svg` を `PdfDashboard` に表示する実装 | Issue #5 の本実装フェーズ |

> 本 Issue の PR は「素材 + metadata」だけで完結し、**実 UI コンポーネントへの貼り込みは行わない**。これは Issue #8 が「依存追加だけで実コードを書かない」線引きをしたのと同じ思想です。

---

## 1. 概要（What / Why / 下流影響）

### 1.1 What（成果物）

本 Issue で確定するのは以下のリポジトリ差分です（実ファイルの中身は §2 と §4 で確定）:

- 新規ファイル: `public/brand/logo-header.svg` / `public/brand/logo-pdf.svg` / `public/brand/og.png` / `public/brand/cat-deco-1.svg`（必要なら `cat-deco-2.svg`）
- 新規ファイル: `public/favicon.ico`（または App Router の `src/app/icon.png` / `src/app/apple-icon.png` / `src/app/icon.svg` 規約利用）
- 新規ファイル: `docs/brand/README.md`（出典・ライセンス・制作者・暫定 vs 本制作のステータス記録）
- 既存ファイル更新: `src/app/layout.tsx`（`metadata.metadataBase` / `metadata.openGraph` / `metadata.twitter` / `metadata.icons` / `viewport.themeColor` の追加）
- 既存ファイル削除: `src/app/favicon.ico`（Next.js デフォルト）— 本 Issue で正式版に差し替えるため除去

### 1.2 Why（重要性 / 下流影響）

本 Issue が抜けたまま後続実装に進むと、次のような不可逆な暫定運用が後続 Issue に滲出します:

- **PDF レポート実装（Issue #5 本実装フェーズ）が暫定文字ロゴから抜け出せない**
  - `docs/spec/pdf-report.md` §6.1 / §6.4 / §13.5 で「12 × 12mm の正方形領域にロゴ SVG を配置。暫定はテキスト『またたび計算機』Inter Bold 14pt」と明記されており、本 Issue で正式 SVG（または最低限の暫定 SVG）が用意されないと、PDF ヘッダーが文字ロゴのまま固定されるリスクがある。
  - html2canvas は `useCORS: false` 運用（`pdf-report.md` §3.1）のため、ロゴは **必ずローカル `public/` 配下に存在する** SVG または PNG でなければラスタライズできない。
- **Cloudflare Pages 公開（Issue #11）後の体感品質が下がる**
  - ファビコンが `create-next-app` のデフォルト Vercel ロゴのままだと、ブラウザタブに「またたび計算機」のブランドが反映されない。
  - OGP 画像が無いと、Slack / X(Twitter) / Facebook / LINE での URL 共有時に「真っ白な OGP プレビュー」または無関係な自動抽出画像が表示され、B2B として品質が低い。
- **マスター設計書 §3.2「Layout: 猫モチーフの背景装飾」が実装着手できない**
  - 後続の Layout 共通コンポーネント実装 Issue が、背景に当てる SVG の物理ファイルが無いと「プレースホルダ div」に留まる。
- **マスター設計書 §1.4「LCP 1 秒目標」と整合する素材容量設計が未確定**
  - 後付けで素材を差し込むと容量超過に気付くのが遅れ、再制作のリスクが発生する。本 Issue で容量予算を §7 で確定する。

### 1.3 後続 Issue がどの素材に依存するか（マッピング）

| 素材 | 直接消費する後続 Issue / ファイル |
|---|---|
| `public/brand/logo-header.svg` | Layout 共通コンポーネントのヘッダー実装 |
| `public/brand/logo-pdf.svg` | `PdfDashboard`（Issue #5 本実装フェーズ）の `<img src="/brand/logo-pdf.svg">` |
| `public/favicon.ico` / `src/app/icon.*` 規約ファイル | ブラウザタブ表示（全環境） / Cloudflare Pages デプロイ後の視認性（Issue #11） |
| `public/brand/og.png` / `src/app/opengraph-image.*` 規約ファイル | SNS / Slack / iMessage 等の URL 展開（Issue #11 公開後に効果発火） |
| `public/brand/cat-deco-*.svg` | Layout 共通コンポーネントの背景装飾（後続 Issue） |
| `docs/brand/README.md` | 制作者・著作権・差し替え履歴の追跡（運用 Issue 全般） |

### 1.4 本 Issue のスコープ外（明示）

| 項目 | 担当 |
|---|---|
| ヘッダー / フッター部品の React コンポーネント実装 | 後続「Layout 共通コンポーネント実装 Issue」 |
| 背景装飾 SVG を `<body>` 背景や Layout 背景に DOM 差し込む実装 | 同上 |
| `PdfDashboard.tsx` への `logo-pdf.svg` 配置コード | Issue #5 の本実装フェーズ |
| `@vercel/og` を使った **動的 OG 画像生成**（`app/opengraph-image.tsx`） | 別 Issue（Cloudflare Pages の Edge Runtime 互換確認後） |
| ダークモード用バリアント（白抜きロゴ等） | 当面不要（マスター設計書はライト固定） |
| 印刷用フルカラーロゴ・名刺・封筒等の対外デザイン | 本プロジェクト範囲外 |
| SNS アイコンセット（X / Facebook / LinkedIn 用の 400×400 等） | 当面不要 |
| ロゴ使用ガイドライン書面（PDF / 社内マニュアル） | 別タスク（社内ブランドチーム） |

---

## 2. 素材ごとの仕様確定

各素材について「用途 / 形式 / 推奨寸法 / カラー / 暫定 vs 本制作 / 配置パス」を確定します。

### 2.1 全素材一覧（サマリ表）

| # | 素材 | 用途 | 形式 | 推奨寸法 | 主要カラー | 暫定/本制作 | 配置パス |
|---|---|---|---|---|---|---|---|
| 1 | ヘッダーロゴ | Web ヘッダー左端 | SVG | viewBox 200×40 想定（ワードマーク + 猫アクセント） | 主線 `#72665B`、必要に応じ `#9CAEB8` | 暫定可（簡易ワードマーク + 猫シルエット） | `/public/brand/logo-header.svg` |
| 2 | PDF ロゴ | PDF ヘッダー左端 12×12mm | SVG（単色） | viewBox 48×48（正方形） | 単色 `#72665B` | 暫定可（猫シルエット 1 色） | `/public/brand/logo-pdf.svg` |
| 3a | ファビコン (ICO) | ブラウザタブ（レガシー含む） | ICO（マルチサイズ 16/32/48） | 16/32/48 px | 単色 `#72665B` | 必須 | `/public/favicon.ico` |
| 3b | ファビコン (SVG) | モダンブラウザ向け | SVG | viewBox 32×32 | 単色 `#72665B` | 推奨 | `/src/app/icon.svg` または `/public/brand/icon.svg` |
| 3c | Apple Touch Icon | iOS ホーム画面 | PNG | 180×180 | `#F8F6F2` 背景 + `#72665B` モチーフ | 推奨 | `/src/app/apple-icon.png` または `/public/apple-touch-icon.png` |
| 4 | OGP 画像 | SNS / Slack 等の URL 展開 | PNG | 1200×630 | 背景 `#F8F6F2` + サービス名 + 猫モチーフ | 必須（暫定でも 1 枚は置く） | `/public/brand/og.png` |
| 5 | 猫モチーフ装飾 | Layout 背景装飾 | SVG | 任意（200×200〜400×400 程度） | `#BEB5AA`（line 色、薄め） | 暫定可（1〜2 種類） | `/public/brand/cat-deco-1.svg`（必要なら `cat-deco-2.svg`） |
| 6 | ライセンス記録 | 出典・権利確認 | Markdown | — | — | 必須 | `/docs/brand/README.md` |

### 2.2 ヘッダーロゴ（`logo-header.svg`）

- **用途**: 後続 Layout 共通コンポーネントのヘッダー左端に配置。サービス名「またたび計算機」のワードマーク + 猫モチーフ（小さなアクセント）を想定。
- **形式**: SVG。理由は (a) ヘッダー高さの可変対応で常に鮮明、(b) html2canvas でラスタライズした際にも輪郭が崩れない、(c) Tailwind の `h-8 w-auto` 等で柔軟にサイズ制御できる。
- **推奨寸法 / viewBox**: `viewBox="0 0 200 40"`（縦 40 で高さ固定、横 200 で「またたび計算機」7 文字 + 猫アクセントが収まる比率）。実際のレンダリングサイズはヘッダー部品側で `h-8 w-auto`（約 32px）を想定。
- **カラー**: 主線 `#72665B`（ink）。CTA 風にしたい場合は猫の目や鈴のアクセントに `#9CAEB8`（accent）を 1 色だけ加える。3 色以上は避ける。
- **暫定 vs 本制作**:
  - **暫定運用（本 Issue デフォルト推奨）**: 「またたび計算機」のテキスト（Inter / Noto Sans JP の Bold 14pt 相当）+ 左に簡易な猫シルエット（耳 2 つ + 丸い顔）を SVG パスで描いた最小ワードマーク。Figma / Illustrator が無くても、テキストエディタで `<text>` + `<path>` を直書きする規模で作成可能。
  - **本制作**: 社内デザイナーまたは委託デザイナーによる正式版。本 Issue 完了後に差し替え PR を別途作成する想定。
- **配置パス**: `/public/brand/logo-header.svg`
- **アクセシビリティ**: 後続実装で `<img alt="またたび計算機" src="/brand/logo-header.svg" />` または `<svg aria-label="またたび計算機">`。SVG 自体には `<title>またたび計算機</title>` を含めること。

### 2.3 PDF ロゴ（`logo-pdf.svg`）

- **用途**: `PdfDashboard.tsx`（Issue #5）のヘッダー左端に表示。`docs/spec/pdf-report.md` §6.1 で **12 × 12mm の正方形領域** が確定済み。
- **形式**: SVG（単色）。html2canvas でラスタライズされる前提のため SVG でも PNG でも結果はピクセル化されるが、**SVG にしておくと将来 PDF を直接描画方式に切り替えた場合（`pdf-report.md` §13.4 の進化方向）にも再利用できる**。
- **推奨寸法 / viewBox**: `viewBox="0 0 48 48"`（正方形）。表示時は CSS で `width: 12mm; height: 12mm` または `width: 48px; height: 48px` 程度に抑える。
- **カラー**: **単色 `#72665B`**（ink）。PDF は 1 色運用が無難（カラーマネジメントの差異を抑える）。アクセント色を加えるとプリンタの色表現で揺らぐリスクがある。
- **暫定 vs 本制作**:
  - **暫定運用**: 猫の顔シルエット（耳 + 顔の丸 + ヒゲ 2〜3 本）を `#72665B` 単色で描いた SVG。`<path>` 直書きで 5〜10 行程度に収まる規模。
  - **本制作**: 正式版が確定した時点でファイル名を維持したまま差し替え（`PdfDashboard.tsx` 側のコード変更不要）。
- **配置パス**: `/public/brand/logo-pdf.svg`
- **html2canvas との互換性**: SVG をインライン `<svg>` 要素として配置するか `<img src="/brand/logo-pdf.svg">` で参照するかは Issue #5 の実装側で決定。本 Issue は **どちらの方式でも動くフォーマット**（外部参照可能、インライン展開可能）として SVG を提供する。

### 2.4 ファビコン

ブラウザタブ・ブックマーク・iOS ホーム画面で表示されるアイコン群。Next.js 14 App Router では複数の方式が選べるため §3.3 で意思決定する。

#### 2.4.1 暫定的な仕様（推奨方式に依らず共通）

- **デザイン**: 猫の顔（耳 2 つ + 丸顔 + 目 2 つ）を `#72665B` 単色で描いた小型シルエット。背景は透明または `#F8F6F2`。
- **サイズ展開**:
  - ICO: 16×16 / 32×32 / 48×48 のマルチサイズ（レガシー Windows 互換）
  - SVG: viewBox 32×32 程度（モダンブラウザ向け、可変解像度）
  - PNG: 180×180（Apple Touch Icon、iOS ホーム画面追加時のアイコン）
- **配置パス**: §3.3 の意思決定に従い、`src/app/` 規約利用 or `public/` 直置きのどちらかに統一する。

### 2.5 OGP 画像（`og.png`）

- **用途**: SNS（X / Facebook / LinkedIn / Slack / iMessage / LINE 等）で URL を共有した際のプレビュー画像。
- **形式**: **PNG**（推奨）。JPG も可だが、文字主体のレイアウトでは PNG の方が劣化しない。透過は不要（OGP は不透明背景前提）。
- **推奨寸法**: **1200 × 630 px**（Open Graph 標準。Twitter Card `summary_large_image` も同じ）。
- **デザイン要件**:
  - 背景: `#F8F6F2`（canvas / オフホワイト）
  - 中央付近に大きく「またたび計算機」のサービス名タイポ（Noto Sans JP Bold 80pt 相当）
  - 副題: 「中小企業向け ROI 診断アプリ」（Noto Sans JP Regular 40pt 相当、`#72665B`）
  - 装飾: 猫モチーフを左下または右下にサブ要素として配置（`#BEB5AA` で控えめに）
  - 会社名: 右下または下部に `株式会社ねこにまたたび`（Noto Sans JP Regular 28pt 相当、`#72665B`）
  - **小型サムネイル時の可読性**: Slack や iMessage では 400px 幅程度にリサイズされて表示されるため、サービス名が縮小後も読める **十分な文字サイズ**（フルサイズ 80pt 以上）を確保する。
- **暫定 vs 本制作**:
  - **暫定運用**: Figma / Canva / Illustrator で 1200×630 のキャンバスを作り、テキスト + 既製の猫アイコン（フリー素材 or 自作 SVG）を配置して 1 枚の PNG を書き出す。容量は §7.2 の予算に収める。
  - **本制作**: デザイナーによる正式版（本 Issue 完了後に差し替え）。
- **容量予算**: **200KB 以下**（§7.2 参照）。PNG 圧縮（TinyPNG / pngquant 等）を必ず適用。
- **配置パス**: `/public/brand/og.png`（または `/src/app/opengraph-image.png` 規約 — §3.4 で意思決定）

### 2.6 猫モチーフ背景装飾 SVG（`cat-deco-*.svg`）

- **用途**: Layout 共通コンポーネントの背景装飾。マスター設計書 §3.2 「Layout: ナビゲーション、フッター、**猫モチーフの背景装飾**」に対応する素材。
- **形式**: SVG（CSS `background-image: url(...)` で当てる想定。後続実装で決定）。
- **推奨寸法**: 200×200〜400×400 程度の正方形〜横長。複数モチーフ（座っている猫、肉球、毛糸玉など）を 1〜2 種類用意。
- **カラー**: **`#BEB5AA`（line 色）の単色 + `opacity` を控えめに**。本文の可読性を阻害しないよう、視認性は「言われて初めて気付く」程度に抑える（`opacity: 0.3` 〜 `0.5` 想定）。`#9CAEB8`（accent）はアクセントが強すぎるため装飾には使わない。
- **暫定 vs 本制作**:
  - **暫定運用**: 1 種類のみ（座っている猫のシルエット 1 つ）を `cat-deco-1.svg` として配置。
  - **本制作**: 2〜3 種類に拡張（後続 Issue / 差し替え PR）。
- **配置パス**: `/public/brand/cat-deco-1.svg`（必要なら `cat-deco-2.svg`）
- **DOM 差し込みは後続 Issue**: 本 Issue では **ファイルを置くだけ**で、Layout コンポーネントの `<div className="bg-[url('/brand/cat-deco-1.svg')]">` 等の実装は行わない。

### 2.7 ライセンス／権利関係（`docs/brand/README.md`）

- **用途**: 各素材の制作者・著作権者・出典・ライセンス・差し替え履歴を一箇所に記録する運用ドキュメント。
- **想定内容**:
  1. 各素材ファイルパスと制作者（社内 / 委託 / 外部素材）
  2. 著作権の帰属（株式会社ねこにまたたびに譲渡済みか、利用許諾ベースか）
  3. 外部素材を使った場合の出典 URL とライセンス（CC0 / MIT / 商用可フリー等）
  4. フォントライセンスの確認（Inter は OFL、Noto Sans JP も OFL — 商用可、OGP 画像にも使ってよい）
  5. 暫定 vs 本制作のステータス（差し替え予定の素材を「暫定」とマーク）
  6. 差し替え履歴（YYYY-MM-DD / PR 番号 / 内容）
- **配置パス**: `/docs/brand/README.md`
- **テンプレ例**（本プラン §8.3 に記載）

---

## 3. 制作方針の意思決定（Pros/Cons）

### 3.1 内製制作 vs 外部発注 vs 外部素材組合せ

#### 選択肢 A: 暫定は内製（テキスト + 簡易 SVG）、正式版は別タスクで差し替え — **推奨**

- **Pros**:
  - 本 Issue を「素材ファイルが揃っていて metadata が機能する」状態で **本日中に完結できる**。後続 Issue（Layout 実装、PDF 実装、Cloudflare Pages 公開）のブロッカー解除を最優先にできる。
  - 暫定 SVG は 5〜10 行のパス記述で済み、テキストエディタで作成可能（Figma / Illustrator 不要）。
  - 正式版が後から到着したとき、**ファイル名を維持したまま差し替えるだけ**で全コードが追従する設計（後続実装側に「素材が暫定か本制作か」を意識させない）。
- **Cons**:
  - 暫定素材のままリリースすると Cloudflare Pages 公開時の体感品質が下がる。**Issue #11 公開前に正式素材に差し替える運用合意**を §12 で残す。
  - 暫定 → 正式の差し替え PR が 1 本追加で発生する。

#### 選択肢 B: 本 Issue で正式素材まで作り切る

- **Pros**: PR が 1 本で済み、暫定運用期間が無い。
- **Cons**:
  - 社内デザイナー / 委託デザイナーの工数調整が本 Issue の所要日数に乗り、**Issue #11（Cloudflare Pages 公開）までのクリティカルパスを長くする**。
  - デザイン承認プロセス（社内決裁）が固まっていない場合、本 Issue が滞留する。

#### 選択肢 C: 外部素材（Iconify / Lucide / Flaticon の猫アイコン等）を全面採用

- **Pros**: 制作工数ゼロ。
- **Cons**:
  - **ブランドの独自性が出ない**。マスター設計書 §1.4「プロフェッショナル × 猫モチーフ」は B2B イメージのため、競合とアイコンが被ると差別化に失敗する。
  - 外部素材のライセンス確認が必須（商用可・帰属表示要否）。`docs/brand/README.md` に逐次記録する運用が増える。
  - Lucide には「猫」アイコン自体が現状無い（2026-04 時点）。Iconify 経由で他のアイコンセットを引くと依存ライブラリが増える。

**推奨: 選択肢 A**。本 Issue は「素材を物理ファイルとして置く」境界点であり、デザインの完成度より **後続 Issue のブロッカー解除** を優先する。

### 3.2 ロゴ表現の方向性（暫定デザインの 3 案）

#### 案 1: ワードマーク主体 + 左に小さな猫アイコン — **推奨**

- 構成: `[🐱 猫アイコン] またたび計算機`（横並び）
- 色: ワードマーク `#72665B`、猫アイコンも `#72665B`（単色運用）
- **Pros**:
  - サービス名が常に視認できる（ヘッダーで認知度を高める）
  - PDF ヘッダーへの転用も容易（同じ SVG をスケールするだけ）
  - 暫定実装の難易度が最も低い（テキスト要素 + 簡易パス）
- **Cons**: 猫モチーフが小さくなり、ブランドの「親しみやすさ」が弱くなる可能性

#### 案 2: 大きな猫の顔シルエット + 下にワードマーク

- 構成: 猫の顔（大）の下に「またたび計算機」（縦組み構成）
- **Pros**: 猫モチーフが主役で印象的
- **Cons**:
  - 縦長になるためヘッダー（横長）への配置で崩れる
  - PDF 12×12mm の正方形領域には合うが、ヘッダー横長領域には不向き
  - **ヘッダー版と PDF 版でデザインを分ける必要が出てくる**（管理コスト増）

#### 案 3: 猫モチーフを単独でロゴ化（ワードマーク無し）

- 構成: 猫の顔または座り姿のみ
- **Pros**: シンボリックでファビコンとの統一感が高い
- **Cons**: ヘッダーにサービス名が文字として出ないため、別途 `<h1>またたび計算機</h1>` 等を併設する必要があり、**Layout 部品が複雑化する**

**推奨: 案 1**（ワードマーク主体 + 小さな猫アイコン）。理由は (a) ヘッダー / PDF / 名刺等の異なる縦横比に最も適応しやすい、(b) 暫定実装の難易度が最も低い、(c) ファビコン側を「猫の顔だけ」（案 3 のミニ版）として担当を分ければ用途別に最適化できる。

### 3.3 ファビコン形式戦略（App Router 規約 vs `public/` 直置き）

Next.js 14 App Router は `src/app/` 配下に **規約ベースのアイコンファイル** を置くことで、HTML の `<link>` タグを自動生成する仕組みを持つ（`src/app/icon.png` / `src/app/icon.svg` / `src/app/apple-icon.png` / `src/app/favicon.ico`）。

#### 選択肢 A: App Router の規約ファイル（`src/app/icon.svg` + `src/app/apple-icon.png` + `src/app/favicon.ico`）— **推奨**

- **Pros**:
  - Next.js が自動で `<link rel="icon" />` / `<link rel="apple-touch-icon" />` を `<head>` に挿入してくれるため、`metadata.icons` を手動で書かなくて済む（**コード量が減る**）。
  - ファイルパスのマジックを Next.js が知っているため、Cloudflare Pages にデプロイした際も静的配信が問題なく機能する。
  - 既存の `src/app/favicon.ico`（create-next-app デフォルト）を **そのまま差し替えれば良い**ため、ファイルパス変更コストが無い。
- **Cons**:
  - 規約ファイルの **キャッシュ制御** や **配信パス** を細かく制御したい場合は不向き（が、本プロジェクトでは不要）。
  - 規約に乗ると「どのサイズが何のリクエストに応答するか」がドキュメントを参照しないと分からない（が、Next.js 公式 docs に明記されている）。

#### 選択肢 B: `public/` 直置き + `metadata.icons` で明示

- **Pros**:
  - `metadata.icons` のコードに「どのアイコンがどこにあるか」が明示的に書かれるため、レビュー時に理解しやすい。
  - 配信パスを完全制御できる。
- **Cons**:
  - `metadata.icons` の宣言が長くなる（icon / apple / shortcut の 3 種類を手書き）。
  - 既存の `src/app/favicon.ico` を削除し、`public/favicon.ico` を別途作成する手順が増える。

**推奨: 選択肢 A**。Next.js 14 の規約に乗ることで `metadata.icons` の手動宣言を省略でき、コード量を最小化できる。**ただし `favicon.ico` のみは `src/app/favicon.ico` の **既存ファイルの差し替え**で対応する**（create-next-app デフォルトの ICO ファイルが既にあるため）。

#### 採用するファイル配置（推奨）

```
src/app/
  favicon.ico       ← 既存ファイルを正式版に差し替え（16/32/48 マルチサイズ）
  icon.svg          ← 新規（モダンブラウザ向け SVG ファビコン）
  apple-icon.png    ← 新規（180×180 PNG、iOS ホーム画面用）
```

> **注意**: `app/icon.svg` と `app/favicon.ico` を両方置いた場合、Next.js は両方の `<link>` を出力する。モダンブラウザは SVG を優先、レガシーは ICO にフォールバックするため両立して問題ない。

### 3.4 OGP 生成方式（静的 PNG vs 動的生成）

#### 選択肢 A: 静的 PNG を `public/brand/og.png` または `src/app/opengraph-image.png` 規約に直置き — **推奨**

- **Pros**:
  - **Cloudflare Pages の Edge Runtime 互換性を一切気にしなくて良い**。静的ファイル配信はどの環境でも動く。
  - 容量予算（200KB 以下）の管理が容易（PNG 圧縮ツールで一度確定すれば良い）。
  - レビュー時にファイルそのものを目視確認できる。
- **Cons**: 動的にクエリパラメータで内容を変えられない（が、本プロジェクトの URL 構造は単一トップページのみで動的 OGP は不要）。

#### 選択肢 B: `app/opengraph-image.tsx` で動的生成（@vercel/og 由来）

- **Pros**: テキストやデータを動的に差し込める。デザイン変更時にコードでバージョン管理できる。
- **Cons**:
  - **Cloudflare Pages のエッジ環境で `@vercel/og` が動く保証が無い**（Vercel 用に作られたライブラリで、Cloudflare Workers ランタイムでは Edge Runtime API の差異により動かないケースが報告されている）。
  - 本 Issue 時点で Cloudflare Pages の挙動を検証するコストが大きい（Issue #11 と密結合になる）。
  - 動的生成は単一ページの本プロジェクトでは過剰機能。

**推奨: 選択肢 A（静的 PNG 直置き）**。動的生成は Cloudflare Pages の Edge Runtime 検証が完了した後の **後続検討事項**として §10 に明記する。

#### 配置パスの選択（A 案内のサブ判断）

- **`src/app/opengraph-image.png` 規約**: Next.js 14 が自動で `<meta property="og:image" />` を生成。`metadata.openGraph.images` を書かずに済む。
- **`public/brand/og.png` + `metadata.openGraph.images` 手動指定**: 配信パスを `metadata.openGraph` で明示的に書く。

**推奨**: **`src/app/opengraph-image.png` 規約**を採用。理由は §3.3 と同じく、Next.js 14 の規約に乗ることで `metadata.openGraph.images` の手動宣言を省略できコード量を最小化できる。`public/brand/og.png` は **副配置（バックアップ / 直リンク用途）として併設しない**（重複管理を避ける）。

> ただし **Twitter Card 画像** は `metadata.twitter.images` で別途明示する必要がある。`src/app/opengraph-image.png` 規約は OG タグに対応するが、Twitter Card にはデフォルトで反映されない場合があるため `metadata.twitter` 側で `images: ['/opengraph-image.png']` のように同じパスを指定する。

### 3.5 SVG の組み込み形態（用途別）

| 用途 | 組み込み形態 | 理由 |
|---|---|---|
| ヘッダーロゴ | **`<img src="/brand/logo-header.svg" alt="またたび計算機" />`** または **インライン JSX** | 後続 Layout 実装で決定。インラインだと CSS で色やサイズを細かく制御できる。`<img>` だとビルドサイズ削減に有利。本 Issue ではどちらでも動く SVG として提供する。 |
| PDF ロゴ | **`<img src="/brand/logo-pdf.svg" />`** | html2canvas で確実にラスタライズされる方式。インライン SVG は html2canvas での描画挙動に既知の差異がある。 |
| ファビコン | **静的ファイル（規約配置）** | Next.js の自動 `<link>` 生成に任せる。 |
| OGP | **静的 PNG（規約配置）** | SNS は OG タグから URL を引いて画像を取得する。 |
| 背景装飾猫 | **CSS `background-image: url('/brand/cat-deco-1.svg')`** | 後続 Layout 実装で決定。CSS background だと `background-size` / `background-repeat` で柔軟にレイアウト可能。 |

`next/image` の採用は本 Issue では **見送り**。理由は (a) SVG に対する `next/image` の最適化メリットが薄い（Next.js は SVG を最適化対象から外す）、(b) PNG OGP 画像は SNS から外部参照されるため `next/image` の最適化は適用されない、(c) ヘッダーロゴ・装飾 SVG は最終的な組み込み形態が後続 Issue で決まるため、本 Issue で `next/image` 縛りを入れない方が柔軟。

### 3.6 ダーク背景考慮

マスター設計書はライトモード固定（`globals.css` のコメント参照: `prefers-color-scheme: dark` のオーバーライドは意図的に置かない）。よって本 Issue では **SVG はライト前提の 1 バリアントのみ用意**する。

- ロゴ主線 `#72665B`（ink）はライト背景 `#F8F6F2`（canvas）上で十分なコントラスト。
- ダークモード対応が将来必要になった場合、`darkMode` を tailwind.config に設定するタイミングで「白抜きロゴ」バリアントを別 SVG として追加する設計。本 Issue では着手しない。

---

## 4. ファイル配置とパス

### 4.1 配置構造（最終形）

```
matatabi-calculator/
├── src/
│   └── app/
│       ├── favicon.ico         ← 既存ファイルを正式版に差し替え（16/32/48 ICO）
│       ├── icon.svg            ← 新規（モダンブラウザ向け SVG ファビコン）
│       ├── apple-icon.png      ← 新規（iOS ホーム画面用 180×180 PNG）
│       ├── opengraph-image.png ← 新規（OG タグ用 1200×630 PNG、Twitter Card と兼用）
│       └── layout.tsx          ← 既存ファイル更新（metadata 拡張）
├── public/
│   └── brand/
│       ├── logo-header.svg     ← 新規（Web ヘッダー用）
│       ├── logo-pdf.svg        ← 新規（PDF ヘッダー用、12×12mm）
│       └── cat-deco-1.svg      ← 新規（背景装飾、必要なら cat-deco-2.svg も追加）
└── docs/
    └── brand/
        └── README.md           ← 新規（出典・ライセンス・差し替え履歴）
```

### 4.2 命名規則

| 規則 | 値 | 理由 |
|---|---|---|
| ディレクトリ名 | `brand`（英数字小文字、単数形） | 短く明示的。`assets` よりブランド素材限定で意味が明確。 |
| ファイル名 | `<種類>-<バリアント>.<拡張子>` | 例: `logo-header.svg` / `logo-pdf.svg`。「ハイフン区切り」「全小文字」で URL 互換。 |
| 装飾モチーフ | `cat-deco-<連番>.svg` | 連番は将来増やす想定。連番ゼロパディング無し（`cat-deco-1.svg`、`cat-deco-10.svg` は 10 種類超えた時点で運用検討）。 |
| 規約ファイル名 | `favicon.ico` / `icon.svg` / `apple-icon.png` / `opengraph-image.png` | Next.js 14 規約に従う（変更不可）。 |

### 4.3 配置パスを規約 / public で混在させる理由

| パス | ファイル | 理由 |
|---|---|---|
| `src/app/` 規約 | `favicon.ico` / `icon.svg` / `apple-icon.png` / `opengraph-image.png` | Next.js が自動で `<link>` / `<meta>` を生成するため `metadata.icons` / `metadata.openGraph.images` を手動で書かずに済む。 |
| `public/brand/` | `logo-header.svg` / `logo-pdf.svg` / `cat-deco-*.svg` | `<img src>` や CSS `url()` で参照する素材は `public/` 配下が標準。`src/app/` 規約には該当しない用途のため。 |
| `docs/brand/` | `README.md` | 配信不要のドキュメント。`public/` には置かない（外部公開不要）。 |

---

## 5. `src/app/layout.tsx` metadata 拡張

### 5.1 現状の `metadata` と拡張後の差分

現状（Issue #7 完了時点）:

```tsx
export const metadata: Metadata = {
  title: "またたび計算機",
  description: "中小企業向け ROI 診断アプリ「またたび計算機」",
};
```

本 Issue で拡張する内容（推奨案）:

```tsx
import type { Metadata, Viewport } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://matatabi-calculator.example";
const SITE_NAME = "またたび計算機";
const SITE_DESCRIPTION = "中小企業向け ROI 診断アプリ「またたび計算機」";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "ja_JP",
    // images は src/app/opengraph-image.png 規約により Next.js が自動付与
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    // images も Next.js が opengraph-image.png 規約から付与
  },
  // icons は src/app/{favicon.ico,icon.svg,apple-icon.png} 規約により Next.js が自動付与
};

export const viewport: Viewport = {
  themeColor: "#F8F6F2",
};
```

### 5.2 各フィールドの設計判断

#### `metadataBase`

- **役割**: `openGraph.url` や画像の相対パスを絶対 URL に解決する基底。
- **値**: `process.env.NEXT_PUBLIC_SITE_URL` を一次参照、未設定時は `https://matatabi-calculator.example` を仮値とする。
- **理由**: Cloudflare Pages の公開ドメインが Issue #11 / #12 で確定するまで仮値運用。`NEXT_PUBLIC_SITE_URL` 環境変数で上書き可能にしておくことで、Cloudflare Pages の Environment Variables 設定で本番ドメインを差し込めば差し替え不要。
- **`.example` ドメイン採用理由**: RFC 2606 で予約されており、誤って実在ドメインを指さない。

#### `openGraph`

- **`type: "website"`**: ROI 診断ツールはサイト全体として `website` タイプが妥当（`article` は記事、`product` は EC 商品向け）。
- **`url: "/"`**: トップページ。`metadataBase` と組み合わさり絶対 URL になる。
- **`siteName`**: SNS で「サイト名」として表示される。
- **`locale: "ja_JP"`**: 日本語サイトの明示。
- **`images`**: `src/app/opengraph-image.png` 規約があるため **手動指定不要**（Next.js が自動付与）。

#### `twitter`

- **`card: "summary_large_image"`**: 1200×630 の大型カード表示。OG 画像と互換。
- **`images`**: `src/app/opengraph-image.png` 規約により自動付与される想定だが、Next.js のバージョンによっては Twitter 側に反映されない場合がある。動作確認で反映されない場合は明示的に `images: ['/opengraph-image.png']` を追記する（§9.3 参照）。

#### `icons`（自動付与）

`src/app/favicon.ico` / `src/app/icon.svg` / `src/app/apple-icon.png` の規約ファイルが存在すれば、Next.js は自動的に以下の `<link>` を `<head>` に挿入する:

```html
<link rel="icon" href="/favicon.ico" sizes="..." />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" />
```

よって `metadata.icons` の手動宣言は **不要**。手動で `metadata.icons.shortcut` を書きたい場合のみ追記する。

#### `viewport.themeColor`

- **役割**: モバイル Safari の URL バー / Android Chrome のステータスバーの背景色を指定する。
- **値**: `#F8F6F2`（canvas / オフホワイト）。サイト背景と統一することで、モバイル端末でブラウザ枠とコンテンツの境界が滑らかになる。
- **配置**: Next.js 14 では `metadata.themeColor` は **deprecated**。`export const viewport` 経由で設定するのが正しい。

### 5.3 環境変数 `NEXT_PUBLIC_SITE_URL` の取り扱い

- **本 Issue での対応**: `.env.local` への記載は **不要**（仮値が動く前提のため）。
- **Issue #11 での対応**: Cloudflare Pages の Environment Variables に `NEXT_PUBLIC_SITE_URL=https://<確定ドメイン>` を設定する手順を Issue #11 のプランに引き継ぐ（§12 申し送り）。
- **`.env.example` の作成**: 本 Issue では行わない（環境変数追加が増えてくる Issue #11 でまとめて作成する）。

---

## 6. アクセシビリティ / SEO 観点

### 6.1 alt 文言指針

| 素材 | 代替テキスト案 | 備考 |
|---|---|---|
| ヘッダーロゴ | `alt="またたび計算機"` | サービス名そのもの。`<h1>` を別途置く場合は `alt=""` で装飾扱いにする選択もあり。 |
| PDF ロゴ | `alt="またたび計算機"` | PDF はスクリーンリーダー利用が限定的だが、`<img alt>` は html2canvas でも残る。 |
| 背景装飾猫 | `aria-hidden="true"` | 装飾なので読み上げ対象外。CSS background で当てる場合は alt 自体不要。 |
| ファビコン | — | `<link rel="icon">` には alt 概念なし。 |
| OGP | — | meta タグ。alt は SNS 側で付与する場合あり（X は `og:image:alt` を読む）。`openGraph.images[0].alt` の付与は本 Issue では行わず、後続で必要に応じて追加。 |

### 6.2 装飾 SVG の `aria-hidden`

背景装飾の猫モチーフは **意味を持たない装飾**のため、後続実装で DOM に差し込む際は必ず以下のいずれかを満たす:

- CSS `background-image` で当てる（DOM 要素として存在しないため `aria-hidden` 不要）
- インライン `<svg>` または `<img>` で当てる場合は `aria-hidden="true"` を付与し、`alt=""`（`<img>`）または `<title>` 無し（`<svg>`）にする

**本 Issue ではファイル配備のみ**のため、上記の運用ルールを `docs/brand/README.md` の運用注意事項に明記する。

### 6.3 OGP 文字可読性

- 1200×630 のフルサイズで「またたび計算機」が読めるのは前提として、**Slack や iMessage の小型サムネイル（〜400px 幅）でも読める**ことを目視確認する。
- 文字色 `#72665B`（ink）と背景 `#F8F6F2`（canvas）のコントラスト比は約 6.7:1（WCAG AA を満たす）。
- フォントは Noto Sans JP Bold（日本語）+ Inter Bold（英数字）。OGP 画像内に埋め込む場合は **画像ラスタライズ済み**のため、フォント読み込みは不要（OFL ライセンスは商用画像への埋め込み許諾を含む — §8.2 参照）。

---

## 7. パフォーマンス / 容量設計

マスター設計書 §1.4「LCP 1 秒以内」目標から逆算した素材容量予算。

### 7.1 容量予算

| 素材 | 目標容量 | 圧縮ツール |
|---|---|---|
| `logo-header.svg` | **5KB 以下** | SVGO（手動 or ビルド時） |
| `logo-pdf.svg` | **3KB 以下** | SVGO |
| `cat-deco-1.svg`（1 種類） | **5KB 以下** | SVGO |
| `cat-deco-2.svg`（あれば） | **5KB 以下** | SVGO |
| `favicon.ico`（マルチサイズ ICO） | **15KB 以下** | ImageMagick / RealFaviconGenerator |
| `icon.svg` | **2KB 以下** | SVGO |
| `apple-icon.png`（180×180） | **15KB 以下** | pngquant / TinyPNG |
| `opengraph-image.png`（1200×630） | **200KB 以下** | pngquant / TinyPNG |
| **合計（OGP 除く）** | **約 50KB 以下** | — |
| **合計（OGP 含む）** | **約 250KB 以下** | — |

### 7.2 OGP 画像の容量管理

- 1200×630 の PNG は素朴な書き出しで 500KB〜2MB 級になり得る。**pngquant（lossy）または TinyPNG で 200KB 以下に圧縮する**のが必須。
- JPG への変換も検討可能だが、文字主体の画像は JPG ノイズが目立つため **PNG + pngquant 圧縮**を推奨。
- 容量超過時の代替策: (a) JPG への変換、(b) 1200×630 → 1080×566 等のサイズダウン（OG タグの `og:image:width` / `og:image:height` で明示）、(c) デザインの簡素化（余計な装飾を削減）。

### 7.3 SVG 圧縮（SVGO 適用）

- **ビルド時自動圧縮は本 Issue では入れない**（Webpack の svgo-loader 等を入れない）。理由は (a) 本プロジェクトは SVG をインポートではなく `public/` の静的ファイルとして配信するため、ビルド時最適化が効きにくい、(b) 設定追加で `next.config.mjs` を触る範囲が増える。
- **代わりに手動圧縮**を運用ルールとする: 素材コミット前に `npx svgo public/brand/*.svg` または SVGOMG（Web 版）で圧縮済みであることを目視確認。圧縮済みであることを `docs/brand/README.md` のチェックリストに記載。

### 7.4 LCP への影響

- ファビコン / OGP は LCP に影響しない（OGP は SNS クローラのみ取得、ファビコンは LCP 計測対象外）。
- **ヘッダーロゴ SVG（5KB）** が初期表示の LCP 候補に含まれる可能性があるが、5KB は HTTP/2 の 1 RTT で取得可能なため LCP 1 秒目標に対しては誤差レベル。
- **背景装飾 SVG** は CSS background-image で遅延ロード扱いになるため LCP 候補にならない。

---

## 8. ライセンス・権利関係の整備

### 8.1 制作主体の確定

本 Issue 着手時点で確認するべき項目:

| 項目 | 確認方法 | 想定回答 |
|---|---|---|
| ロゴ・装飾の制作者 | プロジェクトオーナーに確認 | (a) 社内デザイナー / (b) 委託デザイナー / (c) 開発者自作（暫定） |
| 著作権の帰属 | 制作契約書を確認 | 株式会社ねこにまたたびに譲渡（or 利用許諾） |
| OGP / 装飾に外部素材を使うか | 素材選定時に判断 | (a) 全部内製 / (b) フリー素材併用 |
| フリー素材を使う場合のライセンス | 素材サイトの利用規約 | CC0 / 商用可フリー / MIT 等 |

### 8.2 フォントライセンスの確認

OGP 画像にフォントをラスタライズして埋め込む場合のライセンス確認:

| フォント | ライセンス | OGP 画像への埋め込み |
|---|---|---|
| Inter | SIL Open Font License 1.1（OFL） | **可**（OFL は商用利用・改変・再配布を許可） |
| Noto Sans JP | SIL Open Font License 1.1（OFL） | **可**（同上） |

OFL は「フォントファイルの再配布」に制限を課すが、「フォントで描画した文字をラスタライズして画像に埋め込む」ことには制限が無い。よって OGP 画像内に Inter / Noto Sans JP の文字を埋め込んでも問題ない。

### 8.3 `docs/brand/README.md` テンプレート

```markdown
# ブランド素材 出典・ライセンス記録

## 概要

本ディレクトリは「またたび計算機」のブランド素材（ロゴ・ファビコン・OGP・猫モチーフ装飾）について、
**制作者・著作権・出典・ライセンス・差し替え履歴**を一箇所に記録するための運用ドキュメントです。

実ファイルは以下に配置されています:

- `src/app/favicon.ico` / `src/app/icon.svg` / `src/app/apple-icon.png` / `src/app/opengraph-image.png`
- `public/brand/logo-header.svg` / `public/brand/logo-pdf.svg` / `public/brand/cat-deco-*.svg`

## 素材一覧

| ファイル | 用途 | 制作者 | 著作権 | ライセンス | ステータス |
|---|---|---|---|---|---|
| `public/brand/logo-header.svg` | Web ヘッダーロゴ | 開発者自作（暫定） | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `public/brand/logo-pdf.svg` | PDF ヘッダーロゴ（12×12mm） | 開発者自作（暫定） | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `src/app/favicon.ico` | ブラウザタブアイコン | 開発者自作（暫定） | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `src/app/icon.svg` | モダンブラウザ向けファビコン | 開発者自作(暫定) | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `src/app/apple-icon.png` | iOS ホーム画面用 | 開発者自作（暫定） | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `src/app/opengraph-image.png` | SNS / Slack OGP 画像 | 開発者自作（暫定） | 株式会社ねこにまたたび | 社内利用 | 暫定 |
| `public/brand/cat-deco-1.svg` | Layout 背景装飾（猫モチーフ） | 開発者自作（暫定） | 株式会社ねこにまたたび | 社内利用 | 暫定 |

## 外部素材を使用した場合の出典

（本 Issue 完了時点では外部素材なし。今後追加する場合は以下のテンプレで記録）

- ファイル: `path/to/file.svg`
- 出典: <URL>
- 作者: <Name>
- ライセンス: <CC0 / MIT / etc.>
- ライセンス遵守事項: <帰属表示要否 / 改変可否 / 商用利用可否>

## フォントライセンス（OGP 画像内への埋め込み）

- Inter: SIL Open Font License 1.1（OFL）— 商用画像へのラスタライズ埋め込み可
- Noto Sans JP: SIL Open Font License 1.1（OFL）— 同上

## 運用ルール

- SVG ファイルは **コミット前に必ず SVGO で圧縮**する（`npx svgo public/brand/*.svg`）。
- 装飾 SVG を DOM に差し込む際は **`aria-hidden="true"` または CSS background**で装飾扱いとする。
- 暫定素材から正式素材への差し替えは、ファイル名を維持したまま **同パスで上書き**する（コード変更を発生させない）。

## 差し替え履歴

| 日付 | PR | 内容 |
|---|---|---|
| 2026-04-25 | #<本 Issue PR 番号> | 初版（暫定素材一式を配備） |
```

### 8.4 委託契約 / 著作権譲渡の確認チェックリスト

本 Issue で外部デザイナーに発注する場合（選択肢として残す場合）の確認項目:

- [ ] 制作物の著作権譲渡契約が締結されているか（または利用許諾の範囲が明確か）
- [ ] 改変権の譲渡が含まれるか（後続で SVG を編集する可能性があるため）
- [ ] 第三者素材（ストック画像等）の混入がないか（あれば二次的著作権の整理が必要）
- [ ] 商用利用可否（B2B 向け SaaS としての利用が許諾範囲に含まれるか）

本 Issue で **暫定素材を内製する場合は上記チェックは省略可**（社員の業務著作物として帰属が明確）。

---

## 9. 動作確認手順

### 9.1 ローカル開発での確認

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、以下を確認:

#### ファビコン
- [ ] ブラウザタブに「またたび計算機」のファビコン（猫アイコン）が表示されている
- [ ] ハードリロード（Cmd+Shift+R / Ctrl+Shift+F5）で create-next-app デフォルトの Vercel ロゴが残っていない
- [ ] DevTools → Network → `favicon.ico` のリクエストが 200 を返す
- [ ] DevTools → Network → `icon.svg` のリクエストが 200 を返す（Next.js が `<link rel="icon" type="image/svg+xml">` を自動挿入）

#### OGP / Twitter Card
- [ ] DevTools → Elements → `<head>` 内に以下の `<meta>` が存在する:
  - `<meta property="og:title" content="またたび計算機" />`
  - `<meta property="og:description" content="..." />`
  - `<meta property="og:image" content="https://.../opengraph-image.png" />`（絶対 URL）
  - `<meta property="og:type" content="website" />`
  - `<meta property="og:locale" content="ja_JP" />`
  - `<meta name="twitter:card" content="summary_large_image" />`
- [ ] `og:image` の URL（`http://localhost:3000/opengraph-image.png` 等）をブラウザで直接開いて 1200×630 の PNG が表示される
- [ ] ローカルでは SNS の OGP デバッガが叩けないため、**Issue #11 公開後に各 SNS の OGP デバッガで再確認**する旨を §12 に申し送り

#### Theme Color
- [ ] DevTools → Elements → `<head>` 内に `<meta name="theme-color" content="#F8F6F2" />` が存在する
- [ ] iOS Safari / Android Chrome の実機確認は Issue #11 公開後に実施（ローカルでは再現不可）

#### `public/brand/` 配下の直リンク
- [ ] `http://localhost:3000/brand/logo-header.svg` が 200 で SVG を返す
- [ ] `http://localhost:3000/brand/logo-pdf.svg` が 200 で SVG を返す
- [ ] `http://localhost:3000/brand/cat-deco-1.svg` が 200 で SVG を返す

### 9.2 静的検証

```bash
npm run lint
npm run typecheck
npm run build
```

- [ ] `npm run lint` がエラー 0 件で終了
- [ ] `npm run typecheck` がエラー 0 件で終了
- [ ] `npm run build` が成功し `.next/` が生成される
- [ ] ビルドログに `Generated favicon.ico, icon.svg, apple-icon.png, opengraph-image.png` 系の警告が出ていない

### 9.3 OGP デバッガでの確認（Issue #11 公開後に実施）

以下は Cloudflare Pages 公開後にしか実施できないため、**本 Issue では「Issue #11 完了時に再確認するチェックリスト」として PR 本文に申し送る**:

- [ ] [Meta（Facebook）OGP デバッガ](https://developers.facebook.com/tools/debug/) で対象 URL を入力し、画像 / タイトル / 説明が反映される
- [ ] [Twitter Card Validator](https://cards-dev.twitter.com/validator) または X 上で URL をペーストして大型カード表示を確認
- [ ] Slack に URL を貼り付けて展開プレビューが表示される（タイトル / 説明 / 画像）
- [ ] iMessage / LINE / Discord で URL を貼って展開を確認

### 9.4 PDF ロゴの確認（Issue #5 本実装フェーズで実施）

- [ ] `PdfDashboard.tsx` で `<img src="/brand/logo-pdf.svg">` を表示し、PDF 生成後にロゴが 12×12mm 領域に収まる
- [ ] html2canvas でラスタライズ後も SVG の輪郭が崩れていない
- [ ] PDF を印刷した際に `#72665B` 色がモノクロでも視認できる（参考確認）

### 9.5 容量の自動確認

```bash
ls -lh public/brand/ src/app/favicon.ico src/app/icon.svg src/app/apple-icon.png src/app/opengraph-image.png
```

- [ ] 各ファイルのサイズが §7.1 の予算内に収まっている

---

## 10. スコープ外（再掲）

本 Issue は **素材物理ファイルの配備と metadata 拡張**で完結する。以下は **明示的にスコープ外**として後続 Issue / 別タスクに委譲する:

| 項目 | 担当 |
|---|---|
| 背景装飾 SVG を Layout の `<body>` 背景や DOM に差し込む実装 | 後続「Layout 共通コンポーネント実装 Issue」（または Issue #10 の延長） |
| ヘッダー部品で `logo-header.svg` を表示する React コンポーネント実装 | 同上 |
| PDF ヘッダーで `logo-pdf.svg` を `PdfDashboard.tsx` に表示するコード | Issue #5 本実装フェーズ |
| `@vercel/og` を使った動的 OGP 画像生成 | 別 Issue（Cloudflare Pages の Edge Runtime 互換確認後） |
| ダークモード用バリアント（白抜きロゴ等） | 当面不要（マスター設計書はライト固定） |
| 印刷用フルカラーロゴ・名刺・封筒・チラシ等の対外デザイン | 本プロジェクト範囲外 |
| SNS アイコンセット（X / Facebook / LinkedIn 用 400×400 等） | 当面不要 |
| ロゴ使用ガイドライン書面（PDF / 社内マニュアル） | 別タスク（社内ブランド管理） |
| Tailwind 余白 / 角丸 / シャドウ / コンポーネント粒度の共通スタイル | Issue #10 |
| Cloudflare Pages 公開ドメインの確定と `NEXT_PUBLIC_SITE_URL` 環境変数設定 | Issue #11 |
| `metadata.openGraph.images[0].alt` の付与（OGP 画像の代替テキスト） | 後続改善（必要性が出たら） |
| `webmanifest`（PWA 対応の `site.webmanifest` ファイル）の作成 | 別 Issue（PWA 化を検討するタイミング） |
| 暫定素材から正式素材への差し替え PR（社内デザイン承認後） | 別 PR（本 Issue 完了後にデザイナー納品を待って実施） |

---

## 11. 完了条件（Definition of Done）

### 11.1 素材ファイルの配備

- [ ] `public/brand/logo-header.svg` が存在し、`#72665B` 主線の SVG ワードマーク + 猫アクセントが描かれている
- [ ] `public/brand/logo-pdf.svg` が存在し、12×12mm 正方形に収まる単色 SVG（`#72665B`）である
- [ ] `public/brand/cat-deco-1.svg` が存在し、`#BEB5AA` 主体の装飾 SVG である
- [ ] `src/app/favicon.ico` が create-next-app デフォルトから差し替わっている（マルチサイズ ICO）
- [ ] `src/app/icon.svg` が存在し、モダンブラウザ向け SVG ファビコンとして機能する
- [ ] `src/app/apple-icon.png` が存在し、180×180 PNG である
- [ ] `src/app/opengraph-image.png` が存在し、1200×630 PNG である

### 11.2 容量予算の遵守

- [ ] 各素材が §7.1 の予算内に収まっている
- [ ] OGP 画像が 200KB 以下に圧縮されている
- [ ] SVG が SVGO 等で圧縮済みである（手動確認）

### 11.3 `metadata` 拡張の実装

- [ ] `src/app/layout.tsx` の `metadata` に以下が含まれる:
  - [ ] `metadataBase`（`NEXT_PUBLIC_SITE_URL` 環境変数 + 仮値フォールバック）
  - [ ] `openGraph`（type / url / siteName / title / description / locale）
  - [ ] `twitter`（card / title / description）
- [ ] `src/app/layout.tsx` に `viewport` がエクスポートされ、`themeColor: "#F8F6F2"` が設定されている
- [ ] `<head>` に以下の `<meta>` / `<link>` が自動挿入されることを DevTools で確認:
  - [ ] `<link rel="icon">` 群（favicon.ico / icon.svg / apple-icon.png）
  - [ ] `<meta property="og:*">` 群
  - [ ] `<meta name="twitter:*">` 群
  - [ ] `<meta name="theme-color" content="#F8F6F2">`

### 11.4 ライセンス・権利の記録

- [ ] `docs/brand/README.md` が存在し、§8.3 のテンプレートに従って各素材の制作者・著作権・ライセンス・ステータスが記録されている
- [ ] 外部素材を使用した場合は出典 URL とライセンスが記録されている
- [ ] フォントライセンス（Inter / Noto Sans JP の OFL）が OGP 埋め込み許諾範囲であることが明記されている

### 11.5 ビルド / Lint の通過

- [ ] `npm run lint` がエラー 0 件で終了
- [ ] `npm run typecheck` がエラー 0 件で終了
- [ ] `npm run build` が成功
- [ ] `npm run dev` で `http://localhost:3000` が引き続き正常表示される（Issue #7 のスウォッチページが壊れていない）

### 11.6 Issue #5 / Issue #11 への準備

- [ ] `public/brand/logo-pdf.svg` が `PdfDashboard.tsx` から `<img src="/brand/logo-pdf.svg">` で参照可能（ファイルパスとして存在する）
- [ ] `metadata.metadataBase` が環境変数 `NEXT_PUBLIC_SITE_URL` で上書き可能になっており、Issue #11 で Cloudflare Pages のドメインを設定するだけで本番反映される

### 11.7 Git / PR

- [ ] ブランチ名が `feature/brand-assets_<yyyymmdd>` 形式
- [ ] コミットが論理単位で分割されている（推奨: 「素材配備」+「metadata 拡張」+「ドキュメント追加」の 1〜3 コミット）
- [ ] PR が `develop` をベースに作成されている
- [ ] PR 本文に「素材一覧」「容量実測値」「暫定 vs 本制作のステータス」「Issue #11 申し送り（OGP デバッガ確認）」が記載されている

---

## 12. リスクと申し送り

### R1: 正式ロゴが社内承認待ちの場合の暫定運用

- 本 Issue で暫定素材を配備した後、社内デザイナー / 委託デザイナーから正式素材が納品されるタイミングが Issue #11（Cloudflare Pages 公開）より後にずれ込む可能性がある。
- **対策**: 暫定素材で Cloudflare Pages 公開しても **致命的ではない**（社内向けβ運用 → 後日素材差し替え PR）として運用合意を取る。差し替え PR は **ファイル名を維持したまま上書き**するため、コード変更が一切発生しない（`logo-header.svg` の中身だけ差し替わる）。
- **PR 本文への記載**: 「本 PR の素材は暫定。正式素材は別 PR で差し替え予定」と明示。

### R2: Cloudflare Pages 公開ドメイン未確定で `metadataBase` を仮置きする件

- 本 Issue 着手時点で Cloudflare Pages の公開ドメインが未確定（Issue #11 / #12 で確定）。
- **対策**: `metadataBase` を `process.env.NEXT_PUBLIC_SITE_URL ?? "https://matatabi-calculator.example"` として仮値運用。Issue #11 で本番ドメインが確定したら Cloudflare Pages の Environment Variables に `NEXT_PUBLIC_SITE_URL` を設定するだけで本番反映される（コード変更不要）。
- **Issue #11 への申し送り**: 「Cloudflare Pages の Environment Variables に `NEXT_PUBLIC_SITE_URL=https://<本番ドメイン>` を設定する」をプランに含める。

### R3: html2canvas の `useCORS: false` 制約と SVG 互換性

- `docs/spec/pdf-report.md` §3.1 で `useCORS: false` 運用が確定。これは **外部画像（CORS 不可）を使わない**ことを意味する。
- 本 Issue で配備する `logo-pdf.svg` は **同一オリジン（`/brand/logo-pdf.svg`）**から配信されるため CORS 問題は発生しない。
- **ただし html2canvas は SVG の一部の機能（外部 CSS / 動的 `<use>` / 外部フォント）に既知の制約**がある。本 Issue で配備する SVG は **インライン定義のみ**（外部 CSS / 外部フォント / 動的 `<use>` を使わない）で書くこと。
- **PR チェック**: SVG 内に `<style>@import url(...)</style>` や `<use href="external.svg">` が含まれていないことを目視確認。

### R4: Next.js 14 の `app/icon.svg` 規約と SVG ファビコンのブラウザ互換性

- SVG ファビコンは Chrome 80+ / Firefox 41+ / Safari 12+ で対応。**IE / 旧 Edge は非対応**だが、本プロジェクトの対象ブラウザではない（マスター設計書 §1.4）ため問題なし。
- レガシー対応は `favicon.ico`（マルチサイズ）でフォールバック。

### R5: OGP 画像のキャッシュ問題

- SNS / Slack は OGP 画像を **長期間キャッシュ**するため、Cloudflare Pages 公開後に画像を差し替えても **キャッシュが古い画像を返し続ける**ことがある。
- **対策**: Cloudflare Pages 公開後の素材差し替え時は、各 SNS の OGP デバッガ（特に Meta デバッガ / X Card Validator）で「キャッシュ強制リフレッシュ」を実行する。Slack の場合は URL の末尾にダミーパラメータ（`?v=2`）を付ける運用。
- **Issue #11 への申し送り**: 「OGP 画像差し替え時のキャッシュリフレッシュ手順」を別途ドキュメント化することを検討。

### R6: 暫定 SVG の品質と PR レビュー

- 暫定 SVG は開発者自作のため、デザイナーが見ると「品質が不十分」と感じる可能性がある。
- **対策**: PR 本文に「暫定」明記 + `docs/brand/README.md` のステータス欄に「暫定」マーク。差し替え予定であることを明示することで、過度な品質議論を避ける。

### R7: `metadata.openGraph.images` の重複指定リスク

- `src/app/opengraph-image.png` 規約と `metadata.openGraph.images` の手動指定を **両方書くと重複が発生**する。
- **対策**: 規約ファイル（`opengraph-image.png`）を採用するため、`metadata.openGraph.images` は **手動で指定しない**。Twitter Card 側も同様。
- **動作確認**: DevTools の `<head>` 内で `<meta property="og:image">` が **1 個だけ**存在することを確認。

### R8: `viewport.themeColor` の Next.js 14 deprecation 警告

- Next.js 14 では `metadata.themeColor` に書くと deprecation 警告が出る。**`export const viewport` 経由で書く**のが正しい。
- **本 Issue の実装**: `viewport: Viewport` 型を `next` から import して `export const viewport` で書く（§5.1 のコード例参照）。
- **チェック**: `npm run build` で deprecation 警告が出ないことを確認。

### R9: ファビコン規約と既存 `src/app/favicon.ico` の競合

- 既存の `src/app/favicon.ico`（create-next-app デフォルト）を残したまま `public/favicon.ico` を新規追加すると、Next.js は規約ファイル（`src/app/`）を優先するため `public/favicon.ico` は無視される。
- **対策**: 本 Issue では **`src/app/favicon.ico` を上書き差し替え**する方針を取り、`public/favicon.ico` は作成しない。重複管理を避ける。

### R10: `cat-deco-*.svg` の命名と将来の拡張

- 1 種類のみ配備する場合の命名は `cat-deco.svg`（連番無し）か `cat-deco-1.svg`（連番付き）かで判断が分かれる。
- **本プランの推奨**: **`cat-deco-1.svg`（連番付き）**。理由: 将来 2 種類以上に拡張する際、既存の参照（CSS background-image 等）を変更せずに `cat-deco-2.svg` を追加できる。連番ゼロパディングは 10 種類超えた時点で運用検討（現実的にそこまで増えない想定）。

### R11: 環境変数 `NEXT_PUBLIC_SITE_URL` の `.env.example` 整備

- 本 Issue では `.env.example` を作成しない（仮値が動く前提）。
- **Issue #11 への申し送り**: Cloudflare Pages 公開と合わせて `.env.example` を作成し、`NEXT_PUBLIC_SITE_URL` を含む環境変数一覧を整備する。

### R12: Cloudflare Pages の静的アセット配信と `Cache-Control`

- Cloudflare Pages は `public/` 配下のファイルをデフォルトで長期キャッシュ（1 年）する。
- 暫定素材 → 正式素材の差し替え時、ファイル名が同一だとブラウザキャッシュが古い素材を返し続ける可能性がある。
- **対策**: ファイル名を変更しない方針で行く場合、Cloudflare Pages の `_headers` ファイルで `Cache-Control: public, max-age=86400, must-revalidate` 等の中期キャッシュに調整する手段がある。**本 Issue では `_headers` を作成せず、Issue #11 で扱う**。

### R13: `lucide-react` 等のアイコンライブラリと猫モチーフの関係

- Issue #8 で `lucide-react` が依存に入る予定だが、Lucide には現状（2026-04 時点）「猫」アイコンが無い。
- 本 Issue で配備する `cat-deco-*.svg` および `logo-*.svg` は **Lucide とは独立に内製する**。Lucide は警告バナーや CTA のアイコン用途に限定する。
- **PR レビュー**: 後続実装で「猫モチーフを Lucide で代替する」という誤実装が出ないよう、`docs/brand/README.md` に「猫モチーフは内製 SVG を使用、Lucide では代替しない」ことを明記する。

### R14: Issue #10（デザインガイドライン）との実装順序

- Issue #10 は「余白 / 角丸 / シャドウ」のトークン化が中心で、本 Issue とは責務が分離されている。
- **並行可能**: 本 Issue（#9）と Issue #10 は並行作業しても衝突しない（変更ファイルが重ならない）。
- **マージ順序**: 本 Issue が先でも Issue #10 が先でも問題ない。両方マージされた後、後続「Layout 共通コンポーネント実装 Issue」が両方の成果物を消費する。

---

## 13. 関連ファイル

### 13.1 既存の参照元（仕様確定済み）

- `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` — マスター設計書 §1.4 LCP 1 秒目標 / §2.1 技術要件 / §3.2 Layout 構成（猫モチーフ背景） / §3.3 カラーパレット
- `/Users/YS/development/matatabi-calculator/docs/spec/pdf-report.md` — §6.1 ヘッダー構成（12×12mm ロゴ） / §6.4 ロゴ SVG の扱い（本 Issue で対応） / §3.1 `useCORS: false` 運用 / §13.5 連絡先・ロゴ SVG の未確定事項
- `/Users/YS/development/matatabi-calculator/.claude/issue-order.md` — フェーズ1 における本 Issue の位置付け

### 13.2 既存プロジェクト現状（本 Issue で変更対象 / 参照）

- `/Users/YS/development/matatabi-calculator/src/app/layout.tsx` — 本 Issue で `metadata` 拡張 + `viewport` エクスポート追加
- `/Users/YS/development/matatabi-calculator/src/app/favicon.ico` — 本 Issue で正式版に差し替え
- `/Users/YS/development/matatabi-calculator/tailwind.config.ts` — 本 Issue では触らない（参照のみ、`canvas` / `ink` / `line` / `accent` トークンの色値を SVG にハードコードする際の参照）
- `/Users/YS/development/matatabi-calculator/src/app/globals.css` — 本 Issue では触らない（参照のみ）
- `/Users/YS/development/matatabi-calculator/next.config.mjs` — 本 Issue では触らない
- `/Users/YS/development/matatabi-calculator/package.json` — 本 Issue では触らない（依存追加なし）

### 13.3 本 Issue で **新規作成**

- `/Users/YS/development/matatabi-calculator/public/brand/logo-header.svg`
- `/Users/YS/development/matatabi-calculator/public/brand/logo-pdf.svg`
- `/Users/YS/development/matatabi-calculator/public/brand/cat-deco-1.svg`（必要なら `cat-deco-2.svg` も）
- `/Users/YS/development/matatabi-calculator/src/app/icon.svg`
- `/Users/YS/development/matatabi-calculator/src/app/apple-icon.png`
- `/Users/YS/development/matatabi-calculator/src/app/opengraph-image.png`
- `/Users/YS/development/matatabi-calculator/docs/brand/README.md`

### 13.4 本 Issue で **更新**

- `/Users/YS/development/matatabi-calculator/src/app/layout.tsx` — `metadata` 拡張 + `viewport` エクスポート追加
- `/Users/YS/development/matatabi-calculator/src/app/favicon.ico` — 既存ファイル差し替え

### 13.5 本 Issue で **触らない**（後続 Issue 担当）

| ファイル / 領域 | 担当 Issue |
|---|---|
| `src/components/Layout/*`（ヘッダー / フッター / 背景装飾の React コンポーネント） | 後続「Layout 共通コンポーネント実装 Issue」 |
| `src/components/PdfDashboard.tsx`（PDF ロゴ表示コード） | Issue #5 本実装フェーズ |
| `next.config.mjs`（Cloudflare Pages 対応 / `_headers` / キャッシュ制御） | Issue #11 |
| `tailwind.config.ts` の余白 / 角丸 / シャドウ拡張 | Issue #10 |
| `.env.example` / `NEXT_PUBLIC_SITE_URL` の定常化 | Issue #11 |
| `webmanifest`（PWA 対応） | 別 Issue |
