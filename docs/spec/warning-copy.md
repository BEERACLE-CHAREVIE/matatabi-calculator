# 警告コピー仕様書

> 対象: ROI診断アプリ「またたび計算機」 / 関連Issue: #4 / マスター設計書: [`.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md`](../../.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md) §3.1 / 前提: [`calculation-logic.md`](./calculation-logic.md) / [`input-form.md`](./input-form.md) / [`result-dashboard.md`](./result-dashboard.md)

本ドキュメントは、マスター設計書 §3.1 の「スピード警告：更新待ち「3ヶ月以上」で「CRITICAL OPPORTUNITY LOSS」と表示」を実装可能なレベルまで確定するための仕様書です。ダッシュボード最上部に出すスピード警告バナーの **文言本体（見出し／サブテキスト）**、**表示トリガ条件の最終確認**、**バリエーション（多段化の是非）**、**ビジュアル微調整**、**動的数字差し込み**、**PDF 連携方針**、**実装契約（文字列定数・テンプレート関数・`DashboardView` props 型）** を本書で確定します。UI 骨格（位置・色・アイコン・高さ・アニメーション）は Issue #3 の [`result-dashboard.md §8`](./result-dashboard.md) で既に確定済みであり、本書はその骨格に流し込む文言と周辺の実装契約を担当します。

> **本書のステータス**: ドラフト（営業・マーケティング視点での文言最終承認待ち）。§11.5 参照。承認完了次第、本ヘッダから「ドラフト」表示を外し正本化する。

---

## 1. 前提と目的

### 1.1 目的
- スピード警告バナーで表示する **文言本体**（英語見出し + 日本語サブテキスト）を確定する。
- **表示トリガ条件**（`updateWaitMonths >= 3`）の維持を再確認し、代替案の不採用理由を明記する。
- **バリエーション方針**（単一 UI か多段化か）を確定する。
- Issue #3 §8 の UI 骨格を前提に、**タイポグラフィ階層**と **文言長の吸収方針**を確定する。
- **動的数字差し込み**の有無・計算式・フォールバック条件を確定する。
- **PDF（Issue #5）側での表示方針**を確定する。
- 実装時の **文字列定数・テンプレート関数・`DashboardView` props 型**を確定する。

### 1.2 前提
本仕様書は Issue #1〜#3 の成果物に依存する。特に以下の決定事項を前提とする:

- `CalculationResult` 型（[`calculation-logic.md §5`](./calculation-logic.md)）— `speedWarning: boolean` は「更新待ち 3 ヶ月以上」で `true`。
- `updateWaitMonths` は離散 5 段階セレクト（[`input-form.md §4.4`](./input-form.md)）— `0.5 / 1.5 / 4.5 / 9 / 18` のうち上位 3 値（`4.5 / 9 / 18`）で警告発動。
- 警告バナー UI 骨格（[`result-dashboard.md §8`](./result-dashboard.md)）— 位置は最上部、背景 Amber 500/10〜15%、アイコン Lucide `alert-triangle` (Amber 600)、テキスト `slate-900`、高さ 64〜96px、フェードイン 300ms。
- `DashboardView` は props ベースで副作用を持たない（[`result-dashboard.md §10.2`](./result-dashboard.md)）。
- 表示単位・丸めルール: **万円単位で四捨五入**、3 桁区切り（[`calculation-logic.md §6`](./calculation-logic.md)）。
- ターゲットペルソナ: 中小〜中堅企業の経営者・役員（マスター設計書 §1.2）。

### 1.3 本書のスコープ外

以下は本書のスコープではない:

- 警告以外の文言（内製化カテゴリ別訴求、入力エラー文言、CTA コピー等）。別 Issue で管理する。
- UI 骨格の再設計（色・アイコン・余白・アニメーション）。[`result-dashboard.md §8`](./result-dashboard.md) が正本で、本書では **微調整の有無のみ判定**する。
- PDF レイアウト（A4 配置、フォント埋め込み等）。Issue #5 のスコープ。

---

## 2. 設計原則

本書の文言・条件設計は、以下の原則に従う。

| 原則 | 意味 | 帰結 |
|---|---|---|
| **商談テンポ優先** | 経営者が「1 秒で強度、3 秒で意味」を受け取れること。 | サブテキストは原則 30 文字以内に収める。 |
| **経営者語彙との整合** | 中小〜中堅企業の経営層に即理解可能な日本語ビジネス語彙で書く。 | 「機会損失」「削減余地」「流出」等を採用、IT 専門用語・外来語多用は避ける。 |
| **説明責任** | 営業担当が「なぜこの警告が出るのか」を即答できる構造。 | 文言内に発動条件（例: 「3ヶ月以上の更新待ち」）か金額の根拠を埋め込む。 |
| **誠実な結果** | 「理想形に近い顧客」に対して無意味な警告を出さない。 | 完全内製顧客（`insourcingLevel === 1`）では警告バナーを非表示にする（§4.3 / §7.2）。 |
| **Issue #1-#3 との整合** | 既存 spec の確定事項を **変更せず継承**し、差分は追記の形で最小化する。 | 発動条件（`>= 3`）・UI 骨格・丸めルールは改定せず、本書で取り込むのは `warningMessage` 型の構造化と `CalculationResult` への 1 フィールド追加のみ。 |
| **カテゴリ別訴求と役割直交** | 警告バナーと内製化カテゴリ別訴文（[`calculation-logic.md §4.4`](./calculation-logic.md)）は同時表示されうるが、**バナー=時間軸の緊急性**、**カテゴリ別訴文=計算根拠の透明性**と役割が直交する。 | 両者の文言は互いに衝突しない語彙で設計する。 |
| **営業補足トーク前提** | 本書の文言は「営業担当が隣にいて補足説明する」商談文脈での訴求文である。単独の純然たるシステムメッセージではない。 | 語義の厳密性より訴求力を優先する判断が許容される（§4.4 R1 参照）。 |

