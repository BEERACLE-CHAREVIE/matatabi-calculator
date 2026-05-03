# Issue #5 実装プラン — PDFレポートのレイアウトと日本語フォント方針を確定する

## 0. このプランの性格

本プランは **実装コードを書くための設計書ではなく、「意思決定ドキュメント（spec）」を完成させるためのプラン** である。成果物は Markdown 1 ファイル（`docs/spec/pdf-report.md`）、コード変更はゼロ。Issue #1（計算ロジック前提値）・Issue #2(入力フォーム UI)・Issue #3（診断結果ダッシュボード）・Issue #4（警告コピー）の確定結果を前提に、マスター設計書 §2.2 で規定済みの **jsPDF ＋ html2canvas** 組み合わせを用いて生成する **A4 1 枚の PDF レポート**について、レイアウト配置・日本語フォント埋め込み方針・生成アプローチ（html2canvas 主体か直接描画か）・ファイル名命名規則・ダウンロード導線の挙動を確定する。

実装ファイル（`src/components/PdfDashboard.tsx`、`src/lib/pdf.ts`、`src/lib/pdfFilename.ts`、jsPDF / html2canvas の依存追加等）は本 Issue のスコープ外。本仕様書を Issue #6（Next.js 雛形）・Issue #8（依存ライブラリ追加）以降で参照して実装する。また Issue #3 §10.2 で確定済みの `PdfDashboard` レイヤ（隠し DOM、A4 比率固定、`animated={false}` 強制）の **責務分離は本書で改定しない**。本書は「`PdfDashboard` 配下の A4 内部レイアウト」と「PDF 出力のための副次処理（フォント・ファイル名・ダウンロードフロー）」を担当する。

---

## 1. 概要

### 1.1 何を決めるか

- **生成アプローチ**: html2canvas で隠し DOM をラスタライズし jsPDF に貼る方式（画像貼付方式）／jsPDF API でテキスト・矩形を直接描画する方式／両者のハイブリッドのどれを採るか。
- **A4 1 枚の配置**: 表紙訴求（3 年トータルインパクト）・指標カード（3 年止血／年間創出／3 年創出）・積み上げ横棒グラフ・入力サマリー・警告バナー・カテゴリ別訴求・ヘッダー／フッターをどう A4（210×297mm）に詰めるか。
- **ヘッダー／フッター／ロゴ**: ロゴの配置位置、生成日時の掲出、会社名・免責・連絡先の扱い、ページ番号の要否。
- **日本語フォント埋め込み方針**: html2canvas 主体なら DOM 側フォントのラスタライズで済ませ jsPDF 側のフォント埋め込みは不要／直接描画主体なら Noto Sans JP 等を Base64 で `addFont` 登録する必要あり。どちらを採るか。Issue #3 §10.4「外部 CSS 依存は作らない」方針と、オフライン商談（電波なし）でも動くか、という制約との整合を取る。
- **ファイル名の命名規則**: 英数字のみ／日本語あり／顧客名あり／タイムスタンプ粒度の方針。
- **ダウンロード導線**: ボタン配置（Issue #3 §3.4 の CTA に既に置かれている）の挙動、生成中のローディング表示、失敗時のエラーハンドリング。
- **PDF 専用の微調整**: Recharts の `isAnimationActive={false}`、`useCountUp` の `animated={false}` 強制（Issue #3 §10.2 済み）、警告バナーのフェードイン無効化（Issue #4 §8.3 済み）、生成日時注記（Issue #4 §8.3 申し送り）。
- **依存ライブラリの方針**: jsPDF・html2canvas の推奨バージョン帯と型定義（`@types/jspdf` 等）の要否、`next/dynamic` での遅延ロード方針を Issue #8 への申し送り形で確定。
- **`PdfDashboard` と `DashboardView` の接続契約**: Issue #3 §10.2 / §10.3 の責務分離（`DashboardView` は props ベースの純描画層／`PdfDashboard` は A4 ラッパ）を本書でも保持したまま、PDF 固有 props（生成日時、顧客名等）をどう渡すか。

### 1.2 なぜ重要か（下流への影響）

- **成果物の品質が商談の印象を決める**: PDF は商談後に経営者が社内で回覧する **持ち帰り資料**。画質・フォント崩れ・レイアウト崩れは、アプリそのものの信頼感を毀損する。本書で「画質・フォント・レイアウトの破綻しない形」を仕様レベルで確定する。
- **Issue #3 §10.4 の宙吊りを解消する**: Issue #3 は PDF スナップショット戦略（`PdfDashboard` 別立て、A4 比率固定、`animated={false}` 強制）の **枠組みだけ**を確定し、「A4 内部レイアウト」「フォント埋め込み」「html2canvas 詳細」を Issue #5 へ明示的に申し送っている（§10.4 / §11 R2）。本 Issue 完了で初めて `PdfDashboard` の中身が確定する。
- **Issue #4 §8.3 の申し送りを吸収する**: PDF 内での警告バナー高さ・フォントサイズ調整、生成日時注記の要否は Issue #4 から本 Issue に申し送られている。
- **Issue #8（依存ライブラリ追加）の入力を確定する**: jsPDF・html2canvas・日本語フォントファイル（採用する場合）のバージョン指針と遅延ロード方針は、本 Issue で方針確定後に Issue #8 が `package.json` に反映する依存関係。
- **非機能要件との整合**: マスター設計書 §1.4 の「1 秒以内の LCP」と jsPDF・html2canvas・Noto Sans JP フォントファイル（最大で 2〜3MB 級）のバンドルサイズは正面衝突する。遅延ロード前提を仕様に埋め込まないと非機能要件が壊れる。
- **オフライン商談耐性**: 商談現場は客先会議室（電波が弱いこともある）。PDF 生成が CDN からのフォント読み込みに依存すると、現場で生成失敗する。本 Issue でオフライン耐性を仕様レベルで担保する。
- **ブラウザ互換性**: Safari / iPad での html2canvas 描画には canvas メモリ制約（大きな DOM を描画すると `canvas.toDataURL` が失敗しうる）。タブレット商談が最優先（Issue #3 §7）である以上、iPad Safari での成功率を仕様で保証する必要がある。

---

## 2. 意思決定ステップ（順序付き）

各ステップは生成アプローチ（Step 1）→ フォント方針（Step 2）→ A4 レイアウト（Step 3）→ ヘッダー／フッター（Step 4）→ ファイル名（Step 5）→ ダウンロード導線（Step 6）→ PDF 固有の微調整（Step 7）→ 依存ライブラリ方針（Step 8）→ 実装契約（Step 9）の順に依存する。上から順に確定させる。

---

### Step 1. 生成アプローチ（html2canvas 主体 / 直接描画 / ハイブリッド）を決める

マスター設計書 §2.2 で「jsPDF ＋ html2canvas」と両ライブラリが規定されているが、**どちらを主役にするか**は本 Issue スコープ。Issue #3 §10.1〜§10.2 で `PdfDashboard` の存在（A4 比率の隠し DOM）は確定済みのため、DOM を作ること自体は前提。問題は「そこを html2canvas で画像化するのか、それとも DOM はテキスト抽出目的に留めて jsPDF API で再描画するのか」。

#### 選択肢A: html2canvas 主体（推奨）

- `PdfDashboard` が描画する A4 比率の隠し DOM を `html2canvas` で PNG にラスタライズ → jsPDF の `addImage` で A4 にそのまま貼り付け → `save()` でダウンロード。
- jsPDF は「画像と枠線を貼る台紙」として使う。テキストは画像化済みなので jsPDF のフォント埋め込みは不要。
- **Pros**:
  - Issue #3 §10.2 で確定した `DashboardView` / `PdfDashboard` の責務分離を**そのまま活かせる**。画面側のレイアウト資産（Tailwind クラス、Recharts SVG、Lucide アイコン）が DOM にそのまま反映され、同じ資産で PDF が作れる。
  - 日本語フォントが DOM 側の `next/font` ローカル埋め込みフォントで描画されるため、jsPDF 側で Noto Sans JP を Base64 で登録する手間が不要（Step 2 選択肢 X と整合）。**バンドルサイズが 1〜3MB 増えずに済む**。
  - Recharts が SVG ベース（Issue #3 §5.1）であるため、html2canvas が SVG を直接ラスタライズでき、二重ラスタライズ（Chart.js のような Canvas → Canvas の劣化）が発生しない。
  - 画面の見た目と PDF の見た目が **同一**になる。商談で「画面と同じものが PDF で出ます」と即説明できる。
  - 実装コードが最小（DOM を作る React コンポーネント + 10〜20 行の生成フック）。
- **Cons**:
  - **PNG はラスタ画像**のため、PDF を 200% 以上に拡大印刷するとエッジがぼやける。`html2canvas` の `scale` オプションで `2x` / `3x` に引き上げる対処で実用上は解決するが、画像サイズが大きくなり jsPDF 出力ファイルが 2〜5MB に膨れうる。
  - 経営者が PDF 内のテキストをコピー／検索できない（画像なので）。ただし本件は「ROI 試算レポート」で検索需要は低く、CON としての重みは小さい。
  - html2canvas は SVG の一部 CSS（`filter`、`mask`、一部の `transform`）で描画崩れを起こしうる。Recharts の標準描画で使う CSS 範囲は安全（Issue #3 §5.1 で確認済み）だが、将来 Recharts カスタマイズを深めると罠を踏みうる。
  - Safari / iPad の canvas メモリ制約（後述 §4 R8）で、解像度を上げすぎると失敗する。`scale: 2` を上限に安全側で運用。

#### 選択肢B: jsPDF 直接描画主体

- jsPDF API（`text()` / `rect()` / `line()` / `setFontSize()` 等）で A4 上にテキスト・矩形・線を直接描画。DOM や html2canvas は使わない（Recharts のグラフも自前で数値から棒を描画する）。
- **Pros**:
  - PDF 内テキストが **ベクターで保持**され、コピー／検索可能。印刷時の解像度劣化なし。
  - 出力ファイルサイズが最小（数百 KB 以下）。
