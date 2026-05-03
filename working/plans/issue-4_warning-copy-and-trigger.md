# Issue #4 実装プラン — 警告コピー文言と表示トリガ条件を確定する

## 0. このプランの性格

本プランは **実装コードを書くための設計書ではなく、「意思決定ドキュメント（spec）」を完成させるためのプラン** である。成果物は Markdown 1 ファイル（`docs/spec/warning-copy.md`）、コード変更はゼロ。Issue #1（計算ロジック前提値）・Issue #2（入力フォーム UI）・Issue #3（診断結果ダッシュボード）の確定結果を前提に、「スピード警告」として画面に出す **文言・トリガ条件・バリエーション・ビジュアル微調整** を確定する。

UI 骨格（位置・色・アイコン・高さ・アニメーション）は Issue #3 の `docs/spec/result-dashboard.md §8` で既に確定しており、本 Issue は「その骨格に流し込む **文言本体**」と「**発動条件の最終確認**」に焦点を絞る。実装ファイル（`src/lib/messages.ts`（または `src/lib/warnings.ts`）、`DashboardView` の `warningMessage` props 連携、警告文言の動的差し込みロジック等）は本 Issue のスコープ外。本仕様書を Issue #6（Next.js 雛形）以降で参照して実装する。

---

## 1. 概要

### 1.1 何を決めるか

- **警告文言の最終コピー**: メインフレーズ「CRITICAL OPPORTUNITY LOSS」を英語のまま残すか・日本語化するか・併記するか。サブテキストの文言案。数字差し込みの有無と形式。
- **表示トリガ条件**: `updateWaitMonths >= 3` の閾値を維持するか。他の入力項目との AND/OR で絞り込むか。
- **警告のバリエーション**: 単一の文言で全発動ケースをカバーするか、`updateWaitMonths` の 3 段階（4.5 / 9 / 18 ヶ月）で文言や強度を出し分けるか。
- **ビジュアル表現の微調整**: Issue #3 で確定済みの UI 骨格（Amber 500 背景、`alert-triangle` アイコン、高さ 64〜96px）に対し、文言や多段化の結果として色強度・アイコンを変える余地があるか。
- **実装契約**: 文字列定数 `CRITICAL_OPPORTUNITY_LOSS_MESSAGE` の最終形。`DashboardView` の `warningMessage?: string` props に渡す値の仕様（静的文字列か、`result` を受ける関数か）。

### 1.2 なぜ重要か（下流への影響）

- **商談の「最初の 5 秒」の訴求コア**: スピード警告は、ダッシュボードで **経営者が最初に目にするテキスト**（Issue #3 §8.1 で最上部配置確定済み）。ここの文言が「他人事」に響くか「自社事」に響くかで、商談全体の温度が決まる。
- **Issue #3 の宙吊りを解消する**: `result-dashboard.md §8.5` はプレースホルダ `"{{CRITICAL_OPPORTUNITY_LOSS_MESSAGE}}"` のまま放置されており、`DashboardView` の `warningMessage?: string` props がオプショナルのまま。本 Issue 完了で初めて実装側が確定した文字列定数を注入できる。
- **Issue #3 §11 R6 の最終確認**: 警告バナー文言長の不確定性（「最大 96px まで許容、超過時はヒーロー `font-size` を下限側に寄せる」）は、本 Issue で文言が確定して初めて 1 画面収まり保証が確定する。文言が想定より長ければ §7 のレイアウト再検証が発生する。
- **Issue #5（PDF レポート）への連携**: PDF にも同じ警告バナーを出す想定（マスター設計書 §1.3 の「警告メッセージを視覚的に表示」）。PDF では動的差し込みの扱い（印刷時点の計算値を埋める／汎用文で通す）を確定しておく必要がある。
- **Issue #2（入力フォーム UI）との整合**: `input-form.md §4.4` の離散 5 段階セレクトのうち、下 3 段階（4.5 / 9 / 18 ヶ月）が警告を発動する。多段化する場合、入力選択肢と警告段階の対応が UI 上で **説明可能**である必要がある（営業担当が「この選択肢を選ぶとこの警告が出ます」と即答できる構造）。
- **`calculation-logic.md §4.4` の「カテゴリ別表示文」との同居**: 内製化カテゴリ別の訴求文（「削減余地大」「更なる効率化の提案」「維持フェーズ」）とスピード警告は **別の UI 要素**だが、トーンが衝突するとダッシュボード全体の整合性を壊す。本 Issue の文言はカテゴリ別訴求と共存するトーン設計である必要がある。

---

## 2. 意思決定ステップ（順序付き）

各ステップは情報密度（Step 1）→ 発動境界（Step 2）→ 段階設計（Step 3）→ ビジュアル整合（Step 4）→ 動的差し込み（Step 5）→ PDF 連携（Step 6）→ 実装契約（Step 7）の順で依存する。上から順に確定させる。

---

### Step 1. メインフレーズ「CRITICAL OPPORTUNITY LOSS」の扱いを決める

マスター設計書 §3.1 で「『CRITICAL OPPORTUNITY LOSS』と表示」と明記されており、原則は **英語フレーズを核に据える**。本 Step では「英語のまま／日本語化／併記」の選択をする。

#### 選択肢A: 英語フレーズ単独表示（「CRITICAL OPPORTUNITY LOSS」のみ）

- バナー見出しを英語のまま、サブテキストも英語、または見出しのみ英語でサブは日本語。
- **Pros**:
  - マスター設計書の表現をそのまま継承。強い危機感を「異物感のある英語」で演出し、経営者の視線を掴む。
  - タイポグラフィ的にも印象的で、商談写真・PDF 見本のサムネで一目で覚えてもらえる。
- **Cons**:
  - 中小〜中堅企業の経営者（本プロジェクトのターゲット、マスター設計書 §1.2）は英語に強いとは限らない。意味が即座に伝わらず、**「かっこいい雰囲気」で終わる**リスクがある。
  - 「CRITICAL」「OPPORTUNITY LOSS」の訳が自明ではない（「機会損失」が日本のビジネス語彙に定着しているが、「CRITICAL」単独では重要性／危機性のどちらと解釈されるか揺れる）。

#### 選択肢B: 日本語単独表示（例: 「機会損失が発生中」「重大な機会損失」）

- 英語フレーズを廃し、日本語に翻訳して表示。
- **Pros**:
  - 全経営者に意味が即伝わる。誤読ゼロ。
  - 日本語フォントの可読性が高く、長文サブテキストとの連続性も自然。
- **Cons**:
  - マスター設計書のフレーズを捨てることになり、ブランド／商品名との連続性が弱まる（「またたび計算機」のキャッチコピーとして「CRITICAL OPPORTUNITY LOSS」が社内外で認知されている場合に断絶）。
  - 「機会損失が発生中」は日本語として自然すぎて、かえって危機感が演出できない（日本語の「重大な機会損失」は経営者語彙としてマイルド）。

#### 選択肢C: 英語＋日本語併記（推奨）

