# Changelog

本プロジェクトの主要な変更を記録します。形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠し、バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

---

## [Unreleased]

### Changed
- **計算ロジックの前提値出典を公的統計付きに格上げ（Issue #90）**
  - `docs/spec/calculation-logic.md §3` を「説明ロジック（1 行）」から、厚生労働省「賃金構造基本統計調査 令和7年速報」「就労条件総合調査 令和7年」、BPO テクノロジー「会社員の業務実態調査」、中小企業庁「2025 年版 中小企業白書」を出典とする統計出典付きセクションに改定。
  - `docs/spec/calculation-logic.md §9.5` に「移行ノート」を新設（v1 vs v2 数値比較・過去配布 PDF との整合性確認・商談時の説明強化ポイント）。
  - `src/lib/constants.ts` の各 JSDoc に出典セクションへの参照を追加。
  - `src/components/calculate/InputForm.tsx` のヘルプ文に出典・典型レンジを明記。
  - `src/app/page.tsx` の FAQ「試算結果はどのくらい正確ですか？」を「業界標準値（出典なし）」から「公的統計に基づく業界標準値」へ格上げ。
  - `README.md` に「計算ロジックの前提値出典」セクションを追加。

### Verified (No Behavioral Change)
- **計算結果の数値は v1 と完全一致**: Phase 1 リサーチ（公的統計の中央値レンジ）により、現行値（時給 2,500 円 / 1 日 2 時間 / 月 20 日 / 年 3 回改修 / 内製化 5 段階）が統計的に裏付けられたため、定数値は据え置き。
  - **過去配布 PDF と本リリース後に再生成される PDF の計算結果は完全に一致する**ため、商談チームが顧客説明で混乱することはない。
  - 商談時に「旧版と新版で同じ ROI が出るか」を確認されたら、「同じ結果が出ます。本改定は数値変更ではなく、根拠の出典明記による説明責任強化です」と回答する。

### Notes for Sales / Product Team
- 商談で「この数字の根拠は？」と問われた際は、`docs/spec/calculation-logic.md §3.1〜§3.4` の出典テーブルを直接示せる。
- 公的統計（賃金構造基本統計調査・就労条件総合調査）は厚生労働省が毎年 6〜10 月頃に更新するため、年 1 回のレビューサイクルで再確認推奨。
- 営業／顧客ヒアリングは別途人間タスクとして残置（雛形: `working/issue-90/research/customer-interviews.md`）。実施結果が「現行値が実態と乖離」を示した場合は別 Issue を起票して再リファクタリング。

### Future Work (Issue #90 スコープ外)
- 業種別係数 / 時間価値割引率 / リスク調整係数の導入は、業界別の確定的なデータが揃うまで `docs/spec/calculation-logic.md §8` に残置。
- 内製化粒度の細分化（5 段階 → 7 段階）は、営業ヒアリングで「中間値が欲しい」シグナルが集まった段階で別 Issue 起票。