- **Cons**:
  - 日本語フォントを jsPDF に **別途 `addFont` で Base64 登録する必要**がある。Noto Sans JP の subset でも 1〜3MB のバンドル増（Step 2 選択肢 Y）。**マスター設計書 §1.4 の「1 秒以内 LCP」目標と正面衝突**する。
  - Recharts の SVG 資産を捨てることになり、グラフを自前で再描画する実装コストが重い。Issue #3 §10.2 で確定した「`DashboardView` の props 互換を保ち、画面側の変更で PDF が壊れないことを保証する」という設計思想も壊れる（画面とグラフを別実装するため）。
  - 画面と PDF の見た目が乖離しやすく、経営者が「同じ結果なのに違って見える」違和感を持ちうる。
  - Tailwind / shadcn 系の視覚資産（カード・余白・アイコン）を PDF に持ち込めない。ブランドトーン（Issue #3 §3.4 のデザイン）が PDF で再現できない。
- **不採用理由**: バンドルサイズ増と実装コスト増、資産の二重化が致命的。

#### 選択肢C: ハイブリッド（html2canvas + jsPDF 直接描画の併用）

- グラフ・警告バナー・指標カード等の「視覚要素」は html2canvas で画像化し貼り付け、ヘッダー・フッター・ファイル名・免責文言等の「定型テキスト」は jsPDF の `text()` で直接描画。
- **Pros**:
  - ヘッダー・フッターのテキストだけはベクターで保持でき、軽微な修正（日付差替え等）が容易。
  - 定型テキストなら jsPDF に必要な文字のみ subset フォントを埋め込めばよい（フルセット Noto Sans JP ではなく、「生成日時」「株式会社」「ねこにまたたび」等の限定文字セット）。
- **Cons**:
  - jsPDF 側にもフォント埋め込みが必要になり、選択肢 A のメリット（フォント埋め込み不要）を半分失う。
  - 実装が最も複雑（2 系統の描画コードが並走）。
  - 画面と PDF の見た目が「微妙にズレる」リスクが最大（ヘッダー・フッターの微妙な位置ズレ、フォント差異）。
- **不採用理由**: 複雑度が選択肢 A を大きく上回る一方、メリット（定型テキストのベクター化）は商談用 PDF では価値が小さい。

**推奨**: **選択肢A（html2canvas 主体）**。Issue #3 §10.2 の責務分離と SVG ベース Recharts の選定が、選択肢 A のメリットを最大化する設計になっている。ヘッダー・フッターも DOM 側で一緒に描画して `html2canvas` で一括ラスタライズすれば、画面との一貫性と実装コストの最小化が両立する。

#### 論点1-1. `html2canvas` の `scale` オプション（解像度）の決定

- `scale: 1`（等倍）: ファイルサイズ小、画質低（200% 拡大で文字がぼやける）
- `scale: 2`（2 倍、推奨）: ファイルサイズ中（画像約 1〜2MB、PDF 合計 2〜3MB）、画質十分（300% 拡大まで耐える）
- `scale: 3`（3 倍）: ファイルサイズ大（PDF 5MB 超）、iPad Safari でメモリ制約に触れるリスク
- **推奨**: `scale: 2` を既定とし、将来「ファイルサイズを減らしたい」という声が出たら `scale: 1.5` への降格を検討する余地を §11 将来拡張に残す。

#### 論点1-2. html2canvas の画像フォーマット

- `image/png`: 可逆圧縮。文字・図形のエッジがシャープ。ファイルサイズ中。**推奨**。
- `image/jpeg`（quality 0.85〜0.95）: 非可逆圧縮。ファイルサイズ小だが、文字エッジに JPEG 特有のブロックノイズが出る。ROI レポートの「金額の数字」は可読性が最重要のため不適。
- **推奨**: PNG で固定。ファイルサイズ優先の将来要件が出た際に JPEG への切替を §11 へ。

#### 論点1-3. Recharts のアニメーション無効化

- html2canvas はスナップショットを撮るため、アニメーションの途中状態で撮ると棒グラフが「半分しか伸びていない」状態で PDF に焼き込まれる。
- `PdfDashboard` は `DashboardView` に `animated={false}` を渡す（Issue #3 §10.2 で確定済み）。Recharts は `isAnimationActive` prop を `DashboardView` 内部で `!animated` に連動させる必要がある。**本書でこの連動契約を明記**し、Issue #6 実装時に実装者が迷わないようにする。

---

### Step 2. 日本語フォント埋め込み方針を決める

Step 1 で html2canvas 主体を採るため、フォント埋め込みは「DOM 側（`PdfDashboard` 配下のコンポーネントで使うフォント）」のみで完結する。本 Step ではそのフォントソースを決める。

#### 選択肢X: `next/font/local` でローカル埋め込み（推奨）

- プロジェクト内（例: `public/fonts/NotoSansJP-Regular.woff2` / `NotoSansJP-Bold.woff2`）に Noto Sans JP の subset（日本語常用漢字 + ASCII）を配置し、`next/font/local` で読み込む。
- DOM 側で `font-family` が Noto Sans JP に解決され、html2canvas が DOM の見た目をそのままラスタライズする。
- **Pros**:
  - **外部 CSS 依存ゼロ**（Issue #3 §10.4 / §11 R2 の申し送りと完全整合）。
  - **オフライン商談でも確実に動く**（電波なし会議室でも PDF 生成が成功する）。
  - フォントファイルは Next.js のビルドで静的配信され、初回アクセス時に 1 回ダウンロードされればキャッシュに残る。
  - Inter（英字）と Noto Sans JP（日本語）を `next/font/local` で同時に扱えば、マスター設計書 §3.3 の「Inter または Noto Sans JP」ガイドラインに両対応できる。
- **Cons**:
  - フォントファイルのバンドルサイズが増える。Noto Sans JP フルセット（約 3.4MB）は重いため、**subset（日本語常用漢字 + ひらがな + カタカナ + 英数字）で 400〜800KB に抑える**運用が必要。
  - subset の文字セット漏れ（顧客名に珍しい漢字が含まれる等）で豆腐（□）になるリスク。ただし本アプリの PDF で使う文字は「CRITICAL OPPORTUNITY LOSS」「年間／3 年／万円／機会損失／発生中／累積中／削減余地／内製化／更新待ち」等、**営業語彙の既知集合**であり、subset 化しても豆腐リスクは極小（顧客名を入力項目化する場合のみ Step 4-3 で追加検討）。

#### 選択肢Y: `next/font/google` で Google Fonts から読み込み

- `next/font/google` から Noto Sans JP を読み込む（実態は Next.js がビルド時に Google からダウンロードしてローカルにバンドルする）。
- **Pros**:
  - 実装コード最小（`next/font/google` の 1 行 import）。
  - Next.js が自動で subset や `display: swap` を処理。
- **Cons**:
  - `next/font/google` は**ビルド時**には Google から fetch するため、ビルド環境（Cloudflare Pages の CI）が Google Fonts にアクセスできないと失敗する。Cloudflare Pages の標準 CI は外部ネットワーク可なので実用上は大きな問題にならないが、ビルド成功が外部サービスに依存する。
  - Next.js 14 以降の `next/font/google` は**ビルド時にフォントをローカルに取り込む**挙動のため、**ランタイムで Google Fonts CDN にアクセスしない**（オフライン商談耐性は選択肢 X と同等）。
- **本書としての位置付け**: 選択肢 X の下位互換。実装負荷はほぼ同じだが、ビルド時の外部依存があるため選択肢 X をやや優先する。

#### 選択肢Z: jsPDF に Base64 で直接埋め込み（`addFont`）

- jsPDF API に Noto Sans JP の TTF / OTF を Base64 化して `addFont` 登録。
- **Pros**: Step 1 で選択肢 B（直接描画）を採った場合の必須選択肢。
- **Cons**:
  - Base64 化により、フォントファイルのバンドルサイズが **約 1.37 倍に膨らむ**（Base64 のオーバーヘッド）。Noto Sans JP subset 500KB → Base64 文字列 700KB 級。
  - バンドル JS に埋め込まれるため、初回 LCP に直接影響（非同期ロード化しても PDF 生成時には必要）。
  - html2canvas 主体（Step 1 選択肢 A）ならそもそも不要。
- **本書としての位置付け**: Step 1 で選択肢 A を採用する限り不要。選択肢 B を将来採る場合のみ検討。

**推奨**: **選択肢X（`next/font/local` で Noto Sans JP subset を配置）**。Issue #3 §10.4「外部 CSS 依存は作らない」と完全整合し、オフライン商談耐性も確保できる。Inter（英字見出し）と Noto Sans JP（日本語）を同じ仕組みで扱える点もメリット。

#### 論点2-1. subset 化の方針

- 文字セット: ASCII（英数・記号）+ ひらがな + カタカナ + JIS 第一水準漢字（約 2,965 字）+ 必要な JIS 第二水準漢字の一部。
- ツール: `subset-font`（npm）や `fonttools` で生成。ビルド時 1 回生成し `public/fonts/` にコミット。
- **目標サイズ**: Noto Sans JP Regular + Bold の 2 ウェイトで合計 **800KB 以下**（woff2 圧縮後）。
- 顧客名入力項目（Step 4-3）を採用する場合のみ、JIS 第二水準漢字（人名用漢字含む）の subset を追加検討。

#### 論点2-2. 英字フォント（Inter）の扱い

- 見出し `CRITICAL OPPORTUNITY LOSS`（Issue #4 §3.2）は英字全大文字・`letter-spacing: 0.05〜0.08em`・`font-weight: 700`。Inter の特性に適合。
- **推奨**: Inter Regular + Bold を `next/font/local` で配置（ASCII + Latin-1 で 50〜100KB）。
- Noto Sans JP で英字を兼ねる選択肢もあるが、Inter の英字ディテール（見出しの印象）と両立したいため別 2 ウェイトを推奨。