- **メイン**: 大きく `CRITICAL OPPORTUNITY LOSS`（英語、太字、`alert-triangle` アイコンの右）。
- **サブ**: 小さく日本語の補足（例: 「重大な機会損失が発生中」「更新の待ち時間が収益を削っています」等）。
- **Pros**:
  - マスター設計書のフレーズを継承しつつ、意味を日本語で即理解できる。**一番の核**：「英語でインパクト → 日本語で理解」の 2 段構えが商談での会話を誘発する（「これ、英語で書いてありますが要は…」という営業担当の切り出しに使える）。
  - Issue #3 §8.2 の UI 骨格（見出し `bold`、本文 `normal`）と自然にマッピングできる。
  - 将来的に i18n 化する場合も、英語版・日本語版として両方が既に揃っている。
- **Cons**:
  - バナー高さが増えやすい（2 行構成が既定になる）。Issue #3 §8.3 の「タブレット 64px、スマホ 72px、最大 96px 許容」の範囲に収まるかは文言の総文字数に依存する。
  - 情報量が増え、経営者が「どこを読めばいいか」迷う可能性（見出しと本文のメリハリで解決可能）。

**推奨**: **選択肢C（英語＋日本語併記）**。商品コンセプトの継承・理解速度・商談での会話誘発の 3 点を同時に満たせる。

#### 論点1-1. 英語フレーズのタイポグラフィ

- `CRITICAL OPPORTUNITY LOSS` は全大文字の 3 単語。フォントサイズは **タブレット 16〜18px、`font-weight: 700`**。Issue #3 §8.2 の「見出し `bold`」と整合。
- 文字間（`letter-spacing`）を 0.05em〜0.08em 程度開けると、緊急感と高級感が両立する。
- 色: Issue #3 §8.2 の `slate-900` を継承（本文と同色）。Amber 600 のアイコンが並んでいるので、見出しも Amber に寄せたくなるが **可読性優先で `slate-900` 推奨**。アイコンの Amber が「警告サイン」、テキストの `slate-900` が「内容」という役割分担を維持する。

#### 論点1-2. サブテキストの日本語訳候補

候補を列挙し、推奨を明示する。最終 1 文は **12〜30 文字**を目安とする（Issue #3 §8.3 の高さ制約と §2 の「商談テンポ優先」原則より）。

| # | 候補 | 文字数 | 評価 |
|---|---|---|---|
| a | 重大な機会損失が発生中 | 12 | 直訳、簡潔だが説明責任が弱い |
| b | 更新の待ち時間が収益を削っています | 17 | 因果を明示、経営者語彙との整合 ◎ |
| c | 3ヶ月以上の更新待ちで機会損失が累積中 | 19 | 発動条件も埋め込み、自己説明的 ◎ |
| d | 更新を待つほどコスト流出が累積します | 18 | 動詞で行動喚起、強い |
| e | 現在、月額 `{monthlyLoss}` 万円相当の機会損失が発生中です | 動的 | 数字差し込み（Step 5 で詳述） |

**推奨**: **候補 c（3ヶ月以上の更新待ちで機会損失が累積中）** を既定、**候補 e（数字差し込み）** を動的版として併記。理由は Step 5 で詳述する。

---

### Step 2. 表示トリガ条件を再確認する

Issue #1 で `updateWaitMonths >= 3` が確定済み（`calculation-logic.md §7`・§9）。本 Step では「維持 / 再検討 / 追加条件の AND」の 3 択で再確認する。

#### 選択肢A: 現状維持（`updateWaitMonths >= 3` のみ、推奨）

- `calculation-logic.md §7` 確定のまま。Issue #2 §4.4 の離散値（4.5 / 9 / 18）で発動する。
- **Pros**:
  - 既に 3 つの spec で確定済み。整合を壊さない。
  - 入力選択肢のラベル境界（「1〜2ヶ月」と「3〜6ヶ月」の間）と警告境界（`>= 3`）が一致しており、営業担当が「3ヶ月以上の選択肢を選ぶと警告が出る」と即説明できる。
  - シンプルなルールは説明責任を果たしやすい。
- **Cons**:
  - 月額ベンダー費用がゼロに近い顧客・手作業人数がゼロの顧客でも、更新待ち 3 ヶ月以上で警告が出る。「理論上の機会損失」が現実感の薄い金額になる可能性（後述の Step 5 で「金額差し込み」をする場合に目立つ）。

#### 選択肢B: AND 条件で絞り込む（例: `updateWaitMonths >= 3 && monthlyVendorCost >= N 万円`）

- 月額ベンダー費用が一定以上（例: 10 万円以上）の場合のみ警告を出す。
- **Pros**:
  - 「警告を出す価値があるケース」に絞れる。誤発動の主観的リスクを減らせる。
- **Cons**:
  - 閾値 `N` の根拠が不明確になる（「10 万円以上」の根拠は？）。説明責任を追加で抱え込む。
  - Issue #1 で既に確定済みの条件を **本 Issue で上書きする**ことになり、`calculation-logic.md` の改定が連鎖する（spec の原子性を壊す）。
  - `speedWarning: boolean` が `CalculationResult` の戻り値に含まれる設計（`calculation-logic.md §5`）であり、複合条件を入れると計算レイヤと UI レイヤの責務分離が曖昧になる。

#### 選択肢C: OR 条件で拡張する（例: `updateWaitMonths >= 3 || monthlyVendorCost >= 500 万円`）

- 更新待ちが短くても、月額ベンダー費用が巨大なら警告を出す。
- **Pros**:
  - 大企業顧客にも警告訴求できる。
- **Cons**:
  - 「CRITICAL OPPORTUNITY LOSS」というメインフレーズは **「待ち時間が収益を削る」**という因果を指すのが核（マスター設計書 §3.1「更新待ち＝機会損失」の思想）。OR で別ファセットを足すとフレーズと内容が乖離する。
  - 選択肢B と同じく、`calculation-logic.md` の改定を誘発する。

**推奨**: **選択肢A（現状維持）**。Issue #1 の確定を尊重し、本 Issue は **文言と UI 仕上げに集中する**。追加条件を入れたい場合は別 Issue（将来拡張）として切り出す。

#### 論点2-1. 非発動時の挙動（既に Issue #3 で確定済み、本仕様書でも明記）

- `speedWarning === false` のとき、バナー DOM 自体を描画しない（Issue #3 §8.1）。ヒーローが最上段に繰り上がる。
- 本仕様書では「**非発動時は警告コピー定数も参照されない**」と明記し、`DashboardView` の `showWarningBanner={false}` の挙動と整合させる。

#### 論点2-2. 離散値 `0.5 / 1.5 / 4.5 / 9 / 18` と `>= 3` の境界の再確認

- `input-form.md §4.4` で確定済み。**4.5 / 9 / 18 の 3 値で警告が発動する**。
- 「3〜6ヶ月」カテゴリの代表値が `4.5` であることで、ラベル文言「3〜6ヶ月」の下限 = 閾値 `3` と UI のメンタルモデルが一致する。本仕様書でこの整合性を記載し、Issue #2 への逆依存を明示する。

---

### Step 3. 警告のバリエーション（多段化 vs 単一）を決める

Issue #2 §4.4 で警告発動カテゴリは **3 値（4.5 / 9 / 18 ヶ月）**。多段化するか単一にするかを選択する。

