# PDFレポート仕様書

> 対象: ROI診断アプリ「またたび計算機」 / 関連Issue: #5 / マスター設計書: [`.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md`](../../.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md) §1.3, §2.2, §3.2, §3.3 / 前提: [`calculation-logic.md`](./calculation-logic.md), [`input-form.md`](./input-form.md), [`result-dashboard.md`](./result-dashboard.md), [`warning-copy.md`](./warning-copy.md)

本ドキュメントは、マスター設計書 §2.2 の「jsPDF ＋ html2canvas」で生成する **A4 1 枚の PDF レポート**を実装可能なレベルまで確定するための仕様書です。生成アプローチ（html2canvas 主体か直接描画か）・日本語フォント埋め込み方針・A4 内部レイアウト・ヘッダー／フッター／ロゴ配置・ファイル名命名規則・ダウンロード導線の挙動・依存ライブラリ方針・`PdfDashboard` と `DashboardView` の接続契約を本書で確定します。Issue #6（Next.js 雛形）と Issue #8（依存ライブラリ追加）以降の実装 Issue は本仕様を前提に設計されます。

> **本書のステータス**: 確定。Issue #3 / #4 の確定事項を継承し、本書で新たに決定する項目は §5〜§11 に集約。

---

## 1. 前提と目的

### 1.1 目的
- jsPDF ＋ html2canvas を用いた PDF 生成の **主役ライブラリ**（画像貼付方式か直接描画か）を確定する。
- **日本語フォント埋め込み方針**を確定し、オフライン商談耐性と初回 LCP 1 秒目標を両立させる。
- **A4 1 枚に載せる項目と配置**を ASCII ワイヤー付きで確定する。
- **ヘッダー／フッター／ロゴ配置**、生成日時の掲出位置、ページ番号の要否を確定する。
- **ファイル名の命名規則**（英数字・タイムスタンプ粒度・タイムゾーン）を確定する。
- **ダウンロード導線**（ボタン押下後のフロー、ローディング表示、失敗時ハンドリング、タイムアウト）を確定する。
- PDF 固有の **アニメーション無効化契約**（Recharts `isAnimationActive={!animated}`）を明示する。
- **依存ライブラリのバージョン指針と遅延ロード方針**を Issue #8 への申し送り形で確定する。
- **`PdfDashboard` と `DashboardView` の接続契約**（props 型・レイアウト責務・動的マウント）を確定する。

### 1.2 前提
本仕様書は Issue #1〜#4 の成果物に依存する。特に以下の決定事項を前提とする:

- `CalculationResult` 型（[`calculation-logic.md §5`](./calculation-logic.md)）— `threeYearSavings` / `annualProfitCreation` / `threeYearProfitCreation` / `totalThreeYearImpact` / `speedWarning` / `speedWarningMonthlyLoss` / `insourcingGap`。
- `Inputs` 型（[`calculation-logic.md §5`](./calculation-logic.md)）— 基本 5 項目 + 詳細設定 3 項目。
- 表示単位・丸めルール: **万円単位で四捨五入**（[`calculation-logic.md §6`](./calculation-logic.md)）。ヒーロー数値は `formatManYen` / 桁爆発時は `formatManYenCompact`。
- PDF 表紙訴求: 「3 年間のトータルインパクト」（[`calculation-logic.md §6.1`](./calculation-logic.md)）。
- 入力 5 項目 + 詳細設定 3 項目（[`input-form.md §3, §4`](./input-form.md)）— PDF 入力サマリーの表示対象。`updateWaitMonths` は離散 5 段階セレクト。
- ダッシュボード UI 骨格（[`result-dashboard.md §3, §4, §8`](./result-dashboard.md)）— 指標カード構成、積み上げ横棒グラフ（Blue 止血 + Amber 3 年創出）、警告バナー骨格。
- PDF スナップショット戦略（[`result-dashboard.md §10`](./result-dashboard.md)）— `PdfDashboard` 別立て、A4 比率固定、`animated={false}` 強制。`DashboardView` は props ベースで副作用を持たない。
- 警告バナー確定文言（[`warning-copy.md §3, §7`](./warning-copy.md)）— `CRITICAL OPPORTUNITY LOSS` + 日本語サブ、動的数字差し込み `buildWarningMessage(monthlyLoss)`、`speedWarning && insourcingLevel !== 1` で発動。
- デザイントークン: ベース `#F8FAFC` / Blue 500 (`#3B82F6`) / Amber 500 (`#F59E0B`)（マスター設計書 §3.3）。
- 非機能要件: LCP 1 秒以内、タブレット最適化、オフライン商談耐性（マスター設計書 §1.4）。

### 1.3 本書のスコープ外

以下は本書のスコープではない:

- 実装ファイル（`src/components/PdfDashboard.tsx`、`src/lib/pdf.ts`、`src/lib/pdfFilename.ts`、`public/fonts/` のフォント実ファイル）。Issue #6 / Issue #8 以降の実装 Issue が本仕様を入力として実装する。
- `DashboardView` の props 型・責務分離（[`result-dashboard.md §10.2, §10.3`](./result-dashboard.md)）。本書では改定せず継承のみ。
- 警告バナー文言・発動条件（[`warning-copy.md §3, §4`](./warning-copy.md)）。本書では PDF 内での高さ・フォントサイズ・生成日時注記のみ確定。
- カテゴリ別訴求テキストの最終文言（[`calculation-logic.md §4.4`](./calculation-logic.md) / Issue #1 将来拡張）。本書では掲出枠のみ確保し、プレースホルダ `"{{CATEGORY_MESSAGE}}"` で運用。
- 正式ロゴ SVG の制作・配置（別 Issue）。本書では暫定テキスト `またたび計算機` で代替。
- 連絡先（メール・電話番号・URL）の具体値。本書では「運用で差し替え可能な定数」としての仕様化のみ。
- 顧客名入力項目（Issue #2 改定が必要なため本書では不採用、将来 Issue へ申し送り）。

---

## 2. 設計原則

本書の生成アプローチ・レイアウト・導線設計は、以下の原則に従う。

| # | 原則 | 意味 | 帰結 |
|---|---|---|---|
| 1 | **オフライン商談耐性** | 電波の弱い客先会議室でも PDF 生成が成功すること。 | 外部 CDN（Google Fonts 等）への **ランタイム依存をゼロ**にする。フォントは `next/font/local` で配信。 |
| 2 | **画面と PDF の一貫性** | 商談で「画面と同じものが PDF で出ます」と即説明できること。 | html2canvas で DOM をラスタライズし、画面版と同じ視覚資産（Tailwind / Recharts SVG / Lucide アイコン）を PDF に反映する。 |
| 3 | **Issue #1〜#4 との整合** | 既存 spec の確定事項を **変更せず継承**し、本書では PDF 固有の差分のみ決定する。 | `DashboardView` の props 型・`CalculationResult` 型・警告発動条件・丸めルールは改定しない。PDF 専用ラッパ（`PdfDashboard`）で差分を吸収。 |
| 4 | **LCP 1 秒目標の維持** | マスター設計書 §1.4 の非機能要件を壊さないこと。 | jsPDF + html2canvas は `next/dynamic` で **PDF 生成時のみロード**。Noto Sans JP は subset 化 + `font-display: swap` で非ブロッキング配信。 |
| 5 | **タブレット商談優先** | iPad Safari 実機で生成成功率を保証すること。 | html2canvas の `scale` は `2` を上限とし、canvas メモリ制約（16M px²）に触れない設計。実機試験を Issue #6 実装時に必須化。 |
| 6 | **商談テンポ優先** | ボタン押下から PDF ダウンロード開始までを直線的かつ最短にすること。 | プレビュー表示なし。ワンクリックで即生成・即ダウンロード。生成中ローディングとタイムアウト 10 秒で体感を担保。 |
| 7 | **画像化による制約の受容** | html2canvas 主体の採用により、PDF 内テキストは画像化される（検索・コピー・スクリーンリーダー読み上げ不可）。 | 本アプリの PDF は「商談持ち帰りの静止画資料」であり、可読性（画質）とブランドトーン（視覚資産）を優先する。アクセシビリティ対応は将来拡張（§13）に記録。 |

