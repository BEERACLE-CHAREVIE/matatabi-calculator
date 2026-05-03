# 計算ロジックの前提値・計算式の現実即応リファクタリング実装計画

## Context
現状の `src/lib/calculation.ts` と `src/lib/constants.ts` は仕様書 `docs/spec/calculation-logic.md` と完全整合しているが、前提値（時給 2,500 円 / 1 日 2 時間 / 月 20 日 / 年 3 回改修 / 内製化 5 段階）は商品設計時の「仮置き値」のままで、説明責任は §3「説明ロジック」レベルに留まり統計出典の裏付けがない。また計算式自体も「月額×36 + 改修×3×3」の素朴な乗算で、業界別の差や時間価値割引・リスク調整が考慮されていない。

商談現場で過大／過小／不適切な前提値の数字が出ると商品の信頼性を損なうため、本 Issue #90 では (1) 公的統計と業界レポートを根拠として収集（Phase 1）、(2) 仕様書 `calculation-logic.md` を出典付きで先に改定（Phase 2）、(3) `src/lib/constants.ts` / `src/lib/calculation.ts` / `src/lib/calculation.test.ts` / `InputForm.tsx` を仕様書に合わせて改修（Phase 3）、(4) 関連ドキュメント・サンプル PDF・リリースノートを連動更新（Phase 4）、の 4 段階で抜本見直しする。

GitHub Issue: #90

---

## フェーズ別の性質と進め方

| フェーズ | 性質 | 成果物 | 並列実行 |
|---|---|---|---|
| Phase 1 | **調査タスク（コード変更なし）** | 出典収集ノート・営業ヒアリング結果 | Phase 2 着手の前提 |
| Phase 2 | **ドキュメント改定（コード変更なし）** | `docs/spec/calculation-logic.md` の改訂 | Phase 1 完了が前提 |
| Phase 3 | **実装（コード変更あり）** | `src/lib/constants.ts` / `calculation.ts` / `calculation.test.ts` / `InputForm.tsx` の改修 | Phase 2 のレビュー完了が前提 |
| Phase 4 | **連動ドキュメント・告知** | `pdf-report.md` / `result-dashboard.md` / `README.md` / リリースノート | Phase 3 と並列可（受入直前にマージ） |

---

## 変更対象ファイル

### Phase 1: 根拠調査（コード変更を伴わない調査タスク）

#### 1. 公的統計データの収集（成果物: 一次情報のメモ／URL リスト）
- **新規**: `working/issue-90/research/public-stats.md`（作業ディレクトリ。本リポジトリの `working/` 配下が既存）
- **作業内容**:
  - 厚生労働省「令和最新版 賃金構造基本統計調査」から以下を取得：
    - 企業規模別（10〜99 人 / 100〜999 人 / 1000 人以上）×ホワイトカラー職種（事務従事者・専門技術者）の所定内給与額
    - 社会保険料・賞与等を加味した「実質時給」相当額（厚労省統計だけでは取れない場合は経団連・中小企業基盤整備機構の二次資料を参照）
    - **目的**: `DEFAULT_HOURLY_WAGE = 2_500` の根拠／更新候補値（例: 2,800〜3,200 円）の決定
  - 厚生労働省「就労条件総合調査」から以下を取得：
    - 年間休日総数の平均値（中小企業／大企業別）
    - 完全週休 2 日制適用率
    - **目的**: `DEFAULT_DAYS_PER_MONTH = 20` の根拠／更新候補値（例: 20.5〜21 日）の決定
- **理由**: 仕様書 §3「説明ロジック」レベルから「統計出典付きの根拠」へ昇格させ、商談での説明責任を強化する（受け入れ条件 1 番目）。

#### 2. 業界レポート・SaaS 利用実態調査の収集
- **新規**: `working/issue-90/research/industry-reports.md`
- **作業内容**:
  - IDC Japan / 矢野経済研究所「国内 IT サービス市場調査」「IT 部門アウトソーシング市場」最新版から：
    - 中小企業 IT 業務委託の年間改修頻度の実態分布
    - ベンダー保守費用相場（月額レンジ）
    - **目的**: `REPAIRS_PER_YEAR = 3` の妥当性検証／業種別係数導入の必要性判断
  - 中小企業庁「中小企業白書」「中小企業実態基本調査」から SaaS／システム内製化率の分布：
    - **目的**: `INSOURCING_LEVELS` の 5 段階（0 / 0.25 / 0.5 / 0.75 / 1.0）が現実分布に即しているかの検証（例: 「半分内製 = 0.5」は実態として 30% 程度のレンジ内にあるか）
  - 1 日あたり手作業時間の業界調査（PWC / アクセンチュア / Gartner の RPA 導入レポート等）：
    - **目的**: `DEFAULT_HOURS_PER_DAY = 2` の更新候補値の決定
