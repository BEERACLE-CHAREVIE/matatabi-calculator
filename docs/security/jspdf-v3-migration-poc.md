# jspdf v3 / v4 移行 PoC 調査ノート

> ステータス: 確定（Issue #50 で 2026-05-01 に v3/v4 即時移行不採用を最終判断）
> 関連 Issue: #24（本書の起票元、判断項目 (b)） / #5（PDF レポート実装、本書の判定を待つ） / #8（依存ライブラリ追加、`^2.5.2` 採用の経緯） / #50（本書の確定昇格、§5.1〜§5.2 を最終判定として確定）

## 1. 目的

Issue #24 判断項目 (b) の「`jspdf` v3 / v4 への移行 PoC」を、**コードを書かずに文献ベースで** 整理する。`docs/spec/pdf-report.md §11.2` の現行実装契約コード例:

```ts
const pdf = new jsPDF("p", "mm", "a4");
pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
pdf.save(options.filename);
```

が v3 / v4 でどう書き直しになるか、`html2canvas` v1 系（`^1.4.1`、Issue #8 で採用）との連携にどんな影響があるかを把握し、移行の **可否** と **コスト試算** を Issue #5 着手前に確定させる。

本書はあくまで「移行を検討する場合の作業ノート」であり、本 Issue ではコードは書かない。検証は Issue #5 着手時点で本書を再読し、その時点の最新版（v3.x.x or v4.x.x）の枯れ具合と GHSA 状況を見て判断する。

## 2. v2 → v3 の API 互換破壊点（公式 CHANGELOG / migration guide ベース）

> **注記**: 本セクションは公式リリースノートを Issue #5 着手時点で最新化する前提のリストであり、プラン作成時点で 100% 確認済みの内容ではない。要検証項目には `[要検証]` を付す。

### 2.1 コンストラクタ引数形式

| 形式 | v2 | v3 / v4 |
|---|---|---|
| 位置引数 | `new jsPDF("p", "mm", "a4")` | 後方互換維持（`[要検証]`、deprecation 警告の有無） |
| オブジェクト引数 | `new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })`（v2 でも対応済み） | 推奨（v3.x.x 以降の公式ドキュメント標準） |

**現行コードの影響**: `docs/spec/pdf-report.md §11.2` で位置引数形式を採用。v3 / v4 で deprecation 警告が出る場合は、オブジェクト引数形式に書き直す（1 行）。

### 2.2 `addImage` シグネチャ

| 形式 | v2 / v3 / v4 |
|---|---|
| 位置引数 | `addImage(imgData, "PNG", x, y, width, height)` |
| オブジェクト引数 | `addImage({ imageData, format, x, y, width, height, ... })`（`[要検証]` v3 系で導入された可能性） |

**現行コードの影響**: 位置引数の意味（`imgData`, `format`, `x`, `y`, `width`, `height`）は v2 / v3 / v4 で同じであることが公式ドキュメントから確認できる前提。**書き直し不要の見込み**。

### 2.3 `save(filename)`

- Path Traversal の修正版は **`jspdf@4.0.0+`** に含まれる（GHSA-f8cm-6447-x5h2 の `fixAvailable.version: 4.2.1`、`docs/security/jspdf-vulnerabilities.md §1` 表 #1 と整合）。3.x 系には未バックポートと推定される。
- 修正に伴って `save()` 内部にサニタイズが追加されている可能性があり、テンプレート生成済みファイル名（`matatabi-roi-YYYYMMDD-HHmm.pdf`）はサニタイズの影響を受けない見込み。
- **書き直し不要の見込み**。

### 2.4 `html2canvas` との連携

- v3 / v4 が `html2canvas` を内部依存として要求するか、`peerDependencies` で要求するかを `[要検証]` 。
- v2 系は `html2canvas` を `dependencies` ではなく利用者側で別途インストールする方式（本アプリも `html2canvas@^1.4.1` を別途宣言）。
- v3 / v4 で連携方式が変わると `package.json` の依存構成も変える必要がある可能性。

### 2.5 dompurify 推移依存

- v3 / v4 が新しい dompurify を採用していれば、`docs/security/jspdf-vulnerabilities.md §1` の moderate 7 件は自動的に解消する見込み。
- ただし v3.x.x の最新がどの dompurify バージョンを採用しているかは `[要検証]` 。

## 3. v3 → v4 の追加破壊点

- v4 系のリリースノート確認は Issue #5 着手時点で実施する。
- `npm audit` の `fixAvailable` が `jspdf@4.2.1` を指していることから、v4 系が現行修正版の最新であると推測できるが、v3 → v4 でさらに API 破壊があったかは `[要検証]` 。