---

## 3. メインフレーズ

### 3.1 採用: 英語＋日本語併記

マスター設計書 §3.1 の「『CRITICAL OPPORTUNITY LOSS』と表示」を継承しつつ、日本語サブテキストを併記する **2 段構え**を採用する。

- **メイン（見出し）**: `CRITICAL OPPORTUNITY LOSS`（英語、全大文字、`alert-triangle` アイコンの右に配置）。
- **サブ（本文）**: 日本語 1 行（§3.3 の採用案）。動的数字差し込みあり（§7）。

**採用理由**:
- マスター設計書のフレーズを継承し、商品コンセプト（「またたび計算機」のキャッチコピーとしての `CRITICAL OPPORTUNITY LOSS`）との連続性を保つ。
- 英語で視覚的インパクトを与え、日本語で即理解を与える **二段階認知**が、商談で営業担当の切り出しトーク（「これ、英語ですが要は…」）を誘発する。
- 将来の i18n 対応時も、日本語版・英語版の両方が既に揃っている形でベースラインを確保できる。

**不採用案**:
- **英語フレーズ単独**: ターゲットの経営層に英語の意味が即伝わらないリスク（「かっこいい雰囲気」で終わる）。
- **日本語単独**: マスター設計書のブランドフレーズを捨てることになる。日本語の自然な訳（「重大な機会損失」）はマイルドで危機感が弱い。

### 3.2 英語フレーズのタイポグラフィ

| 項目 | 値 |
|---|---|
| フォント | `Inter` または `Noto Sans` 系 sans-serif（Issue #7 のフォント設定に追随） |
| ウェイト | `700`（bold） |
| フォントサイズ | タブレット 16〜18px / スマホ 14〜16px / デスクトップ 16〜18px |
| 色 | `slate-900`（Issue #3 §8.2 のテキスト色を継承） |
| 文字間 (`letter-spacing`) | `0.05em`〜`0.08em`（緊急感と高級感の両立） |
| 大文字／小文字 | 原文のまま全大文字 |
| アイコン連結 | 見出しの左に `alert-triangle` (Amber 600) を縦中央揃えで配置、アイコンと見出しの間隔 12px（Issue #3 §8.3 準拠） |

> **補足**: アイコンの色（Amber 600）が「警告サイン」の役割を担い、見出しテキストは `slate-900` で可読性を優先する。見出しを Amber に染めると情報過多となるため避ける。

### 3.3 日本語サブテキストの候補と採用案

サブテキストの候補を以下に列挙する。最終 1 文は **12〜30 文字**を目安とする（Issue #3 §8.3 の高さ制約と §2 「商談テンポ優先」より）。

| # | 候補 | 文字数 | 評価 | 採否 |
|---|---|---|---|---|
| a | 重大な機会損失が発生中 | 12 | 直訳、簡潔だが説明責任が弱い | 不採用 |
| b | 更新の待ち時間が収益を削っています | 17 | 因果を明示、経営者語彙と整合 | 予備 |
| c | 3ヶ月以上の更新待ちで機会損失が累積中 | 19 | 発動条件も埋め込み、自己説明的 | **採用（フォールバック用）** |
| d | 更新を待つほどコスト流出が累積します | 18 | 動詞で行動喚起、強い | 不採用（トーンが強すぎる） |
| e | `現在、月額 {monthlyLoss} 万円相当の機会損失が発生中` | 動的（最短 21 / 最長 25 文字、半角数字も 1 文字換算） | 数字差し込み（§7） | **採用（既定）** |

**採用方針**:
- **既定（動的差し込み可能な場合）**: 候補 e — `現在、月額 {monthlyLoss} 万円相当の機会損失が発生中`
- **フォールバック（`monthlyLoss === 0` の場合）**: 候補 c — `3ヶ月以上の更新待ちで機会損失が累積中`

※ ただし `insourcingLevel === 1`（完全内製）の場合、§4.3 の判定でバナー自体を非表示にするため、実運用でフォールバック文言が表示されるのは **`speedWarning === true && monthlyVendorCost === 0`** という極限ケースのみ。

---

## 4. 表示トリガ条件

### 4.1 採用: 現状維持（`updateWaitMonths >= 3`）

[`calculation-logic.md §7`](./calculation-logic.md) で確定済みの **`updateWaitMonths >= 3`**（3 ヶ月以上で発動）を本書でも維持する。本書で新たな発動条件を足すことはしない。