- **理由**: Issue 本文の Phase 1 の 2 番目「業界レポートの収集」に対応。出典 URL と取得日を必ず記録（Phase 2 で仕様書に転記するため）。

#### 3. 営業／顧客ヒアリングの実施
- **新規**: `working/issue-90/research/customer-interviews.md`
- **作業内容**:
  - 既存顧客 5〜10 社／商談未成約顧客 5〜10 社にヒアリング：
    - 「3 年間トータルインパクト」の数字に対する体感（過大／適正／過小）
    - 自社の実態時給／月稼働日数／改修頻度
    - 現状の 5 段階内製化選択肢が選びにくくないか（中間値が欲しい等）
  - 営業チームへのヒアリング：
    - 商談で「この数字の根拠は？」と問われた頻度と回答内容
    - 数字の信頼性が商談成約率に与える影響の体感
- **理由**: 受け入れ条件 1 番目「営業チーム / 商品担当が新しい数値を商談で使えるかをレビュー済み」（最終項目）の前提となる一次情報。Phase 2 の仕様書改定時の判断材料にする。

> **Phase 1 注**: 上記 3 ファイルはコード成果物ではないため、本リポジトリにコミットするか別管理（Notion / Google Drive）にするかは Phase 2 着手前に判断する。少なくとも仕様書 §3 改定時に出典を引用できる形で参照可能にしておく。

---

### Phase 2: 仕様書改定（コード変更なし、`docs/spec/calculation-logic.md` を先に確定）

#### 4. `docs/spec/calculation-logic.md` の §2「固定値一覧と扱い」改定
- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/calculation-logic.md`
- **変更箇所**: §2 のテーブル（行 25-33）
- **変更内容**:
  - 各行の「値」列に Phase 1 で確定した新しい数値を記入（例: `DEFAULT_HOURLY_WAGE` は 2,500 → Phase 1 確定値）
  - 「理由」列を「マスター設計書準拠」「業種により変動」レベルから、**統計名・URL・取得日**の出典明記に書き換え（例: 「厚労省 令和 N 年賃金構造基本統計調査（取得日 2026-MM-DD、URL: https://...）に基づく中小企業ホワイトカラー実質時給 N 円」）
  - 必要に応じ新しい行を追加（例: 業種別係数 / リスク調整係数 / 時間価値割引率）
- **理由**: 受け入れ条件「`docs/spec/calculation-logic.md` が改定され、新しい前提値・計算式・出典が実装より先に確定している」に対応。実装は仕様書を正本として行うため、コードより先に確定する必要がある（Phase 2 → Phase 3 の順序が必須）。

#### 5. `docs/spec/calculation-logic.md` の §3「デフォルト値の根拠」を出典セクションに格上げ
- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/calculation-logic.md`
- **変更箇所**: §3（行 43-55）全体
- **変更内容**:
  - 現在の「説明ロジック（1 行）」レベルから、各値ごとに以下の形式で出典を完全列挙：
    - 統計名 / 発行者
    - URL
    - 取得日
    - 採用した数値とその根拠ロジック
    - 仮の値ではなく統計値を採用したことによる旧版との差分
  - §3 の最後の「注記」（行 55）の「将来的に統計出典に置き換える余地を残す」文言を削除し、「Issue #90（2026-MM-DD）で統計出典に置換完了」に書き換え
- **理由**: Issue 本文 Phase 4「README.md または運用ドキュメントに『前提値の出典一覧』を追加」の中核。営業現場で「なぜこの値か」と問われたとき、本セクションを示せば即答できる状態にする。