## 4. 移行コスト試算

### 4.1 必須コード変更（最小）

| 対象 | 変更 | 行数試算 |
|---|---|---|
| `src/lib/pdf.ts` のコンストラクタ引数形式 | 位置 → オブジェクト形式（deprecation 警告が出る場合のみ） | 1 行 |
| `package.json` の `dependencies.jspdf` | `^2.5.2` → `^3.0.0` または `^4.0.0` | 1 行 |
| `package-lock.json` | `npm install` で自動更新 | 自動 |
| `docs/spec/pdf-report.md §11.2` のコード例 | 位置 → オブジェクト形式に追従（必要なら） | 1 行 |
| `docs/spec/pdf-report.md §10.1` のバージョン帯記載 | `^2.5.x` → `^3.x.x` または `^4.x.x` に更新 | 1 行 |

### 4.2 検証コスト

- A4 1 枚生成・日本語フォント埋め込み・Recharts SVG ラスタライズの動作確認（`docs/spec/pdf-report.md §2 原則 5` の実機検証要件）。
- iPad Safari / Mobile Safari / Desktop Chrome / Desktop Safari の最低 4 環境で再確認。

### 4.3 リスク

- **html2canvas v2 系連鎖**: jspdf v3 / v4 が `html2canvas` v2 系を要求する場合、`html2canvas` 本体の major アップデートが連鎖し、Issue #8 で確定した `^1.4.1` 帯（`working/plans/issue-8_dependencies.md` §2 Step 3）の方針改定が必要になる。
- **未知の API 破壊点**: 本書の `[要検証]` 項目が実機で問題化する可能性。Issue #5 のスケジュール圧迫リスク。
- **v3 / v4 系の枯れ不足**: メジャー版アップデート直後は 0day や regression が多い傾向。`working/plans/issue-8_dependencies.md` §2 Step 3 でも v2 採用の根拠としてこの点を挙げている。

## 5. 結論（Issue #50 で 2026-05-01 に最終判定）

### 5.1 最終判定

**v3 / v4 への即時移行は採用しない**（Issue #5 着手時点で §5.3 の再評価トリガーが発火していなければ v2 系を継続する）。理由:

1. `docs/security/jspdf-vulnerabilities.md §3` の到達経路分析で 10 件すべて到達不能と判定済み。
2. v3 / v4 系のリリースから Issue #5 着手予定までの期間が短く、「枯れ」が不足している（Path Traversal の修正版は v4.0.0+ のみで、v4 メジャーリリース直後の `0day` / regression リスクが大きい）。
3. `html2canvas` との連携破壊リスクが Issue #5 のスケジュールと正面衝突する。
4. `package.json` `overrides` で `dompurify` を強制更新する代替案も `docs/security/jspdf-vulnerabilities.md §6.3` で否定済み（jspdf v2 内部 API 破壊リスクのほうが実害大）。

### 5.2 本 Issue（#50）でのアクション

**コードを書かない最終判断を確定する**。本書のステータスを冒頭メタどおり「確定（最終判定）」に固定し、`docs/security/jspdf-vulnerabilities.md §5 / §6.4` に最終判断と実施日を反映する。実機 PoC は Issue #5 着手時点に持ち越し、その時点のプランで本書 §5.3 の再評価トリガーを再読する手順を明記する。

### 5.3 再評価のトリガー

`docs/security/jspdf-vulnerabilities.md §4` と整合し、以下のいずれかが発生した場合に本書を再読・更新する:

- `jspdf` v2 系に critical 級の新規脆弱性が出た（特に `addImage` 経路）
- dompurify 推移依存が v2 系のメンテナンスブランチに backport された（楽観シナリオ、可能性は低い）
- `docs/spec/pdf-report.md §13.1` の顧客名入力要件が確定し、ファイル名にユーザー入力が混入する仕様変更が決まった
- Issue #5 着手時点で v3 / v4 系の最新版がメジャー版リリースから 6 ヶ月以上経過し、回帰報告が落ち着いている（枯れ判定）

## 6. 関連ファイル

- `docs/security/jspdf-vulnerabilities.md` — 現状の脆弱性判断スナップショット
- `docs/spec/pdf-report.md` — §10.1（依存ライブラリ方針）/ §11.2（`generatePdf` 実装契約）
- `working/plans/issue-8_dependencies.md §6 R5` — v3 を踏まない方針の根拠
- `working/plans/issue-24-jspdf-vulnerability-policy_260501195233.md` — 本書を生成する元プラン