[`input-form.md §4.4`](./input-form.md) の離散 5 段階セレクトでは、上位 3 値（`4.5 / 9 / 18`）で警告が発動する。選択肢ラベル境界（「1〜2ヶ月」と「3〜6ヶ月」の間）が警告境界と一致しており、営業担当が「3 ヶ月以上の選択肢を選ぶと警告が出る」と即説明できる。

### 4.2 代替案の不採用理由

#### AND 条件で絞り込む案（例: `updateWaitMonths >= 3 && monthlyVendorCost >= N`）
- **不採用理由**: 閾値 `N` の根拠が不明確で説明責任を追加で抱え込む。Issue #1 の確定条件を本書で上書きすることになり、`calculation-logic.md` の改定が連鎖する（spec の原子性を壊す）。`speedWarning: boolean` が `CalculationResult` の戻り値に含まれる設計（§5）との責務分離も曖昧になる。

#### OR 条件で拡張する案（例: `|| monthlyVendorCost >= 500 万円`）
- **不採用理由**: 「CRITICAL OPPORTUNITY LOSS」というメインフレーズは **「待ち時間が収益を削る」**という因果を指すのが核（マスター設計書 §3.1）。OR で別ファセットを足すとフレーズと内容が乖離する。

追加条件を入れたい場合は別 Issue（将来拡張）として切り出す。

### 4.3 非発動時の挙動（完全内製顧客の取り扱いを含む）

#### 4.3.1 `speedWarning === false`（更新待ち 3 ヶ月未満）

- バナー DOM 自体を描画しない（[`result-dashboard.md §8.1`](./result-dashboard.md) 参照）。
- ヒーローが最上段に繰り上がる。
- 警告コピー定数・テンプレート関数も参照されない。

#### 4.3.2 `speedWarning === true && insourcingLevel === 1`（完全内製）

- **バナー非表示**（§2 「誠実な結果」原則）。完全内製顧客は `insourcingGap = 0` のため「月額機会損失 = 0 円」となり、「0 万円相当の機会損失」は誠実性を欠く表示となる。
- この判定は `DashboardView`（props ベース、副作用なし）ではなく **`ResultDashboard` コンテナ側**で行い、`showWarningBanner={false}` を `DashboardView` に渡す（[`result-dashboard.md §10.2`](./result-dashboard.md) の責務分離）。
- 判定条件は `insourcingLevel === 1` を用いる（「完全内製顧客には警告を出さない」という業務ルールが読める形）。`speedWarningMonthlyLoss === 0` で判定する案もあるが、後者は内部実装の結果であり業務ルールではないため採らない。

#### 4.3.3 判定フロー（擬似コード）

```ts
// ResultDashboard コンテナ（Issue #6 以降で実装）
const showWarningBanner =
  result.speedWarning && insourcingLevel !== 1;

return (
  <DashboardView
    result={result}
    insourcingLevel={insourcingLevel}
    animated={animated}
    showWarningBanner={showWarningBanner}
    warningMessage={
      showWarningBanner
        ? buildWarningMessage(result.speedWarningMonthlyLoss)
        : undefined
    }
  />
);
```

### 4.4 入力選択肢との境界整合

[`input-form.md §4.4`](./input-form.md) の 5 段階と本書の警告境界は以下のように対応する:

| ラベル | 代表値 (`updateWaitMonths`) | `speedWarning` | バナー表示（insourcingLevel < 1 の場合） |
|---|---|---|---|
| すぐ対応（〜1ヶ月） | `0.5` | `false` | 非表示 |
| 1〜2ヶ月 | `1.5` | `false` | 非表示 |
| 3〜6ヶ月 | `4.5` | `true` | **表示** |
| 半年〜1年 | `9` | `true` | **表示** |
| 1年以上 | `18` | `true` | **表示** |

この対応は `input-form.md §4.4` のラベル境界と一致しており、営業担当が選択肢を指差して「この選択から警告が出ます」と説明できる。

---

## 5. バリエーション（多段化の是非）

### 5.1 採用: 単一 UI + 動的数字差し込み

警告発動カテゴリは `updateWaitMonths` の 3 段階（`4.5 / 9 / 18`）だが、**色・アイコン・フレーズは単一で統一**し、動的数字差し込み（§7）によって「段階表現」を自然に発生させる。

**採用理由**:
- Issue #3 §8 の UI 骨格（Amber 500 単一色、`alert-triangle` 単一アイコン）を一切改定せずに済む。
- `CalculationResult` に `warningLevel: "caution" | "warning" | "critical"` 等の追加拡張を要さず、本書での型拡張は `speedWarningMonthlyLoss: number` の 1 フィールドのみ。
- 動的数字（月額機会損失）が段階ごとに自然に変化することで、「1 ヶ月 30 万円」と「1 ヶ月 1,200 万円」のような重みの差が数字で表現される。
- 「CRITICAL OPPORTUNITY LOSS」は **最上位の強度を示唆するフレーズ**であり、段階化すると「下位段階での CRITICAL 表示は誇大」という矛盾が生じる。
- ターゲット（中小〜中堅企業の経営者）には「出ているか／出ていないか」の 2 値が意思決定に貢献しやすい。