#### 6. `docs/spec/calculation-logic.md` の §4「内製化選択肢」見直し（必要に応じて）
- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/calculation-logic.md`
- **変更箇所**: §4.1 のテーブル（行 64-70）／§4.2 計算式説明（行 73-76）
- **変更内容**:
  - Phase 1 の中小企業白書調査結果に基づき、5 段階刻み（0 / 0.25 / 0.5 / 0.75 / 1.0）が実態分布に対して粗すぎないかを検証
  - 必要なら粒度を 4 段階または 7 段階に変更し、新しい `INSOURCING_LEVELS` 配列定義を擬似コードで明示
  - 「係数として止血額に乗算」方式は維持しつつ、業種別係数を併用する場合は §4.2 に追記
- **理由**: 5 段階が現実顧客の実態と乖離している場合、計算結果の信頼性を直接損なうため。実装ファイル（`constants.ts`）の `INSOURCING_LEVELS` 配列はリテラル union 型 `InsourcingLevel` の単一の真実の源であり、ここを変更すると `calculation.ts` / `InputForm.tsx` / `PdfDashboard.tsx` のすべてに型レベルで波及する。

#### 7. `docs/spec/calculation-logic.md` の §5「最終計算式」擬似コード改定
- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/calculation-logic.md`
- **変更箇所**: §5（行 93-168）
- **変更内容**:
  - 定数値（`DEFAULT_HOURLY_WAGE` 等）を新しい値に書き換え
  - 計算式の構造を変更する場合（例: 業界別係数の乗算、3 年合計に対する時間価値割引、リスク調整係数）、`calculate()` 関数の擬似コードを書き換え：
    - 新規入力プロパティを `Inputs` 型に追加（例: `industryCoefficient?: number`）
    - 中間計算ステップをコメント付きで明示
  - JSDoc `@example` の値も新しい計算式の出力に合わせて書き換え
- **理由**: 受け入れ条件「`docs/spec/calculation-logic.md` の §5（計算式）と §前提値セクションを更新」に対応。`src/lib/calculation.ts` の JSDoc 内 `@example` および `src/lib/calculation.test.ts` の最初の it ブロックは本擬似コードと完全一致しているため、ここを正本として実装側を追従させる。