#### 選択肢A: 単一の警告文言で全発動ケースをカバー（推奨）

- 「3〜6ヶ月」「半年〜1年」「1年以上」のいずれでも同じ文言・同じ色・同じアイコンを表示。
- **Pros**:
  - 実装がシンプル。`speedWarning: boolean` 1 つで制御でき、`CalculationResult` 型を変更しなくて済む（`calculation-logic.md §5` の設計を尊重）。
  - 商談での説明が簡単（「3 ヶ月以上で警告」の 1 ルール）。
  - 経営者が「どの段階か」より「警告が出ているか否か」を認識すればよい（商談の意思決定はバイナリに寄せる方が速い）。
  - 数字差し込み（Step 5）で個別最適化が可能（文言は同じでも金額は段階で自然に増える）。
- **Cons**:
  - 1 年以上待っている顧客と、3 〜 6 ヶ月の顧客で同じ警告を出すと「重み」の表現が同じになる。営業担当が補足トークで差別化する余地はあるが、**UI 単独では温度差が伝わらない**。

#### 選択肢B: 3 段階で文言／色を出し分ける

- 例:
  - `4.5 ヶ月`: 「注意」レベル（Amber 300 相当の穏やか色、`info` 系文言）
  - `9 ヶ月`: 「警告」レベル（Amber 500、現状の `alert-triangle`、現状の文言）
  - `18 ヶ月`: 「重大」レベル（Red 500 相当、`alert-octagon` アイコン、強い文言）
- **Pros**:
  - 段階ごとの危機感を視覚で直接伝えられる。
  - 「1 年以上待っている」顧客に対して特別な強度で訴求できる。
- **Cons**:
  - Issue #3 §8 で UI 骨格（Amber 500 / `alert-triangle` / 高さ 64〜96px）が**単一の色・アイコン**で確定済み。多段化すると本 Issue で Issue #3 の §8.2 を改定する必要がある（spec の原子性毀損）。
  - `CalculationResult` に `warningLevel: "caution" | "warning" | "critical"` 等を追加する必要が出て、`calculation-logic.md §5` の型を拡張することになる。
  - 実装コストが増える（3 段階分の文言・色・アイコンの組み合わせ、状態管理、テストケース）。
  - 「CRITICAL OPPORTUNITY LOSS」というフレーズ自体が **最上位の強度を示唆**しているため、段階化すると「下位段階での CRITICAL 表示は誇大」という矛盾が生じる。
  - 中小〜中堅企業の経営者ターゲット（マスター設計書 §1.2）には **「出ているか／出ていないか」の 2 値** の方が意思決定に貢献しやすい。

#### 選択肢C: 文言は単一、数字部分のみ段階で自然に変化（中間案）

- 単一の文言テンプレート（選択肢A 相当）に、動的な金額差し込み（Step 5）を組み込むことで、結果として「`4.5` ヶ月の顧客は少額、`18` ヶ月の顧客は高額」が自然に表現される。
- 色・アイコン・フレーズは単一で統一。数字だけが段階で変化する。
- **Pros**:
  - 選択肢A のシンプルさと、選択肢B の段階表現のメリットを両立。
  - Issue #3 §8 の UI 骨格を一切変更せずに済む。
  - `CalculationResult` の型拡張なし。
- **Cons**:
  - 「色・アイコンの強度差」は表現できない（数字の大小でしか段階感を出せない）。

**推奨**: **選択肢C（単一 UI ＋ 動的数字差し込み）**。Issue #3 の確定を尊重しつつ、Step 5 の数字差し込みで段階表現を代替する。選択肢A と実質的に同じ UI で、文言テンプレートに `{loss}` プレースホルダを仕込むだけで段階性を確保できる。

#### 論点3-1. 将来拡張として「多段化」を残す

- 商談現場で「1 年以上の顧客と 3 ヶ月の顧客で同じ警告は弱い」というフィードバックが出たら、後続 Issue として多段化を検討する。
- 本仕様書の §11 「未解決事項 / 将来拡張」に記録する。

---

### Step 4. ビジュアル表現の微調整を決める

Issue #3 §8.2 で UI 骨格は確定済み:
- 背景: Amber 500 透明度 10〜15%
- 枠線: Amber 500 実線 1px
- アイコン: Lucide `alert-triangle` / Amber 600
- テキスト: `slate-900`
- 高さ: タブレット 64px / スマホ 72px / 最大 96px

本 Step では、本 Issue で新たに確定した「文言の長さ・数字差し込み有無・多段化判断」に照らして、**UI 骨格に微調整が必要かを判定**する。

#### 4-1. 色強度の変更是非

- Step 3 で単一 UI を推奨したため、Amber 500 を維持する。
- 多段化（選択肢B）を採用した場合のみ、`4.5 ヶ月 = Amber 300 / 9 ヶ月 = Amber 500 / 18 ヶ月 = Red 500` への拡張を検討（**不採用**のため記録のみ）。
- **推奨**: Issue #3 §8.2 のまま Amber 500 を維持。本仕様書でも「色トークンは Issue #3 の規定に従う」と明記する。

#### 4-2. アイコンの変更是非

- Issue #3 §8.2 で `alert-triangle`（Amber 600）が確定済み。本 Issue で変更する積極的理由はない。
- **推奨**: `alert-triangle` 維持。本仕様書ではアイコン指定は Issue #3 への参照に留め、再掲しない（単一の真実の源の維持）。

#### 4-3. 見出しと本文のタイポグラフィ階層

- 本 Issue の新規確定事項として、**英語フレーズ（見出し）と日本語サブ（本文）のタイポグラフィ階層**を明記する必要がある。
- 推奨値:

| 要素 | タブレット | スマホ | ウェイト | 色 |
|---|---|---|---|---|
| 英語見出し「CRITICAL OPPORTUNITY LOSS」 | 16〜18px | 14〜16px | 700 | `slate-900` |
| 日本語サブテキスト | 13〜14px | 12〜13px | 400 | `slate-700` |
| アイコン | 20×20px | 20×20px | — | Amber 600 |
| 行間（サブテキスト） | 1.4〜1.5 | 1.4 | — | — |

- 見出し（太字・大きめ）→ サブ（細字・小さめ）の階層で「英語で掴む → 日本語で理解する」視線誘導を作る。
- アイコンは見出しに縦中央揃えで並べ、サブテキストは見出しの下（2 行目）に配置。

#### 4-4. 文言長の想定と吸収

- Step 1 + Step 5 の想定文言（英語見出し + 日本語サブ + 動的金額）で、最長ケースを試算:
  - `CRITICAL OPPORTUNITY LOSS`（25 文字）
  - 日本語サブ: `現在、月額 1,200 万円相当の機会損失が発生中です`（23 文字）
  - 合計 2 行、タブレット 64px に収まる想定。
- Issue #3 §8.3 の「最大 96px 許容」はスマホ縦で日本語サブが折り返した場合の保険として維持。
- 文言が想定より長くなった場合のフォールバック（Issue #3 §11 R6）は本仕様書でも明記する。

#### 4-5. アニメーション