**不採用案**:
- **3 段階で文言／色を出し分ける**: Issue #3 §8.2 の改定を誘発、`CalculationResult` 型拡張が必要、実装・テストコスト増、`CRITICAL` フレーズの誇大問題が発生。段階化の具体案（色・アイコンの候補）は §11.3 の将来拡張に記録する。

### 5.2 将来の多段化余地

商談現場で「1 年以上の顧客と 3 ヶ月の顧客で同じ警告は弱い」というフィードバックが出た場合、後続 Issue として多段化を検討する余地を §11.3 に記録する。

---

## 6. ビジュアル微調整

Issue #3 §8 の UI 骨格は **一切改定せず継承**する。本章では本書で新たに確定する「タイポグラフィ階層」と「文言長の吸収方針」を定義する。

### 6.1 色・アイコン（Issue #3 §8.2 を継承）

- 背景: Amber 500 (#F59E0B) 透明度 10〜15%（`bg-amber-500/10` 相当）
- 枠線: Amber 500 実線 1px
- アイコン: Lucide `alert-triangle`、色 Amber 600 (#D97706)、サイズ 20×20px
- テキスト色: 見出し `slate-900`（[`result-dashboard.md §8.2`](./result-dashboard.md) を継承）、サブテキスト `slate-700`（**本書 §6.2 で新規確定**）

背景・枠線・アイコン・見出し色は [`result-dashboard.md §8.2`](./result-dashboard.md) を正本とし本書では再掲のみ（色定義の改定なし）。ただしサブテキスト用 `slate-700` の階層化は本書 §6.2 で新規確定する（`result-dashboard.md §8.2` 本体には見出し／サブの区別がないため、本書による追加確定として §11.2 のフォローアップで `result-dashboard.md` 側にも反映する）。

### 6.2 タイポグラフィ階層

本書で新規に確定する。見出し（英語、太字、大きめ）→ サブ（日本語、細字、小さめ）の階層で「英語で掴む → 日本語で理解する」視線誘導を作る。

| 要素 | タブレット | スマホ | デスクトップ | ウェイト | 色 | 行間 |
|---|---|---|---|---|---|---|
| 英語見出し `CRITICAL OPPORTUNITY LOSS` | 16〜18px | 14〜16px | 16〜18px | 700 | `slate-900` | 1.2 |
| 日本語サブテキスト | 13〜14px | 12〜13px | 13〜14px | 400 | `slate-700`（本書で新規確定） | 1.4〜1.5（スマホ 1.4） |
| アイコン | 20×20px | 20×20px | 20×20px | — | Amber 600 | — |
| `letter-spacing`（見出しのみ） | 0.05〜0.08em | 同左 | 同左 | — | — | — |

- アイコンは見出しに縦中央揃えで並べ、サブテキストは見出しの下（2 行目）に配置する。
- サブテキストの `slate-700` は、見出し `slate-900` よりやや弱いコントラストにすることで見出しを目立たせる意図。

### 6.3 文言長の想定と 96px 吸収

本書採用の最長ケース（§7.4）を試算し、Issue #3 §8.3 の高さ吸収範囲に収まることを確認する。

**最長ケース**:
- 英語見出し: `CRITICAL OPPORTUNITY LOSS`（半角 25 文字、1 行）
- 日本語サブ: `現在、月額 1,200 万円相当の機会損失が発生中`（25 文字、1 行。半角数字・カンマ・半角スペースも各 1 文字として換算。§3.3 の「12〜30 文字目安」と同じ数え方）
- アイコン + 見出し + サブ = **2 行構成**（タブレット 64px 想定に収まる）

**吸収方針**（Issue #3 §8.3 / §11 R6 継承）:
- バナー高さは **最小 64px・最大 96px** を許容。
- スマホ縦で日本語サブが折り返した場合（2 行以上）、96px まで許容。96px を超える場合はヒーロー数値の `font-size` を `clamp` 下限（`2.5rem`）に切り替えて 1 画面収まりを維持する。
- 実装時（Issue #6 以降）に実機で最長ケースのレイアウトを確認する。

> **補足**: Issue #3 §8.3 の「タブレット 64px（1 行想定）」は、本書の文言採用（英語＋日本語併記）により **2 行構成が既定**となる。本書ではタブレットでも行間を詰めた 2 行（行間 1.3〜1.4）が 64px に収まる前提で設計する。この点は §11.2 のフォローアップで `result-dashboard.md §8.3` を追記更新する運用を取る。

### 6.4 アニメーション（Issue #3 §8.4 を継承）

- マウント時にフェードイン 300ms のみ。
- バナー内の数字（`{monthlyLoss}` 部分）には **カウントアップアニメーションを適用しない**。ヒーロー数値・補助カードは Issue #3 §6.1 でカウントアップするが、バナーは「警告」が役割で、カウントアップは「インパクト演出」であり役割が異なる。フェードインだけで十分。

---

## 7. 動的数字差し込み

### 7.1 採用: 月額損失差し込み

サブテキストに **月額の機会損失額**を動的に差し込む（§3.3 候補 e）。

- 計算式: `monthlyLoss = monthlyVendorCost * insourcingGap`（円単位）
- 万円換算: `Math.round(monthlyLoss / 10_000)` → 「◯◯万円」（3 桁区切り、`calculation-logic.md §6` 準拠）
- 表示例: `現在、月額 120 万円相当の機会損失が発生中`

**採用理由**:
- 経営者に最も響く「月額」の数字を示せる。
- `insourcingGap` を乗じることで、内製化済みの顧客に対して「除外済み」の原則（[`calculation-logic.md §4.2`](./calculation-logic.md)）と整合する。
- §5.1 の「単一 UI + 動的差し込みで段階表現」を実現する核となる。

**不採用案**:
- **固定文言（数字差し込みなし）**: 単調で段階表現不能。
- **月数のみ差し込み**（例: `3〜6ヶ月の更新待ちで累積中`）: 金額換算の方が経営者の意思決定に直結する。
- **累積損失差し込み**（`monthlyVendorCost * updateWaitMonths * insourcingGap`）: 補助カードの「3 年間の止血」と金額が競合し情報の二重化となる。`updateWaitMonths` は離散代表値（4.5/9/18）のため「4.5ヶ月累積」のような曖昧な表現になる。

### 7.2 `monthlyLoss === 0` のフォールバック

フォールバック文言は §3.3 候補 c（`3ヶ月以上の更新待ちで機会損失が累積中`）を用いる。ただし以下の 2 パスで実際にフォールバック文言が表示されることは稀:

- `insourcingLevel === 1`（完全内製）: §4.3.2 により **バナー自体を非表示**。フォールバック文言は表示されない。
- `monthlyVendorCost === 0` かつ `speedWarning === true`: 極めて稀なケース。この場合のみフォールバック文言が表示される。

従ってフォールバック文言は「実質的に極限ケース専用の保険文」として位置付ける。

### 7.3 `calculation-logic.md §5` への型拡張要請

動的差し込みには `CalculationResult` に新フィールド `speedWarningMonthlyLoss: number`（円単位、`monthlyVendorCost * insourcingGap`）を追加する必要がある。

**追加条件**:
- `speedWarning === true` のとき: `speedWarningMonthlyLoss = monthlyVendorCost * insourcingGap`
- `speedWarning === false` のとき: `speedWarningMonthlyLoss = 0`

**代案との比較**:
- **`DashboardView` 側で計算する案**（`result.threeYearSavings / 36` で近似）: `repairCost * 3回/年 × 3年` 分が混入するため厳密な月額ベンダー費用ベースにならない。**厳密性を優先し、`CalculationResult` への追加を採用**する。

本拡張は既存 API（`speedWarning` boolean）を破壊しない **追加のみ**であり、後方互換。`calculation-logic.md §5` への 1 行追記はマージ後のフォローアップで対応する（§11.1）。

### 7.4 最終文言テンプレートと擬似コード

```
見出し: CRITICAL OPPORTUNITY LOSS
サブ:   現在、月額 {monthlyLoss} 万円相当の機会損失が発生中   ← speedWarningMonthlyLoss > 0 のとき
        3ヶ月以上の更新待ちで機会損失が累積中                 ← speedWarningMonthlyLoss <= 0 のとき
```

- `{monthlyLoss}` は `Math.round(speedWarningMonthlyLoss / 10_000)` の 3 桁区切り整数（万円単位）。テンプレート関数の引数は **円単位**で渡し、関数内で万円変換する契約とする（下記擬似コード参照）。
- スペーシング: 数字の前に半角スペース 1 個、後ろはスペースなしで「万円」に続く（例: `月額 120 万円相当`）。§3.3 テーブル・§10 表示例も同じ書式に統一する。

実装の正本は以下の擬似コードとする（Issue #6 以降で `src/lib/messages.ts` に実装）:

```ts
// ───── スピード警告の文字列定数・テンプレート関数 ─────

/** スピード警告のヘッドライン（英語）。不変の固定文言。 */
export const CRITICAL_OPPORTUNITY_LOSS_HEADLINE = "CRITICAL OPPORTUNITY LOSS";

/**
 * スピード警告の本文を組み立てる。
 *
 * monthlyLossYen > 0 のとき: 月額機会損失を万円単位で差し込む。
 * monthlyLossYen <= 0 のとき: 汎用のフォールバック文言を返す（本関数自身が防御）。
 *
 * 典型的な呼び出し条件は `speedWarning === true && insourcingLevel !== 1`
 * （詳細は §4.3 の判定フロー参照）。ResultDashboard コンテナが
 * `showWarningBanner` の判定を行い、本関数はその結果を受けて文言生成のみ担当する。
 */
export function buildCriticalOpportunityLossSubtext(monthlyLossYen: number): string {
  if (monthlyLossYen <= 0) {
    return "3ヶ月以上の更新待ちで機会損失が累積中";
  }
  const manYen = Math.round(monthlyLossYen / 10_000);
  return `現在、月額 ${manYen.toLocaleString("ja-JP")} 万円相当の機会損失が発生中`;
}

/**
 * DashboardView の warningMessage props に渡す構造化オブジェクトを組み立てる。
 * speedWarningMonthlyLoss を受け取り、headline / subtext をまとめて返す。
 */
export function buildCriticalOpportunityLossMessage(monthlyLossYen: number): {
  headline: string;
  subtext: string;
} {
  return {
    headline: CRITICAL_OPPORTUNITY_LOSS_HEADLINE,
    subtext: buildCriticalOpportunityLossSubtext(monthlyLossYen),
  };
}
```

> **注記**: 本擬似コードは本書を **実装時の正本**として扱う。Issue #6 以降で `src/lib/messages.ts` に実装する際、この形から逸脱する場合は本書を先に改定すること。

---

## 8. PDF（Issue #5）連携

### 8.1 PDF にも同じバナーを出す

マスター設計書 §1.3 の「診断結果ダッシュボード：数値、グラフ、**警告メッセージ**を視覚的に表示」に従い、PDF にも同じ警告バナーを出す。

- Issue #3 §10.2 の `DashboardView` を PDF 版ラッパ `PdfDashboard` からも再利用する設計に従い、同じ `warningMessage` props を注入する。
- PDF 固有のフォントサイズ調整は Issue #5 で A4 レイアウトに合わせて検討する（本書では指定しない）。

### 8.2 数字は印刷時点で固定

PDF 生成時、`PdfDashboard` が `DashboardView` をレンダリングする時点の `result.speedWarningMonthlyLoss` を埋め込む。PDF は静的ドキュメントとして出力され、以降は更新されない。ユーザーが入力を変えて再計算しても、以前保存した PDF の数字は古いまま残る。

これは PDF の性質上自然な挙動で、ユーザーは違和感を持たない（PDF は「その時点のレポート」として認識される）。

### 8.3 Issue #5 への申し送り

Issue #5（PDF レポートのレイアウト仕様）で以下を検討する:

- A4 比率でのバナー高さ・フォントサイズ調整（画面のタブレット 64px 想定とは異なる）。
- PDF 内に「生成日時」の注記を入れるか（入力値が変わった場合に PDF の古さを示す手がかり）。
- PDF での `animated=false` 強制時、フェードインアニメーションも無効化される（静止画像として出力されるため自明）。

---

## 9. 実装契約

### 9.1 ファイル: `src/lib/messages.ts`

文字列定数・テンプレート関数は `src/lib/messages.ts` に集約する。

**採用理由**:
- 将来、他の文言（内製化カテゴリ別訴求、エラー文言等）も同ファイルに集約でき、i18n 対応時に移行しやすい。
- ファイル名の汎用性が高く、警告以外の文言が増えても責務が曖昧にならない。

**不採用案**: `src/lib/warnings.ts`（スピード警告専用）は、他文言が別ファイルになり文言管理が分散するため採らない。

### 9.2 エクスポート API（定数 + 関数）

§7.4 の擬似コードを正本とする。エクスポート API は以下の 3 つ:

| 名前 | 種類 | 戻り値 / 値 | 備考 |
|---|---|---|---|
| `CRITICAL_OPPORTUNITY_LOSS_HEADLINE` | 文字列定数 | `"CRITICAL OPPORTUNITY LOSS"` | 不変 |
| `buildCriticalOpportunityLossSubtext` | 関数 | `string` | 引数: `monthlyLossYen: number` |
| `buildCriticalOpportunityLossMessage` | 関数 | `{ headline: string; subtext: string }` | `DashboardView` props に直接渡せる形 |

### 9.3 `DashboardView` props への反映案

`DashboardView` の props のうち、`warningMessage` の型を Issue #3 §10.3 の `string` オプショナルから **構造化オブジェクト**に更新する。本書完了後のフォローアップで `result-dashboard.md §10.3` を追記更新する（§11.2）。

```ts
// result-dashboard.md §10.3 への差分提案
interface DashboardViewProps {
  result: CalculationResult;
  insourcingLevel: InsourcingLevel;
  animated: boolean;
  showWarningBanner: boolean;
  warningMessage?: {
    headline: string;   // ← CRITICAL_OPPORTUNITY_LOSS_HEADLINE
    subtext: string;    // ← buildCriticalOpportunityLossSubtext(...)
  };
}
```

**採用理由**: 案α（`warningHeadline / warningSubtext` の 2 プロパティに分ける）と比較して、プロパティが増えすぎず、Issue #3 §10.3 の既存 `warningMessage` 1 プロパティの形を継承できる。

---

## 10. 表示例

本書で確定した文言・UI を統合した表示例を以下に示す（擬似ワイヤー）。以降のワイヤー中の `⚠`（U+26A0）は Lucide `alert-triangle` アイコン（Amber 600、§3.2 / §6.1）の代替表記であり、実装では絵文字ではなく Lucide コンポーネントを描画する。

### 10.1 標準ケース（`insourcingLevel = 0.5`, `updateWaitMonths = 9`, `monthlyVendorCost = 500,000`）

- `speedWarning = true`, `speedWarningMonthlyLoss = 250,000 円 = 25 万円`
- バナー表示: **あり**

```
┌──────────────────────────────────────────────────────────┐
│ ⚠  CRITICAL OPPORTUNITY LOSS                              │
│     現在、月額 25 万円相当の機会損失が発生中              │
└──────────────────────────────────────────────────────────┘
```

### 10.2 低額ケース（`insourcingLevel = 0`, `updateWaitMonths = 4.5`, `monthlyVendorCost = 100,000`）

- `speedWarning = true`, `speedWarningMonthlyLoss = 100,000 円 = 10 万円`
- バナー表示: **あり**

```
┌──────────────────────────────────────────────────────────┐
│ ⚠  CRITICAL OPPORTUNITY LOSS                              │
│     現在、月額 10 万円相当の機会損失が発生中              │
└──────────────────────────────────────────────────────────┘
```

### 10.3 高額ケース（`insourcingLevel = 0.25`, `updateWaitMonths = 18`, `monthlyVendorCost = 1,600,000`）

- `speedWarning = true`, `speedWarningMonthlyLoss = 1,200,000 円 = 120 万円`
- バナー表示: **あり**（文言最長想定ケース、§6.3）

```
┌──────────────────────────────────────────────────────────┐
│ ⚠  CRITICAL OPPORTUNITY LOSS                              │
│     現在、月額 120 万円相当の機会損失が発生中             │
└──────────────────────────────────────────────────────────┘
```

### 10.4 完全内製ケース（`insourcingLevel = 1`, `updateWaitMonths = 9`）

- `speedWarning = true`, `speedWarningMonthlyLoss = 0`
- バナー表示: **なし**（§4.3.2）
- ダッシュボード最上段はヒーローが繰り上がる。

### 10.5 非発動ケース（`updateWaitMonths = 1.5`）

- `speedWarning = false`, `speedWarningMonthlyLoss = 0`
- バナー表示: **なし**（§4.3.1）

---

## 11. 未解決事項 / 将来拡張

### 11.1 `calculation-logic.md §5` への追記運用（`speedWarningMonthlyLoss`）

- 本書完了後のフォローアップ PR で、[`calculation-logic.md §5`](./calculation-logic.md) の `CalculationResult` 型に `speedWarningMonthlyLoss: number` を追加する。
- §7 スピード警告セクションの末尾に「月額損失の差し込み文言は `warning-copy.md §7` を参照」の 1 行追記。
- §10 関連 Issue テーブルの Issue #4 行に参照箇所を追記。

### 11.2 `result-dashboard.md §8.2 / §8.3 / §8.5 / §10.3` への追記運用

- §8.5 の現行プレースホルダ記述（`{{CRITICAL_OPPORTUNITY_LOSS_MESSAGE}}` 文字列）を本書（`warning-copy.md`）への参照に置き換え。
- §8.3 の「タブレット 64px（1 行想定）」表記を「2 行既定（英語見出し + 日本語サブ）」に更新。行間を詰めた 2 行で 64px に収まる設計である旨を追記。
- §8.2 のテキスト色規定に、サブテキスト用 `slate-700` を追記（本書 §6.1 / §6.2 で新規確定）。
- §10.3 の `DashboardViewProps.warningMessage?: string` を `{ headline: string; subtext: string }` 構造体型に更新。
- §13 関連 Issue テーブルの Issue #4 行に「文言確定済み、`warning-copy.md` 参照」と追記。

### 11.3 多段化の将来検討

商談現場で「1 年以上の顧客と 3 ヶ月の顧客で同じ警告は弱い」というフィードバックが出た場合、以下の拡張を検討する:

- `updateWaitMonths >= 3 && < 6`: 注意レベル（Amber 300 + 弱文言）
- `updateWaitMonths >= 6 && < 12`: 警告レベル（現状の Amber 500）
- `updateWaitMonths >= 12`: 重大レベル（Red 500 + `alert-octagon`）

この拡張は `CalculationResult` に `warningLevel: "caution" | "warning" | "critical"` を追加する `calculation-logic.md §5` の改定を伴うため、フィードバックが蓄積してから別 Issue として立てる。

### 11.4 i18n 対応

- 本 Issue の文言は日本語固定。将来の英語圏展開時は日本語サブも英語化する。
- `src/lib/messages.ts` の定数・関数は **i18n キーに差し替え可能な構造**で設計する（戻り値型は `string`、呼び出し側で i18n ライブラリに差し替える余地を残す）。

### 11.5 文言の社内承認プロセス

- 本書の文言は **営業・マーケティング視点での最終承認**が必要（実装前に経営層／営業責任者のレビュー）。
- 承認完了時まで本書ヘッダに「**ドラフト**」表示を残し、承認後に正本化する。
- 承認プロセスで文言が変更された場合は、本書の §3.3 / §7.4 / §10 のサンプル文言を追記修正する。

### 11.6 累積損失表現への切替余地

- 現状は「月額」のみ差し込むが、将来「更新待ち期間累積」で表現したい場合は `monthlyVendorCost * updateWaitMonths * insourcingGap` への切替を検討する（§7.1 不採用案 D 参照）。
- ただし補助カードの「3 年間の止血」と金額が競合する懸念があるため、切替時は補助カード側の表示調整も併せて検討する。

### 11.7 文言長の実機確認

- §6.3 の最長ケースがタブレット 64px に収まることは擬似計算ベースでの想定。実装時（Issue #6 以降）に実機で最長ケースの 1 画面収まりを確認する。
- 96px を超える場合は Issue #3 §8.3 の吸収方針（ヒーロー `font-size` 下限寄り切替）に従う。

---

## 12. 決定項目チェックリスト

本仕様書で確定済みの項目:

### メインフレーズ
- [x] 英語／日本語／併記の方針: **英語＋日本語併記** → §3.1
- [x] 英語見出しの確定文字列: `CRITICAL OPPORTUNITY LOSS` → §3.1
- [x] 日本語サブテキストの確定文: 動的版 候補 e / フォールバック版 候補 c → §3.3
- [x] 見出しと本文のタイポグラフィ階層 → §6.2
- [x] `letter-spacing` 指定: 0.05〜0.08em → §6.2

### 表示トリガ条件
- [x] `updateWaitMonths >= 3` 維持 → §4.1
- [x] 代替案（AND / OR 条件）の不採用理由 → §4.2
- [x] 非発動時の挙動（バナー非表示、ヒーロー繰り上げ） → §4.3
- [x] 完全内製顧客（`insourcingLevel === 1`）でのバナー非表示ルール → §4.3.2
- [x] 入力選択肢との境界整合（`input-form.md §4.4`） → §4.4

### バリエーション
- [x] 単一 UI + 動的数字差し込み採用 → §5.1
- [x] 多段化を採用しない理由 → §5.1
- [x] 将来の多段化余地を記録 → §11.3

### ビジュアル微調整
- [x] 色・アイコンは Issue #3 §8.2 を継承（変更なし） → §6.1
- [x] タイポグラフィ階層の決定 → §6.2
- [x] 文言長の想定と 96px 吸収方針 → §6.3
- [x] バナー高さ（タブレット 2 行既定）の扱い → §6.3

### 動的数字差し込み
- [x] 差し込み対象: 月額機会損失（`monthlyVendorCost * insourcingGap`） → §7.1
- [x] 計算式 → §7.1
- [x] `monthlyLoss === 0` フォールバック文言 → §7.2
- [x] 完全内製顧客でのバナー非表示 → §4.3.2
- [x] `CalculationResult` 型拡張: `speedWarningMonthlyLoss: number` → §7.3

### PDF 連携
- [x] PDF にも同じバナーを出す → §8.1
- [x] PDF 内数字は印刷時点で固定 → §8.2
- [x] Issue #5 への申し送り → §8.3

### 実装契約
- [x] ファイル: `src/lib/messages.ts` → §9.1
- [x] エクスポート API（定数 + テンプレート関数） → §9.2, §7.4
- [x] `DashboardView` props の `warningMessage` 型（構造化オブジェクト） → §9.3
- [x] バナー内数字のアニメーション: なし → §6.4

### フォローアップ（本書外）
- [ ] `calculation-logic.md §5` への `speedWarningMonthlyLoss` 追記 → §11.1 / §13.3 (1)
- [ ] `result-dashboard.md §8.3 / §8.5 / §10.3` の追記更新 → §11.2 / §13.3 (2)
- [ ] マスター設計書 §3.1 に `warning-copy.md` への 1 行参照を追加 → §13.3 (3)
- [ ] Issue #5・#6 の説明欄に「警告コピー仕様は `docs/spec/warning-copy.md` を参照」と追記 → §13.3 (4)

### 承認プロセス
- [ ] 文言の社内承認（営業・マーケティング視点レビュー） → §11.5

---

## 13. 関連 Issue / 後続作業

### 13.1 直接依存するもの

| Issue | 本書が依存する章 |
|---|---|
| #1 計算ロジック前提値 | §4（`updateWaitMonths >= 3` 発動条件）、§7.3（`CalculationResult` 型拡張） |
| #2 入力フォーム UI | §4.4（離散 5 段階セレクトとの境界整合） |
| #3 診断結果ダッシュボード | §6（UI 骨格の継承）、§9.3（`DashboardView` props 反映） |

### 13.2 本書に依存するもの

| Issue | 本書から参照される章 |
|---|---|
| #5 PDF レポート | §8（PDF 連携）、§11.2（`result-dashboard.md §8.5` プレースホルダ差し替え） |
| #6 Next.js 雛形 | §9（`src/lib/messages.ts` 実装）、§7.4（擬似コード正本） |

### 13.3 本書完了後のフォローアップ作業

1. `docs/spec/calculation-logic.md §5` に `speedWarningMonthlyLoss: number` を追加、§7・§10 に本書への参照追記。
2. `docs/spec/result-dashboard.md §8.3` のタブレット 64px を「2 行既定」へ更新、§8.5 のプレースホルダ記述を本書参照に置換、§8.2 の「テキスト色」にサブテキスト用 `slate-700` を追記、§10.3 の `warningMessage` 型を構造化オブジェクトに更新、§13 関連 Issue テーブルに参照追記。
3. マスター設計書 `.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` §3.1 に本書への 1 行参照を追加（Issue #1 / #2 / #3 と同じ運用）。
4. Issue #5・#6 の説明欄に「警告コピー仕様は `docs/spec/warning-copy.md` を参照」と追記。

> 社内承認後の正本化運用は §12 「承認プロセス」のチェックリストに集約しており、本節では扱わない。