#### 8. `docs/spec/calculation-logic.md` に「移行ノート」セクションを新設
- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/calculation-logic.md`
- **変更箇所**: §10 直後に新設（または §8「未解決事項 / 将来拡張」を §11 に繰り下げて §10.5 を作る）
- **変更内容**:
  - 「v1（旧版） vs v2（本改定）」の数値比較表（標準入力で旧版いくら → 新版いくら）
  - 過去配布 PDF との数値乖離の説明
  - 商談時の旧版 PDF 提示に関する注意喚起
- **理由**: Phase 4 のリリースノートに転記する原稿として機能。配布済み PDF と新計算結果の数値が一致しないため、商談チームが混乱しないよう仕様書側にも明記する。

---

### Phase 3: 実装（仕様書改定後、`src/lib/constants.ts` から順に）

#### 9. `src/lib/constants.ts` の定数値更新
- **変更**: `/Users/YS/development/matatabi-calculator/src/lib/constants.ts`
- **変更箇所**:
  - `DEFAULT_HOURLY_WAGE`（行 26）／`DEFAULT_HOURS_PER_DAY`（行 29）／`DEFAULT_DAYS_PER_MONTH`（行 32）：Phase 2 で確定した新しい値に書き換え
  - `REPAIRS_PER_YEAR`（行 20）：Phase 2 で見直しが入った場合は更新（固定値ステータスのままなら据え置き）
  - `INSOURCING_LEVELS`（行 60-66）：Phase 2 §4.1 改定に応じて要素を追加／削除。`as const` と `value` ベースの union 型導出は維持
  - 各 JSDoc の「仕様書 §X」参照と数値根拠コメントも新仕様に合わせて更新（行 25-32 のコメント文言）
  - 必要に応じ新規定数を追加（例: `INDUSTRY_COEFFICIENTS` / `TIME_VALUE_DISCOUNT_RATE` / `RISK_ADJUSTMENT_FACTOR`）
- **理由**: 受け入れ条件「`src/lib/constants.ts` の定数値が新しい前提値に更新されている」。本ファイルは「単一の真実の源」として `calculation.ts` / `format.ts` / `InputForm.tsx` / `PdfDashboard.tsx` から参照されるため、ここを起点に変更を波及させる。

#### 10. `src/lib/calculation.ts` の計算式改修（必要に応じて）
- **変更**: `/Users/YS/development/matatabi-calculator/src/lib/calculation.ts`
- **変更箇所**:
  - `CalculationInput` インターフェース（行 34-43）：Phase 2 §5 で新規入力プロパティが追加された場合、対応するフィールドを追加
  - `CalculationOutput` インターフェース（行 55-63）：新規出力プロパティが追加された場合のみ追加（既存 PDF / Dashboard 表示は変えない設計のため、原則は据え置き）
  - `calculate()` 関数（行 127-175）：
    - Phase 2 §5 の擬似コードと完全一致させる
    - 新しい計算式構造を導入する場合は、`safeNum` / `clampAmount` / `normalizeInsourcingLevel` のガードを既存パターンに合わせて差し込む
    - JSDoc `@example`（行 113-125）の入出力値を Phase 2 §5 の `@example` と一致させる
- **理由**: 受け入れ条件「計算式を変更した場合、`src/lib/calculation.ts` の `calculate()` が新しい仕様に合致している」。本ファイルの設計原則「純粋関数 / UI 非依存 / 円単位浮動小数 / NaN・Infinity・負値ガード」（ファイル冒頭コメント行 1-10）は維持する。

#### 11. `src/lib/calculation.test.ts` の境界値・例示テストの全件期待値更新
- **変更**: `/Users/YS/development/matatabi-calculator/src/lib/calculation.test.ts`
- **変更箇所**:
  - 「JSDoc @example の数値が仕様書 §5 の擬似コードと一致する」テスト（行 15-33）：Phase 2 §5 の新 `@example` 値に合わせて `expect(result).toEqual(...)` を書き換え
  - 「insourcingLevel の 5 段階全網羅」テスト（行 35-58）：`INSOURCING_LEVELS` の段階数が変わった場合は `it.each` のテーブルと `[InsourcingLevel, number]` の組を更新
  - 「speedWarning 境界条件」テスト（行 60-80）：`SPEED_WARNING_THRESHOLD_MONTHS` を変更した場合は境界値（現在 2.99 / 3 / 3.01）も書き換え
  - 「デフォルト値フォールバック」テスト（行 107-135）：新しい `DEFAULT_HOURLY_WAGE × DEFAULT_HOURS_PER_DAY × DEFAULT_DAYS_PER_MONTH × MONTHS_PER_YEAR` の積を計算した期待値に書き換え（行 117-118 の `6_000_000` / `18_000_000` 等）
  - 「ガード関数 / NaN / Infinity / 負値」テスト（行 137-213）：金額系の期待値を新計算式で再算出
  - 「normalizeInsourcingLevel」テスト（行 215-239）：`insourcingGap=1` 時の `threeYearSavings` 期待値を新 `MONTHS_IN_PERIOD` × 値で再算出
- **理由**: 受け入れ条件「`src/lib/calculation.test.ts` の境界値・例示テストの期待値が全件更新され、カバレッジ 100% を維持している」。本ファイルはガード関数（`safeNum` / `clampAmount` / `normalizeInsourcingLevel`）の全分岐を網羅する設計（行 7-9 のヘッダコメント参照）のため、新計算式のすべての分岐に対しテストケースを追加する必要がある。

#### 12. `src/components/calculate/InputForm.tsx` の入力範囲・刻み・プレースホルダ改修
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/InputForm.tsx`
- **変更箇所**:
  - `validateMonthlyVendor`（行 71-81）：Phase 2 で月額ベンダー費用の上限／下限が変わった場合、`n > 10_000` のしきい値を更新。エラー文言も「10,000 万円以下で入力してください」を新値に追従
  - `validateRepair`（行 83-95）：同上、`n > 5_000` の更新
  - `validateWorkerCount`（行 97-107）：同上、`n > 1_000` の更新
  - `UPDATE_WAIT_OPTIONS`（行 26-32）：Phase 2 §4.1 で更新待ち期間カテゴリが変わった場合の代表値とラベル更新（例: 「3〜6 ヶ月」→ 4.5、警告閾値との整合維持）
  - `<input>` の `min`/`max`/`step` 属性（行 382-384 / 435-437 / 492-494）：上記 validate 関数と一致させる
  - 各フィールドの `help` テキスト（行 363 / 416 / 469 / 532 / 575）：「年 3 回想定で試算します」のような前提値言及部分を新値に書き換え