#### 論点2-3. 数字の表示崩れ対策

- 「¥」「万円」等の記号は Noto Sans JP subset に含める。
- 数字（0〜9）は Inter で統一（商談の「金額の数字」が Inter の洗練された字形で出る方が経営者への印象が良い）。
- CSS では `font-family: 'Inter', 'Noto Sans JP', sans-serif` のカスケード指定で、英数は Inter・日本語は Noto Sans JP に自動で解決される。

---

### Step 3. A4 1 枚に載せる項目と配置を決める

A4 縦（210 × 297mm = 595 × 842pt @72dpi）に、Issue #1〜#4 で確定済みの情報を詰める。

#### 3-1. 載せる要素の棚卸し

| # | 要素 | 出典 | 必須度 |
|---|---|---|---|
| 1 | ヘッダー（ロゴ + サービス名 + 生成日時） | 本書 Step 4 | 必須 |
| 2 | 警告バナー（CRITICAL OPPORTUNITY LOSS、`speedWarning=true` のみ） | Issue #4 §3 | 条件付き必須 |
| 3 | 表紙訴求（3 年トータルインパクト、ヒーロー数値） | `calculation-logic.md §6.1` | 必須 |
| 4 | 指標カード（3 年止血・年間創出・3 年創出の並列） | Issue #3 §3.2 | 必須 |
| 5 | 積み上げ横棒グラフ（Blue 止血 + Amber 3 年創出） | Issue #3 §4.1 | 必須 |
| 6 | 内製化注記（「◯% 相当分を除外済み」） | Issue #3 §3.3 | 条件付き必須 |
| 7 | カテゴリ別訴求テキスト | `calculation-logic.md §4.4` | 推奨 |
| 8 | 入力サマリー（基本 5 項目 + 詳細設定が折り畳み開時） | Issue #2 §3.3 | 必須 |
| 9 | 免責注記（「試算上の最大値」「営業担当の補足前提」） | `calculation-logic.md §6.1` / 本書 | 必須 |
| 10 | フッター（会社名・連絡先・ページ番号） | 本書 Step 4 | 必須 |

#### 3-2. レイアウト選択肢

##### 選択肢A: ヒーロー大型・上下分割（推奨）

```
┌───────────────────────────────────────────────────┐
│ [ロゴ]  ROI診断結果レポート         生成日時 2026-04-23│ ← ヘッダー (30mm高)
├───────────────────────────────────────────────────┤
│ ⚠ CRITICAL OPPORTUNITY LOSS                        │
│    現在、月額 120 万円相当の機会損失が発生中          │ ← 警告バナー (15mm、条件付)
├───────────────────────────────────────────────────┤
│                                                     │
│         3年間のトータルインパクト                    │ ← 表紙訴求 (50mm)
│            ◯,◯◯◯ 万円                           │
│            ※ 試算上の最大値                        │
│                                                     │
├───────────────────────────────────────────────────┤
│  [3年間の止血]   [年間の利益創出]  [3年間の利益創出]│ ← 指標カード 3列 (40mm)
│   ◯◯◯ 万円      ◯◯ 万円         ◯◯◯ 万円      │
│   Blue 500       Amber 500         Amber 500       │
│   ※内製化 ◯% 除外                                 │
├───────────────────────────────────────────────────┤
│ [積み上げ横棒グラフ: Blue 止血 + Amber 3年創出]    │ ← グラフ (45mm)
├───────────────────────────────────────────────────┤
│ ◆ 診断カテゴリ                                      │
│   カテゴリ別訴求テキスト（§4.4 のカテゴリ別1〜2文）   │ ← カテゴリ訴求 (20mm)
├───────────────────────────────────────────────────┤
│ ◆ 入力値サマリー                                    │
│  月額ベンダー費用   ◯◯万円／月                     │
│  単発改修費用       ◯◯万円／回                     │ ← 入力サマリー (45mm)
│  手作業人数         ◯名                             │
│  更新待ち期間       ◯〜◯ヶ月                        │
│  内製化状況         ◯◯◯ (◯%)                       │
│  (詳細設定: 時給 ◯円 / ◯h/日 / ◯日/月)              │
├───────────────────────────────────────────────────┤
│ 本試算は入力値に基づく理論上の最大値であり、...       │ ← 免責 (10mm)
├───────────────────────────────────────────────────┤
│ 株式会社ねこにまたたび  contact@...  1 / 1          │ ← フッター (15mm)
└───────────────────────────────────────────────────┘
```

- **Pros**:
  - 視線誘導が「警告 → トータル → 内訳 → グラフ → 診断 → 入力 → 免責」の直線的な流れになり、経営者が上から順に読める。
  - 画面版ダッシュボード（Issue #3 §3.4）の ASCII ワイヤーと情報順序が一致し、画面 ↔ PDF のメンタルモデルが揃う。
  - 入力サマリーを下部に置くことで、表紙訴求を上部に確保できる（PDF の「最初の視線」は上端。そこに結論があるのが正解）。
- **Cons**:
  - 情報量が A4 1 枚いっぱい詰まる。各要素の余白を最小化しないと収まらない（後述 §3-3 のマージン設計）。

##### 選択肢B: 2 カラム分割（左: サマリー数字 / 右: 入力値とグラフ）

- A4 を中央で縦分割し、左半分にヒーロー＋指標カード、右半分に入力サマリー＋グラフを配置。
- **Pros**: 各要素の高さを半分にできるため、詰め込み感が緩和される。
- **Cons**:
  - 視線誘導が Z 字で複雑化し、「どこから読むか」が不明瞭。
  - 表紙訴求のヒーロー数値が半分のサイズになり、インパクトが弱まる。
  - 画面版ダッシュボード（縦 1 カラム）とのメンタルモデルが乖離する。
- **不採用理由**: PDF の本質は「商談後の回覧資料」であり、初見で結論が 1 秒で伝わる直線的な視線誘導が必須。

##### 選択肢C: 表紙 + 明細の 2 ページ構成（A4 2 枚）

- 1 ページ目は表紙訴求のみ（ヒーロー数値を大きく）。2 ページ目に指標カード・グラフ・入力サマリー・免責。
- **Pros**: 1 ページ目のインパクトが最大化される。
- **Cons**:
  - Issue #5 の規定は「A4 1 枚」（Issue 本文「A4 1 枚に載せる項目と配置」）。2 枚化は本 Issue のスコープ外。
  - 物理的な印刷コストが 2 倍、回覧時の取り回しも煩雑。
- **不採用理由**: スコープ外。

**推奨**: **選択肢A（上下分割、1 枚構成）**。Issue 本文の「A4 1 枚」要件と、画面版との一貫性、直線的な視線誘導を全て満たす。

#### 3-3. マージン・余白設計

- **ページマージン**: 上 15mm / 下 15mm / 左 15mm / 右 15mm（描画領域 180 × 267mm）。
- **セクション間余白**: 各要素の間を **4mm** で統一。
- **要素内余白（カード padding）**: 指標カードは縦 8mm / 横 6mm。
- **ヒーロー数値のフォントサイズ**: `calculation-logic.md §6.1` のトータルインパクトを最大フォントで表示。**36pt**（約 13mm 高）を既定とし、桁爆発（10 億円超、Issue #3 §9.2）で `formatManYenCompact` による「◯億◯万円」表記が発生した場合は **28pt** に自動縮小。
- **警告バナーの高さ**: 画面版はタブレット 64px（約 17mm）だが、A4 の密度に合わせて **15mm** に圧縮。文字サイズは見出し 12pt（`letter-spacing: 0.05em` 維持）、サブ 10pt。Issue #4 §8.3 の申し送り「A4 比率でのバナー高さ・フォントサイズ調整」を本書で上記の通り確定する。
- **指標カードの幅**: 3 カード横並びで各幅 56mm、カード間余白 6mm。画面版（Issue #3 §3.2 では 2 カード）と異なり、PDF では **3 カード並列**（トータルインパクトをヒーローに据えるため、止血・年間創出・3 年創出の 3 つを対等に並べる）。

> **画面との差分の合理性**: 画面版は 2 カード（止血 / 年間創出 + 3 年創出の二段表示）だが、PDF は 3 カード（止血 / 年間創出 / 3 年創出の並列）とする。理由は、PDF は「静止画像として回覧される」ため、画面版の二段表示（年間 → 3 年の視線誘導）が機能しにくく、並列の方が読み取りやすいため。この差分は Issue #3 §10.2 の「`DashboardView` の props 互換を保ったまま、PDF 側で独自ラッパを作り A4 フィットさせる」方針と整合（内部レイアウトを変えるが props 契約は変えない）。

#### 3-4. 警告バナー非発動時の扱い

- `speedWarning === false` または Issue #4 §4.3 の「`speedWarning && insourcingLevel === 1`」条件下では、PDF でも **バナーを非表示**にする（画面版と同じ判定ロジック）。
- バナー領域（15mm）が丸ごと空くため、**表紙訴求（ヒーロー）の位置を上に繰り上げる**（`speedWarning` フラグで条件分岐するレイアウト）。
- 判定は Issue #4 §4.3 の `ResultDashboard` 側ロジックをそのまま `PdfDashboard` 側にも適用（**`PdfDashboard` が `ResultDashboard` と同じ判定式 `result.speedWarning && insourcingLevel !== 1` を持つ**）。

#### 3-5. 内製化カテゴリ別訴求の掲出

- `calculation-logic.md §4.4` で確定済みのカテゴリ（「削減余地大」「更なる効率化の提案」「維持フェーズ」）のいずれかに該当する **1〜2 文の訴求テキスト**を、グラフ直下に掲出。
- 本書では固定訴求文を**新規に決定はしない**（Issue #4 スコープ外 / Issue #1 §8 将来拡張）。プレースホルダ `"{{CATEGORY_MESSAGE}}"` として記述し、Issue #1 の将来拡張で文言が確定次第差し替える運用とする。
- 警告バナーのサブテキスト（Issue #4 §7.1）と**役割が直交する**（カテゴリ訴求 = 計算根拠の透明性 / 警告 = 時間軸の緊急性、Issue #4 §2）ため、両方が同時に出ても PDF の情報設計を壊さない。