---

## 3. 生成アプローチ

### 3.1 採用: html2canvas 主体 + jsPDF 画像貼付

`PdfDashboard` が描画する A4 比率の隠し DOM を `html2canvas` で PNG にラスタライズし、jsPDF の `addImage` で A4 台紙にそのまま貼り付け、`save()` でダウンロードする方式を採用する。

- **ライブラリ役割分担**:
  - `html2canvas`: 隠し DOM → PNG データ URL
  - `jsPDF`: A4 台紙 + 画像貼付 + ダウンロード
- **フォント埋め込み**: DOM 側で `next/font/local` により解決されるため、jsPDF 側での `addFont` による Base64 登録は **不要**（§4 で詳述）。
- **画面版との一貫性**: Tailwind クラス・Recharts SVG・Lucide アイコンが DOM に反映され、それがそのまま画像化されるため、画面 ↔ PDF の見た目が同一（§5-5 の「指標カード数差分」のみ例外）。

#### 採用理由
- Issue #3 §10.2 で確定した `DashboardView` / `PdfDashboard` の責務分離を **そのまま活かせる**。画面側のレイアウト資産（Tailwind・Recharts・Lucide）を PDF に持ち込める。
- 日本語フォントが DOM 側の `next/font/local` で解決されるため、jsPDF 側で Noto Sans JP を Base64 で登録する手間が不要。**バンドル JS のサイズ増を回避**。
- Recharts は SVG ベース（[`result-dashboard.md §5.1`](./result-dashboard.md)）であり、html2canvas が SVG を直接ラスタライズする。二重ラスタライズ（Canvas → Canvas の劣化）が発生しない。
- 実装コードが最小（DOM を作る React コンポーネント + 10〜20 行の生成ユーティリティ）。

### 3.2 `scale` オプションと画像フォーマット

| 項目 | 値 | 根拠 |
|---|---|---|
| `scale` | **2**（既定） | `scale: 1` はファイルサイズ最小だが 200% 拡大印刷で文字がぼやける。`scale: 3` は iPad Safari のメモリ制約（約 16M px²）に触れうる。`scale: 2`（A4 縦で約 1190×1684 = 約 200 万 px²）が画質・安定性のバランス点。 |
| 画像フォーマット | **PNG**（`image/png`） | 可逆圧縮で文字・図形のエッジがシャープ。JPEG は金額の数字にブロックノイズが出るため不適。 |
| `useCORS` | `false` | 外部画像を使わない（ロゴ・アイコンは Lucide SVG + ローカル SVG）。 |
| `backgroundColor` | `#ffffff` | 透明ではなく白地。PDF 台紙の下地が PNG に含まれて安定する。 |

**将来拡張**: ファイルサイズ削減の要望が出た場合は `scale: 1.5` への降格を §13.4 で受け入れる。

### 3.3 Recharts アニメーション無効化の接続契約

html2canvas はスナップショットを撮るため、アニメーションの途中状態で撮ると棒グラフが「半分しか伸びていない」状態で PDF に焼き込まれる。これを防ぐため、以下の **接続契約**を本書で確定する:

- `PdfDashboard` は `DashboardView` に `animated={false}` を渡す（[`result-dashboard.md §10.2`](./result-dashboard.md) で既定）。
- `DashboardView` は内部で Recharts の `isAnimationActive` を **`!animated` に連動**させる（`animated = false` → `isAnimationActive = false`）。
- `useCountUp` も `animated={false}` で即時最終値を表示（[`result-dashboard.md §6, §10.2`](./result-dashboard.md) で既定）。
- 警告バナーのフェードインも `animated={false}` により自動無効（[`warning-copy.md §6.4`](./warning-copy.md)）。

念のため html2canvas 実行前に `requestAnimationFrame` 2 回分の待機を置く（§8.1 参照）ことで、アニメーションが走っていても完了後にスナップショットされる保険を掛ける。

### 3.4 不採用案

#### jsPDF 直接描画主体（不採用）
- jsPDF API（`text()` / `rect()` / `line()` / `setFontSize()` 等）で A4 上に直接描画。Recharts のグラフも自前で数値から棒を描画する方式。
- **不採用理由**:
  - 日本語フォントを jsPDF に `addFont` で Base64 登録する必要があり、Noto Sans JP subset でも 1〜3MB のバンドル増（Base64 オーバーヘッド含む）。**マスター設計書 §1.4 の LCP 1 秒目標と正面衝突**。
  - Recharts の SVG 資産を捨てて自前でグラフを再描画する実装コストが重い。Issue #3 §10.2 の「画面側の変更で PDF が壊れないことを保証する」設計思想も壊れる。
  - Tailwind / shadcn 系の視覚資産（カード・余白・アイコン）を PDF に持ち込めず、ブランドトーンが再現できない。
- **Pros（参考）**: PDF 内テキストがベクターでコピー・検索可能、印刷解像度劣化なし、ファイルサイズ最小。

#### html2canvas + jsPDF 直接描画のハイブリッド（不採用）
- グラフ・警告バナー・指標カードは html2canvas で画像化、ヘッダー・フッター・免責等の定型テキストは jsPDF `text()` で直接描画。
- **不採用理由**:
  - jsPDF 側にもフォント埋め込みが必要になり、html2canvas 主体の最大メリット（フォント埋め込み不要）を半分失う。
  - 2 系統の描画コードが並走して実装が最も複雑。ヘッダー・フッターの微妙な位置ズレ・フォント差異のリスクが最大。
  - 定型テキストのベクター化という利点は、商談用 PDF（画像として回覧される前提）では価値が小さい。

---

## 4. 日本語フォント埋め込み方針

§3 で html2canvas 主体を採用したため、フォント埋め込みは「DOM 側で `font-family` が解決される形」のみで完結する。本 §では DOM 側フォントのソース・subset 化・英字併用・カスケード指定を確定する。

### 4.1 採用: `next/font/local` で Noto Sans JP subset を配置

プロジェクト内（`public/fonts/`）に Noto Sans JP の subset（Regular + Bold）を配置し、`next/font/local` で読み込む。

- **ディレクトリ**: `public/fonts/`
  - `NotoSansJP-Regular.woff2`（subset、約 400KB）
  - `NotoSansJP-Bold.woff2`（subset、約 400KB）
  - `Inter-Regular.woff2`（ASCII + Latin-1、約 40KB）
  - `Inter-Bold.woff2`（ASCII + Latin-1、約 40KB）
- **DOM 側の `font-family` カスケード**: `font-family: 'Inter', 'Noto Sans JP', sans-serif;` により英数・記号は Inter、日本語は Noto Sans JP に自動解決される。