- **理由**: 受け入れ条件「`InputForm.tsx` の入力範囲・デフォルト値が新しい前提値に連動している」。`InputForm.tsx` は基本 5 項目のみを担当し、詳細設定 3 項目（時給／1 日時間／月稼働日数）は本コンポーネントのスコープ外（行 9-10 のコメント参照）で `calculate()` 側のフォールバックに任されているため、本ファイルでは「入力範囲・刻み・ヘルプ文・更新待ち期間カテゴリ」のみが影響範囲。

#### 13. `src/components/calculate/PdfDashboard.tsx` の補助変数追従（必要に応じて）
- **変更**: `/Users/YS/development/matatabi-calculator/src/components/calculate/PdfDashboard.tsx`
- **変更箇所**:
  - `UPDATE_WAIT_LABELS`（行 116-122）：`InputForm.tsx` の `UPDATE_WAIT_OPTIONS` を private で複製しているため、Phase 3 #12 でカテゴリが変わった場合は手書きで同期（`as const` literal で型エラーが出るため反映漏れは検知可能、ファイルコメント行 113-115 参照）
  - `findUpdateWaitLabel`（行 140-142）／`findInsourcingLabel`（行 144-146）：内部実装は変更不要（`INSOURCING_LEVELS` から自動取得しているため）
- **理由**: PDF 入力サマリー表示は `INSOURCING_LEVELS` を参照しているため、`constants.ts` 改定で自動追従する。`UPDATE_WAIT_LABELS` のみ private 複製のため手動同期が必要。

#### 14. `src/components/calculate/DashboardView.tsx` への影響
- **変更**: なし（参照のみ）
- **変更箇所**: `/Users/YS/development/matatabi-calculator/src/components/calculate/DashboardView.tsx`
- **変更内容**: 本ファイルは `CalculationOutput` 型のフィールドのみを参照しており、計算式・前提値の改定は型を変えない限り影響しない。
- **理由**: 受け入れ条件「`PdfDashboard.tsx` / `DashboardView.tsx` - 表示には影響なし（計算結果のみが変わる）」と整合。

---

### Phase 4: ドキュメント連動と告知