#### 3-6. 完全内製顧客（`insourcingLevel === 1`）の配置調整

- 警告バナー非表示（§3-4）＋ 止血カード「0 万円」表示（Issue #3 §3.3）＋ カテゴリ別訴求「維持フェーズ」（§3-5）の組み合わせが発生する。
- PDF レイアウトは「空白」にならないよう、**「維持フェーズ」のカテゴリ訴求テキストを他カテゴリより長めに**設定する運用を Issue #1 将来拡張に申し送る（本書ではレイアウトが破綻しないことのみ確認）。

---

### Step 4. ヘッダー／フッター／ロゴ配置を決める

A4 1 枚でも、商談資料としての体裁（社名・連絡先・免責）を整える必要がある。

#### 4-1. ヘッダー設計

##### 選択肢A: ロゴ左・サービス名中央・生成日時右（推奨）

- **構成**: 左端にロゴ（28 × 28px の猫モチーフ SVG）、中央に「ROI診断結果レポート」タイトル（14pt Bold）、右端に生成日時（10pt Regular、例: `生成日時 2026-04-23 15:30`）。
- **高さ**: 20mm。下端に Slate 200 の細線 1px を引いて本文と区切る。
- **Pros**:
  - 商談資料として標準的な形式。経営者に違和感なく受け入れられる。
  - 生成日時が一目でわかり、「いつの試算か」が明確。
  - Issue #4 §8.3 の「PDF 内に『生成日時』の注記を入れるか」の申し送りを**ここで吸収**できる（フッターではなくヘッダーに置く選択）。
- **Cons**: 特になし。

##### 選択肢B: ロゴ + タイトルのみ（生成日時はフッター）

- ヘッダーはロゴとタイトルだけ、生成日時はフッター右端に小さく。
- **Pros**: ヘッダーがシンプル。
- **Cons**: 生成日時がフッターに埋もれ、経営者が「いつのレポートか」を即座に認識しづらい。
- **不採用理由**: 商談後の回覧で「3 ヶ月前の試算？昨日？」が即わかることが重要。

**推奨**: **選択肢A（ロゴ左・タイトル中央・生成日時右）**。

#### 4-2. フッター設計

##### 選択肢A: 会社名・連絡先・ページ番号(推奨)

- **構成**: 左端に会社名（例: `株式会社ねこにまたたび`、10pt Regular、Slate 700）、中央に連絡先（例: `contact@nekonimatatabi.example`、9pt Regular、Slate 600）、右端にページ番号（`1 / 1`、9pt Regular、Slate 600）。
- **高さ**: 15mm。上端に Slate 200 の細線 1px。
- **Pros**:
  - 商談資料の基本要件（出所明示）を満たす。
  - ページ番号は「1 / 1」固定で、将来的に複数ページ化（§11 将来拡張）した時の互換も残せる。
- **Cons**: 連絡先（メール / 電話番号）が仕様上未確定。**連絡先は Issue #5 スコープ外として「運用で差し替え可能な定数」とする**。

##### 選択肢B: 会社名と免責注記

- フッターに会社名と免責文の 1 行版を置く。
- **Cons**: 免責文は本文の末尾（§3-2 レイアウト図の「免責 10mm」領域）に既に置くため、フッターとの重複が発生。

##### 選択肢C: QR コード付き

- フッター右端に連絡先 URL の QR コードを配置。
- **Pros**: 経営者がスマホでスキャンして即アクセスできる。
- **Cons**:
  - QR コード生成ライブラリ（`qrcode` npm 等）の追加依存が発生。
  - 連絡先 URL が未確定（選択肢 A と同じ問題）。
  - ロゴ・会社名と並んで密度が上がる。
- **本書としての位置付け**: 選択肢 A を採用した上で、**§11 将来拡張として QR コード追加を残す**。

**推奨**: **選択肢A（会社名・連絡先・ページ番号）**。連絡先は `src/lib/pdfConstants.ts`（仮称）の定数として Issue #6 実装時に差し替え可能な形で記述。

#### 4-3. 顧客名・会社名の入力の是非

- Issue #2 の入力項目に顧客名は**含まれていない**（§4.4 入力 5 項目 + 詳細設定 3 項目）。
- PDF の宛名として「株式会社 ◯◯ 様」を表示したい要望は商談現場で想定される。
- **選択肢A**: 顧客名入力を Issue #2 に追加する（Issue #2 改定が必要）。
- **選択肢B**: PDF には顧客名を出さない（汎用レポート）。
- **選択肢C**: PDF ダウンロード時のモーダルで任意入力させる（Issue #2 非改定、PDF 導線に組み込む）。
- **推奨**: **選択肢B（出さない）** を本書で確定。理由:
  - Issue #2 を改定すると spec 原子性が壊れる（Issue #1 / #2 / #3 / #4 の確定事項を本書で触らない方針）。
  - 選択肢 C は UX フローが複雑化し、商談テンポ（Issue #2 §2 / Issue #3 §2）を損なう。
  - 顧客名は営業担当が手書き（または別紙メモ）で補える。
  - 将来、顧客名入力を追加したい要件が固まった時点で別 Issue 化。**本書 §11 将来拡張に記録**。

#### 4-4. ロゴの配置と調達

- マスター設計書 §1.4 / §3.3 で「プロフェッショナル × 猫モチーフ」のブランドイメージが規定されているが、**ロゴ SVG の実ファイルは未確定**（プロジェクトに未コミット）。
- 本書では「ヘッダー左端 20 × 20pt の正方形領域にロゴを配置する」とレイアウトのみ確定し、**ロゴ SVG の制作・配置は Issue #6 実装時または別 Issue で対応**。暫定でテキスト `またたび計算機` を Inter Bold 14pt で代替する運用を推奨。

---

### Step 5. ファイル名の命名規則を決める

ブラウザの `download` 属性や jsPDF `save()` の引数で指定するダウンロードファイル名の命名規則を確定する。

#### 選択肢A: `matatabi-roi-<YYYYMMDD-HHmm>.pdf`（推奨）

- 例: `matatabi-roi-20260423-1530.pdf`
- 要素: プロジェクト識別子 `matatabi-roi` + 生成日時（分単位）
- **Pros**:
  - 英数字のみ。**全 OS・全ブラウザ互換**（Windows / macOS / iPadOS / Android 全対応）。
  - 分単位タイムスタンプで、同一顧客に複数回生成しても衝突しない。
  - ソート順が生成時刻順と一致（アルファベット順 = 時系列順）。
  - ファイル名から内容が推測できる（`matatabi` = プロダクト名）。
- **Cons**: 顧客名を含めない（Step 4-3 の選択肢 B と整合）。

#### 選択肢B: `matatabi-calculator-report-<顧客名>-<日付>.pdf`

- 例: `matatabi-calculator-report-acme-corp-20260423.pdf`
- **Pros**: 顧客名で検索しやすい。
- **Cons**:
  - 顧客名入力が必要（Step 4-3 選択肢 B で不採用）。
  - ファイル名が長くなる（Windows の 260 文字制限までは余裕あるが、可読性が落ちる）。
- **不採用理由**: Step 4-3 と整合。

#### 選択肢C: `ROI診断結果_<日付>.pdf`（日本語ファイル名）

- 例: `ROI診断結果_20260423.pdf`
- **Pros**: 経営者が日本語で直接内容を認識できる。
- **Cons**:
  - **macOS / iPadOS で日本語ファイル名は正常だが、古い Windows（エンコーディング問題）や Linux（UTF-8 非対応端末）でファイル名が化ける可能性**。
  - jsPDF の `save(filename)` は一部環境で日本語ファイル名を扱う際に URL エンコード問題を起こす既知のケースがあり、安定性が選択肢 A より劣る。
  - 商談相手がファイルをチーム内で転送する際、転送先の環境で化けるリスクが残る。
- **不採用理由**: 商談資料は経営者から役員・社内担当者・取引先に転送されうる。**最大公約数的な互換性**を優先する。

#### 選択肢D: `matatabi-roi-<UUID>.pdf`

- UUID を使うことで衝突ゼロを保証。
- **Cons**: UUID は人間が読めず、ダウンロードフォルダで「どれがどの顧客か」がわからない。**不採用**。

**推奨**: **選択肢A（`matatabi-roi-<YYYYMMDD-HHmm>.pdf`）**。

#### 論点5-1. タイムスタンプ粒度

- **分単位（`YYYYMMDD-HHmm`）**: 同一顧客に連続 2 回生成（1 分以内）で衝突しうるが、現実的にはほぼ問題なし。**推奨**。
- **秒単位（`YYYYMMDD-HHmmss`）**: 衝突ゼロだが、ファイル名が長くなる（14 文字 → 16 文字）。
- **日付のみ（`YYYYMMDD`）**: 同日再生成で必ず衝突し、ブラウザが `(1)`, `(2)` を自動付加する挙動に依存する。不採用。

#### 論点5-2. タイムゾーン

- 生成日時は **JST（ローカルタイムゾーン）** で固定。`new Date()` の `toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })` 相当で整形。
- UTC やユーザーローカルタイムゾーンは、商談現場（ほぼ日本国内）で混乱の元になる。**JST 固定**が最もシンプル。

---

### Step 6. PDF ダウンロード導線と挙動を決める

Issue #3 §3.4 で「PDF ダウンロード」ボタンは CTA エリア（ダッシュボード下部）に配置済み。本 Step では押下時の挙動を確定する。

#### 6-1. 生成フロー

