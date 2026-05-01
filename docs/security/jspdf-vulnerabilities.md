# jspdf v2 系の脆弱性判断メモ

> ステータス: 確定（2026-05-01 時点）
> 関連 Issue: #24（本書の起票元） / #5（PDF レポート実装、本書を遵守する） / #8（依存ライブラリ追加、本書の前提）

## 本書の目的

`jspdf@^2.5.2`（Issue #8 で導入）に対して `npm audit` が報告する脆弱性 10 件（後述 §1 の表）について、本アプリの利用形態における **到達経路を分析し、各件が実質的に到達不能であることを実装契約から論証する** 。本書は Issue #24 の判断項目 (a) / (b) / (c) のうち (a) の正本記録であり、(b) は `docs/security/jspdf-v3-migration-poc.md` 、(c) は本書 §6 と `.github/workflows/security-audit.yml` で扱う。

本書の判定が成立するためには `docs/spec/pdf-report.md §3.1 / §11.2 / §11.3` の実装契約が遵守される必要がある。Issue #5（PDF レポート実装）の PR レビュー時には §2.1〜§2.3 の遵守事項チェックリスト（§7）を必ず適用する。

## 1. 対象脆弱性の一覧

`npm audit` 実測（2026-05-01）で、`jspdf` 本体および推移依存 `dompurify` に起因する advisory は以下のとおり。

| # | GHSA ID | タイトル | 出所 | 重大度 | 修正版 |
|---|---|---|---|---|---|
| 1 | GHSA-f8cm-6447-x5h2 | jspdf Path Traversal | `jspdf` 本体 (<=3.0.4) | **critical** | jspdf 4.0.0+ |
| 2 | GHSA-w532-jxjh-hjhj | jspdf ReDoS | `jspdf` 本体 (<3.0.1) | high | jspdf 3.0.1+ |
| 3 | GHSA-8mvj-3j78-4qmw | jspdf DoS | `jspdf` 本体 (<=3.0.1) | high | jspdf 3.0.2+ |
| 4 | GHSA-vhxf-7vqr-mrjg | DOMPurify XSS | `dompurify` (<3.2.4) | moderate | dompurify 3.2.4+ |
| 5 | GHSA-h8r8-wccr-v5f2 | DOMPurify mutation-XSS via Re-Contextualization | `dompurify` (<3.3.2) | moderate | dompurify 3.3.2+ |
| 6 | GHSA-cjmm-f4jc-qw8r | DOMPurify ADD_ATTR predicate skips URI validation | `dompurify` (<=3.3.1) | moderate | dompurify 3.3.2+ |
| 7 | GHSA-cj63-jhhr-wcxv | DOMPurify USE_PROFILES prototype pollution | `dompurify` (<=3.3.1) | moderate | dompurify 3.3.2+ |
| 8 | GHSA-39q2-94rc-95cp | DOMPurify ADD_TAGS function form bypasses FORBID_TAGS | `dompurify` (<=3.3.3) | moderate | dompurify 3.3.4+ |
| 9 | GHSA-h7mw-gpvr-xq4m | DOMPurify FORBID_TAGS bypass via function-based ADD_TAGS | `dompurify` (<3.4.0) | moderate | dompurify 3.4.0+ |
| 10 | GHSA-crv5-9vww-q3g8 | DOMPurify SAFE_FOR_TEMPLATES bypass in RETURN_DOM mode | `dompurify` (>=1.0.10 <3.4.0) | moderate | dompurify 3.4.0+ |

合計 10 件（critical 1 / high 2 / moderate 7）。`npm audit` の `fixAvailable` はいずれも `jspdf@4.2.1`（SemVer major、本アプリでは Issue #8 §6 R5 により採用しない）を提示する。

`npm audit` は他に Next.js 本体・eslint-config-next・glob・postcss 由来の脆弱性も報告するが、これらは Issue #8 由来ではなく、本書のスコープ外である（別 Issue で扱う）。

## 2. 到達経路分析

### 2.1 jspdf Path Traversal (GHSA-f8cm-6447-x5h2)

**論点**: `pdf.save(filename)` の `filename` 引数にディレクトリトラバーサル文字（`..`、`/`、`\`）が混入すると任意パスへの書き出しが可能とされる。ブラウザ環境では User-Agent 側のダウンロード機構が影響を緩和するが、API レベルでは脆弱性として報告されている。

**本アプリでの到達経路**:

- `docs/spec/pdf-report.md §11.3` の `buildPdfFilename()` がファイル名を **テンプレート生成** する仕様。
  - 形式: `matatabi-roi-${ymd}-${hm}.pdf`
  - `ymd` / `hm` は `Date` インスタンスから `Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", ... })` の `formatToParts` で抽出した数値文字列のみを連結する。
  - 固定文字列部分（`matatabi-roi-`、`-`、`.pdf`）と数値文字列のみで構成される。