- Issue #3 §8.4 で「マウント時にフェードイン 300ms のみ」が確定済み。本 Issue で変更なし。
- 本仕様書ではアニメーション章を設けず、Issue #3 §8.4 への参照に留める。

**推奨**: **Issue #3 §8 の UI 骨格は一切改定せず**、本 Issue で新規に確定するのは「タイポグラフィ階層（§4-3）」と「文言長の想定内に収まることの再確認（§4-4）」のみ。

---

### Step 5. 動的数字差し込みの有無と形式を決める

Step 1 論点1-2 で候補 e として出した「数字差し込み」を本 Step で詳細化する。

#### 5-1. 差し込み対象の候補

スピード警告で差し込める数値の候補を列挙する:

| 候補 | 計算 | 単位 | 意味 |
|---|---|---|---|
| `updateWaitMonths`（そのまま） | 入力値 | ヶ月 | 現在の待ち月数 |
| 月額ベンダー費用相当の機会損失 | `monthlyVendorCost * insourcingGap` | 円/月 | 待ち 1 ヶ月あたりの流出額 |
| 待ち期間累計の機会損失 | `monthlyVendorCost * updateWaitMonths * insourcingGap` | 円 | 既に累積した機会損失の概算 |
| 3 年間の止血額 | `result.threeYearSavings` | 円 | 補助カードとの重複 |

#### 5-2. 差し込み形式の選択肢

##### 選択肢A: 固定文言（数字差し込みなし）

- 文言: `CRITICAL OPPORTUNITY LOSS` / `3ヶ月以上の更新待ちで機会損失が累積中`
- **Pros**: 実装最シンプル。`warningMessage` を静的文字列定数で渡すだけ（Issue #3 §8.5 の設計と完全整合）。
- **Cons**: Step 3 選択肢C で段階表現を数字に託した設計趣旨と矛盾。単調で、`4.5` ヶ月顧客と `18` ヶ月顧客の重みが区別できない。

##### 選択肢B: 月数のみ差し込み

- 文言: `{waitMonths} の更新待ちで機会損失が累積中`
- 例（ラベルベース）: `3〜6ヶ月の更新待ちで機会損失が累積中`（ラベルそのまま埋め込み）
- **Pros**:
  - 入力ラベル（Issue #2 §4.4 の 5 段階）と一致する文言で、営業担当が「お客様が選ばれた選択肢が警告対象です」と指差しで説明できる。
  - 金額計算が絡まないため、数字の誇張リスクが低い。
- **Cons**:
  - 「月数」だけでは経営者に響きにくい。金額換算した方が意思決定に直結する。

##### 選択肢C: 金額差し込み（月額損失）（推奨）

- 文言: `現在、月額 {monthlyLoss} 万円相当の機会損失が発生中`
- `monthlyLoss = Math.round(monthlyVendorCost * insourcingGap / 10_000)`（万円単位、四捨五入）
- **Pros**:
  - 経営者に最も響く「月額」の数字を示せる。
  - 段階表現が自然に発生する（月額 50 万円の顧客と 500 万円の顧客で重みが異なる）。
  - `calculation-logic.md §6` の「万円単位四捨五入」ルールと整合。
  - `insourcingGap` を掛けることで、完全内製顧客（`insourcingGap = 0`）では **月額 0 万円**となり、この場合は §5-3 のフォールバックで差し込みなし文言に切り替える運用が取れる。
- **Cons**:
  - 月額損失の表現は「理論値」であり、厳密には「ベンダー流出コストの月額」に近い（`updateWaitMonths` とは独立）。文言が「機会損失」と謳う以上、営業トークで「待ちながら毎月これだけ流れている」と補足する必要がある。
  - `monthlyVendorCost` が小さい顧客で「月額 1 万円相当」等、見かけ上のインパクトが弱い数字になる（これは **誠実な結果**原則と整合するため許容）。

##### 選択肢D: 金額差し込み（累積損失）

- 文言: `既に {累積損失} 万円相当の機会損失が累積`
- `累積損失 = monthlyVendorCost * updateWaitMonths * insourcingGap`
- **Pros**: 「過去」の損失として最もインパクトが強い。
- **Cons**:
  - `updateWaitMonths` は離散値（4.5 / 9 / 18）であり、これを掛けると「4.5 ヶ月累積」のような曖昧な表現になる。
  - `monthlyVendorCost` ベースの累積損失は `calculation-logic.md §5` の `threeYearSavings`（将来 3 年間の削減額）と **直交する指標**であり、経営者に「過去？未来？」の混乱を招く。
  - 補助カードの「3 年間の止血」と数字が競合し、ダッシュボード内で同じような金額が 2 箇所に出て **情報の二重化**となる。

**推奨**: **選択肢C（月額損失の差し込み）**。`insourcingGap` を掛けて完全内製顧客で `0` になる設計と組み合わせる。

#### 5-3. `monthlyLoss === 0` のフォールバック

- `insourcingLevel === 1`（完全内製）の場合、`insourcingGap = 0` → `monthlyLoss = 0`。
- この場合でも `speedWarning === true`（更新待ち 3 ヶ月以上）ならバナーが出る設計だが、「月額 0 万円相当の機会損失」は**誠実でない**（0 なら警告する意味がない）。
- **推奨運用**:
  - (a) `speedWarning && insourcingLevel === 1` のとき、**バナー自体を非表示**にする（`showWarningBanner = false` で上書き）。
  - (b) 代わりに内製化注記（Issue #3 §3.3）の「現状、理想形に近い運用のため削減余地は 0 万円」が既に出ているので、警告は冗長となる。
- 本仕様書では **(a) を採用**し、`DashboardView` 側のロジックとして「`speedWarning && insourcingLevel === 1 → showWarningBanner = false`」を明記する。Issue #3 §10.2 の `DashboardView` 責務分離（props ベースで副作用なし）に従い、この判定は **`ResultDashboard` 側コンテナ**で行う。

#### 5-4. 数字差し込みと Issue #1 の `speedWarning` 設計の整合

- `CalculationResult.speedWarning: boolean` は現行のまま維持（Step 2 選択肢A 推奨）。
- 数字差し込みに必要な `monthlyLoss` は **`CalculationResult` に新規フィールドとして追加**する必要がある。
  - 追加案: `speedWarningMonthlyLoss: number`（円単位、`monthlyVendorCost * insourcingGap`）。
  - `speedWarning === false` のときは `0` を返す。
- これは `calculation-logic.md §5` の型拡張となるため、**本仕様書の §11「未解決事項／Issue #1 への軽微な追記」として記録**し、本 Issue 完了後に `calculation-logic.md` に 1 行追記する運用を取る。
- 代案: `monthlyLoss` を `DashboardView` 側で計算する（`result.threeYearSavings / 36` で近似可能、ただし `repairCost` 分が混入するため厳密には一致しない）。**厳密性を優先し、前者（`calculation-logic.md` への追記）を推奨**する。

#### 5-5. 数字差し込み文言の最終形

```
見出し: CRITICAL OPPORTUNITY LOSS
サブ:   現在、月額 {monthlyLoss} 万円相当の機会損失が発生中
```