#### 採用理由
- **外部 CSS 依存ゼロ**（[`result-dashboard.md §10.4`](./result-dashboard.md) / §11 R2 の申し送りと完全整合）。
- **オフライン商談耐性**（電波なし会議室でも PDF 生成が成功する、§2 原則 1）。
- Next.js のビルドで静的配信され、初回アクセス時に 1 回ダウンロードされればキャッシュに残る。
- Inter（英字）と Noto Sans JP（日本語）を同じ仕組みで扱える。

### 4.2 subset 化の方針

- **文字セット**: ASCII（英数・記号）+ ひらがな + カタカナ + JIS 第一水準漢字（約 2,965 字）+ 必要な JIS 第二水準漢字の一部。
- **ツール**: `subset-font`（npm）または `fonttools`。ビルド時 1 回生成し `public/fonts/` にコミット。
- **目標サイズ**: Noto Sans JP Regular + Bold の 2 ウェイトで合計 **800KB 以下**（woff2 圧縮後）。
- **確認項目**: 本アプリで使用する既知文字集合（§4.3 参照）が subset に含まれることを Issue #6 実装時のテストで保証。

### 4.3 使用文字の既知集合（subset 確認用）

本アプリの PDF で使用する文字は **営業語彙の既知集合**に限られる。subset 漏れによる豆腐（□）リスクを最小化するため、以下の文字群を subset 生成時に必ず含める:

- 見出し語: `CRITICAL OPPORTUNITY LOSS` / `ROI診断結果レポート` / `3年間のトータルインパクト` / `試算上の最大値`
- 指標ラベル: `3年間の止血` / `年間の利益創出` / `3年間の利益創出` / `月額ベンダー費用` / `単発改修費用` / `手作業人数` / `更新待ち期間` / `内製化状況` / `時給` / `稼働時間`
- 判定語: `機会損失` / `発生中` / `累積中` / `削減余地` / `更なる効率化の提案` / `維持フェーズ`
- 単位: `万円` / `万円／月` / `万円／回` / `名` / `ヶ月` / `円` / `h/日` / `日/月` / `%`
- 会社名: `株式会社ねこにまたたび`
- 時間表現: `生成日時` + 数字 0〜9 + `-` + `:`

### 4.4 英字フォント（Inter）併用

- 見出し `CRITICAL OPPORTUNITY LOSS`（[`warning-copy.md §3.2`](./warning-copy.md)）は英字全大文字・`letter-spacing: 0.05〜0.08em`・`font-weight: 700`。Inter の字形特性に適合。
- 金額の数字（0〜9）も Inter で統一する。経営者向け商談資料で数字の字形が洗練されている印象を担保するため。
- カスケード指定（§4.1）により、英数は Inter・日本語は Noto Sans JP に自動で解決される。

### 4.5 不採用案

#### `next/font/google`（不採用）
- Next.js がビルド時に Google Fonts から fetch してローカルにバンドルする方式。
- **不採用理由**: ビルド環境（Cloudflare Pages の CI）が Google Fonts にアクセスできないとビルド失敗する。ランタイム依存はないが、ビルド成功が外部サービスに依存する点で `next/font/local` より弱い。
- **参考**: ランタイムで Google Fonts CDN にアクセスしない挙動（Next.js 14 以降）はオフライン商談耐性（§2 原則 1）と整合する。

#### jsPDF `addFont` で Base64 直接埋め込み（不採用）
- TTF / OTF を Base64 化して jsPDF に登録する方式。
- **不採用理由**:
  - Base64 化でフォントファイルのバンドルサイズが **約 1.37 倍に膨らむ**（Noto Sans JP subset 500KB → Base64 文字列 700KB 級）。
  - バンドル JS に埋め込まれるため、初回 LCP に直接影響（非同期ロード化しても PDF 生成時には必要）。
  - §3 で html2canvas 主体を採用する限り、そもそも jsPDF 側のフォント登録は不要。

---

## 5. A4 1 枚レイアウト

### 5.1 採用: 上下分割・1 枚構成

A4 縦（210 × 297mm = 595 × 842pt @72dpi）に、Issue #1〜#4 で確定済みの情報を **上から順に**詰める。視線誘導は「警告 → トータル → 内訳 → グラフ → 診断 → 入力 → 免責」の直線的な流れとする。

### 5.2 載せる要素の棚卸しと優先順位

| # | 要素 | 出典 | 必須度 | 高さ |
|---|---|---|---|---|
| 1 | ヘッダー（ロゴ + サービス名 + 生成日時） | 本書 §6.1 | 必須 | 20mm |
| 2 | 警告バナー（`CRITICAL OPPORTUNITY LOSS`） | [`warning-copy.md §3`](./warning-copy.md) | 条件付き必須 | 15mm |
| 3 | 表紙訴求（3 年トータルインパクト、ヒーロー数値） | [`calculation-logic.md §6.1`](./calculation-logic.md) | 必須 | 50mm |
| 4 | 指標カード（3 年止血・年間創出・3 年創出の並列） | [`result-dashboard.md §3.2`](./result-dashboard.md) | 必須 | 40mm |
| 5 | 積み上げ横棒グラフ（Blue 止血 + Amber 3 年創出） | [`result-dashboard.md §4.1`](./result-dashboard.md) | 必須 | 45mm |
| 6 | 内製化注記（「◯% 相当分を除外済み」） | [`result-dashboard.md §3.3`](./result-dashboard.md) | 条件付き必須 | 指標カード内 |
| 7 | カテゴリ別訴求テキスト | [`calculation-logic.md §4.4`](./calculation-logic.md) | 推奨 | 20mm |
| 8 | 入力サマリー（基本 5 項目 + 詳細設定） | [`input-form.md §3.3`](./input-form.md) | 必須 | 45mm |
| 9 | 免責注記 | [`calculation-logic.md §6.1`](./calculation-logic.md) / 本書 | 必須 | 10mm |
| 10 | フッター（会社名・連絡先・ページ番号） | 本書 §6.2 | 必須 | 15mm |

> 警告バナー非発動時は要素 2 を非表示化し、要素 3 以降を上に繰り上げる（§5.6 参照）。

### 5.3 マージン・余白設計

| 項目 | 値 | 備考 |
|---|---|---|
| ページマージン（上下左右） | **15mm** | 描画領域 180 × 267mm |
| セクション間余白 | **4mm** | 全要素共通で統一 |
| カード padding | 縦 8mm / 横 6mm | 指標カード内部 |
| ヒーロー数値フォントサイズ | **36pt**（桁爆発時 28pt） | `formatManYenCompact` による「◯億◯万円」表記が発生した場合に自動縮小 |
| 警告バナー高さ | **15mm** | 画面版 64〜96px からの圧縮 |
| 警告見出しフォントサイズ | 12pt（`letter-spacing: 0.05em` 維持） | [`warning-copy.md §3.2`](./warning-copy.md) からの縮小 |
| 警告サブフォントサイズ | 10pt | [`warning-copy.md §3.3`](./warning-copy.md) からの縮小 |
| 指標カード幅（3 枚並列） | 各 56mm、カード間 6mm | ヘッダー・フッターのマージンと合う計算 |

> [`warning-copy.md §8.3`](./warning-copy.md) の申し送り「A4 比率でのバナー高さ・フォントサイズ調整」は本表で確定する。

### 5.4 ASCII ワイヤー

#### 警告発動時（通常ケース: `speedWarning && insourcingLevel !== 1`）

