# jspdf v2 系脆弱性最終判断と運用整備（v3 即時移行はせず到達不能判定の文書化を確定する）

## Context

`npm audit`（2026-05-01 実測）で 7 件（critical 1 / high 4 / moderate 2）の脆弱性が報告されている。critical は `jspdf@^2.5.2` 本体の Path Traversal（GHSA-f8cm-6447-x5h2）、moderate のうち 1 件は推移依存 `dompurify` の XSS 系。high の 4 件（`next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next`）は別系統で、いずれも `next@16` メジャー更新でしか解消しない。

PDF 生成本実装（本リポジトリでは **Issue #5**、Issue 本文の「#43」相当）の着手前に、`docs/security/jspdf-vulnerabilities.md` と `docs/security/jspdf-v3-migration-poc.md` の事前分析を踏まえて、最終方針を確定し、文書を「確定」ステータスに切り替えるのが本 Issue（#50）のスコープである。

GitHub Issue: #50

## 推奨アプローチと理由

**推奨: v2 系を継続（jspdf `^2.5.2` を据え置き） + `overrides` を導入しない + 既存到達不能判定を「最終判断」として文書化して締める。** Next.js / glob / postcss 系の high / moderate は別 Issue として切り出す。

### 理由（3 つの独立した根拠）

1. **`docs/security/jspdf-vulnerabilities.md` §3 で 10 件すべて到達不能と既に論証済み。** 実装契約（§3.1 html2canvas 主体・§6.3 顧客名入力不採用・§11.2 / §11.3 のテンプレート生成ファイル名）を遵守する限り、critical Path Traversal も dompurify XSS 系もコードパスに到達しない。Issue #50 の受け入れ条件 (a) は「critical が消える **または許容理由が文書化**」で、後者がすでに成立している。

2. **`docs/security/jspdf-v3-migration-poc.md` §5.1 が「v3 / v4 への即時移行は推奨しない」と結論済み。** PoC は文献ベースで `[要検証]` 項目（コンストラクタ引数形式の deprecation、`html2canvas` v2 連鎖、dompurify 採用バージョン、v4 追加破壊点）が多数残る。Issue #5 着手時点での実機検証が前提であり、本 Issue（#50）で先回り移行すると Issue #5 のスケジュールを圧迫する。Path Traversal の修正版は jspdf **4.0.0+** にしか入っておらず（3.x では未バックポート推定）、移行するなら v4 系。v4 メジャー直後に飛び込むのは「枯れ不足」リスクが高い（PoC §4.3）。

3. **`overrides` で `dompurify` を v3.4.0+ に強制更新する案は jspdf v2 が内部 API として参照する形を破壊する可能性がある**（vuln 文書 §6.3）。本アプリは `jsPDF.html()` を呼ばないため dompurify コードパスには到達せず、強制更新の必要性が低い。`overrides` を入れると `import "jspdf"` 時のモジュール初期化エラーリスクのほうが現実的に高い。

### Next.js 系 high の扱い

`next@16.2.4` への semver-major 更新を要する。本リポジトリは `next@14.2.35` で App Router / `next/font/local` / `@cloudflare/next-on-pages` 連携を前提に運用される（`.claude/issue-order.md` フェーズ 3）。v16 は v14→v15→v16 の 2 段階メジャーで Breaking changes 範囲が大きいため、**本 Issue では即時更新を行わず、別 Issue（"Next.js 14 → 16 メジャー更新"）として切り出す**。受け入れ条件 (b) は「方針が文書化されている」で満たす。

## 変更対象ファイル

### 1. `docs/security/jspdf-vulnerabilities.md` のステータスと最終判断追記

- **変更**: `/Users/YS/development/matatabi-calculator/docs/security/jspdf-vulnerabilities.md`
- **変更箇所**:
  - 冒頭メタ（L3）: `> ステータス: 確定（2026-05-01 時点）` → `> ステータス: 確定（最終判断 2026-05-01）` に揃え、関連 Issue に `#50` を追記。
  - §1 表（L16-L27）: `npm audit` 実測との整合確認のうえ、件数を「critical 1 / high 2 / moderate 7」のまま維持（jspdf 系のみのカウント。Next.js 系は本書スコープ外）。
  - §5 末尾（L112）: 「Issue #5 着手時点で再評価する」を「**Issue #50 にて 2026-05-01 に v2 継続を最終判断（v3/v4 即時移行はしない）。Issue #5 着手時点で `docs/security/jspdf-v3-migration-poc.md` §5.3 の再評価トリガーを再確認する**」へ更新。
  - §6（残存リスク受容の運用）末尾に新規節 §6.4 を追加: 「**§6.4 Next.js 系 high の扱い（Issue #50 確定）**」として、`next` / `glob` / `eslint-config-next` / `@next/eslint-plugin-next` / `postcss` の advisory ID と 修正版 (`next@16.2.4`)、即時更新しない理由（Cloudflare Pages 連携 / App Router 14 系前提 / メジャー 2 段飛び）、別 Issue 化する旨を明記。