```
[PDFダウンロード ボタン押下]
    ↓
[生成中ローディング表示 (ボタン内にスピナー + "PDF生成中...")]
    ↓
[PdfDashboard の隠しDOM をマウント (A4 比率固定)]
    ↓
[100ms 待機 (DOM レイアウト確定とフォント読み込み確認)]
    ↓
[html2canvas(scale: 2, useCORS: false)]
    ↓
[new jsPDF('p', 'mm', 'a4') → addImage → save(filename)]
    ↓
[PdfDashboard の隠しDOM をアンマウント]
    ↓
[生成完了 (ボタンを元の表示に戻す)]
```

#### 6-2. ローディング表示

- ボタン内にインラインスピナー（Lucide `loader-2` を CSS アニメーション回転）+ テキスト「PDF生成中...」。
- ボタン自体は `disabled` 状態にして二重クリック防止。
- 生成時間は `scale: 2` の場合タブレット端末で **2〜5 秒**を想定。5 秒を超える場合はユーザーが「固まった」と誤認するリスクがあるため、**10 秒でタイムアウト**してエラー表示。

#### 6-3. 生成失敗時のエラーハンドリング

- 失敗ケース:
  - html2canvas のメモリ不足（iPad Safari で `scale: 2` で大きな DOM を描画しようとして失敗）
  - jsPDF のインスタンス生成失敗（極めて稀）
  - ブラウザの `save()` / ダウンロード API ブロック（ポップアップブロッカー等）
- **エラー表示**: ボタン直下にインラインのエラーメッセージ「PDFの生成に失敗しました。ページを再読み込みして再度お試しください。」を 5 秒間表示し、自動で消える。
- **リトライ**: ユーザーが再度ボタンを押すことで再試行可能（状態をリセット）。
- **ログ**: `console.error` にエラー詳細を出力（本番でも OK、商談中のデバッグに使える）。将来、Cloudflare Pages のログ収集や Sentry 連携は §11 将来拡張。

#### 6-4. `PdfDashboard` の隠し DOM マウントタイミング

- Issue #3 §10.2 で `position: absolute; left: -9999px;` の隠し DOM として既定済み。
- 常時マウントする運用（ダッシュボード表示中は常に非表示で存在）と、生成時に動的マウントする運用の 2 案。
- **推奨**: **生成時に動的マウント**。理由:
  - 常時マウントだとダッシュボード表示時に `PdfDashboard` 分の DOM ノードも常に存在し、React の再レンダリングコストが倍になる。
  - A4 比率の隠し DOM は高さが 842pt（約 297mm）あり、描画コストが小さくない。
  - 動的マウントなら `next/dynamic` による遅延ロードで jsPDF・html2canvas の初期ロードも回避可能（§8 参照）。
- 実装: `useState` で `isGeneratingPdf` を持ち、`true` の間のみ `<PdfDashboard />` をレンダリング。html2canvas 完了後に `false` に戻す。

---

### Step 7. PDF 固有の微調整を決める

Issue #3 §10.2 / Issue #4 §6.4 で既に確定済みの項目と、本書で新たに確定する項目を整理する。

#### 7-1. Issue #3 / #4 で確定済みの再掲（本書では改定なし）

- `useCountUp` の `animated={false}` 強制（Issue #3 §10.2）。PDF では数値カウンターは即時最終値を表示。
- Recharts の `isAnimationActive={false}` を `DashboardView` で `!animated` に連動（§Step 1-3 で本書が契約明示）。
- 警告バナーのフェードイン無効化（Issue #4 §6.4、自明だが PDF では `animated={false}` により自動無効）。
- `prefers-reduced-motion` は PDF 版では無視（OS 設定に関わらず `animated={false}` 強制、Issue #3 §11 R10）。

#### 7-2. 本書で新たに確定する PDF 固有の微調整

- **ヒーロー数値のフォントサイズ**: 画面版 `clamp(2.5rem, 6vw, 4rem)`（Issue #3 §7.2）を、PDF では固定 `36pt`（桁爆発時 `28pt`）に置き換え（§Step 3-3）。
- **指標カードの数**: 画面版 2 枚 → PDF 3 枚（§Step 3-3 補足）。
- **警告バナー高さ**: 画面版 64〜96px → PDF 15mm（§Step 3-3）。
- **セクション間余白**: 画面版 `space-y-6`（24px）→ PDF `4mm`（§Step 3-3）。
- **凡例のタップ／ホバー**: 画面版はタップでツールチップ表示（Issue #3 §4.3）→ PDF では**静止画像のため無効**。凡例の金額ラベルを**常時表示**にする（Recharts の `Legend` / `LabelList` で静的描画）。

---

### Step 8. 依存ライブラリ方針（Issue #8 への申し送り）を決める

本 Issue で採用するライブラリのバージョン指針と導入方針を、Issue #8（依存ライブラリ追加）への申し送り形で確定する。

#### 8-1. jsPDF

- 採用バージョン: **jsPDF v2 系**（`^2.5.x` 帯）。最新の v3 は破壊的変更を含むため、v2 の安定版を採用。
- TypeScript 型定義: jsPDF v2 系は **公式型定義を同梱**（`@types/jspdf` は不要）。
- 遅延ロード: `next/dynamic` でダイナミック import（**PDF 生成時のみロード**）。初回 LCP への影響を排除。

#### 8-2. html2canvas

- 採用バージョン: **html2canvas v1 系**（`^1.4.x` 帯）。
- TypeScript 型定義: html2canvas は公式型定義を同梱。
- 遅延ロード: jsPDF と同じタイミングで `next/dynamic` により遅延ロード。`src/lib/pdf.ts` 内で `await import('html2canvas')` / `await import('jspdf')` を行い、ボタン押下時点で初めてロード。

#### 8-3. フォントファイル

- Noto Sans JP subset（Regular + Bold）を `public/fonts/` に配置。Step 2-1 参照。
- Inter（Regular + Bold）も同様に `public/fonts/` に配置。
- ライブラリではなく静的アセットとしての扱い。Issue #8 の `package.json` 追加とは独立。

#### 8-4. バンドルサイズ試算

- jsPDF v2 系: min+gzip で約 **340KB**
- html2canvas v1 系: min+gzip で約 **45KB**
- Noto Sans JP subset Regular + Bold (woff2): 約 **800KB**（遅延ロード不要、`next/font/local` のブラウザキャッシュ活用）
- Inter Regular + Bold (woff2): 約 **80KB**
- **合計影響**: 初回 LCP には jsPDF + html2canvas は影響しない（遅延ロード）。Noto Sans JP subset のみ初回 LCP に影響する可能性があるが、`next/font/local` は `font-display: swap` でフォント読み込みを非ブロッキングにできる。マスター設計書 §1.4 の LCP 1 秒目標は**遅延ロード前提で維持可能**。

---

### Step 9. 実装契約（`PdfDashboard` と `DashboardView` の接続）を決める

Issue #3 §10.2 で確定済みの責務分離を破らずに、PDF 固有の props（生成日時、顧客名の有無等）をどう渡すかを決める。

#### 9-1. `PdfDashboard` の責務（本書で確定）

```ts
interface PdfDashboardProps {
  result: CalculationResult;          // calculation-logic.md §5 の型
  insourcingLevel: InsourcingLevel;   // 内製化注記のため
  inputs: Inputs;                     // 入力サマリー表示のため（calculation-logic.md §5 の Inputs 型）
  generatedAt: Date;                  // 生成日時（ヘッダー右端に表示）
}
```

- `PdfDashboard` は隠し DOM を描画し、内部で `DashboardView` を以下のように呼び出す:

```ts
<DashboardView
  result={result}
  insourcingLevel={insourcingLevel}
  animated={false}                                  // PDF は必ず false
  showWarningBanner={result.speedWarning && insourcingLevel !== 1}
  warningMessage={
    result.speedWarning && insourcingLevel !== 1
      ? buildWarningMessage(result.speedWarningMonthlyLoss)  // Issue #4 §7.4
      : undefined
  }
/>
```

- `DashboardView` の周りに PDF 専用のヘッダー・フッター・入力サマリー・免責・カテゴリ訴求を PDF 専用ラッパコンポーネント（`PdfDashboard` 内部の JSX）として配置。

#### 9-2. PDF 生成ユーティリティ `src/lib/pdf.ts`（仮称）

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

#### 9-3. ファイル名生成ユーティリティ `src/lib/pdfFilename.ts`（仮称）

```ts
// src/lib/pdfFilename.ts (Issue #6 以降で実装)

/** Step 5 推奨: matatabi-roi-YYYYMMDD-HHmm.pdf (JST 固定、分単位) */
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

#### 9-4. `ResultDashboard` 側の導線

- `ResultDashboard`（Issue #3 §10.2 のコンテナ）が `isGeneratingPdf` 状態を持ち、ボタン押下で以下を実行:
  1. `isGeneratingPdf = true` に設定（`<PdfDashboard />` がレンダリングされる）
  2. `requestAnimationFrame` 2 回分待機（DOM レイアウト確定）
  3. 隠し DOM の ref を取得し `generatePdf({ element, filename: buildPdfFilename() })` を呼ぶ
  4. 成功／失敗を UI に反映
  5. `isGeneratingPdf = false` に戻す（`<PdfDashboard />` アンマウント）
- この一連のフローは Issue #6 の実装範囲。本書では「接続の**契約**」のみを確定。

---

## 3. 変更が必要なファイル一覧

本 Issue は新規ドキュメント作成が主タスクのため、「新規作成予定ファイル」と「既存 spec への軽微な追記」に分けて記載する。

### 3.1 新規作成

**`docs/spec/pdf-report.md`**（プロジェクトルート直下の `docs/spec/` に新規作成、`calculation-logic.md` / `input-form.md` / `result-dashboard.md` / `warning-copy.md` と並列配置）

- 命名理由: Issue #5 の主題は「PDF レポートのレイアウトと日本語フォント方針」であり、ファイル名 `pdf-report.md` がスコープを正確に表現する。`pdf-output.md` や `pdf-layout.md` も候補だが、`report` の方が「商談資料としての成果物」という性格を反映する。

#### 構成目次

```
1. 前提と目的
2. 設計原則（オフライン商談耐性 / 画面と PDF の一貫性 / Issue #1-#4 との整合 / 非機能要件 LCP 1秒 の維持）
3. 生成アプローチ
   3.1 採用: html2canvas 主体 + jsPDF 画像貼付
   3.2 scale / 画像フォーマット
   3.3 Recharts アニメーション無効化の接続契約
   3.4 直接描画案・ハイブリッド案の不採用理由