```
┌─────────────────────────────────────────────────────────┐
│ [ロゴ]  ROI診断結果レポート            生成日時 2026-04-23 15:30 │ ← ヘッダー 20mm
├─────────────────────────────────────────────────────────┤
│ ⚠  CRITICAL OPPORTUNITY LOSS                              │
│    現在、月額 120 万円相当の機会損失が発生中              │ ← 警告バナー 15mm
├─────────────────────────────────────────────────────────┤
│                                                           │
│            3年間のトータルインパクト                      │
│               ◯,◯◯◯ 万円                                │ ← 表紙訴求 50mm
│               ※ 試算上の最大値                          │
│                                                           │
├─────────────────────────────────────────────────────────┤
│  [3年間の止血]    [年間の利益創出]    [3年間の利益創出]  │
│   ◯◯◯ 万円         ◯◯ 万円             ◯◯◯ 万円        │ ← 指標カード 40mm
│   Blue 500          Amber 500             Amber 500       │
│   ※内製化 ◯% 除外                                        │
├─────────────────────────────────────────────────────────┤
│ [積み上げ横棒グラフ: Blue 止血 + Amber 3年創出]           │ ← グラフ 45mm
├─────────────────────────────────────────────────────────┤
│ ◆ 診断カテゴリ                                            │
│   {{CATEGORY_MESSAGE}}                                    │ ← カテゴリ訴求 20mm
├─────────────────────────────────────────────────────────┤
│ ◆ 入力値サマリー                                          │
│  月額ベンダー費用    ◯◯万円／月                          │
│  単発改修費用        ◯◯万円／回                          │ ← 入力サマリー 45mm
│  手作業人数          ◯名                                  │
│  更新待ち期間        ◯〜◯ヶ月                            │
│  内製化状況          ◯◯◯ (◯%)                           │
│  (詳細設定: 時給 ◯円 / ◯h/日 / ◯日/月)                   │
├─────────────────────────────────────────────────────────┤
│ 本試算は入力値に基づく理論上の最大値であり、...           │ ← 免責 10mm
├─────────────────────────────────────────────────────────┤
│ 株式会社ねこにまたたび  contact@...             1 / 1     │ ← フッター 15mm
└─────────────────────────────────────────────────────────┘
```

#### 警告非発動時（`!speedWarning` または `insourcingLevel === 1`）

- 警告バナー（15mm）を非表示にし、表紙訴求を上に繰り上げる。
- 判定式は `ResultDashboard` と共通: `showWarningBanner = result.speedWarning && insourcingLevel !== 1`（[`warning-copy.md §4.3`](./warning-copy.md)）。

```
┌─────────────────────────────────────────────────────────┐
│ [ロゴ]  ROI診断結果レポート            生成日時 2026-04-23 15:30 │ ← ヘッダー 20mm
├─────────────────────────────────────────────────────────┤
│                                                           │
│            3年間のトータルインパクト                      │
│               ◯,◯◯◯ 万円                                │ ← 表紙訴求 50mm（繰り上げ）
│               ※ 試算上の最大値                          │
│                                                           │
├─────────────────────────────────────────────────────────┤
│  [3年間の止血]    [年間の利益創出]    [3年間の利益創出]  │
│   ...                                                     │ ← 以降、§5.4 の警告発動時と同構成
```

#### 完全内製顧客（`insourcingLevel === 1`）

- 警告バナー非表示（§5.4 非発動時と同じレイアウト繰り上げ）。
- 止血カードは「0 万円」表示（[`result-dashboard.md §3.3`](./result-dashboard.md)）。レイアウトは維持。
- カテゴリ訴求テキストは「維持フェーズ」文言（プレースホルダ `{{CATEGORY_MESSAGE}}`）。

### 5.5 指標カード 3 枚並列の合理性（画面版 2 枚との差分）

- **画面版**: 2 カード構成（止血 + 年間創出に 3 年創出を二段表記）。[`result-dashboard.md §3.2`](./result-dashboard.md) で確定済み。
- **PDF 版**: **3 カード並列**（止血・年間創出・3 年創出を対等に並べる）。
- **差分の根拠**: PDF は「静止画像として回覧される」ため、画面版の二段表示（年間 → 3 年の視線誘導）が機能しにくい。並列の方が一目で対比できる。
- **責務分離との整合**: Issue #3 §10.2 の「`DashboardView` の props 互換を保ったまま、PDF 側で独自ラッパを作り A4 フィットさせる」方針と整合。`DashboardView` の型は改定せず、`PdfDashboard` 内部の独自 JSX で 3 カード並列を実現する。
- **画面 ↔ PDF の差分は「二段表示 vs 並列表示」の 1 点のみ**。数字・色・グラフは完全一致するため、経営者目線での齟齬は実用上問題ないと判断。

### 5.6 警告非発動時・完全内製顧客でのレイアウト破綻防止

- 警告バナー（15mm）の領域が空く場合、**表紙訴求（ヒーロー）の位置を上に繰り上げる**（`showWarningBanner` フラグで条件分岐）。
- 止血カード「0 万円」表示時（完全内製顧客）は、レイアウトは維持する（カード幅・余白は変わらない）。
- カテゴリ訴求「維持フェーズ」文言を他カテゴリより長めに設定する運用は Issue #1 将来拡張に申し送り（本書ではレイアウト破綻しないことのみ確認）。

### 5.7 不採用案

#### 2 カラム分割（左: サマリー数字 / 右: 入力値とグラフ）（不採用）
- **不採用理由**: 視線誘導が Z 字で複雑化し、PDF の本質である「初見 1 秒で結論が伝わる」直線的な視線誘導が損なわれる。表紙訴求のヒーロー数値が半分のサイズになりインパクトが弱まる。

#### 表紙 + 明細の 2 ページ構成（A4 2 枚）（不採用）
- **不採用理由**: Issue #5 の規定は「A4 1 枚」。スコープ外。物理印刷コストと回覧時の取り回しも煩雑化する。

---

## 6. ヘッダー／フッター／ロゴ

### 6.1 ヘッダー

| 領域 | 内容 | タイポグラフィ |
|---|---|---|
| 左端 | ロゴ（20 × 20pt の正方形領域、暫定は文字ロゴ `またたび計算機`） | Inter Bold 14pt |
| 中央 | `ROI診断結果レポート` | Noto Sans JP Bold 14pt |
| 右端 | `生成日時 2026-04-23 15:30`（JST 固定、分単位） | Inter + Noto Sans JP Regular 10pt |

- **高さ**: 20mm。下端に Slate 200 の細線 1px を引いて本文と区切る。
- **生成日時**: [`warning-copy.md §8.3`](./warning-copy.md) の「PDF 内に『生成日時』の注記を入れるか」の申し送りを **ヘッダー右端に吸収**する。フッターに置くより視認性が高く、経営者が「いつの試算か」を即認識できる。

### 6.2 フッター

| 領域 | 内容 | タイポグラフィ |
|---|---|---|
| 左端 | `株式会社ねこにまたたび` | Noto Sans JP Regular 10pt / Slate 700 |
| 中央 | 連絡先（例: `contact@nekonimatatabi.example`） | Inter Regular 9pt / Slate 600 |
| 右端 | ページ番号（`1 / 1` 固定） | Inter Regular 9pt / Slate 600 |

- **高さ**: 15mm。上端に Slate 200 の細線 1px。
- **ページ番号**: 将来的な複数ページ化（§13.3）との互換を保つため `1 / 1` 形式で固定。
- **連絡先**: 具体値は Issue #5 スコープ外。**`src/lib/pdfConstants.ts`（仮称）の定数として Issue #6 実装時に差し替え可能な形で記述**する運用とする（§13.5）。