- `docs/spec/pdf-report.md §11.2` の `generatePdf` 実装契約により、`pdf.save(options.filename)` の `filename` は `buildPdfFilename()` の戻り値以外にはならない。
- **ユーザー入力（フォーム値）はファイル名に一切混入しない**（`docs/spec/pdf-report.md §6.3` で顧客名入力は採用しないことが確定済み、§13.1 で将来 Issue として保留）。

**判定**: テンプレート生成された数値文字列のみが `save()` に渡るため、ディレクトリ区切り文字（`/` `\` `..`）は文字単位で出現しえない。**到達不能**。

**実装時の遵守事項**:
1. `pdf.save(filename)` の `filename` には `buildPdfFilename()` の戻り値以外を渡してはならない。
2. 将来 `docs/spec/pdf-report.md §13.1` の顧客名入力要件が確定し、ファイル名にユーザー入力が含まれる仕様変更が入った場合は、本書の判定を再評価する（§4 トリガー (ii)）。

### 2.2 jspdf ReDoS / DoS (GHSA-w532-jxjh-hjhj / GHSA-8mvj-3j78-4qmw)

**論点**: 巨大な入力文字列に対する正規表現処理（ReDoS）または処理量爆発（DoS）。攻撃者制御の入力が jspdf の特定経路に流れた場合に成立。

**本アプリでの到達経路**:

- `generatePdf` が jspdf に渡すデータは以下の 2 系統のみ:
  1. `addImage(imgData, "PNG", ...)` の `imgData`: `html2canvas` の出力 dataURL
  2. `save(filename)` の `filename`: §2.1 で評価済み（テンプレート生成、攻撃面なし）
- `imgData` は `html2canvas` が DOM 要素から内部生成する base64 PNG。
  - `docs/spec/pdf-report.md §3.2` で `scale: 2` が固定されており、A4 1 枚（210mm × 297mm）の `scale: 2` は約 1190 × 1684 px に固定。
  - 入力サイズは **画面実装側のレイアウト寸法とフォーム入力値から決定論的に計算される**。攻撃者がブラウザの DOM を任意に書き換えれば理論上は巨大化できるが、それは攻撃者が既にクライアント実行コンテキストを支配している前提であり、ReDoS / DoS の評価対象から外れる（XSS や任意コード実行が本来の論点）。
- 本アプリの利用形態（社内営業ツール、認証なし公開だが入力点は数値フォーム 5 項目のみ。`docs/spec/pdf-report.md §1.2` 参照）では、攻撃者制御の巨大入力が jspdf の正規表現／処理経路に到達する経路は存在しない。

**判定**: `addImage` の `imgData` も `save` の `filename` も攻撃者制御文字列が流れる経路ではない。**到達不能**。

**実装時の遵守事項**:
1. `addImage` に渡す `imgData` は `html2canvas` 出力の dataURL 以外を採用しない。
2. ユーザー入力をそのまま jspdf API（`text` / `addImage` 等）に渡す実装をしない。

### 2.3 dompurify XSS 系 7 件 (推移依存)

**論点**: `dompurify` は XSS サニタイザ。`jsPDF.html()` メソッドが内部で利用する。報告されている 7 件はいずれも `dompurify.sanitize()` の bypass 系で、**信頼できない HTML を sanitize に通すユースケース** で初めて成立する。

**本アプリでの到達経路**:

- `docs/spec/pdf-report.md §3.1` で **html2canvas 主体方針** が確定: DOM → PNG ラスタライズ → jsPDF `addImage` で貼付。
- `jsPDF.html()` は **本アプリで一切呼ばれない**（仕様確定）。
- `jsPDF.html()` を呼ばない以上、`jspdf` 内部の `dompurify` 利用コードパスはモジュールがロードされても **実行経路に乗らないデッドコード** となる。

**判定**: `jsPDF.html()` を呼ばない実装契約を維持する限り、dompurify の脆弱なコードパスは実行されない。**到達不能**。

**実装時の遵守事項**:
1. `src/lib/pdf.ts` の `generatePdf` 関数内で `pdf.html(...)` / `jsPDF.prototype.html(...)` を呼び出してはならない（grep でレビュー時にチェック）。
2. 将来 `pdf.html()` を使った実装方針への変更（例: html2canvas を廃止して `jsPDF.html()` 直接利用に切り替える）が検討された場合は、本書を再評価する（§4 トリガー (iii)）。

## 3. 結論

§1 の **10 件すべて「到達不能」** と判定する。これは現行の `docs/spec/pdf-report.md` の実装契約（§3.1 html2canvas 主体・§6.3 顧客名入力不採用・§11.2 / §11.3 の関数契約）を厳密に遵守することを前提とする条件付き判定である。

| 区分 | 件数 | 判定 |
|---|---|---|
| jspdf Path Traversal (critical) | 1 | 到達不能（§2.1） |
| jspdf ReDoS / DoS (high) | 2 | 到達不能（§2.2） |
| dompurify 系 (moderate) | 7 | 到達不能（§2.3） |

## 4. 再評価のトリガー

以下のいずれかが発生した場合、本書を更新する（場合により判定を「到達可能」に改める）:

- (i) `jspdf` v2 系（`<3.0.0`）に新たな脆弱性が報告された
- (ii) `docs/spec/pdf-report.md §13.1` の顧客名入力要件が確定し、ファイル名にユーザー入力が混入する仕様変更が決まった
- (iii) `jsPDF.html()` を呼び出す実装方針に切り替わった（html2canvas 主体方針の見直し）
- (iv) jspdf v3 / v4 への移行が決定した（`docs/security/jspdf-v3-migration-poc.md §5` の再評価）
- (v) `npm audit` 実行で本書 §1 の表に未掲載の advisory が報告された

## 5. v3 / v4 移行 PoC への参照

本 Issue 判断項目 (b) の v3 / v4 移行 API 互換調査は `docs/security/jspdf-v3-migration-poc.md` に分離している。プラン作成時点（2026-05-01）の暫定判定は **「即時移行は推奨しない」**。Issue #5 着手時点で再評価する。

## 6. 残存リスク受容の運用

§3 の判定により本 Issue では **コード側の対症療法（`package.json` `overrides` でのホワイトリスト化等）を行わない** 方針を採る。代わりに以下の運用を整備する:

### 6.1 CI による critical 検知

- `.github/workflows/security-audit.yml` で `npm audit --audit-level=critical` を CI 化（Issue #24 判断項目 (c) の最小実装）。
- トリガー: `pull_request` / `push (develop / main)` / 週次 `schedule (cron: "0 0 * * 1")` / `workflow_dispatch` 。
- ローカル再現用に `package.json` の `scripts` に `audit` / `audit:critical` の 2 本を追加する。

### 6.2 critical 1 件（GHSA-f8cm-6447-x5h2）の扱い

本書 §1 表 #1 の jspdf Path Traversal は §2.1 で **到達不能と判定済み** であるが、`npm audit --audit-level=critical` は当該 advisory を引き続き critical として報告する。本 Issue 完了時点では以下の運用を採る:

- **CI ジョブは赤化を許容する**: 当該 critical 1 件で security-audit ワークフローが赤になるが、本 Issue では「new critical の早期検知」を優先目的とし、既存 critical の緑化は行わない。
- **ブランチ保護で必須化しない**: GitHub の Required check には設定しない。PR マージは他のチェック（lint / typecheck / build）通過で判断する。
- Issue #5（PDF レポート実装）の着手・マージのタイミングで `docs/security/jspdf-v3-migration-poc.md` を再読し、以下の選択肢から再判断する:
  - (α) 既知 GHSA-ID（`GHSA-f8cm-6447-x5h2`）以外の critical のみで失敗させるカスタムスクリプト（`scripts/audit-check.mjs` 等）を別 Issue で導入
  - (β) jspdf v3 / v4 へ移行し、当該 critical を根本解消
  - (γ) 引き続き赤色を許容（最小コスト運用）

### 6.3 `package.json` `overrides` を採用しない理由

- `dompurify` を v3.4.0+ に強制更新する `overrides` を入れると、jspdf v2 が利用する内部 API が破壊される可能性があり、`import "jspdf"` 時のモジュール初期化エラーリスクが残る。
- 本書 §2.3 で dompurify コードパスは到達不能と判定しているため、強制更新の必要性が低い。
- Issue #5 着手時点で v3 / v4 移行が決まれば `overrides` は不要になる（jspdf 自体の修正版採用）。一時的な対症療法を入れるよりは、CI + 文書化された到達不能判定の二段構えを採る。

## 7. レビュー観点（Issue #5 担当者向け申し送り）

Issue #5 の PR レビュー時に以下を必須チェック項目として適用する:

- [ ] `pdf.save(filename)` の `filename` 引数が `buildPdfFilename()` の戻り値以外でない（§2.1）
- [ ] `pdf.html(...)` の呼び出しが存在しない（grep で確認、§2.3）
- [ ] `addImage` に渡す `imgData` が `html2canvas` 出力以外でない（§2.2）
- [ ] フォーム入力値や URL クエリパラメータを直接 jspdf API に渡す箇所が存在しない（§2.2 / §2.3）

## 8. 関連ファイル

- `docs/spec/pdf-report.md` — §3.1 / §6.3 / §11.2 / §11.3 / §13.1
- `docs/security/jspdf-v3-migration-poc.md` — v3 / v4 移行 PoC 調査ノート
- `working/plans/issue-8_dependencies.md §6 R5` — v3 を踏まない方針の根拠
- `working/plans/issue-24-jspdf-vulnerability-policy_260501195233.md` — 本書を生成する元プラン
- `.github/workflows/security-audit.yml` — CI による critical 検知
- `package.json` — `audit` / `audit:critical` scripts