4. 日本語フォント埋め込み方針
   4.1 採用: next/font/local で Noto Sans JP subset
   4.2 subset 化の方針
   4.3 Inter（英字見出し）併用
   4.4 数字記号の表示指針
   4.5 不採用案（next/font/google / jsPDF addFont）の理由
5. A4 1 枚レイアウト
   5.1 採用: 上下分割・1 枚構成
   5.2 要素棚卸しと優先順位
   5.3 マージン・余白設計
   5.4 ASCII ワイヤー（警告発動時 / 非発動時）
   5.5 指標カード 3 枚並列の合理性（画面版 2 枚との差分）
   5.6 完全内製顧客でのレイアウト破綻防止
6. ヘッダー / フッター / ロゴ
   6.1 ヘッダー: ロゴ左・タイトル中央・生成日時右
   6.2 フッター: 会社名・連絡先・ページ番号
   6.3 顧客名入力の不採用
   6.4 ロゴ SVG の扱い（Issue #6 / 将来 Issue 申し送り）
7. ファイル名命名規則
   7.1 採用: matatabi-roi-<YYYYMMDD-HHmm>.pdf
   7.2 タイムスタンプ粒度とタイムゾーン
   7.3 不採用案の理由
8. ダウンロード導線
   8.1 生成フローのシーケンス
   8.2 ローディング表示
   8.3 エラーハンドリングとタイムアウト
   8.4 PdfDashboard の動的マウント
9. PDF 固有の微調整
   9.1 Issue #3 / #4 確定事項の再掲
   9.2 本書で新規確定する微調整
10. 依存ライブラリ方針（Issue #8 申し送り）
    10.1 jsPDF v2 系
    10.2 html2canvas v1 系
    10.3 フォントアセット
    10.4 バンドルサイズ試算
11. 実装契約
    11.1 PdfDashboard の責務と型
    11.2 src/lib/pdf.ts（PDF 生成ユーティリティ）
    11.3 src/lib/pdfFilename.ts（ファイル名生成）
    11.4 ResultDashboard 側の導線
    11.5 DashboardView との接続契約
12. 表示例（警告発動時 / 非発動時 / 完全内製顧客）
13. 未解決事項 / 将来拡張
    13.1 顧客名入力（将来 Issue）
    13.2 QR コード（将来 Issue）
    13.3 複数ページ化 / PDF/A 対応 / サーバサイド生成
    13.4 scale: 1.5 への降格余地
    13.5 連絡先・ロゴ SVG の未確定
    13.6 カテゴリ別訴求テキストの最終文言
    13.7 Sentry / Cloudflare Pages ログ統合
14. 決定項目チェックリスト
15. 関連 Issue / 後続作業
```

#### 仕様書の中心となる擬似コード（抜粋）

```ts
// ───────── PdfDashboard props（本書で新規確定） ─────────
interface PdfDashboardProps {
  result: CalculationResult;
  insourcingLevel: InsourcingLevel;
  inputs: Inputs;
  generatedAt: Date;
}