### 6.3 顧客名入力の不採用

- PDF の宛名として「株式会社 ◯◯ 様」を表示する要望は想定されるが、本書では **不採用**。
- **不採用理由**:
  - Issue #2 の入力項目に顧客名は含まれない（[`input-form.md §3.3`](./input-form.md)）。Issue #2 改定は本書のスコープ外かつ spec 原子性を壊す。
  - PDF ダウンロード時にモーダルで任意入力させる案は UX フローが複雑化し、商談テンポ（§2 原則 6）を損なう。
  - 顧客名は営業担当が手書き（または別紙メモ）で補える。
- 将来、顧客名入力を追加したい要件が固まった時点で別 Issue 化（§13.1）。

### 6.4 ロゴ SVG の扱い

- マスター設計書 §3.3 で「プロフェッショナル × 猫モチーフ」のブランドイメージが規定されているが、**ロゴ SVG の実ファイルは未確定**。
- 本書では「ヘッダー左端 20 × 20pt の正方形領域にロゴを配置する」とレイアウト枠のみ確定。ロゴ SVG の制作・配置は **別 Issue（仮: Issue #99 ブランドアセット制作）で対応**する。
- 暫定運用: テキスト `またたび計算機` を Inter Bold 14pt で代替（§13.5）。

---

## 7. ファイル名命名規則

### 7.1 採用: `matatabi-roi-<YYYYMMDD>-<HHmm>.pdf`

- 例: `matatabi-roi-20260423-1530.pdf`
- 構成: プロジェクト識別子 `matatabi-roi` + 生成日時（分単位）
- 英数字のみ。全 OS・全ブラウザで互換。

#### 採用理由
- **全 OS・全ブラウザ互換**（Windows / macOS / iPadOS / Android / Linux）。
- 分単位タイムスタンプで、同一顧客に複数回生成しても衝突しない。
- ソート順が生成時刻順と一致（アルファベット順 = 時系列順）。
- ファイル名から内容が推測できる（`matatabi` = プロダクト名）。

### 7.2 タイムスタンプ粒度とタイムゾーン

| 項目 | 値 | 根拠 |
|---|---|---|
| 粒度 | **分単位**（`YYYYMMDD-HHmm`） | 同一顧客に 1 分以内の連続生成は現実的に稀。秒単位は冗長。 |
| タイムゾーン | **JST 固定**（`Asia/Tokyo`） | 商談現場はほぼ日本国内。UTC やユーザーローカルタイムゾーンは混乱の元。 |
| 日付区切り | `-`（ハイフン） | ISO 8601 風の可読性。アンダースコアより視覚的に自然。 |

### 7.3 不採用案

#### `matatabi-calculator-report-<顧客名>-<日付>.pdf`（不採用）
- **不採用理由**: 顧客名入力を §6.3 で不採用としたため。ファイル名も冗長化する。

#### `ROI診断結果_<日付>.pdf`（日本語ファイル名、不採用）
- **不採用理由**: macOS / iPadOS で日本語ファイル名は正常だが、古い Windows（エンコーディング問題）や Linux（UTF-8 非対応端末）で化ける可能性。商談相手が社内転送する際の耐性を優先し、英数字のみとする。
- 将来日本語化する場合の実装メモ（`encodeURIComponent` / `decodeURIComponent` を挟む等）は §13.5 に記録。

#### `matatabi-roi-<UUID>.pdf`（不採用）
- **不採用理由**: UUID は人間が読めず、ダウンロードフォルダで「どれがどの顧客か」が判別できない。

---

## 8. ダウンロード導線

### 8.1 生成フロー

Issue #3 §3.4 で「PDF ダウンロード」ボタンは CTA エリア（ダッシュボード下部）に配置済み。本書では押下時のシーケンスを以下で確定する:

```
[PDFダウンロード ボタン押下]
    ↓
[isGeneratingPdf = true に設定]
    ↓
[生成中ローディング表示 (ボタン内スピナー + "PDF生成中...")]
    ↓
[PdfDashboard の隠しDOM をマウント (A4 比率固定、position: absolute; left: -9999px)]
    ↓
[requestAnimationFrame 2 回分待機 (DOM レイアウト確定とフォント解決)]
    ↓
[html2canvas(element, { scale: 2, useCORS: false, backgroundColor: "#ffffff" })]
    ↓
[new jsPDF('p', 'mm', 'a4') → addImage(imgData, 'PNG', 0, 0, 210, 297) → save(filename)]
    ↓
[isGeneratingPdf = false に設定 (PdfDashboard アンマウント)]
    ↓
[生成完了 (ボタンを元の表示に戻す)]
```

### 8.2 ローディング表示

- ボタン内にインラインスピナー（Lucide `loader-2` を CSS アニメーション回転）+ テキスト「PDF生成中...」。
- ボタン自体を `disabled` 状態にして二重クリック防止。
- 生成時間は `scale: 2` でタブレット端末（iPad 9th 世代想定）で **2〜5 秒**を想定。

### 8.3 タイムアウトとエラーハンドリング

| 項目 | 挙動 |
|---|---|
| タイムアウト | **10 秒**。超過時は「PDFの生成に失敗しました。ページを再読み込みして再度お試しください。」を表示。 |
| エラー表示 | ボタン直下にインラインメッセージ。**5 秒間表示して自動で消える**。 |
| リトライ | ユーザーが再度ボタンを押すことで再試行可能（状態をリセット）。 |
| ログ | `console.error` にエラー詳細を出力（商談中のデバッグに使える）。Sentry / Cloudflare Pages ログ統合は §13.7 将来拡張。 |

**想定する失敗ケース**:
- html2canvas のメモリ不足（iPad Safari で `scale: 2` で大きな DOM を描画しようとして失敗）
- jsPDF のインスタンス生成失敗（極めて稀）
- ブラウザの `save()` / ダウンロード API ブロック（ポップアップブロッカー等）

### 8.4 `PdfDashboard` の動的マウント方針

- **採用**: PDF 生成時のみ `<PdfDashboard />` をレンダリング（動的マウント）。
- **理由**:
  - 常時マウントだとダッシュボード表示時に `PdfDashboard` 分の DOM ノードも常に存在し、React の再レンダリングコストが倍になる。
  - A4 比率の隠し DOM は高さ 842pt（約 297mm）あり、描画コストが小さくない。
  - 動的マウントなら `next/dynamic` による遅延ロードで jsPDF・html2canvas の初期ロードも回避可能（§10）。
- **実装**: `useState` で `isGeneratingPdf` を持ち、`true` の間のみ `<PdfDashboard />` をレンダリング。html2canvas 完了後に `false` に戻してアンマウント。

### 8.5 プレビュー機能の不在

- 本書では「ボタン押下 → 即ダウンロード」のワンクリックフロー（§8.1）を確定する。ダウンロード前にプレビュー表示する UX は **採用しない**。
- **理由**:
  - 商談テンポ優先（§2 原則 6 / [`result-dashboard.md §2`](./result-dashboard.md)）。ワンクリックで即 PDF が得られる方が商談現場で使いやすい。
  - プレビュー表示には追加の UI 実装（モーダル等）が必要で、Issue #5 スコープが膨らむ。
- 将来プレビュー機能を追加したい要望が出た場合は §13 将来拡張として追記可能。

---

## 9. PDF 固有の微調整

### 9.1 Issue #3 / #4 で確定済みの再掲（本書では改定なし）

本書はこれらを **継承**するのみで、新規変更はしない。