- `{monthlyLoss}` は `formatManYen(result.speedWarningMonthlyLoss)` の出力から「万円」単位部分を剥いだ整数（3 桁区切り）を埋め込む。
- 実装は `src/lib/messages.ts` にテンプレート関数として定義:
  ```ts
  export function buildCriticalOpportunityLossMessage(
    monthlyLossYen: number
  ): { headline: string; subtext: string } {
    const manYen = Math.round(monthlyLossYen / 10_000);
    return {
      headline: "CRITICAL OPPORTUNITY LOSS",
      subtext: `現在、月額 ${manYen.toLocaleString("ja-JP")} 万円相当の機会損失が発生中`,
    };
  }
  ```
- **本擬似コードは仕様書に掲載し、実装時の正本とする**。

---

### Step 6. PDF レポート（Issue #5）との連携方針を決める

マスター設計書 §1.3 で「診断結果ダッシュボード：数値、グラフ、**警告メッセージ**を視覚的に表示」と規定され、PDF も同じメッセージを持つ想定。

#### 6-1. PDF 側の警告表示有無

##### 選択肢A: PDF にも同じバナーを出す（推奨）

- Issue #3 §10.2 で `DashboardView` が PDF 版ラッパからも再利用される設計（`animated=false` を強制）。同じ props 構造で `warningMessage` も注入する。
- **Pros**:
  - 画面と PDF の一貫性。経営者が PDF を見返したとき、ダッシュボードと同じ「CRITICAL OPPORTUNITY LOSS」メッセージが残り、**持ち帰り商談資料としての訴求力**が維持される。
  - 実装追加コストほぼゼロ。
- **Cons**:
  - PDF は印刷・保存後も閲覧される。動的差し込み（Step 5）の数字が「印刷時点」の値で固定される。将来、入力値が変わっていても PDF の数字は変わらない（これは自明だが明記する）。

##### 選択肢B: PDF には警告を出さない

- **Pros**: PDF は「計算結果レポート」の性格に寄せて、警告は画面上のみ。
- **Cons**: マスター設計書 §1.3 の規定から外れる。画面で強く訴求したメッセージが PDF で消える違和感。

**推奨**: **選択肢A**（PDF にも同じバナー）。

#### 6-2. PDF 側の動的差し込みタイミング

- PDF 生成時、`PdfDashboard`（Issue #3 §10.2）が `DashboardView` をレンダリングする時点の `result.speedWarningMonthlyLoss` を埋め込む。
- PDF は静的ドキュメントとして出力され、以降は更新されない。これは自然な挙動。
- 本仕様書の §10 にて「PDF 内の数字は印刷時点の値で固定される」旨を明記。

#### 6-3. PDF 固有の文字サイズ調整

- PDF は A4 比率（Issue #3 §10.4）であり、画面のタブレット 64px 想定とは異なるレイアウト。
- **本仕様書では文字サイズの PDF 固有指定はしない**（Issue #5 のスコープ）。「Issue #5 で A4 に合わせたサイズ調整を行うこと」と申し送りのみ。

---

### Step 7. 実装契約（文字列定数・テンプレート関数）を決める

Issue #3 §8.5 で「`src/lib/messages.ts` または `src/lib/warnings.ts` に **文字列定数 `CRITICAL_OPPORTUNITY_LOSS_MESSAGE`** を置く」運用が確定済み。本 Step で最終形を確定する。

#### 7-1. ファイル名の選択

##### 選択肢A: `src/lib/messages.ts`（推奨）

- 汎用的な文言管理ファイル。将来、他の文言（内製化カテゴリ別訴求 `calculation-logic.md §4.4`、エラー文言 `input-form.md §8.3` 等）も同ファイルに集約可能。
- **Pros**: 文言を 1 箇所に集約して i18n 対応時に移行しやすい。
- **Cons**: 肥大化のリスク（ただし本プロジェクト規模では非現実的な懸念）。

##### 選択肢B: `src/lib/warnings.ts`

- スピード警告専用。
- **Pros**: 責務が明確。
- **Cons**: 他の文言（カテゴリ別訴求等）が別ファイルになり、文言管理が分散する。

**推奨**: **選択肢A（`src/lib/messages.ts`）**。

#### 7-2. エクスポートする API の形

静的文字列定数では Step 5 の動的差し込みに対応できないため、**関数ベース**で提供する:

```ts
// src/lib/messages.ts（Issue #6 以降で実装）

/** スピード警告のヘッドライン（英語）。不変。 */
export const CRITICAL_OPPORTUNITY_LOSS_HEADLINE = "CRITICAL OPPORTUNITY LOSS";

/**
 * スピード警告の本文を組み立てる。
 * monthlyLossYen=0 のときは「月額相当」部分を省略した汎用文を返す。
 * 呼び出し側は (speedWarning && insourcingLevel < 1) の条件下でのみ使うこと。
 */
export function buildCriticalOpportunityLossSubtext(monthlyLossYen: number): string {
  if (monthlyLossYen <= 0) {
    return "3ヶ月以上の更新待ちで機会損失が累積中";
  }
  const manYen = Math.round(monthlyLossYen / 10_000);
  return `現在、月額 ${manYen.toLocaleString("ja-JP")} 万円相当の機会損失が発生中`;
}
```

- `DashboardView` props は Issue #3 §10.3 の `warningMessage?: string` を **2 プロパティに分ける**（見出しと本文を別 prop にする）か、**構造化オブジェクト**で渡すかを選択する:
  - 案α: `warningHeadline?: string; warningSubtext?: string`
  - 案β: `warningMessage?: { headline: string; subtext: string }`
- **推奨**: **案β（構造化オブジェクト）**。プロパティが増えすぎず、Issue #3 §10.3 の既存 `warningMessage` 1 プロパティの形を継承できる。

#### 7-3. Issue #3 §10.3 の型定義への追記

本 Issue 完了時、`DashboardView` props を以下に更新する指針を本仕様書に記載:

```ts
interface DashboardViewProps {
  result: CalculationResult;
  insourcingLevel: InsourcingLevel;
  animated: boolean;
  showWarningBanner: boolean;
  warningMessage?: {
    headline: string;
    subtext: string;
  };
}
```

- Issue #3 §10.3 からの差分は `warningMessage` の型のみ。本 Issue 完了後に `docs/spec/result-dashboard.md §10.3` に 1 行追記する運用（本仕様書の §11 に記録）。

---

## 3. 変更が必要なファイル一覧

本 Issue は新規ドキュメント作成が主タスクのため、「新規作成予定ファイル」と「既存 spec への軽微な追記」に分けて記載する。

### 3.1 新規作成

**`docs/spec/warning-copy.md`**（プロジェクトルート直下の `docs/spec/` に新規作成、`calculation-logic.md` / `input-form.md` / `result-dashboard.md` と並列配置）

- 命名理由: Issue #4 の主題は「警告コピー（文言）と発動条件」であり、ファイル名 `warning-copy.md` がスコープを正確に表現する。`warning-message.md` も候補だが、英語の `message` より `copy`（広告／UI ライティング領域の語彙）の方が「営業ツールとしての文言設計」という性格を反映する。

#### 構成目次

