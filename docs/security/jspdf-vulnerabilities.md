# jspdf v2 系の脆弱性判断メモ

> ステータス: 確定（最終判断 2026-05-01、Issue #67 にて 2026-05-03 に audit-level high 運用へ昇格）
> 関連 Issue: #24（本書の起票元） / #5（PDF レポート実装、本書を遵守する） / #8（依存ライブラリ追加、本書の前提） / #50（v3/v4 即時移行不採用の最終判断、本書 §5・§6.4 に反映） / #67（audit-level critical → high 引き上げ、本書 §1 表追補・§2.4・§6.2・§6.5 に反映）

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

### 1.1 Issue #67 着手時点（2026-05-03）の追補

Issue #24 で本書を起票した時点（2026-05-01）以降、`jspdf` 本体に対して新たに以下の advisory が公表された（§4 トリガー (i)(v) 該当）。Issue #67 で audit-level を high へ引き上げる際に再評価し、いずれも本アプリで未使用の jspdf API に紐づき到達不能と判定した（§2.4 参照）。

| #  | GHSA ID | タイトル | 出所 | 重大度 | 修正版 |
|----|---|---|---|---|---|
| 11 | GHSA-pqxr-3g65-p328 | jsPDF PDF Injection in AcroFormChoiceField | `jspdf` 本体 (<=4.0.0) | high | jspdf 4.0.1+ |
| 12 | GHSA-95fx-jjr5-f39c | jsPDF DoS via Unvalidated BMP Dimensions | `jspdf` 本体 (<=4.0.0) | high | jspdf 4.0.1+ |
| 13 | GHSA-vm32-vv63-w422 | jsPDF Stored XMP Metadata Injection | `jspdf` 本体 (<=4.0.0) | moderate | jspdf 4.0.1+ |
| 14 | GHSA-cjw8-79x6-5cj4 | jsPDF Shared State Race Condition in addJS Plugin | `jspdf` 本体 (<=4.0.0) | moderate | jspdf 4.0.1+ |
| 15 | GHSA-9vjf-qc39-jprp | jsPDF PDF Object Injection via addJS Method | `jspdf` 本体 (<4.2.0) | high | jspdf 4.2.0+ |
| 16 | GHSA-67pg-wm7f-q7fj | jsPDF DoS via Malicious GIF Dimensions | `jspdf` 本体 (<4.2.0) | high | jspdf 4.2.0+ |
| 17 | GHSA-p5xg-68wr-hm3m | jsPDF AcroForm RadioButton PDF Injection | `jspdf` 本体 (<4.2.0) | high | jspdf 4.2.0+ |
| 18 | GHSA-7x6v-j9x4-qf24 | jsPDF PDF Object Injection via FreeText color | `jspdf` 本体 (<=4.2.0) | high | jspdf 4.2.1+ |
| 19 | GHSA-wfv2-pwc8-crg5 | jsPDF HTML Injection in New Window paths | `jspdf` 本体 (<=4.2.0) | **critical** | jspdf 4.2.1+ |

§1 表 (1〜10) と合わせて累積 19 件（critical 2 / high 9 / moderate 8）。いずれも `fixAvailable` は jspdf 4.x 系 SemVer major で、本アプリでは `docs/security/jspdf-v3-migration-poc.md §5.1` の最終判定により採用しない。Issue #67 では `scripts/audit-check.mjs` の GHSA-ID 除外リストにより、これらすべてを CI ブロック対象から外す（§2.4・§6.5 参照）。

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
- `dompurify` モジュール自体は `jspdf` の import 時に読み込まれるが、脆弱性が成立するのは `dompurify.sanitize()` の呼び出し時のみ。`sanitize()` は `jsPDF.html()` の内部実装からのみ起動されるため、`jsPDF.html()` を経由しない以上、**脆弱なコードパスは実行されない**。

**判定**: `jsPDF.html()` を呼ばない実装契約を維持する限り、dompurify の脆弱なコードパスは実行されない。**到達不能**。

**実装時の遵守事項**:
1. `src/lib/pdf.ts` の `generatePdf` 関数内で `pdf.html(...)` / `jsPDF.prototype.html(...)` を呼び出してはならない（grep でレビュー時にチェック）。
2. 将来 `pdf.html()` を使った実装方針への変更（例: html2canvas を廃止して `jsPDF.html()` 直接利用に切り替える）が検討された場合は、本書を再評価する（§4 トリガー (iii)）。

### 2.4 Issue #67 で追補した jspdf 高位 advisory 群（§1.1 #11〜#19）