- `useCountUp` の `animated={false}` 強制（[`result-dashboard.md §10.2`](./result-dashboard.md)）。PDF では数値カウンターは即時最終値を表示。
- Recharts の `isAnimationActive` を `!animated` に連動（§3.3 で本書が接続契約を明示）。
- 警告バナーのフェードイン無効化（[`warning-copy.md §6.4`](./warning-copy.md)）。`animated={false}` により自動無効。
- `prefers-reduced-motion` は PDF 版では無視（OS 設定に関わらず `animated={false}` を強制、[`result-dashboard.md §11 R10`](./result-dashboard.md)）。

### 9.2 本書で新たに確定する微調整

| 項目 | 画面版 | PDF 版 | 根拠 |
|---|---|---|---|
| ヒーロー数値フォントサイズ | `clamp(2.5rem, 6vw, 4rem)`（[`result-dashboard.md §7.2`](./result-dashboard.md)） | **36pt**（桁爆発時 28pt） | A4 固定サイズに合わせる。桁爆発時は `formatManYenCompact` との組み合わせで縮小。 |
| 指標カード数 | 2 枚（止血 + 年間/3 年の二段表記） | **3 枚並列**（止血 / 年間 / 3 年） | §5.5 の合理性議論による。 |
| 警告バナー高さ | 64〜96px | **15mm** | A4 密度優先。 |
| セクション間余白 | `space-y-6`（24px） | **4mm** | A4 密度優先。 |
| 凡例のツールチップ | タップでツールチップ表示（[`result-dashboard.md §4.3`](./result-dashboard.md)） | **静止画像のため無効**。凡例の金額ラベルを**常時表示**に切替（Recharts `Legend` / `LabelList` で静的描画）。 | PDF は操作不可。 |

---

## 10. 依存ライブラリ方針（Issue #8 申し送り）

### 10.1 jsPDF

| 項目 | 値 |
|---|---|
| 採用バージョン帯 | **v2 系**（`^2.5.x`） |
| TypeScript 型定義 | **公式同梱**（`@types/jspdf` は不要） |
| ロード戦略 | `next/dynamic` / dynamic import（PDF 生成時のみロード） |

- v3 系は破壊的変更を含むため、v2 の安定版を採用。
- `src/lib/pdf.ts` 内で `await import('jspdf')` により動的ロード。ボタン押下時点で初めてロードされ、初回 LCP に影響しない。

### 10.2 html2canvas

| 項目 | 値 |
|---|---|
| 採用バージョン帯 | **v1 系**（`^1.4.x`） |
| TypeScript 型定義 | 公式同梱 |
| ロード戦略 | jsPDF と同じタイミングで dynamic import |

- `src/lib/pdf.ts` 内で `await import('html2canvas')` により動的ロード。

### 10.3 フォントアセット

- Noto Sans JP subset（Regular + Bold）を `public/fonts/` に配置（§4.1）。
- Inter（Regular + Bold）も同様に `public/fonts/` に配置。
- ライブラリ依存ではなく静的アセット。Issue #8 の `package.json` 追加とは独立した作業。

### 10.4 バンドルサイズ試算と LCP 影響

| 項目 | サイズ | LCP 影響 |
|---|---|---|
| jsPDF v2 系（min+gzip） | 約 **340KB** | 遅延ロード済み、影響なし |
| html2canvas v1 系（min+gzip） | 約 **45KB** | 遅延ロード済み、影響なし |
| Noto Sans JP subset Regular + Bold（woff2） | 約 **800KB** | `next/font/local` + `font-display: swap` で非ブロッキング |
| Inter Regular + Bold（woff2） | 約 **80KB** | 同上 |

**結論**: jsPDF + html2canvas は遅延ロードにより初回 LCP に一切影響しない。Noto Sans JP subset は `font-display: swap` によりブロックを回避。**マスター設計書 §1.4 の LCP 1 秒目標は維持可能**。

---

## 11. 実装契約

### 11.1 `PdfDashboard` の responsibilities と props 型

```ts
// src/components/PdfDashboard.tsx (Issue #6 以降で実装)

interface PdfDashboardProps {
  result: CalculationResult;          // calculation-logic.md §5
  insourcingLevel: InsourcingLevel;   // 内製化注記と警告バナー判定のため
  inputs: Inputs;                     // 入力サマリー表示のため（calculation-logic.md §5）
  generatedAt: Date;                  // 生成日時（ヘッダー右端に表示）
}
```

- `PdfDashboard` は A4 比率（210 × 297mm）の隠し DOM を描画する（[`result-dashboard.md §10.2`](./result-dashboard.md) の既定を継承）。
- 内部で `DashboardView` を呼び出し、周囲に PDF 専用のヘッダー・フッター・入力サマリー・免責・カテゴリ訴求を配置する。

```tsx
// PdfDashboard 内部の JSX (抜粋、契約のみ明示)
<div className="pdf-a4-wrapper">
  <PdfHeader generatedAt={generatedAt} />
  <DashboardView
    result={result}
    insourcingLevel={insourcingLevel}
    animated={false}                          // PDF は必ず false
    showWarningBanner={result.speedWarning && insourcingLevel !== 1}
    warningMessage={
      result.speedWarning && insourcingLevel !== 1
        ? buildWarningMessage(result.speedWarningMonthlyLoss)
        : undefined
    }
  />
  <PdfCategoryMessage /* {{CATEGORY_MESSAGE}} プレースホルダ */ />
  <PdfInputSummary inputs={inputs} />
  <PdfDisclaimer />
  <PdfFooter />
</div>
```

> `DashboardView` の props 型は [`result-dashboard.md §10.3`](./result-dashboard.md) から変更なし。`PdfDashboard` は独自に `inputs` を受け取り、入力サマリー（画面版ダッシュボードには存在しない）だけを PDF 側で追加する。

### 11.2 `src/lib/pdf.ts`（PDF 生成ユーティリティ）

```ts
// src/lib/pdf.ts (Issue #6 以降で実装)

export interface GeneratePdfOptions {
  element: HTMLElement;          // PdfDashboard がマウントされた隠し DOM のルート要素
  filename: string;              // buildPdfFilename() の戻り値
}

export async function generatePdf(options: GeneratePdfOptions): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(options.element, {
    scale: 2,
    useCORS: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
  pdf.save(options.filename);
}
```

### 11.3 `src/lib/pdfFilename.ts`（ファイル名生成）

```ts
// src/lib/pdfFilename.ts (Issue #6 以降で実装)

/** §7.1 採用: matatabi-roi-YYYYMMDD-HHmm.pdf（JST 固定、分単位） */
export function buildPdfFilename(now: Date = new Date()): string {
  const jst = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => jst.find((p) => p.type === type)?.value ?? "";
  const ymd = `${get("year")}${get("month")}${get("day")}`;
  const hm = `${get("hour")}${get("minute")}`;
  return `matatabi-roi-${ymd}-${hm}.pdf`;
}
```

### 11.4 `ResultDashboard` 側の導線

`ResultDashboard`（[`result-dashboard.md §10.2`](./result-dashboard.md) のコンテナ）が `isGeneratingPdf` 状態を持ち、ボタン押下で以下を実行する:

1. `isGeneratingPdf = true` に設定（`<PdfDashboard />` がレンダリングされる）。
2. `requestAnimationFrame` 2 回分待機（DOM レイアウト確定 + フォント解決）。
3. 隠し DOM の `ref` を取得し `generatePdf({ element: ref.current, filename: buildPdfFilename() })` を呼ぶ。
4. 成功／失敗を UI に反映（§8.3）。
5. `isGeneratingPdf = false` に設定（`<PdfDashboard />` アンマウント）。