```
1. 前提と目的
2. 設計原則（商談テンポ / 経営者に届く語彙 / 説明責任 / Issue #1-#3 との整合）
3. メインフレーズ（英語／日本語／併記）
   3.1 採用: 英語＋日本語併記
   3.2 英語フレーズのタイポグラフィ
   3.3 日本語サブテキストの候補と採用案
4. 表示トリガ条件
   4.1 採用: 現状維持（updateWaitMonths >= 3）
   4.2 代替案（AND/OR 条件）の不採用理由
   4.3 非発動時の挙動
   4.4 入力選択肢との境界整合
5. バリエーション（多段化の是非）
   5.1 採用: 単一 UI + 動的数字差し込み
   5.2 将来の多段化余地（未解決事項へ）
6. ビジュアル微調整
   6.1 色・アイコン（Issue #3 §8.2 を継承）
   6.2 タイポグラフィ階層（見出し / 本文）
   6.3 文言長の想定と 96px 吸収
7. 動的数字差し込み
   7.1 採用: 月額損失差し込み
   7.2 monthlyLoss === 0 のフォールバック
   7.3 calculation-logic.md §5 への型拡張要請（speedWarningMonthlyLoss）
   7.4 最終文言テンプレートと擬似コード
8. PDF（Issue #5）連携
   8.1 PDF にも同じバナーを出す
   8.2 数字は印刷時点で固定
   8.3 Issue #5 への申し送り
9. 実装契約
   9.1 ファイル: src/lib/messages.ts
   9.2 エクスポート API（定数 + 関数）
   9.3 DashboardView props への反映案
10. 表示例（英語見出し＋日本語サブ＋数字差し込みの最終案）
11. 未解決事項 / 将来拡張
    11.1 calculation-logic.md §5 への追記運用（speedWarningMonthlyLoss）
    11.2 result-dashboard.md §10.3 への追記運用（warningMessage 型拡張）
    11.3 多段化の将来検討
    11.4 i18n 対応
12. 決定項目チェックリスト
13. 関連 Issue / 後続作業
```

#### 仕様書の中心となる擬似コード（抜粋）

```ts
// ───────── 警告コピー定数・テンプレート関数 ─────────
export const CRITICAL_OPPORTUNITY_LOSS_HEADLINE = "CRITICAL OPPORTUNITY LOSS";

export function buildCriticalOpportunityLossSubtext(monthlyLossYen: number): string {
  if (monthlyLossYen <= 0) {
    return "3ヶ月以上の更新待ちで機会損失が累積中";
  }
  const manYen = Math.round(monthlyLossYen / 10_000);
  return `現在、月額 ${manYen.toLocaleString("ja-JP")} 万円相当の機会損失が発生中`;
}

// ───────── DashboardView props 改定案（result-dashboard.md §10.3 差分） ─────────
interface DashboardViewProps {
  result: CalculationResult;
  insourcingLevel: InsourcingLevel;
  animated: boolean;
  showWarningBanner: boolean;
  warningMessage?: {
    headline: string;   // = CRITICAL_OPPORTUNITY_LOSS_HEADLINE
    subtext: string;    // = buildCriticalOpportunityLossSubtext(...)
  };
}

// ───────── CalculationResult 拡張案（calculation-logic.md §5 差分） ─────────
interface CalculationResult {
  threeYearSavings: number;
  annualProfitCreation: number;
  threeYearProfitCreation: number;
  totalThreeYearImpact: number;
  speedWarning: boolean;
  insourcingGap: number;
  speedWarningMonthlyLoss: number;  // ★追加: 円単位、speedWarning=false のとき 0
}
```

### 3.2 既存 spec への軽微な追記（本 Issue 完了後の運用作業）

本 Issue の成果物 PR と同時、あるいはマージ直後のフォローアップ PR で以下の追記を行う:

- `docs/spec/calculation-logic.md` §5 の `CalculationResult` 型に `speedWarningMonthlyLoss: number` を追加（Step 5-4 の結論）。§7 スピード警告セクションの末尾に「**月額損失の差し込み文言は `docs/spec/warning-copy.md` を参照**」の 1 行追記。§10 関連 Issue テーブルの Issue #4 行に参照箇所を追記。
- `docs/spec/result-dashboard.md` §8.5 のプレースホルダ `"{{CRITICAL_OPPORTUNITY_LOSS_MESSAGE}}"` 記述を更新し、`warning-copy.md` への参照に置き換え。§10.3 の `DashboardViewProps.warningMessage` を `{ headline: string; subtext: string }` 構造体型に更新。§13 関連 Issue テーブルの Issue #4 行に「文言確定済み、`warning-copy.md` 参照」と追記。
- `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` §3.1 の「スピード警告」行に「文言・発動条件の確定仕様は `docs/spec/warning-copy.md` を参照（Issue #4 で確定）」の 1 行追記を推奨（Issue #1/#2/#3 と同じ運用）。

### 3.3 コード変更

- **本 Issue では対象外**。Issue #6（Next.js 雛形）以降で、本仕様書を参照して `src/lib/messages.ts`・`DashboardView` props・`ResultDashboard` コンテナの警告バナー出し分けロジックを実装する。

### 3.4 配置判断

- Issue #1 / #2 / #3 と同じ原則: `.claude/` はマスター設計書（コンテキスト）、確定仕様は `docs/spec/` 配下。
- ファイル名 `warning-copy.md` は `docs/spec/` 配下の他 3 ファイルと並列関係。

---

## 4. 考慮事項・リスク

### R1: Issue #3 §8 の UI 骨格を改定したくなる誘惑

- 多段化（Step 3 選択肢B）を採用すると、色・アイコンを変える必要が出て Issue #3 §8.2 を改定することになる。
- → 本プランでは **選択肢C（単一 UI + 動的数字差し込み）を推奨** し、Issue #3 の確定を尊重する。多段化は §11 将来拡張へ。

### R2: `CalculationResult` 型拡張の波及

- Step 5-4 で `speedWarningMonthlyLoss: number` を `CalculationResult` に追加する提案。`calculation-logic.md §5` の型が変わると `calculation-logic.md` の改定が必要。
- → 本 Issue 完了時に `calculation-logic.md §5` に 1 行追記する運用（§3.2 参照）。Issue #1 の確定を破壊しない範囲の**追加**であり、既存 API は後方互換。
- 代案として `DashboardView` 側で `result.threeYearSavings / 36` により近似計算する方法もあるが、`repairCost` 分が混入して厳密に月額ベンダー費用ベースにならない。**厳密性を優先して型拡張を選ぶ**。

### R3: `monthlyLoss === 0` フォールバックの条件設計ミス

- Step 5-3 で「`speedWarning && insourcingLevel === 1 → showWarningBanner = false`」と決めた。ただしこの判定は `DashboardView`（props ベース、副作用なし）ではなく **`ResultDashboard` コンテナ側**で行う必要がある（Issue #3 §10.2 の責務分離）。
- → 本仕様書に「`ResultDashboard` が `speedWarning && insourcingLevel === 1` のとき `showWarningBanner={false}` を `DashboardView` に渡す」と明記。

### R4: 文言が「理論値」であることの誠実性