**論点**: §1.1 で追補した 9 件は、いずれも `jspdf` の特定 API（AcroForm 系、addJS、BMP/GIF デコーダ、HTML/New Window、FreeText 等）に紐づく PDF Injection / DoS 系。`docs/spec/pdf-report.md §3.1 / §11.2` で確定した実装契約のもとで、これら API を本アプリが呼び出すかが到達可否を決める。

**本アプリでの到達経路**:

- 本アプリで `generatePdf` が利用する jspdf API は §2.1〜§2.3 のとおり `new jsPDF("p", "mm", "a4")` / `addImage(imgData, "PNG", ...)` / `save(filename)` の 3 種に限定される（`docs/spec/pdf-report.md §11.2`）。
- 以下、追補対象 9 件を該当 API ごとに分類して到達経路を評価する:

| GHSA-ID | 該当 API / 経路 | 本アプリ実装 | 到達判定 |
|---|---|---|---|
| GHSA-pqxr-3g65-p328 | `AcroFormChoiceField`（PDF フォーム） | フォーム要素を一切生成しない | 到達不能 |
| GHSA-p5xg-68wr-hm3m | `AcroForm RadioButton.createOption` | 同上 | 到達不能 |
| GHSA-7x6v-j9x4-qf24 | FreeText 注釈の `color` プロパティ | 注釈系 API 未使用 | 到達不能 |
| GHSA-9vjf-qc39-jprp | `addJS()`（埋め込み JavaScript） | `addJS` を呼ばない | 到達不能 |
| GHSA-cjw8-79x6-5cj4 | `addJS` プラグインの shared state | 同上（`addJS` 未使用） | 到達不能 |
| GHSA-95fx-jjr5-f39c | BMP デコーダ（`addImage` の `format: "BMP"`） | `addImage(..., "PNG", ...)` のみ。BMP / GIF を渡さない | 到達不能 |
| GHSA-67pg-wm7f-q7fj | GIF 寸法（同上、GIF 経路） | 同上 | 到達不能 |
| GHSA-vm32-vv63-w422 | XMP メタデータ書き込み | `setProperties` / メタデータ API 未使用 | 到達不能 |
| GHSA-wfv2-pwc8-crg5 | `pdf.html()` の New Window paths（HTML Injection） | `pdf.html()` 未使用（§2.3 と同一前提）。`addLink` の URL も渡さない | 到達不能 |

**判定**: 9 件すべて、本アプリが該当 jspdf API を呼び出さないことから **到達不能**。§2.1〜§2.3 と同じ「未使用 API は脆弱コードパスを実行しない」前提で成立する条件付き判定である。

**実装時の遵守事項**（既存 §2.1〜§2.3 の遵守事項を再確認）:
1. `addImage` の第 2 引数は `"PNG"` 固定とし、`"BMP"` / `"GIF"` 等の他フォーマットを渡さない。
2. `addJS` / `setProperties` / `addAcroForm*` / `pdf.html()` / `addLink` などの API を新規導入する場合は、本書を再評価する（§4 トリガー (iii) を拡張運用する）。
3. 上記の遵守事項を破る実装変更が PR に含まれる場合、レビュー時に §7 のチェックリストで指摘する（§7 にチェック項目を追加した）。

## 3. 結論

§1 の 10 件 + §1.1 の 9 件、合計 **19 件すべて「到達不能」** と判定する。これは現行の `docs/spec/pdf-report.md` の実装契約（§3.1 html2canvas 主体・§6.3 顧客名入力不採用・§11.2 / §11.3 の関数契約）を厳密に遵守することを前提とする条件付き判定である。

| 区分 | 件数 | 判定 |
|---|---|---|
| jspdf Path Traversal (critical) | 1 | 到達不能（§2.1） |
| jspdf ReDoS / DoS (high) | 2 | 到達不能（§2.2） |
| dompurify 系 (moderate) | 7 | 到達不能（§2.3） |
| jspdf 追補 critical (HTML Injection in New Window paths) | 1 | 到達不能（§2.4） |
| jspdf 追補 high (AcroForm / addJS / BMP / GIF / FreeText 等) | 6 | 到達不能（§2.4） |
| jspdf 追補 moderate (XMP / addJS shared state) | 2 | 到達不能（§2.4） |

## 4. 再評価のトリガー

以下のいずれかが発生した場合、本書を更新する（場合により判定を「到達可能」に改める）:

- (i) `jspdf` v2 系（`<3.0.0`）に新たな脆弱性が報告された
- (ii) `docs/spec/pdf-report.md §13.1` の顧客名入力要件が確定し、ファイル名にユーザー入力が混入する仕様変更が決まった
- (iii) `jsPDF.html()` を呼び出す実装方針に切り替わった（html2canvas 主体方針の見直し）
- (iv) jspdf v3 / v4 への移行が決定した（`docs/security/jspdf-v3-migration-poc.md §5` の再評価）
- (v) `npm audit` 実行で本書 §1 の表に未掲載の advisory が報告された

## 5. v3 / v4 移行 PoC への参照

本 Issue 判断項目 (b) の v3 / v4 移行 API 互換調査は `docs/security/jspdf-v3-migration-poc.md` に分離している。**Issue #50 にて 2026-05-01 に v2 継続を最終判断（v3/v4 即時移行はしない）。** Issue #5 着手時点で `docs/security/jspdf-v3-migration-poc.md` §5.3 の再評価トリガーを再確認する。

## 6. 残存リスク受容の運用

§3 の判定により本 Issue では **コード側の対症療法（`package.json` `overrides` でのホワイトリスト化等）を行わない** 方針を採る。代わりに以下の運用を整備する:

### 6.1 CI による high / critical 検知（Issue #67 で audit-level=high へ昇格）

- `.github/workflows/security-audit.yml` で `npm run audit:check`（`scripts/audit-check.mjs` 経由）を CI 化。Issue #24 判断項目 (c) の実装は Issue #67 で audit-level=high 運用へ昇格した。
- トリガー: `pull_request` / `push (develop / main)` / 週次 `schedule (cron: "0 0 * * 1")` / `workflow_dispatch` 。
- ローカル再現用に `package.json` の `scripts` に `audit` / `audit:check` の 2 本を提供する（旧 `audit:critical` は Issue #67 で `audit:check` に置換）。

### 6.2 既知 critical / high 群の扱い（Issue #67 で (α) 採用へ確定）

§1（10 件）+ §1.1（9 件）の合計 19 件は §2.1〜§2.4 で **到達不能と判定済み** であるが、`npm audit` は引き続き critical / high として報告する。本書 §6.2 で Issue #50 完了時点に保留していた選択肢 (α)(β)(γ) について、Issue #67（2026-05-03）で **(α) GHSA-ID 除外スクリプト導入** を採用と確定した:

- **採用方針**: `scripts/audit-check.mjs` で `ALLOWED_GHSA_IDS` に列挙した GHSA-ID（§2 で到達不能と判定済みのもの）を除外し、残存 critical / high が 1 件でもあれば CI を赤化する。
- **CI ジョブは「新規 critical / high の早期検知」目的で赤化する**: 既知 GHSA は除外スクリプトにより緑化済みのため、新たな advisory が発生した時点で確実に赤化する運用へ切り替わる（旧運用「既知 critical の赤化を許容」は廃止）。
- **ブランチ保護で必須化しない**: GitHub の Required check には引き続き設定しない（§6.5「運用観察」参照）。PR マージは他のチェック（lint / typecheck / build / test）通過で判断する。
- (β) jspdf v3 / v4 へのメジャー更新は不採用（`docs/security/jspdf-v3-migration-poc.md §5.1` の最終判定 2026-05-01 に従う）。
- (γ) 据え置き継続も不採用（新規 high の早期検知能力を犠牲にし、Issue #67 受け入れ条件と矛盾する）。

### 6.3 `package.json` `overrides` を採用しない理由

- `dompurify` を v3.4.0+ に強制更新する `overrides` を入れると、jspdf v2 が利用する内部 API が破壊される可能性があり、`import "jspdf"` 時のモジュール初期化エラーリスクが残る。
- 本書 §2.3 で dompurify コードパスは到達不能と判定しているため、強制更新の必要性が低い。
- Issue #5 着手時点で v3 / v4 移行が決まれば `overrides` は不要になる（jspdf 自体の修正版採用）。一時的な対症療法を入れるよりは、CI + 文書化された到達不能判定の二段構えを採る。

### 6.4 Next.js 系 high / moderate の扱い（Issue #50 確定）

> **ステータス: 移行完了（2026-05-02、Issue #53 / Issue #64 にて解消）。** 本節は判断履歴として残置する。実装上の Next.js 系 advisory は §6.4.1 の表のとおりすべて 0 件化済み。

`npm audit` 実測（2026-05-01）では、本書 §1 の jspdf 系とは別系統で、Next.js 周辺の高位脆弱性が併せて報告された。本書のスコープ外だが、Issue #50 の受け入れ条件 (b)「high 脆弱性も方針が文書化されている（即対応 / 別 Issue 化）」を満たすため、本節で扱いを明記する。