この一連のフローは Issue #6 実装範囲。本書では **接続の契約**のみを確定する。

### 11.5 `DashboardView` との接続契約

- `DashboardView` の props 型は [`result-dashboard.md §10.3`](./result-dashboard.md) のまま改定しない。
- `PdfDashboard` は `DashboardView` に `animated={false}` と警告バナー表示フラグを渡す（§11.1）。
- `DashboardView` 内部の Recharts は `isAnimationActive={!animated}` で連動（§3.3）。`useCountUp` は `animated={false}` で即時最終値。
- `PdfDashboard` の `inputs` は **`DashboardView` には渡さない**（`DashboardView` の props に `inputs` は含まれない）。PDF 専用ラッパ（`PdfInputSummary`）が `inputs` を直接消費する。

---

## 12. 表示例

### 12.1 警告発動時（例: 更新待ち 9 ヶ月 / 月額 120 万円機会損失）

- ヘッダー: `ROI診断結果レポート` / `生成日時 2026-04-23 15:30`
- 警告バナー: `CRITICAL OPPORTUNITY LOSS` / `現在、月額 120 万円相当の機会損失が発生中`
- ヒーロー: `3年間のトータルインパクト` / `◯,◯◯◯ 万円` / `※ 試算上の最大値`
- 指標カード 3 枚 + グラフ + カテゴリ訴求 + 入力サマリー + 免責 + フッター

### 12.2 警告非発動時（例: 更新待ち 1 ヶ月）

- ヘッダー: 同上
- 警告バナー非表示 → 表紙訴求を 15mm 上に繰り上げ
- 以降の構成は §12.1 と同じ

### 12.3 完全内製顧客（`insourcingLevel === 1`）

- ヘッダー: 同上
- 警告バナー非表示（§12.2 と同じレイアウト繰り上げ）
- 止血カード: `0 万円`（[`result-dashboard.md §3.3`](./result-dashboard.md)）
- カテゴリ訴求: 「維持フェーズ」プレースホルダ（`{{CATEGORY_MESSAGE}}`、Issue #1 将来拡張で文言確定）

---

## 13. 未解決事項 / 将来拡張

### 13.1 顧客名入力（将来 Issue）

- §6.3 で不採用とした顧客名入力（PDF 宛名「株式会社 ◯◯ 様」）は、要件が固まった時点で別 Issue 化する。
- 採用時の影響: Issue #2 の入力項目追加 / §4.3 の subset 文字セット拡張（JIS 第二水準の人名漢字）/ §7 ファイル名規則の再検討。

### 13.2 QR コード（将来 Issue）

- フッター右端に連絡先 URL の QR コードを配置する案。採用時は `qrcode` npm 追加が必要。連絡先 URL の確定（§13.5）が先行条件。

### 13.3 複数ページ化 / PDF/A 対応 / サーバサイド生成

- **複数ページ化**: ページ番号を `1 / 1` で固定している（§6.2）が、将来「明細 2 ページ目」等を追加したい要件が出た際は `N / M` 対応に拡張する。
- **PDF/A 対応**: 長期保管要件（法務・監査）が出た場合、PDF/A-1b 準拠が必要。html2canvas 主体では制約あり（画像化された PDF は PDF/A 化が容易）。
- **サーバサイド生成**: Cloudflare Workers / Puppeteer 等でサーバサイド生成する案。ブラウザの canvas メモリ制約（§R2）を回避できるが、Cloudflare Pages Functions の実行時間制限（30 秒）との兼ね合い要検討。

### 13.4 `scale: 1.5` への降格余地

- 現状 `scale: 2` 固定（§3.2）だが、実機試験（iPad Safari）で頻繁に失敗・速度不足が観測された場合は `scale: 1.5` への降格を受け入れる。
- 降格判断のトリガ: Issue #6 実装時の iPad 実機計測で生成成功率 < 95% または生成時間 > 10 秒が頻発。

### 13.5 連絡先・ロゴ SVG の未確定

- 連絡先（メール・電話番号・URL）は `src/lib/pdfConstants.ts`（仮称）の定数として Issue #6 実装時に差し替え可能な形で記述。実値は別途確定。
- ロゴ SVG は暫定テキスト `またたび計算機`（Inter Bold 14pt）で代替。正式ロゴは別 Issue（仮: ブランドアセット制作）で対応。
- 日本語ファイル名対応（§7.3）を将来採用する場合の実装メモ: `encodeURIComponent` / `decodeURIComponent` を挟む等、jsPDF の `save(filename)` 互換性対応が必要。

### 13.6 カテゴリ別訴求テキストの最終文言

- §5.2 要素 7、§5.4 ASCII ワイヤー、§11.1 JSX では `{{CATEGORY_MESSAGE}}` プレースホルダとして記述。
- [`calculation-logic.md §4.4`](./calculation-logic.md) のカテゴリ（「削減余地大」「更なる効率化の提案」「維持フェーズ」）ごとの最終文言は Issue #1 将来拡張で確定し、本書のプレースホルダを差し替える。
- 完全内製顧客でのレイアウト空白感を避けるため、「維持フェーズ」文言は他カテゴリより長めに設定する運用を Issue #1 将来拡張に申し送り。

### 13.7 Sentry / Cloudflare Pages ログ統合

- §8.3 で PDF 生成失敗時は `console.error` のみ。商談中のデバッグには十分だが、本番運用で失敗率を計測する場合は Sentry / Cloudflare Pages ログ統合が必要。

### 13.8 オフライン商談運用メモ

- §2 原則 1 / §4.1 でオフライン商談耐性を確保したが、**初回アクセス時にフォントファイル（`next/font/local`）のダウンロードが完了している必要がある**。
- 運用前提: 商談直前のネット接続で初回アクセスを済ませてから、オフライン会議室に移動する。
- Issue #6 実装時に README / 運用ドキュメント（仮: `docs/operation.md`）に記載する。

### 13.9 PDF アクセシビリティ（タグ付き PDF / PDF/UA）

- html2canvas 主体（§3.1）のため、PDF 内テキストが画像化されスクリーンリーダー読み上げ不可、テキスト検索不可。
- アクセシビリティ要件は画面版（[`result-dashboard.md §6.3`](./result-dashboard.md) で `prefers-reduced-motion` 対応済み）に集約する。
- タグ付き PDF / PDF/UA 対応は将来拡張。採用時は §3 の生成アプローチ再設計（直接描画主体への移行）が必要。

### 13.10 プレビュー機能

- §8.5 で本書では不採用。将来プレビュー表示の要望が出た場合は、モーダル内にレンダリングした `PdfDashboard` をダウンロード前に確認できる UX を追加。

---

## 14. 決定項目チェックリスト

Issue #5 のクローズ要件。**以下すべてに結論が本書内に記述されていること**。

### 生成アプローチ
- [x] html2canvas 主体を採用（§3.1）
- [x] 直接描画案・ハイブリッド案の不採用理由明記（§3.4）
- [x] `scale: 2` に決定（§3.2）
- [x] 画像フォーマット PNG に決定（§3.2）
- [x] Recharts アニメーション無効化の接続契約（`isAnimationActive={!animated}`）を明示（§3.3）