- 「月額 `{monthlyLoss}` 万円相当の機会損失が発生中」の数字は、厳密には「月額ベンダー費用 × 内製化ギャップ」であり、**更新待ちの期間に応じて累積しているわけではない**（月額費用はベンダーに払い続けている）。
- 表現として「機会損失が『発生中』」は、`updateWaitMonths >= 3` の顧客に対し「待ち時間の間も支払い続けている額」を示す意味で成立するが、**語義を厳密に突くと誤認を招きうる**。
- → 営業トークとして「更新を待っている間も毎月これだけベンダーに支払いが発生し続けており、内製化・AI 化すれば削減できる額です」と補足する運用を前提とする。本仕様書に「**この文言は営業補足トークを前提とした訴求文である**」旨の注記を §2 設計原則に入れる。
- 将来的に「更新待ち期間累積」で表現したい場合は、`monthlyVendorCost * updateWaitMonths * insourcingGap`（Step 5-2 選択肢D）への切替を未解決事項に記録。

### R5: バナー文言長の再確認

- Issue #3 §11 R6 で「警告バナー文言長の不確定性」が未解決として残っていた。本 Issue で文言が確定した時点で最長ケース（Step 4-4）を計測:
  - 英語見出し 25 文字 + 日本語サブ 23 文字 + 数字（最大 3 桁 + カンマ） ≒ 2 行。
  - タブレット 64px に収まることを想定。
- → 実装時（Issue #6 以降）に実機で文字サイズ・行間を確認。96px を超える場合は Issue #3 §8.3 の吸収方針に従う。

### R6: i18n 対応の将来余地

- 本 Issue の文言は日本語固定（英語見出しは固定フレーズ）。将来、英語圏展開の場合は日本語サブも英語化する必要がある。
- → `src/lib/messages.ts` の定数・関数は **i18n キーに差し替え可能な構造**で設計（関数の戻り値型は文字列、呼び出し側で i18n ライブラリに差し替える余地を残す）。§11 未解決事項へ記録。

### R7: PDF 内の数字固定問題

- Step 6-2 で「PDF は印刷時点の数字で固定」と決めた。ユーザーが入力を変えて再計算しても、以前保存した PDF の数字は古いまま。
- → これは PDF の性質上自然な挙動で、ユーザーも違和感は持たない（PDF は「その時点のレポート」として認識される）。本仕様書にも明記のみ。
- 将来、PDF に「生成日時」の注記を入れる提案は Issue #5 のスコープ。

### R8: 内製化カテゴリ別訴求（`calculation-logic.md §4.4`）とのトーン衝突

- ダッシュボードには「スピード警告バナー」と「内製化注記」（Issue #3 §3.3）が同時に表示されうる。
- 例: `insourcingLevel = 0.5`（半分内製）、`updateWaitMonths = 9`（半年〜1年）の場合
  - バナー: `CRITICAL OPPORTUNITY LOSS / 現在、月額 25 万円相当の機会損失が発生中`
  - 内製化注記: 「既に内製化されている 50% 相当分は削減余地から除外済み」
  - これら 2 つが同時に出ても、前者が緊急性（時間軸）、後者が透明性（計算根拠）を語るため **役割が直交している**。トーンは衝突しない。
- → 本仕様書 §2 設計原則に「カテゴリ別訴求と警告バナーは役割が直交しており、トーン衝突しない」と明記。

### R9: `speedWarningMonthlyLoss` のゼロ値と完全内製の重複

- `insourcingLevel === 1` のとき、`insourcingGap = 0` → `speedWarningMonthlyLoss = 0` となり、Step 5-3 のフォールバック（バナー非表示）と同じ結果になる。
- つまり「`speedWarning && insourcingLevel === 1` → `showWarningBanner = false`」は、論理的には「`speedWarning && speedWarningMonthlyLoss === 0` → `showWarningBanner = false`」と等価。
- → 実装上はどちらの条件でも良いが、**`insourcingLevel === 1` を判定条件にすると意味的に明瞭**（「完全内製顧客には警告を出さない」という業務ルールが読める）。`speedWarningMonthlyLoss === 0` は内部実装の結果であり業務ルールではない。本仕様書で前者を推奨する。

### R10: Step 1 の英語＋日本語併記でバナー 2 行化が必須化

- 選択肢C（推奨）では **必ず 2 行構成**（英語見出し 1 行 + 日本語サブ 1 行）となる。Issue #3 §8.3 の「タブレット 64px（1 行想定）」は再解釈する必要がある。
- → 本仕様書で「本 Issue の文言採用により、タブレットでも **2 行構成が既定**。高さ 64px はアイコンと 2 行テキストが収まる前提のため、行間を詰めた 2 行（行間 1.3〜1.4）で設計」と明記する。
- Issue #3 §8.3 の「1 行想定」の表現は緩める形で追記運用(§3.2 参照)。

### R11: 動的数字のアニメーション

- ヒーロー数値と補助カードはカウントアップアニメーション（Issue #3 §6.1）を持つ。スピード警告バナーの `{monthlyLoss}` 数字にカウントアップを適用するか。
- → **適用しない**推奨。理由:
  - バナーの役割は「警告」で、カウントアップは「インパクト演出」。役割が異なる。
  - バナーは Issue #3 §8.4 で「フェードイン 300ms のみ」が確定済み。カウントアップを足すと余計な視覚ノイズ。
  - 実装コスト増（カウントアップフックの適用箇所が増える）。
- → 本仕様書の §7.4 擬似コードに「バナー内の数字は **アニメーションなしの即時表示**」と明記。

### R12: 文言の社内承認プロセス

- 本プロジェクトの性格上、文言は **営業・マーケティング視点での最終承認**が必要（実装前に経営層／営業責任者のレビュー）。
- → 本仕様書 §11 未解決事項に「本文言の社内承認が完了次第、本仕様書を正本化」と記載。レビュー未済のうちは「案」として扱う運用を推奨。

---

## 5. 決定項目チェックリスト

Issue #4 をクローズするために、**以下すべてに結論が書かれていること**:

### メインフレーズ
- [ ] 英語／日本語／併記の方針（推奨: 併記）
- [ ] 英語見出しの確定文字列（`CRITICAL OPPORTUNITY LOSS`）
- [ ] 日本語サブテキストの確定文（候補 a〜e から採用）
- [ ] 見出しと本文のタイポグラフィ階層（フォントサイズ・ウェイト・色・行間）
- [ ] `letter-spacing` 指定の有無

### 表示トリガ条件
- [ ] `updateWaitMonths >= 3` を維持するか（推奨: 維持）
- [ ] 代替案（AND / OR 条件）の不採用理由の明記
- [ ] 非発動時の挙動（バナー非表示、ヒーロー繰り上げ）
- [ ] 入力選択肢との境界整合（`input-form.md §4.4` との対応確認）

### バリエーション
- [ ] 単一 UI / 多段化の選択（推奨: 単一 UI + 動的数字差し込み）
- [ ] 多段化を採用しない理由の明記
- [ ] 将来の多段化余地（未解決事項に記録）

### ビジュアル微調整
- [ ] 色・アイコンを Issue #3 §8.2 から変更するか（推奨: 変更なし）
- [ ] タイポグラフィ階層の決定
- [ ] 文言長の想定と 96px 吸収方針の再確認
- [ ] バナー高さ（タブレット）の扱い（1 行想定 → 2 行既定への更新）