- **変更内容**: 受け入れ条件 (a) と (b) を満たす最終判断・実施日を文書側に固定する。
- **理由**: Issue 受け入れ条件 (d)「`docs/security/jspdf-vulnerabilities.md` に最終判断・実施日が追記」を直接満たす。

### 2. `docs/security/jspdf-v3-migration-poc.md` の暫定判定 → 確定への昇格

- **変更**: `/Users/YS/development/matatabi-calculator/docs/security/jspdf-v3-migration-poc.md`
- **変更箇所**:
  - 冒頭メタ（L3）: `> ステータス: 調査中（2026-05-01 時点の暫定判定）` → `> ステータス: 確定（Issue #50 で 2026-05-01 に v3/v4 即時移行不採用を最終判断）` に変更。関連 Issue に `#50` を追記。
  - §5.1（L91-L96）: 暫定判定 → 最終判定として表記を整える（「即時移行は推奨しない」を「即時移行は採用しない（Issue #5 着手時点で §5.3 トリガーが発火していなければ v2 継続）」）。
  - §5.2（L99）: 「本 Issue でのアクション」を「**Issue #50（本書の確定）でコードを書かない最終判断を確定。Issue #5 着手時点で本書 §5.3 を再読する手順を `working/plans/` の Issue #5 プランに引き継ぐ**」と更新。
- **変更内容**: 文献ベース PoC を「確定文書」に昇格させ、Issue #5 への申し送り経路を明示。
- **理由**: 受け入れ条件 (a)/(b)/(d) のうち、PoC 側のステータスを暫定のまま放置しないため。Issue #50 の判断アウトプットの正本性を確保する。

### 3. `package.json` / `package-lock.json` の据え置き確認（変更なし）

- **変更なし**: `/Users/YS/development/matatabi-calculator/package.json`
  - `dependencies.jspdf: "^2.5.2"` のまま据え置き。
  - `overrides` フィールドは追加しない（vuln 文書 §6.3 の判断と整合）。
  - `scripts.audit` / `scripts.audit:critical` は既に存在（`package.json` L10-L11）。追加変更不要。
- **変更なし**: `/Users/YS/development/matatabi-calculator/package-lock.json`
  - `node_modules/jspdf@2.5.2` / `node_modules/dompurify@2.5.9` の解決状態を変更しない。
  - 受け入れ条件 (e)「`package-lock.json` がコミットされ、CI 上で再現する」については、本 Issue でロックファイルを変更しない以上、現状の lock 内容のまま CI で `npm ci` が成功する状態を維持する。
- **理由**: 本 Issue は「方針確定」がスコープであり、コード／依存変更を伴わない（PoC §5.2 の「コードを書かない」と整合）。

### 4. `src/lib/pdf.ts` への影響（本 Issue では作成しない）

- **新規作成しない**: `/Users/YS/development/matatabi-calculator/src/lib/pdf.ts`
- **理由**: 当該ファイルは Issue #5（PDF レポート実装）の成果物。Issue #50（本 Issue）はその前段の方針確定であり、ここでファイルを作るとスコープ越境になる。Issue #5 の実装時に `docs/spec/pdf-report.md §11.2` の実装契約（`new jsPDF("p", "mm", "a4")` / `pdf.addImage(imgData, "PNG", 0, 0, 210, 297)` / `pdf.save(buildPdfFilename())`）と本書 §7 のレビュー観点を遵守して着手する。

### 5. `.github/workflows/security-audit.yml` の据え置き

- **変更なし**: `/Users/YS/development/matatabi-calculator/.github/workflows/security-audit.yml`
- **理由**: 既に Issue #24 で `npm audit --audit-level=critical` 化が実装済み。critical 1 件で赤化することは vuln 文書 §6.2 で許容済みの運用。本 Issue で `audit-level` を `high` に上げる選択肢もあったが、Next.js 系 high が別 Issue で解消されるまで CI が永続的に赤化するため、現状の `critical` レベル維持を最終判断とする（vuln 文書 §6.4 へ追記する内容に含める）。

## 設計上の考慮点

### なぜ v3 / v4 移行を選ばないか（再整理）