### 日本語フォント埋め込み
- [x] `next/font/local` で Noto Sans JP subset 配置を採用（§4.1）
- [x] `next/font/google` / jsPDF `addFont` の不採用理由明記（§4.5）
- [x] subset 化の文字セット方針（ASCII + ひらがな + カタカナ + JIS 第一水準漢字）確定（§4.2）
- [x] 使用文字の既知集合を明示（§4.3）
- [x] Inter（英字見出し）併用を採用（§4.4）
- [x] `font-family` カスケード指定を明示（§4.1, §4.4）
- [x] 目標バンドルサイズ（合計 < 1MB）を明示（§10.4）

### A4 レイアウト
- [x] 上下分割・1 枚構成を採用（§5.1）
- [x] 載せる要素の棚卸し完了（§5.2）
- [x] マージン 15mm / セクション間余白 4mm を確定（§5.3）
- [x] ヒーロー数値フォントサイズ 36pt（桁爆発時 28pt）を確定（§5.3）
- [x] 指標カード数（PDF 3 枚並列）と画面版との差分の合理性明記（§5.5）
- [x] 警告バナー高さ 15mm・見出し 12pt・サブ 10pt を確定（§5.3）
- [x] 警告非発動時のレイアウト繰り上げ方針確定（§5.4, §5.6）
- [x] 完全内製顧客でのレイアウト破綻防止（§5.6）

### ヘッダー / フッター / ロゴ
- [x] ヘッダー構成（ロゴ左・タイトル中央・生成日時右）確定（§6.1）
- [x] フッター構成（会社名・連絡先・ページ番号）確定（§6.2）
- [x] ページ番号を `1 / 1` 固定で採用（§6.2）
- [x] 顧客名入力を不採用（§6.3）
- [x] ロゴ SVG は Issue #5 スコープ外、暫定テキスト運用（§6.4）
- [x] 連絡先は運用で差し替え可能な定数（§6.2）
- [x] 生成日時はヘッダー右端に掲出、JST 固定（§6.1, §7.2）

### ファイル名命名規則
- [x] `matatabi-roi-<YYYYMMDD>-<HHmm>.pdf` を採用（§7.1）
- [x] タイムスタンプ粒度は分単位（§7.2）
- [x] 日本語ファイル名・顧客名入り・UUID 案の不採用理由明記（§7.3）

### ダウンロード導線
- [x] 生成フロー確定（§8.1）
- [x] ローディング表示（スピナー + 「PDF生成中...」）確定（§8.2）
- [x] タイムアウト 10 秒を確定（§8.3）
- [x] エラーハンドリング（インラインメッセージ、5 秒自動クローズ、リトライ可）確定（§8.3）
- [x] `PdfDashboard` は動的マウント（生成時のみ）を採用（§8.4）
- [x] プレビュー機能不採用（§8.5）

### PDF 固有の微調整
- [x] `animated={false}` 強制（既存継承、§9.1）
- [x] `isAnimationActive={!animated}` 接続契約明示（§3.3, §9.1）
- [x] `prefers-reduced-motion` 無視（既存継承、§9.1）
- [x] 凡例を常時表示に切替（§9.2）
- [x] 警告バナーのフェードイン無効化（既存継承、§9.1）

### 依存ライブラリ方針（Issue #8 申し送り）
- [x] jsPDF v2 系（`^2.5.x`）を採用（§10.1）
- [x] html2canvas v1 系（`^1.4.x`）を採用（§10.2）
- [x] TypeScript 型定義は公式同梱（`@types/jspdf` 不要）（§10.1, §10.2）
- [x] 遅延ロード方針（`next/dynamic` / dynamic import）確定（§10.1, §10.2）
- [x] フォントアセットは `public/fonts/` に配置（§10.3）
- [x] バンドルサイズ試算と LCP 影響明記（§10.4）

### 実装契約
- [x] `PdfDashboardProps` 型（`result` / `insourcingLevel` / `inputs` / `generatedAt`）確定（§11.1）
- [x] `src/lib/pdf.ts` の API 設計（`generatePdf({ element, filename })`）確定（§11.2）
- [x] `src/lib/pdfFilename.ts` の API 設計（`buildPdfFilename(now?)`）確定（§11.3）
- [x] `ResultDashboard` 側の導線（`isGeneratingPdf` 状態 + 動的マウント）確定（§11.4）
- [x] `DashboardView` との接続（Issue #3 §10.3 の型を改定せずそのまま使う）確定（§11.5）

### ドキュメント
- [x] 仕様書の保存先: `docs/spec/pdf-report.md`
- [x] マスター設計書 §1.3 / §2.2 / §3.2 / §3.3 からの参照関係明記（本書ヘッダ）
- [x] `calculation-logic.md` / `input-form.md` / `result-dashboard.md` / `warning-copy.md` との整合確認（§1.2）
- [ ] [フォローアップ] `result-dashboard.md §10.4` / §11 R2・R10 への参照追記
- [ ] [フォローアップ] `warning-copy.md §8.3` への参照追記
- [ ] [フォローアップ] `calculation-logic.md §10` 関連 Issue テーブル Issue #5 行への参照追記
- [ ] [フォローアップ] `input-form.md §3.3` への 1 行追記（PDF 入力サマリーへの参照）
- [ ] [フォローアップ] マスター設計書 §1.3 / §2.2 / §3.2 への 1 行参照追記
- [ ] [フォローアップ] Issue #6・#8 の説明欄に「PDF 仕様は `docs/spec/pdf-report.md` を参照」と追記

---

## 15. 関連 Issue / 後続作業

### 15.1 本 Issue の成果物
- `docs/spec/pdf-report.md`（本書）

### 15.2 本書を入力として実施される後続 Issue
- **Issue #6（Next.js 雛形）**: `src/components/PdfDashboard.tsx` の実装、`DashboardView` の `isAnimationActive={!animated}` 連動、`ResultDashboard` の PDF ボタン導線、`public/fonts/` のフォント配置。
- **Issue #8（依存ライブラリ追加）**: `jspdf@^2.5.x` / `html2canvas@^1.4.x` を `package.json` に追加。型定義は公式同梱のため追加不要。
- **別 Issue（ブランドアセット制作）**: 正式ロゴ SVG の制作と配置（§6.4 / §13.5）。
- **Issue #1 将来拡張**: カテゴリ別訴求テキストの最終文言確定（§13.6）。

### 15.3 本書と前提 Issue の関係（再掲）
- Issue #1（`calculation-logic.md`）: `CalculationResult` / `Inputs` / 丸めルール / 表紙訴求指標の提供元。
- Issue #2（`input-form.md`）: 入力項目定義と入力サマリー表示対象の提供元。
- Issue #3（`result-dashboard.md`）: `DashboardView` / `PdfDashboard` 責務分離、指標カード・グラフ UI 骨格の提供元。§10.4 の申し送り（A4 内部レイアウト・フォント埋め込み・html2canvas 詳細）を本書で吸収。
- Issue #4（`warning-copy.md`）: 警告バナー確定文言と `buildWarningMessage` テンプレート関数、発動条件の提供元。§8.3 の申し送り（A4 比率でのバナー高さ・フォントサイズ調整、生成日時注記の要否）を本書で吸収。

### 15.4 実機検証項目（Issue #6 実装時）
- iPad Safari で `scale: 2` による PDF 生成の成功率（§13.4 の降格判断トリガ）。
- Noto Sans JP subset に使用文字（§4.3 既知集合）がすべて含まれているかの豆腐テスト。
- オフライン環境（機内モード）で PDF 生成が成功するかの耐性テスト。
- 生成時間の実機計測（タイムアウト 10 秒の妥当性確認、§8.3）。