### 動的数字差し込み
- [ ] 差し込み有無（推奨: あり）
- [ ] 差し込み対象（月額損失 / 累積損失 / 月数）
- [ ] 計算式（`monthlyVendorCost * insourcingGap`）
- [ ] `monthlyLoss === 0` フォールバック文言
- [ ] 完全内製顧客（`insourcingLevel === 1`）での挙動（バナー非表示）
- [ ] `CalculationResult` 型拡張の必要性（`speedWarningMonthlyLoss: number` の追加）

### PDF 連携
- [ ] PDF にも同じバナーを出すか（推奨: 出す）
- [ ] PDF 内数字は印刷時点で固定する旨の明記
- [ ] Issue #5 への申し送り事項の列挙

### 実装契約
- [ ] ファイル名: `src/lib/messages.ts`
- [ ] エクスポート API(定数 + テンプレート関数)の形
- [ ] `DashboardView` props の `warningMessage` 型（構造化オブジェクト）
- [ ] バナー内数字のアニメーション有無（推奨: なし）

### ドキュメント
- [ ] 仕様書の保存先: `docs/spec/warning-copy.md`
- [ ] マスター設計書 §3.1 からの参照関係明記
- [ ] `calculation-logic.md` / `input-form.md` / `result-dashboard.md` との整合確認
- [ ] [TODO / マージ後] `calculation-logic.md §5` への `speedWarningMonthlyLoss` 追記
- [ ] [TODO / マージ後] `result-dashboard.md §8.5`・§10.3 への追記（警告文言確定・ `warningMessage` 型更新）
- [ ] [TODO / マージ後] Issue #5・#6 の説明欄に「警告コピー仕様は `docs/spec/warning-copy.md` を参照」と追記

### 承認プロセス
- [ ] 文言の社内承認（営業・マーケティング視点レビュー）

---

## 6. 進め方（実働手順）

1. 本プランを元に、Issue #4 担当者（またはレビュワー）と §5 のチェックリストを 1 項目ずつ議論・合意する。
2. `docs/spec/calculation-logic.md` §5・§7・§9、`docs/spec/input-form.md` §4.4、`docs/spec/result-dashboard.md` §8 を再読し、前提の整合を取る。
3. Step 1〜7 の推奨案（英語＋日本語併記、`>= 3` 維持、単一 UI + 動的差し込み、Amber 500 維持、月額損失差し込み、PDF 併用、`src/lib/messages.ts`）を採用するか、代替案を採用するかを決定する。
4. 合意結果を `docs/spec/warning-copy.md` に Markdown で記述する（§3.1 の目次に沿って）。
5. §3.1 の擬似コード（`CRITICAL_OPPORTUNITY_LOSS_HEADLINE` 定数、`buildCriticalOpportunityLossSubtext` 関数、`DashboardViewProps` 改定案、`CalculationResult` 拡張案）を本仕様書に貼り付ける。
6. §4 の考慮事項・リスクを「11. 未解決事項 / 将来拡張」セクションに棚卸しして記録（特に R2 / R6 / R10 / R12 は既存 spec 改定／外部承認を伴うため明示的に記録）。
7. 本仕様書の PR / commit を Issue #4 にリンクし、クローズ。
8. マージ後のフォローアップ作業として、以下を別 PR で実施:
   - `docs/spec/calculation-logic.md` §5 に `speedWarningMonthlyLoss: number` を追加、§7・§10 に `warning-copy.md` への参照追記。
   - `docs/spec/result-dashboard.md` §8.5 のプレースホルダ記述を `warning-copy.md` 参照に置換、§8.3 のタブレット 64px を「2 行既定」へ更新、§10.3 の `warningMessage` 型を構造化オブジェクトに更新、§13 関連 Issue テーブルに参照追記。
   - マスター設計書 `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` §3.1 に `warning-copy.md` への 1 行参照を追加（Issue #1 / #2 / #3 と同じ運用）。
   - Issue #5・#6 の説明欄に「警告コピー仕様は `docs/spec/warning-copy.md` を参照」と追記。
9. 文言の社内承認（R12）が未済の場合、本仕様書のヘッダに「**ドラフト（営業・マーケティング承認待ち）**」と明示し、承認後に正本化する。

---

## 7. 参考文献

本 Issue は新規ドキュメント作成タスクのため、「既存の参照元ファイル」と「新規作成予定ファイル」を併記する:

- `/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` — 参照元マスター設計書。§1.2（ターゲット: 中小〜中堅企業の経営者・役員）、§1.3（警告メッセージを視覚的に表示する要件）、§3.1（スピード警告：更新待ち「3ヶ月以上」で『CRITICAL OPPORTUNITY LOSS』と表示）、§3.3（デザインガイドライン: アクセントカラー Amber 500）が本 Issue の原点。
- `/Users/YS/development/matatabi-calculator/docs/spec/calculation-logic.md` — Issue #1 の成果物。§4.4（内製化カテゴリ別訴求、本 Issue のトーン整合）、§5（`CalculationResult` 型、`speedWarning: boolean` と本 Issue で拡張提案する `speedWarningMonthlyLoss`）、§7（スピード警告発動条件 `updateWaitMonths >= 3`）、§9 決定項目チェックリスト「スピード警告発動条件」が本 Issue の前提。
- `/Users/YS/development/matatabi-calculator/docs/spec/input-form.md` — Issue #2 の成果物。§4.4（`updateWaitMonths` 離散 5 段階、下 3 段階で警告発動）が本 Issue のバリエーション判断（Step 3）と境界整合（Step 2-2）の根拠。
- `/Users/YS/development/matatabi-calculator/docs/spec/result-dashboard.md` — Issue #3 の成果物。§8（警告バナー UI 骨格: 位置・色・アイコン・高さ・アニメーション）、§8.5（文言プレースホルダ化と `src/lib/messages.ts` 運用）、§10.2（`DashboardView` 責務分離、`PdfDashboard` ラッパ）、§10.3（`DashboardViewProps.warningMessage?: string`）、§11 R6（警告バナー文言長の不確定性）が本 Issue の UI 骨格前提。
- `/Users/YS/development/matatabi-calculator/.claude/issue-order.md` — 参照元。フェーズ0 #4（#1 に依存、独立タスク、ブロッカーは #1 のみ）。
- `/Users/YS/development/matatabi-calculator/working/plans/issue-3_result-dashboard-spec.md` — 本プランの構成スタイルの参照元（「このプランの性格」「概要」「意思決定ステップ」「変更ファイル一覧」「考慮事項・リスク」「決定項目チェックリスト」「進め方」「関連ファイル」の章立て）。
- `/Users/YS/development/matatabi-calculator/working/plans/issue-1_calculation-logic-assumptions.md` / `/Users/YS/development/matatabi-calculator/working/plans/issue-2_input-form-ui-spec.md` — 同上、スタイル参照元。
- `/Users/YS/development/matatabi-calculator/docs/spec/warning-copy.md` — **新規作成予定**。本 Issue の主成果物。