// ───────── PDF 生成ユーティリティ（src/lib/pdf.ts） ─────────
export async function generatePdf(options: {
  element: HTMLElement;
  filename: string;
}): Promise<void> {
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

// ───────── ファイル名生成（src/lib/pdfFilename.ts） ─────────
export function buildPdfFilename(now: Date = new Date()): string {
  const jst = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: string) => jst.find((p) => p.type === t)?.value ?? "";
  return `matatabi-roi-${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}.pdf`;
}
```

### 3.2 既存 spec への軽微な追記（本 Issue 完了後の運用作業）

本 Issue の成果物 PR と同時、あるいはマージ直後のフォローアップ PR で以下の追記を行う:

- `docs/spec/result-dashboard.md` §10.3 の `DashboardViewProps` は本書では改定なし（既に Issue #4 §11.2 のフォローアップで `warningMessage: { headline, subtext }` に更新済み）。§10.4 の「Issue #5 への申し送り」セクション末尾に「**確定仕様は `docs/spec/pdf-report.md` を参照（Issue #5 で確定）**」の 1 行追記。§11 R2 / R10 の該当行にも同様の参照追記。
- `docs/spec/warning-copy.md` §8.3（Issue #5 への申し送り）の該当行に「**確定仕様は `docs/spec/pdf-report.md` を参照**」の 1 行追記。特に「A4 比率でのバナー高さ・フォントサイズ調整」「生成日時注記の要否」が本書で確定した旨を記載。
- `docs/spec/calculation-logic.md` §10 関連 Issue テーブルの Issue #5 行に「**PDF 表紙訴求・表示ルールの確定仕様は `docs/spec/pdf-report.md` を参照（Issue #5 で確定）**」の 1 行追記。
- `docs/spec/input-form.md` §3.3（確認画面の入力サマリー）に「PDF の入力サマリー表示については `docs/spec/pdf-report.md §5` を参照」の 1 行追記を推奨（Issue #2 の該当記述との整合のため）。
- `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` §1.3 の「PDFレポート出力」行 / §2.2 の「PDF生成」行 / §3.2 の `PdfGenerator` 行に「詳細仕様は `docs/spec/pdf-report.md` を参照（Issue #5 で確定）」の 1 行追記を推奨（Issue #1 / #2 / #3 / #4 と同じ運用）。

### 3.3 コード変更

- **本 Issue では対象外**。Issue #6（Next.js 雛形）・Issue #8（依存ライブラリ追加）以降で、本仕様書を参照して `src/components/PdfDashboard.tsx`・`src/lib/pdf.ts`・`src/lib/pdfFilename.ts`・`ResultDashboard` の PDF ボタン導線・`public/fonts/` 配下のフォントファイルを実装・配置する。

### 3.4 配置判断

- Issue #1 / #2 / #3 / #4 と同じ原則: `.claude/` はマスター設計書（コンテキスト）、確定仕様は `docs/spec/` 配下。
- ファイル名 `pdf-report.md` は `docs/spec/` 配下の他 4 ファイル（`calculation-logic.md` / `input-form.md` / `result-dashboard.md` / `warning-copy.md`）と並列関係。

---

## 4. 考慮事項・リスク

### R1: html2canvas の SVG 描画崩れ

- Recharts は SVG ベース（Issue #3 §5.1）のため html2canvas と親和性が高いが、一部の SVG 機能（`filter` / `mask` / `clip-path` の複雑な組み合わせ）で描画崩れが発生しうる。
- → Recharts 標準描画で使われる SVG 機能は `<path>` / `<rect>` / `<text>` / 単純な `<g transform>` の範囲に留まる（Issue #3 §5.1 で確認済み）。将来 Recharts の高度カスタマイズを行う場合、html2canvas での描画テストを必ず実施する旨を §13 将来拡張に記録。
- Lucide アイコン（Issue #3 §4.2 凡例）も SVG `<path>` ベースで安全。

### R2: iPad Safari の canvas メモリ制約

- iPad Safari では、html2canvas で描画する canvas のサイズが 16,777,216 px²（約 4096×4096）を超えると失敗する既知の制約がある。
- A4 縦 `scale: 2` → `1190 × 1684 px` = 約 200 万 px² で、理論上は余裕。**ただし** iPad のメモリ残量次第では失敗しうる。
- → `scale: 2` を上限と定め、Issue #6 実装時に iPad 実機で生成試験を実施する旨を決定項目チェックリストに明記。失敗が頻発する場合は `scale: 1.5` への降格を §13.4 で受け入れる。

### R3: フォント subset 化の文字セット漏れ

- Step 2-1 の Noto Sans JP subset で、本アプリで使用する文字が漏れると PDF 中で豆腐（□）として表示される。
- → 本アプリの PDF 使用文字は既知集合（「CRITICAL OPPORTUNITY LOSS」「3年間のトータルインパクト」「月額 / 万円 / 機会損失 / 発生中 / 累積中 / 削減余地 / 内製化 / 更新待ち / ベンダー費用 / 改修費用 / 手作業人数 / 時給 / 株式会社 / ねこにまたたび」等）に限られる。subset 化時にこれらの文字が全て含まれることを確認するテストを Issue #6 実装時に設ける旨を明記。
- 顧客名入力（Step 4-3 で不採用）を将来追加する場合は、JIS 第二水準漢字（人名漢字）の追加 subset が必要。

### R4: 生成所要時間とユーザー体感

- html2canvas `scale: 2` + jsPDF `addImage` で、タブレット端末（iPad 9th）で **2〜5 秒**の生成時間を想定。
- → 5 秒を超える場合はユーザーが「固まった」と誤認するリスク。Step 6-2 のローディング表示とタイムアウト 10 秒で対処。
- Issue #6 実装時に実機計測し、10 秒を超えることが頻発する場合は `scale: 1.5` 降格を検討。

### R5: LCP 1 秒目標との整合

- マスター設計書 §1.4 の LCP 1 秒目標に対し、jsPDF + html2canvas の合計 385KB gzip は無視できないサイズ。
- → Step 8-1 / 8-2 で `next/dynamic` による遅延ロードを決定。**PDF 生成時のみロード**することで、初回 LCP に一切影響しない。
- Noto Sans JP subset（800KB）は初回ロード時に `next/font/local` で配信されるが、`font-display: swap` により LCP ブロックを回避。

### R6: PDF の「印刷時点の値で固定」と再計算の非同期

- Issue #4 §8.2 / 本書 §Step 6-1 の通り、PDF は生成時点の `result` を画像化して固定する。生成後にユーザーが入力を変えて再計算しても、以前保存した PDF は古いまま。
- → これは PDF の性質上自然な挙動。ヘッダーの生成日時表示（Step 4-1）で「いつの試算か」が明示されるため、経営者の混乱は最小化される。
- 本仕様書にも明記のみ。

### R7: Recharts アニメーション状態の焼き込み

- `isAnimationActive={true}` のまま html2canvas を撮ると、棒グラフが伸びる途中で静止画化される可能性。
- → Step 1-3 で「`DashboardView` 内部で Recharts の `isAnimationActive` を `!animated` に連動させる」契約を本書で明示。Issue #6 実装時の正本。
- 念のため html2canvas 実行前に `requestAnimationFrame` 2 回分の待機を置く（Step 6-4）ことで、もしアニメーションが走っていても完了後にスナップショットされる保険を掛ける。

### R8: 完全内製顧客 + 警告非発動時のレイアウト空白

- `insourcingLevel === 1` かつ `speedWarning === true` → 警告バナー非表示（Issue #4 §4.3.2）。加えて `speedWarning === false` でも警告バナー非表示。この場合、§3-2 レイアウト図の警告バナー 15mm が空く。
- → Step 3-4 で「表紙訴求（ヒーロー）の位置を上に繰り上げる」方針を採用。`ResultDashboard` / `PdfDashboard` が `showWarningBanner` フラグに応じてレイアウトを条件分岐する。
- 完全内製顧客ではさらに止血カードが「0 万円」表示になる（Issue #3 §3.3）。レイアウトの空白感を避けるためカテゴリ訴求「維持フェーズ」文言を他カテゴリより長めに設定する運用は Issue #1 将来拡張に申し送り（本書ではレイアウト破綻しないことのみ確認）。

### R9: ファイル名の日本語文字問題

- Step 5-C（日本語ファイル名）を不採用としたが、仮に将来日本語ファイル名を採用する際、jsPDF の `save(filename)` が内部で `URL.createObjectURL` + `a.download` を使う実装で、一部ブラウザで日本語のエンコードが文字化けする既知ケースあり。
- → 本書では英数字のみ（Step 5-A）で確定。将来日本語化する場合は `encodeURIComponent` / `decodeURIComponent` を挟む等の追加実装が必要な旨を §13 に記録。

### R10: オフライン商談での生成成功保証

- Step 2 で外部フォント CDN 依存を排除したため、理論上オフラインでも生成可能。
- → ただし初回アクセス時にフォントファイル（`next/font/local`）のダウンロードが完了している必要がある。商談直前のネット接続で初回アクセスを済ませてから、オフライン会議室に移動する運用を前提とする。
- この運用前提を Issue #6 実装時の README / 運用ドキュメント（仮: `docs/operation.md`）に記載する旨を §13 に記録。

### R11: ロゴ SVG の未確定

- Step 4-4 で「ロゴ SVG は Issue #5 スコープ外」と切り分けたが、Issue #6 実装時に何を配置するかが未確定のままだとヘッダーが暫定テキストになる。
- → 暫定: `またたび計算機` の文字ロゴ（Inter Bold 14pt）。正式ロゴ SVG は別 Issue（仮: Issue #99 ブランドアセット制作）で対応する旨を §13 に記録。
- マスター設計書 §3.3「猫モチーフ」との整合を最終的に保証するには正式ロゴが必要だが、Issue #5 のスコープ（レイアウトとフォント方針の確定）からは外す。

### R12: 連絡先情報の未確定

- Step 4-2 のフッター中央に「連絡先」を置くが、具体的なメール・電話番号・URL は未確定。
- → 本書では「運用で差し替え可能な定数として `src/lib/pdfConstants.ts` で管理」と仕様化のみ。実値は Issue #6 実装時または別 Issue で設定する旨を §13 に記録。

### R13: 画面版との情報密度の差分（指標カード 2 枚 → 3 枚）

- Step 3-3 で「画面版 2 カード（止血 + 年間創出二段） vs PDF 3 カード（止血 + 年間創出 + 3 年創出 並列）」という差分を設けた。
- → これは Issue #3 §10.2 の「`DashboardView` の props 互換を保ったまま、PDF 側で独自のラッパを作り A4 フィットさせる」方針と整合するが、**「画面と PDF の見た目が同一」という Step 1 選択肢 A の Pros と一部矛盾**する。
- 画面 ↔ PDF の差分は「二段表示 vs 並列表示」の 1 点のみで、数字・色・グラフは完全一致。経営者目線での齟齬は実用上問題ないと判断。
- 代案として「画面・PDF ともに 3 カード並列」とする選択肢もあるが、画面版は Issue #3 §3.2 で 2 カード（年間創出に 3 年創出を二段で併記）として確定済みのため、Issue #3 の確定を尊重して本書では PDF 側のみ 3 カード並列を採用する。

### R14: カテゴリ別訴求文言の未確定

- §3-5 で「カテゴリ別訴求テキスト」を PDF に掲出することを決めたが、具体的な文言は `calculation-logic.md §8` 将来拡張のままで未確定（Issue #1 の時点で確定されなかった）。
- → 本書では「プレースホルダ `"{{CATEGORY_MESSAGE}}"` として記述し、Issue #1 将来拡張で文言確定後に差し替え」と運用を明記。`docs/spec/warning-copy.md` §8.5 のプレースホルダと同じスタイル。

### R15: PDF 内の SEO / アクセシビリティ

- html2canvas 主体（Step 1 選択肢 A）の場合、PDF 内テキストが画像化されスクリーンリーダー読み上げ不可、テキスト検索不可。
- → アクセシビリティの観点では望ましくないが、本アプリの PDF は「商談持ち帰り資料」であり、経営者が社内で回覧する用途。アクセシビリティ要件は画面版（Issue #3 §6.3 で `prefers-reduced-motion` 対応済み）に集約。
- PDF のアクセシビリティ対応は §13 将来拡張（タグ付き PDF 化、PDF/UA 対応等）として記録。

### R16: `inputs` 型の `PdfDashboard` への流入経路

- Step 9-1 で `PdfDashboardProps.inputs: Inputs` を追加したが、画面版の `DashboardView` の props には `inputs` が含まれない（Issue #3 §10.3 では `result` / `insourcingLevel` / `animated` / `showWarningBanner` / `warningMessage`）。
- → `PdfDashboard` は `DashboardView` のラッパであり、**入力サマリー表示のために独自に `inputs` を受け取る**。`DashboardView` には `inputs` を渡さない（画面版ダッシュボードには入力サマリー表示がないため、Issue #3 §3.4 の ASCII ワイヤー参照）。
- この流入経路の非対称性は「画面版には入力サマリーがない、PDF 版にはある」という機能差分に根ざしており、責務分離として自然。本書でこの契約を明示。

### R17: プレビュー機能の不在

- 本書では「ボタン押下 → 即ダウンロード」のフロー（Step 6-1）を確定したが、ダウンロード前にプレビュー表示する UX は採用しない。
- → 理由:
  - 商談テンポ優先（Issue #3 §2）。ワンクリックで即 PDF が得られる方が商談現場で使いやすい。
  - プレビュー表示には追加の UI 実装（モーダル等）が必要で、Issue #5 スコープが膨らむ。
- 将来プレビュー機能を追加したい要望が出た場合は §13 将来拡張として記録。

---

## 5. 決定項目チェックリスト

Issue #5 をクローズするために、**以下すべてに結論が書かれていること**:

### 生成アプローチ
- [ ] html2canvas 主体 / 直接描画 / ハイブリッドの選択（推奨: html2canvas 主体）
- [ ] 直接描画案・ハイブリッド案の不採用理由の明記
- [ ] `scale` の決定（推奨: 2）
- [ ] 画像フォーマットの決定（推奨: PNG）
- [ ] Recharts アニメーション無効化の接続契約（`isAnimationActive={!animated}`）

### 日本語フォント埋め込み
- [ ] 採用方式（推奨: `next/font/local` で Noto Sans JP subset 配置）
- [ ] 不採用案（`next/font/google` / jsPDF `addFont`）の理由明記
- [ ] subset 化の文字セット方針（ASCII + ひらがな + カタカナ + JIS 第一水準漢字 + 一部第二水準）
- [ ] Inter（英字見出し）併用の可否
- [ ] 数字・記号の font-family カスケード指定
- [ ] 目標バンドルサイズ（Noto Sans JP subset + Inter で 1MB 以下）

### A4 レイアウト
- [ ] レイアウト方式の選択（推奨: 上下分割・1 枚構成）
- [ ] 載せる要素の棚卸し（ヘッダー / 警告バナー / 表紙訴求 / 指標カード / グラフ / 内製化注記 / カテゴリ訴求 / 入力サマリー / 免責 / フッター）
- [ ] マージン（上下左右 15mm）・セクション間余白（4mm）の確定
- [ ] ヒーロー数値のフォントサイズ（36pt、桁爆発時 28pt）
- [ ] 指標カード数（画面 2 枚 vs PDF 3 枚の差分と合理性）
- [ ] 警告バナー高さ（15mm、見出し 12pt / サブ 10pt）
- [ ] 警告非発動時のレイアウト繰り上げ方針
- [ ] 完全内製顧客でのレイアウト破綻防止

### ヘッダー / フッター / ロゴ
- [ ] ヘッダー構成（ロゴ左・タイトル中央・生成日時右）
- [ ] フッター構成（会社名・連絡先・ページ番号）
- [ ] ページ番号の要否（推奨: 入れる、1 / 1 固定）
- [ ] 顧客名入力の是非（推奨: 入れない、将来 Issue へ）
- [ ] ロゴ SVG の扱い（Issue #5 スコープ外、暫定テキスト）
- [ ] 連絡先情報の扱い（運用で差し替え可能な定数）
- [ ] 生成日時のタイムゾーン（JST 固定）

### ファイル名命名規則
- [ ] 命名規則の選択（推奨: `matatabi-roi-<YYYYMMDD-HHmm>.pdf`）
- [ ] タイムスタンプ粒度（推奨: 分単位）
- [ ] 日本語ファイル名・顧客名入りの不採用理由明記
- [ ] UUID 案の不採用理由明記

### ダウンロード導線
- [ ] 生成フローのシーケンス（ボタン押下 → 動的マウント → html2canvas → jsPDF → save → アンマウント）
- [ ] ローディング表示（スピナー + 「PDF生成中...」）
- [ ] タイムアウト（10 秒）
- [ ] エラーハンドリング（インラインメッセージ、5 秒自動クローズ、リトライ可）
- [ ] `PdfDashboard` の動的マウント方針（生成時のみ、常時マウントしない）

### PDF 固有の微調整
- [ ] `animated={false}` 強制（Issue #3 §10.2 済み、再確認）
- [ ] `isAnimationActive={!animated}` 接続契約
- [ ] `prefers-reduced-motion` 無視（Issue #3 §11 R10 済み、再確認）
- [ ] 凡例を常時表示（タップツールチップ無効化への代替）
- [ ] 警告バナーのフェードイン無効化（Issue #4 §6.4 済み、再確認）

### 依存ライブラリ方針
- [ ] jsPDF のバージョン帯（推奨: v2 系 `^2.5.x`）
- [ ] html2canvas のバージョン帯（推奨: v1 系 `^1.4.x`）
- [ ] 型定義の要否(両者とも公式同梱、`@types/jspdf` 不要)
- [ ] 遅延ロード方針（`next/dynamic` / dynamic import、PDF 生成時のみロード）
- [ ] フォントアセットの配置（`public/fonts/`）
- [ ] バンドルサイズ試算と LCP 影響の明記

### 実装契約
- [ ] `PdfDashboard` の props 型（`result` / `insourcingLevel` / `inputs` / `generatedAt`）
- [ ] `src/lib/pdf.ts` の API 設計（`generatePdf({ element, filename })`）
- [ ] `src/lib/pdfFilename.ts` の API 設計（`buildPdfFilename(now?)`）
- [ ] `ResultDashboard` 側の導線（`isGeneratingPdf` 状態 + 動的マウント）
- [ ] `DashboardView` との接続（Issue #3 §10.3 の型を改定せずそのまま使う）

### ドキュメント
- [ ] 仕様書の保存先: `docs/spec/pdf-report.md`
- [ ] マスター設計書 §1.3 / §2.2 / §3.2 からの参照関係明記
- [ ] `calculation-logic.md` / `input-form.md` / `result-dashboard.md` / `warning-copy.md` との整合確認
- [ ] [TODO / マージ後] `result-dashboard.md §10.4` / §11 R2 / R10 への参照追記
- [ ] [TODO / マージ後] `warning-copy.md §8.3` への参照追記
- [ ] [TODO / マージ後] `calculation-logic.md §10` 関連 Issue テーブル Issue #5 行への参照追記
- [ ] [TODO / マージ後] `input-form.md §3.3` への 1 行追記（PDF 入力サマリーへの参照）
- [ ] [TODO / マージ後] マスター設計書 §1.3 / §2.2 / §3.2 への 1 行参照追記
- [ ] [TODO / マージ後] Issue #6・#8 の説明欄に「PDF 仕様は `docs/spec/pdf-report.md` を参照」と追記

---

## 6. 進め方（実働手順）

1. 本プランを元に、Issue #5 担当者（またはレビュワー）と §5 のチェックリストを 1 項目ずつ議論・合意する。
2. `docs/spec/calculation-logic.md` §5・§6、`docs/spec/input-form.md` §3.3、`docs/spec/result-dashboard.md` §3・§4・§5・§7・§8・§10・§11、`docs/spec/warning-copy.md` §4.3・§6・§7・§8 を再読し、前提の整合を取る。
3. Step 1〜9 の推奨案（html2canvas 主体 / `next/font/local` + Noto Sans JP subset / 上下分割 1 枚構成 / ロゴ左・タイトル中央・生成日時右 / `matatabi-roi-<YYYYMMDD-HHmm>.pdf` / 動的マウント + ワンクリック生成 / `isAnimationActive={!animated}` 連動 / jsPDF v2 + html2canvas v1 遅延ロード / `PdfDashboardProps` 新規定義）を採用するか、代替案を採用するかを決定する。
4. 合意結果を `docs/spec/pdf-report.md` に Markdown で記述する（§3.1 の目次に沿って）。
5. §3.1 の擬似コード（`PdfDashboardProps` 型、`generatePdf` 関数、`buildPdfFilename` 関数）を本仕様書に貼り付ける。
6. §3.1 の ASCII ワイヤー（警告発動時 / 非発動時 / 完全内製顧客）を本仕様書 §12 に掲載する。
7. §4 の考慮事項・リスクを「13. 未解決事項 / 将来拡張」セクションに棚卸しして記録（特に R2 / R4 / R10 / R11 / R12 / R14 / R15 は実機検証・ブランドアセット・運用ドキュメントを伴うため明示的に記録）。
8. 本仕様書の PR / commit を Issue #5 にリンクし、クローズ。
9. マージ後のフォローアップ作業として、以下を別 PR で実施:
   - `docs/spec/result-dashboard.md` §10.4 / §11 R2・R10 に `pdf-report.md` への参照追記。
   - `docs/spec/warning-copy.md` §8.3 に `pdf-report.md` への参照追記（特にバナー高さ・フォントサイズ・生成日時注記の確定を明示）。
   - `docs/spec/calculation-logic.md` §10 関連 Issue テーブル Issue #5 行に `pdf-report.md` への参照追記。
   - `docs/spec/input-form.md` §3.3 に PDF 入力サマリーへの 1 行参照追記。
   - マスター設計書 `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` §1.3 / §2.2 / §3.2 に `pdf-report.md` への 1 行参照追記（Issue #1 / #2 / #3 / #4 と同じ運用）。
   - Issue #6（Next.js 雛形）・Issue #8（依存ライブラリ追加）の説明欄に「PDF 仕様は `docs/spec/pdf-report.md` を参照」と追記。
10. Issue #6 実装着手時に、本仕様書 §Step 2（フォント subset）・§Step 8（依存バージョン）・§Step 9（実装契約）を実装計画の入力として使用。iPad Safari 実機での生成試験（R2 / R4 対応）をテスト項目に含める。

---

## 7. 参考文献

本 Issue は新規ドキュメント作成タスクのため、「既存の参照元ファイル」と「新規作成予定ファイル」を併記する:

- `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` — 参照元マスター設計書。§1.3（機能要件: PDF レポート出力 = A4 サイズで生成・ダウンロード）、§1.4（非機能要件: LCP 1 秒、タブレット最適化、ブランドイメージ）、§2.2（ライブラリ: jsPDF ＋ html2canvas）、§3.2（コンポーネント構成: `PdfGenerator` = 隠し DOM を画像化し PDF に変換）、§3.3（デザインガイドライン: Inter / Noto Sans JP、Blue 500 / Amber 500）が本 Issue の原点。
- `/Users/YS/development/matatabi-calculator/docs/spec/calculation-logic.md` — Issue #1 の成果物。§5（`CalculationResult` / `Inputs` 型）、§6（表示・丸めルール、万円単位四捨五入）、§6.1（PDF サマリー = 3 年トータルインパクトを表紙訴求、並列表示項目）、§4.4（カテゴリ別訴求文）、§7（スピード警告発動条件）が本 Issue の前提。
- `/Users/YS/development/matatabi-calculator/docs/spec/input-form.md` — Issue #2 の成果物。§3.3（確認画面の入力サマリー = PDF 表示想定）、§4.4（`updateWaitMonths` 離散 5 段階）、入力 5 項目 + 詳細設定 3 項目の仕様が本 Issue の入力サマリー設計（§Step 3-1 要素 8）の根拠。
- `/Users/YS/development/matatabi-calculator/docs/spec/result-dashboard.md` — Issue #3 の成果物。§3（指標カード構成、ASCII ワイヤー）、§4（グラフ: 積み上げ横棒 Blue + Amber）、§5（Recharts 採用、SVG ベース）、§6（アニメーション、`prefers-reduced-motion` 尊重）、§7（レスポンシブレイアウト、タブレット最優先）、§8（警告バナー UI 骨格）、§9（`formatManYen` / `formatManYenCompact`）、§10（PDF スナップショット戦略、`DashboardView` / `PdfDashboard` 責務分離、§10.3 `DashboardViewProps`、§10.4 Issue #5 への申し送り）、§11 R2・R10（html2canvas の SVG フォント互換性、PDF での `animated={false}` 強制）が本 Issue の直接の前提・申し送り元。
- `/Users/YS/development/matatabi-calculator/docs/spec/warning-copy.md` — Issue #4 の成果物。§3（`CRITICAL OPPORTUNITY LOSS` + 日本語サブ）、§4.3（非発動時・完全内製顧客の判定）、§6（タイポグラフィ階層、文言長吸収）、§7（動的数字差し込み、`buildWarningMessage`）、§8.3（Issue #5 への申し送り: A4 比率でのバナー高さ・フォントサイズ調整、生成日時注記の要否、PDF での `animated={false}` 強制）が本 Issue の直接の前提・申し送り元。
- `/Users/YS/development/matatabi-calculator/.claude/issue-order.md` — 参照元。フェーズ0 #5（#1 / #3 に依存、#6 / #8 が本 Issue に依存）。
- `/Users/YS/development/matatabi-calculator/working/plans/issue-1_calculation-logic-assumptions.md` / `issue-2_input-form-ui-spec.md` / `issue-3_result-dashboard-spec.md` / `issue-4_warning-copy-and-trigger.md` — 本プランの構成スタイルの参照元。
- `/Users/YS/development/matatabi-calculator/docs/spec/pdf-report.md` — **新規作成予定**。本 Issue の主成果物。