#### 15. `docs/spec/pdf-report.md` の数値例・サンプル PDF 更新
- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/pdf-report.md`
- **変更箇所**:
  - §4.3「使用文字の既知集合」の指標ラベル群（行 160）：新しい計算式で追加されたラベルがあれば追記
  - §5.4「ASCII ワイヤー」の警告バナー金額例「現在、月額 120 万円相当」（行 247）：新計算式で生成される代表値に書き換え
  - §5.4 の入力サマリー部分の「(詳細設定: 時給 ◯円 / ◯h/日 / ◯日/月)」（行 271）：新デフォルト値の例示に書き換え
  - §5.3 マージン・余白設計テーブル（行 220-235）：`formatMetricCardValue` の Compact 自動降格ロジックは温存（仕様書 Issue #85 で確定済みのため、桁爆発閾値は変えない方針）。新前提値で計算結果の桁が大きく変わる場合のみ「桁爆発時 24pt」発動条件のレビューを実施
- **理由**: 受け入れ条件「`docs/spec/pdf-report.md` / `result-dashboard.md` の数値例・サンプル PDF が新仕様に整合している」。

#### 16. `docs/spec/result-dashboard.md` の数値例更新
- **変更**: `/Users/YS/development/matatabi-calculator/docs/spec/result-dashboard.md`
- **変更箇所**:
  - §3.1 ヒーロー数値の説明（行 46-52）：固定値の言及はないため変更不要
  - §1.2 前提（行 19-29）：`calculation-logic.md §5` への参照は維持
  - §9.2 桁爆発時の代替表記（行 324-344）：`monthlyVendorCost` 上限 1 億円/月 × 36 ヶ月 = 36 億円級という記述（行 325）について、上限値が Phase 3 #12 で変わった場合は「最大値 X 億円級」に書き換え
- **理由**: 数値例更新の徹底。`formatManYen` / `formatManYenCompact` のロジック変更は不要（金額表記の単位ルール変更ではないため）。

#### 17. `README.md` に「前提値の出典一覧」セクション追加
- **変更**: `/Users/YS/development/matatabi-calculator/README.md`
- **変更箇所**: 「ドキュメント」セクション（行 136-148）の直後または末尾の「ライセンス」セクションの直前
- **変更内容**:
  - 新セクション「## 計算ロジックの前提値出典」を追加
  - Phase 2 §3 改定で確定した出典リスト（統計名・URL・取得日・採用値）を表形式で転記
  - 詳細は `docs/spec/calculation-logic.md §3` を参照、と相互リンク
- **理由**: 受け入れ条件「`README.md` または運用ドキュメントに『前提値の出典一覧』を追加」。営業・商品担当が GitHub UI から直接出典を辿れる導線を作る。

#### 18. ランディングページ FAQ 文言の更新
- **変更**: `/Users/YS/development/matatabi-calculator/src/app/page.tsx`
- **変更箇所**: `FAQS` 配列の `faq-accuracy` の `answer`（行 109-113）
- **変更内容**:
  - 現在の「業界標準値（時給 2,500 円、1 日 2 時間、月 20 営業日、年 3 回改修など）に基づく簡易試算です」を新しい前提値に書き換え
  - 出典の信頼性を訴求する文言（例: 「公的統計（厚労省賃金構造基本統計調査ほか）に基づく業界標準値で試算」）に格上げ
- **理由**: ユーザー向け FAQ で旧値が露出すると、商談時の数値乖離を顧客に直接気付かれるため、必ず連動更新する。

#### 19. リリースノート（CHANGELOG.md）新規作成または PR 説明文への破壊的変更注意喚起
- **新規（CHANGELOG.md がない場合）**: `/Users/YS/development/matatabi-calculator/CHANGELOG.md`
- もしくは PR 説明本文／GitHub Releases ドラフトへの記載
- **変更内容**:
  - 「## v2.0.0 - YYYY-MM-DD: 計算ロジック前提値・計算式の抜本見直し（Issue #90）」セクション
  - 破壊的変更の注意喚起：
    - 「計算ロジック v2: 前提値を XX → YY に改定。過去配布 PDF と数値が一致しない可能性あり」
    - 「商談時に旧版 PDF を提示する場合は本リリース日（YYYY-MM-DD）以降の再生成を推奨」
  - Phase 2 §10「移行ノート」へのリンク
- **理由**: 受け入れ条件「リリースノートに破壊的変更の注意喚起（過去配布 PDF との数値乖離）が明記されている」。本リポジトリは現状 CHANGELOG.md を持たないため、新設するか PR 説明＋ GitHub Releases で代替するかは Phase 4 着手時に判断する。

#### 20. CI 品質ゲート（lint / typecheck / test / build）の合格確認
- **変更**: なし（CI ワークフロー `.github/workflows/ci.yml` は既存のまま）
- **作業内容**:
  - ローカルで `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` を全件 pass まで反復
  - `jest --coverage` でカバレッジ 100% を維持していることを確認（`src/lib/calculation.ts` の全関数・全分岐）
  - E2E（`e2e/golden-path.spec.ts` / `e2e/responsive-matrix.spec.ts`）は Playwright 未導入のため別途ローカルで実行
- **理由**: 受け入れ条件「`npm run lint` / `npm run typecheck` / `npm test` / `npm run build` が全件 pass する」「カバレッジ 100% を維持」。

---

## 設計上の考慮点

### 順序依存性（Phase 2 → Phase 3 の必須性）
仕様書を実装より先に確定するのは、本リポジトリの設計原則「仕様書を正本として実装が追従する」（マスター設計書 §3.1 / `calculation-logic.md` 冒頭の参照関係）に従うため。Phase 2 を飛ばして Phase 3 から始めると、`calculation.test.ts` の期待値計算根拠が不明瞭になり、レビュー時に「なぜこの値か」が答えられなくなる。

### 計算式構造を変えるか、定数値のみ更新するか
Issue 本文では「計算式を変更する場合は」という条件付きで `calculate()` の改修を要請している。Phase 1 のヒアリング結果次第で：
- **定数値のみ更新（小規模変更）**: `constants.ts` と `calculation.test.ts` の期待値、`InputForm.tsx` のバリデーション範囲のみ変更。`calculation.ts` のロジックは無改修。
- **計算式構造を変更（中〜大規模）**: 業界別係数 / 時間価値割引 / リスク調整係数の追加。`CalculationInput` 型・`calculate()` 関数本体・`InputForm.tsx` の追加入力 UI・`PdfDashboard.tsx` の入力サマリー表示まで波及。

Phase 1 の終了時点で「定数値のみ」か「構造変更」かを意思決定し、Phase 2 の §5 改定範囲を決める。

### 後方互換性
`CalculationInput` / `CalculationOutput` 型の既存フィールドは削除しない（PDF 出力・ダッシュボード表示の互換性維持のため）。新規プロパティを追加する場合は optional（`?:`）で導入し、既存の呼び出し側（`CalculatePageClient.tsx` / `PdfDashboard.tsx`）に変更を強要しない。

### `INSOURCING_LEVELS` の段階数変更時の波及
`INSOURCING_LEVELS` は `as const` 配列からリテラル union 型 `InsourcingLevel` を導出している（仕様書 §10「実行時・型の両面から堅牢化」要件）。段階を増減すると以下が型エラーで検知される：
- `calculation.test.ts` の `it.each<[InsourcingLevel, number]>([...])` テーブル
- `InputForm.tsx` の `INSOURCING_LEVELS.map` の選択肢ボタン生成
- `PdfDashboard.tsx` の `findInsourcingLabel`

これは「型レベルで反映漏れを検知できる」設計のため、段階数変更時はコンパイルエラーをすべて潰す形でレビューする。

### Phase 4 のリリース告知のタイミング
本リポジトリは Cloudflare Pages で `main` ブランチ push 時に自動本番デプロイされる（README.md 行 96-100）。商談チームへの事前周知が必要なため、PR マージ → main へのマージ → 本番デプロイの間に最低 1 営業日のバッファを置き、その間にリリースノートと営業向け案内を送付する。

---

## 検証方法

1. **Phase 1 完了の検証**: `working/issue-90/research/` 配下の 3 つのメモが揃い、各前提値に統計出典（URL + 取得日）と顧客ヒアリング結果が紐付いていること。営業／商品担当のレビュー OK。
2. **Phase 2 完了の検証**: `docs/spec/calculation-logic.md` の §2 / §3 / §4 / §5 / §10 が改定済みで、出典がすべて URL 付きで記載されていること。新仕様の擬似コードが `calculate()` 実装と一致する青写真として読めること。
3. **Phase 3 完了の検証**:
   - `npm run typecheck` で型エラー 0
   - `npm run lint` で lint エラー 0
   - `npm test` で全テスト pass + `--coverage` でカバレッジ 100%
   - `npm run build` で静的エクスポート（`out/`）が成功
   - `src/lib/calculation.ts` の `@example` 値と `src/lib/calculation.test.ts` の最初の `it` ブロックの `expect(result).toEqual(...)` 値が完全一致
   - `src/lib/constants.ts` の数値が Phase 2 §2 / §3 のテーブルと完全一致
   - `src/components/calculate/InputForm.tsx` の `min`/`max`/`step` 属性とエラー文言と Phase 2 §2 / `docs/spec/input-form.md §5.2` が完全一致
4. **Phase 4 完了の検証**:
   - `docs/spec/pdf-report.md` / `docs/spec/result-dashboard.md` の数値例が新計算結果で見ても破綻しない
   - `README.md` に出典一覧セクションが追加されている
   - `src/app/page.tsx` の FAQ から旧前提値の言及が消えている
   - リリースノート（CHANGELOG.md または PR 説明）に破壊的変更の注意喚起が明記されている
5. **E2E 検証**: `npx playwright test e2e/golden-path.spec.ts` で「3 年間のトータルインパクト」表示が新計算結果で表示され、PDF ダウンロードが成功すること。`e2e/responsive-matrix.spec.ts` で `getByLabel(/月額ベンダー費用/)` の入力フィールドが新しい上限値で動作すること。
6. **商談現場レビュー**: 受け入れ条件最終項目「営業チーム / 商品担当が新しい数値を商談で使えるかをレビュー済み」を、Phase 4 完了直後に営業 MTG で実施。