| 区分 | 主な advisory 経路 | 重大度 | 修正版 | 解消状態 |
|---|---|---|---|---|
| `next` 本体 | next の複数 advisory + 推移依存 `postcss` 経由 | high | `next@16.2.4` 以降 | ✅ 解消（Issue #64 で `next@16.2.4` 採用） |
| `glob` | `@next/eslint-plugin-next` と相互に推移依存（`glob` 自体の advisory が plugin 経由で連鎖） | high | `next@16` の依存解決追従 | ✅ 解消（`next@16` への lockfile 再解決で除去） |
| `eslint-config-next` | `@next/eslint-plugin-next` 経由 | high | `next@16` の依存解決追従 | ✅ 解消（`eslint-config-next@^16` 採用） |
| `@next/eslint-plugin-next` | `glob` と相互に推移依存 | high | `next@16` の依存解決追従 | ✅ 解消（`next@16` への lockfile 再解決で除去） |
| `postcss` | `next` の推移依存 | moderate | `next@16` の依存解決追従 | ✅ 解消（`next@16.2.4` がネスト依存に `postcss@8.4.31` を pin していたため、`package.json` の `overrides` で `postcss@^8.5.10` を全体に強制し解消） |

#### 6.4.1 即時更新しない理由（履歴）

> **過去の判断（Issue #50 起票時点 2026-05-01）。** Issue #53 / Issue #64 で `next@16.2.4` への移行が完了したため、本節は履歴として残す。

- Issue #50 起票時点では、本リポジトリは `next@14.2.35` で App Router / `next/font/local` / `@cloudflare/next-on-pages` 連携を前提に運用されると想定されていた（当時の `.claude/issue-order.md` フェーズ 3 / `README.md` の Cloudflare Pages 設定の記述に基づく）。
- ※ 本リポジトリでは `next/font/local` 不使用、`@cloudflare/next-on-pages` 未導入。当時の Issue #50 起票文の記述に準じて履歴として記録（実態調査は `docs/security/nextjs-15-16-migration-notes.md §3` を参照）。
- `next@14 → next@16` は **メジャー 2 段飛び**（v14 → v15 → v16）。Breaking changes の影響範囲（App Router の細部、middleware API、画像最適化、`next/font/local` の挙動）を Issue #50 のスコープで吸収するのは過大と判断した。
- `@cloudflare/next-on-pages` が `next@16` の Edge Runtime 仕様変更にどこまで追従済みかも別途検証が必要と想定されていた（実際には `@cloudflare/next-on-pages` 未導入で、`output: "export"` による静的アップロード運用のため検証不要だった）。

#### 6.4.2 別 Issue 化方針

- 「Next.js 14 → 16 メジャー更新」は **Issue #53** として切り出し済み（2026-05-01 起票）。`postcss` / `glob` は `next` の依存解決に追従する形で同時更新する想定。
- 本 Issue（#50）完了時点では、`.github/workflows/security-audit.yml` の `audit-level=critical` を維持し、high レベルの CI 赤化は当面起こさない運用とする（critical 1 件の赤化のみ §6.2 に従って許容）。
- **Issue #53 / Issue #64 にて移行完了**（2026-05-02、`next@16.2.4` / `eslint-config-next@^16.0.0` / `eslint@^9` 採用、`postcss` は `overrides` で `^8.5.10` に強制）。Issue #67（2026-05-03）にて `security-audit.yml` を `audit-level=high` 相当（GHSA-ID 除外スクリプト経由）に引き上げ済み（§6.2・§6.5）。

### 6.5 audit-level critical → high 引き上げ（Issue #67 確定）

- **実施日**: 2026-05-03（Issue #67 完了時点）。
- **採用方針**: (α) GHSA-ID 除外スクリプト導入。`scripts/audit-check.mjs` で `npm audit --json` の出力から severity が critical / high の advisory を抽出し、`ALLOWED_GHSA_IDS` に列挙された既知 GHSA-ID を除外したうえで残存件数を判定する。CI / ローカルとも `npm run audit:check` で同一動作する。
- **除外対象 GHSA-ID リスト**（`scripts/audit-check.mjs` の `ALLOWED_GHSA_IDS` と一致。critical / high のみ列挙）:
  - `GHSA-f8cm-6447-x5h2` — §2.1（jspdf Path Traversal、`buildPdfFilename()` テンプレート生成のため到達不能）
  - `GHSA-w532-jxjh-hjhj` / `GHSA-8mvj-3j78-4qmw` — §2.2（jspdf ReDoS / DoS、攻撃者制御文字列が到達しない）
  - `GHSA-pqxr-3g65-p328` / `GHSA-p5xg-68wr-hm3m` — §2.4（AcroForm 系、本アプリではフォーム要素未生成）
  - `GHSA-9vjf-qc39-jprp` — §2.4（`addJS` 系、`addJS` API 未使用）
  - `GHSA-95fx-jjr5-f39c` / `GHSA-67pg-wm7f-q7fj` — §2.4（BMP / GIF デコーダ、`addImage(..., "PNG", ...)` のみ使用）
  - `GHSA-7x6v-j9x4-qf24` — §2.4（FreeText 注釈、注釈系 API 未使用）
  - `GHSA-wfv2-pwc8-crg5` — §2.4（HTML Injection in New Window paths、`pdf.html()` 未使用）