- **Path Traversal の修正は v4.0.0+ のみ**（PoC §2.3）。v3 では未バックポート推定。仮に「critical を消す」だけが目的なら v4 直行が必要だが、`html2canvas` の v2 連鎖（PoC §2.4 / §4.3）と v4 メジャーリリース直後の枯れ不足リスクを Issue #5 のスケジュールと正面から衝突させることになる。
- 本アプリの利用形態では critical の Path Traversal は **`pdf.save(buildPdfFilename())` のテンプレート生成ファイル名のみが渡る** ため到達不能（vuln 文書 §2.1）。「消す価値」より「移行で生む不確実性」が大きい。

### なぜ `overrides` を選ばないか

- jspdf v2 は内部で `dompurify@^2.5.4` 系を import しており、`overrides` で v3.4.0+ に強制した場合に `dompurify` の major API 差分（`addHook` シグネチャ・default export の取り扱い等）で初期化失敗するリスクが残る（vuln 文書 §6.3）。
- 本アプリは `jsPDF.html()` を呼ばず dompurify コードパスに到達しないため（vuln 文書 §2.3）、強制更新の必要性は限定的。CI + 文書化判定の二段構えで十分。

### Next.js / glob / postcss 高位脆弱性の扱い

- これらは本 Issue（#50）スコープ外として **別 Issue 化する**。具体的には `next@16` メジャー更新の影響範囲（App Router の breaking、`@cloudflare/next-on-pages` の対応バージョン、`next/font/local` の挙動変化）を独立した調査タスクとして起票し、`postcss` / `glob` は `next` の依存解決に追従する形で同時更新する。
- 受け入れ条件 (b)「high 脆弱性も方針が文書化されている（即対応 / 別 Issue 化）」は、`docs/security/jspdf-vulnerabilities.md §6.4`（新設）で「別 Issue 化」を明記して満たす。

### Issue #5 への引き継ぎ事項（再掲）

`docs/security/jspdf-vulnerabilities.md §7`（レビュー観点）と PoC §5.3 の再評価トリガーは Issue #5 の PR レビュー時に必須化する。Issue #5 着手プランの「事前確認」セクションで両文書を再読する手順を明記すること。

## 検証方法

本 Issue は文書のみ更新する方針のため、回帰テストは Issue 本文の指示どおり (a)〜(d) の最小スモークで足りる。Issue #5（`src/lib/pdf.ts`）が未実装である現状を踏まえる。

1. **`npm install` の成功確認**: `package.json` / `package-lock.json` を変更しないので、`node_modules` 再構築後も `npm ci` が成功すること。コマンド: `npm ci`（exit 0）。
2. **`npm run build` のパス**: 文書のみの変更で Next.js ビルドに影響しないことを確認。コマンド: `npm run build`（exit 0、`out/` または `.next/` が生成）。
3. **`npm run typecheck` のパス**: 文書変更が TypeScript 型解決に影響しないことを確認。コマンド: `npm run typecheck`（`tsc --noEmit` exit 0）。
4. **`npm audit` の実測値が文書記載と一致**: コマンド: `npm audit --json | python3 -c "..."`。期待値は記録時点と同じ「critical 1 / high 4 / moderate 2 / total 7」。差分が出たら vuln 文書 §1 表を更新（再評価トリガー (v) に該当）。
5. **`npm run audit:critical` が critical 1 件で赤化する挙動**: コマンド: `npm run audit:critical`（exit code != 0、ただし vuln 文書 §6.2 の運用上許容）。CI ワークフロー `.github/workflows/security-audit.yml` がプル直後の develop ブランチで同様に赤化することを GitHub Actions 上で 1 回確認。
6. **文書整合性チェック**: `grep -n "暫定判定\|調査中" docs/security/jspdf-v3-migration-poc.md` が 0 件になっていること（ステータス昇格の検証）。`grep -n "Issue #50" docs/security/jspdf-vulnerabilities.md docs/security/jspdf-v3-migration-poc.md` が両ファイルでヒットすること（最終判断の追跡可能性）。
7. **PDF 生成の回帰確認は本 Issue ではスキップ**: `src/lib/pdf.ts` 未実装のため、PDF 出力（Chrome / Safari / iOS）の手動回帰は Issue #5 の受け入れ条件として持ち越す。本 Issue 完了時点では `docs/security/jspdf-vulnerabilities.md §7` の PR レビュー観点が Issue #5 担当者へ申し送られていることが代替担保。

### Critical Files for Implementation

- /Users/YS/development/matatabi-calculator/docs/security/jspdf-vulnerabilities.md
- /Users/YS/development/matatabi-calculator/docs/security/jspdf-v3-migration-poc.md
- /Users/YS/development/matatabi-calculator/package.json
- /Users/YS/development/matatabi-calculator/.github/workflows/security-audit.yml
- /Users/YS/development/matatabi-calculator/docs/spec/pdf-report.md