- **追跡のみ（moderate のため allowlist 登録不要、severity フィルタで自動除外）**:
  - `GHSA-cjw8-79x6-5cj4` — §2.4（`addJS` プラグイン共有状態、`addJS` API 未使用）
  - `GHSA-vm32-vv63-w422` — §2.4（XMP メタデータ書き込み、メタデータ API 未使用）
  - dompurify 系 7 件（§1 #4〜#10、§2.3 で到達不能判定済み）
- **採用しなかった選択肢**:
  - **(β) jspdf v3 / v4 メジャー更新**: `docs/security/jspdf-v3-migration-poc.md §5.1` の最終判定（2026-05-01）と矛盾。`html2canvas` v2 連鎖と v4 メジャーリリース直後の枯れ不足リスクが現存し、再評価トリガー（PoC §5.3）も未発火。
  - **(γ) 据え置き継続**: 現状 `audit-level=critical` のままでは新規 high の早期検知能力が得られず、Issue #67 起票動機（Next.js 系 high の 0 件化を受けた引き上げ判断）と矛盾する。
- **除外リスト変更ガバナンス**:
  - `ALLOWED_GHSA_IDS` への追加・削除は本書 §2 の到達経路分析を必ず付帯すること。`scripts/audit-check.mjs` 冒頭コメントで明文化済み。
  - §4 トリガー (i)〜(v) のいずれかが発火した場合、本節と §1.1 / §2.4 を再評価する。
- **ブランチ保護 Required check への組み込み**: 本 Issue 範囲外。最低 2 週間の運用観察期間（2026-05-03〜2026-05-17 目安）を経て、新規 advisory 発生時の運用負荷と検知ラグを観察したうえで別 Issue で判断する。`security-audit.yml` を即 Required にすると、新規 advisory 公開タイミングで develop の PR が無関係に止まる副作用が大きいため、慎重に判断する。

## 7. レビュー観点（Issue #5 担当者向け申し送り）

Issue #5 の PR レビュー時に以下を必須チェック項目として適用する:

- [ ] `pdf.save(filename)` の `filename` 引数が `buildPdfFilename()` の戻り値であること（§2.1）
- [ ] `pdf.html(...)` を呼び出す実装が含まれないこと（grep で確認、§2.3 / §2.4）
- [ ] `addImage` に渡す `imgData` が `html2canvas` 出力の dataURL であること（§2.2）
- [ ] `addImage` の第 2 引数（フォーマット指定）が `"PNG"` であること（§2.4: BMP / GIF デコーダ脆弱性の到達回避）
- [ ] `addJS` / `setProperties` / `addAcroForm*` / `addLink` などの jspdf API を新規導入していないこと（§2.4: 追補 9 件の到達回避）
- [ ] フォーム入力値や URL クエリパラメータを jspdf API に直接渡す実装が含まれないこと（§2.2 / §2.3 / §2.4）

## 8. 関連ファイル

- `docs/spec/pdf-report.md` — §3.1 / §6.3 / §11.2 / §11.3 / §13.1
- `docs/security/jspdf-v3-migration-poc.md` — v3 / v4 移行 PoC 調査ノート
- `working/plans/issue-8_dependencies.md §6 R5` — v3 を踏まない方針の根拠
- `working/plans/issue-24-jspdf-vulnerability-policy_260501195233.md` — 本書を生成する元プラン
- `working/plans/issue-67-raise-security-audit-level-critical-to-high_260503192049.md` — 本書 §1.1 / §2.4 / §6.2 / §6.5 を更新した Issue #67 のプラン
- `.github/workflows/security-audit.yml` — CI による high / critical 検知（`npm run audit:check` 経由）
- `package.json` — `audit` / `audit:check` scripts
- `scripts/audit-check.mjs` — GHSA-ID 除外スクリプト（Issue #67 で導入、`ALLOWED_GHSA_IDS` の根拠は §6.5）
