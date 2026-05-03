# security-audit ワークフローの GHSA-ID 除外スクリプト導入と audit-level 引き上げプラン（オプション α 採用）

## Context
PR #65（Issue #64、Next.js 14 → 16 メジャー更新）のマージにより、`docs/security/jspdf-vulnerabilities.md §6.4` で別 Issue 化されていた Next.js 系 high 4 件が解消された。`npm audit` 実測上の残存 advisory は以下 2 件のみ:

- `GHSA-f8cm-6447-x5h2`（jspdf Path Traversal、critical 1 件、`docs/security/jspdf-vulnerabilities.md §2.1` で到達不能判定済み）
- `GHSA-vhxf-7vqr-mrjg` 系（dompurify、moderate 1 件、jspdf 推移依存、§2.3 で到達不能判定済み）

`docs/security/jspdf-vulnerabilities.md §6.2` で Issue #50 完了時点に保留されていた選択肢 (α)(β)(γ) の再評価ができる材料が揃った。本プランでは **(α) GHSA-ID 除外スクリプト導入** を採用し、jspdf v2 系を据え置いたまま CI を `audit-level=high` 相当に引き上げ、新規 critical / high の早期検知能力を確立する。`src/lib/pdf.ts` には変更を加えない（jspdf 本体のメジャー更新を行わないため、(β) は不採用）。

GitHub Issue: #67

## 変更対象ファイル

### 1. GHSA-ID 除外ロジックを実装する `audit-check.mjs` の新規追加
- **新規**: `/Users/YS/development/matatabi-calculator/scripts/audit-check.mjs`
- **変更箇所**: ファイル全体（`scripts/` ディレクトリ自体が未存在のため、ディレクトリも新設する）
- **変更内容**:
  - 冒頭にコメントブロックで設計根拠を残す（既存 `.github/workflows/security-audit.yml` / `ci.yml` と同様の慣習に従う）:
    ```
    // 設計根拠: docs/security/jspdf-vulnerabilities.md §6.2 (α)
    // 関連 Issue: #67（audit-level critical → high 引き上げ）
    ```
  - Node 標準 API のみで完結する ESM スクリプトとして実装する（`engines.node: ">=20.0.0"` 前提、`package.json` L18-L20）:
    1. `child_process.spawnSync` で `npm audit --json --audit-level=high` を実行し、stdout を JSON として `JSON.parse` する。`npm audit` は脆弱性検知時に exit code 1 を返すが、本スクリプトでは exit code を無視し、出力 JSON のみを解析対象とする（`status` フィールドが `0` 以外でも `vulnerabilities` キーは存在する仕様）。
    2. 既知 GHSA-ID の除外リストを定数として宣言する:
       ```js
       // 到達不能と判定済みの既知 advisory（docs/security/jspdf-vulnerabilities.md §2.1 / §2.3）
       const ALLOWED_GHSA_IDS = new Set([
         "GHSA-f8cm-6447-x5h2", // jspdf Path Traversal（§2.1: filename はテンプレート生成のため到達不能）
         // dompurify 系 advisory は jspdf 推移依存。§2.3 で到達不能判定済み。
         // npm audit 実測時点で残存しているものを列挙する（実測値に応じて随時更新）。
       ]);
       ```
       コメントで「除外リストを変更する際は `docs/security/jspdf-vulnerabilities.md §2` の到達経路分析と §6.2 の運用方針を必ず再評価すること」と明記する。
    3. `vulnerabilities` オブジェクトを走査し、`severity` が `critical` または `high` のものを抽出。各 advisory の `via` 配列に含まれる `url`（GitHub Advisory URL、形式 `https://github.com/advisories/GHSA-xxxx-xxxx-xxxx`）または `source`（GHSA ID 直値）から GHSA-ID を抽出し、`ALLOWED_GHSA_IDS` に含まれないものをエラー出力対象とする。
       - dompurify は moderate のため `audit-level=high` では本来検知されないが、`npm audit --json` は moderate も含めて出力するため、severity フィルタリングは本スクリプト側で行う（`npm audit` 側の `--audit-level` は最終 exit code 判定にのみ作用するため、本スクリプトは `--json` 出力のみ利用する）。
    4. 残存 advisory が 0 件なら `console.log` で「No blocking advisories. Allowed GHSA-IDs: <list>」と表示し `process.exit(0)`。1 件以上なら、当該 advisory の `name` / `severity` / GHSA-ID / `title` / `url` を表形式で `console.error` し、`process.exit(1)` で赤化する。
    5. `ALLOWED_GHSA_IDS` で除外した advisory も「INFO: Allowed advisories suppressed (see docs/security/jspdf-vulnerabilities.md §2):」として参考表示し、運用者が CI ログから除外実態を一目で把握できるようにする。
  - shebang（`#!/usr/bin/env node`）は付けず、`node scripts/audit-check.mjs` 形式での起動を前提とする（`package.json` の `scripts` から呼び出すため）。
- **理由**: Issue #67 「実装方針 (α)」の中核実装。既知 critical 1 件（GHSA-f8cm-6447-x5h2）を除外したうえで critical/high の有無を判定することで、Issue 受け入れ条件「(α) または (β) の場合、対応する実装変更が完了」「`audit-level=high` への引き上げが完了する」を満たす。Node 標準 API のみで完結させるのは、新規依存追加（`audit-ci` 等のサードパーティ製ツール）を避け、`package-lock.json` のサプライチェーン拡大を回避するため（`docs/security/jspdf-vulnerabilities.md §6.3` の「対症療法を増やさない」方針と整合）。

### 2. `package.json` の audit スクリプト整備
- **変更**: `/Users/YS/development/matatabi-calculator/package.json`
- **変更箇所**: `scripts` ブロック L10-L11（既存 `audit` / `audit:critical` 行）
- **変更内容**:
  - `"audit"` 行（L10）: `"npm audit"` のまま据え置き（手動の網羅確認用途として残す）。
  - `"audit:critical"` 行（L11）: 既存スクリプトを `"audit:check": "node scripts/audit-check.mjs"` に **置換** する。
    - 旧名 `audit:critical` は CI / ローカルの呼び出し点が `.github/workflows/security-audit.yml` のみに限定されるため、置換による影響範囲は本プランで完結する。
    - 既存の `audit:critical` は `audit-level=critical` の意味から外れる時点で名称が誤誘導になるため、`audit:check` に rename する（Issue 本文「`audit:critical` script を `audit:check` 等にリネーム / 追加」に整合）。
  - `package.json` 側の `overrides` セクション（L49-L53）は変更しない（jspdf v2 系据え置き、`docs/security/jspdf-vulnerabilities.md §6.3` と整合）。
- **理由**: Issue #67 影響範囲「`package.json` — (α) 採用時に `audit:critical` script を `audit:check` 等にリネーム / 追加」を直接満たす。ローカル再現性を担保し、CI 側ワークフローからもこのスクリプトを呼ぶことで「ローカルと CI が同じコマンドを共有する」プロジェクト慣習（既存 `lint` / `typecheck` / `build` と同じ）に揃える。

### 3. `.github/workflows/security-audit.yml` の audit-level 引き上げと実行コマンド差し替え
- **変更**: `/Users/YS/development/matatabi-calculator/.github/workflows/security-audit.yml`
- **変更箇所**: L33-L37（`Run: npm audit --audit-level=critical` ステップ）と冒頭コメント L1
- **変更内容**:
  - L1 の設計根拠コメントに `# 関連 Issue: #67（audit-level high 引き上げと GHSA-ID 除外スクリプト導入）` を追記（既存 `# 関連 Issue: #24` と並記）。
  - L33-L37 のステップ全体を以下の構造に置換:
    ```yaml
    - name: npm audit (high 以上を GHSA-ID 除外付きでブロック)
      # 既知の到達不能 advisory（GHSA-f8cm-6447-x5h2 等）は scripts/audit-check.mjs で除外する。
      # 除外対象の根拠は docs/security/jspdf-vulnerabilities.md §2.1 / §2.3 / §6.2 (α)。
      # 新規 high / critical advisory が出た場合は赤化する（早期検知が目的）。
      run: npm run audit:check
    ```
  - ジョブ名 (`audit:`)、`runs-on`、`permissions`、トリガ（pull_request / push / schedule / workflow_dispatch）は据え置き。
- **理由**: Issue #67「`.github/workflows/security-audit.yml` — `audit-level` パラメータ変更、(α) 採用時はジョブ実行コマンド変更」を達成。`npm run audit:check` 経由で呼ぶことで、ローカル再現と CI 実行が単一スクリプト経由に統一される。`npm audit --audit-level=high` を直接書かず `audit-check.mjs` 経由とするのは、GHSA-ID 除外を CI/ローカルで同一に保つため（CI のみ除外あり / ローカルは除外なし、というドリフトを防ぐ）。

### 4. `docs/security/jspdf-vulnerabilities.md` §6.2 の運用方針更新
- **変更**: `/Users/YS/development/matatabi-calculator/docs/security/jspdf-vulnerabilities.md`
- **変更箇所**:
  - 冒頭メタ L3-L4: 関連 Issue に `#67`（本 Issue）を追記。
  - §6.2（L124-L133）: 「critical 1 件（GHSA-f8cm-6447-x5h2）の扱い」節を全面改訂し、Issue #50 完了時点の「赤化を許容する」運用から、Issue #67 完了時点の「(α) GHSA-ID 除外スクリプト + audit-level=high 運用」へ昇格させる。
  - §6.4 末尾（L168 付近）に新規節 §6.5 を追加: 「**§6.5 audit-level critical → high 引き上げ（Issue #67 確定）**」として、以下を記録:
    - 実施日（プラン採用時点の日付、文書反映時に確定）。
    - 採用方針: (α) GHSA-ID 除外スクリプト（`scripts/audit-check.mjs`）導入。
    - 除外対象 GHSA-ID リスト（`GHSA-f8cm-6447-x5h2` ほか実測時点で残存する dompurify 系を §2.1 / §2.3 と紐付けて列挙）。
    - 採用しなかった選択肢 (β)(γ) の理由（(β) は jspdf v3/v4 メジャー更新が必要で `docs/security/jspdf-v3-migration-poc.md §5.1` 最終判定と矛盾、(γ) は新規 high の早期検知能力を犠牲にするため Issue #67 受け入れ条件と整合しない）。
    - ブランチ保護の Required check 組み込みは本 Issue 範囲外であり、運用観察期間（最低 2 週間目安）を経た後に別途判断する旨。
  - §8 関連ファイル（L181-L186）に `scripts/audit-check.mjs` を追記。
- **変更内容**: 採用方針を文書側に固定し、将来の運用者が GHSA-ID 除外リスト変更時に参照すべき根拠を §2 と紐付ける。
- **理由**: Issue #67 受け入れ条件「(α)(β)(γ) のいずれかが採用方針として確定し、`docs/security/jspdf-vulnerabilities.md §6.2` に記録される」「`audit-level=high` への引き上げが完了するか、引き上げ見送りの理由が文書化される」を直接満たす。

### 5. `src/lib/pdf.ts` への影響（変更なし）
- **変更なし**: `/Users/YS/development/matatabi-calculator/src/lib/pdf.ts`
- **理由**: 本プランは (α) 採用であり、jspdf 本体は `^2.5.2` のまま据え置く（`docs/security/jspdf-v3-migration-poc.md §5.1` の最終判定に整合）。`src/lib/pdf.ts` の `generatePdf` は `docs/spec/pdf-report.md §11.2` の実装契約（`new jsPDF("p", "mm", "a4")` / `pdf.addImage(imgData, "PNG", 0, 0, 210, 297)` / `pdf.save(buildPdfFilename())`）を維持し、`docs/security/jspdf-vulnerabilities.md §7` のレビュー観点（`pdf.html()` 不使用、`buildPdfFilename()` 経由のファイル名、`html2canvas` 出力 dataURL 限定）も継続適用される。

## 設計上の考慮点

### なぜ (α) を採用するか（(β)(γ) との比較）

- **(α) GHSA-ID 除外スクリプト**: `audit-level=high` 引き上げを実現しつつ、`docs/security/jspdf-vulnerabilities.md §3` で確定した「10 件すべて到達不能」判定との整合を保つ。新規 high / critical advisory（jspdf v2 系の新規脆弱性、dompurify 経路の新規発見、Next.js 系の再発など）を早期検知でき、Issue #67 受け入れ条件「CI の green / red 状態が運用方針通りに収束する」を満たす。実装は Node 標準 API のみで完結し、追加依存を増やさない。
- **(β) jspdf v3 / v4 移行（不採用）**: `docs/security/jspdf-v3-migration-poc.md §5.1` の最終判定（2026-05-01、Issue #50）で「即時移行は採用しない」が確定済み。Path Traversal の修正版は jspdf 4.0.0+ にしか含まれず、`html2canvas` v2 連鎖（PoC §4.3）と v4 メジャーリリース直後の枯れ不足リスクが現存する。再評価トリガー（PoC §5.3）も発火していないため、本 Issue で v3/v4 を採用する根拠はない。
- **(γ) 据え置き継続（不採用）**: 現状 `audit-level=critical` のままでは jspdf critical 1 件の永続赤化が続き、新規 high の早期検知能力が得られない。Issue #67 が起票された動機（Next.js 系 high が 0 件化したことで引き上げ判断材料が揃った）と矛盾する。

### `audit-check.mjs` をシェルスクリプトではなく ESM スクリプトとする理由

- 既存リポジトリは Node ESM（`type` 未指定だが `.mjs` で ESM 強制）と TypeScript 中心構成（`src/`）であり、シェルスクリプト（`bash`）の前例は `.claude/hooks/block-dangerous-db-commands.sh` のみ。CI ランナーは `ubuntu-latest`（既存 `.github/workflows/security-audit.yml` L17）だが、ローカル開発環境は macOS（`darwin`）+ zsh / bash 混在のため、`jq` / `grep` 依存のシェル実装は環境差リスクが残る。Node ESM スクリプトなら `engines.node: ">=20.0.0"` 環境で同一動作する。
- `npm audit --json` の出力構造は `vulnerabilities[name].via[].url` を経由する複雑なネスト構造であり、`jq` 一行で書こうとすると保守性が下がる。Node の構造化解析のほうが将来の除外リスト追加・テスト容易性で優位。

### 除外リスト変更ガバナンス

- `ALLOWED_GHSA_IDS` への追加は `docs/security/jspdf-vulnerabilities.md §2` の到達経路分析を必ず付けることをコード内コメントとドキュメント §6.5 で明文化する。`docs/security/jspdf-vulnerabilities.md §4` の再評価トリガー（特に (i)(v)）と連動させ、許可リストを「単なる無視リスト」に堕ちさせない。

### ブランチ保護 Required check への組み込み

- Issue #67 「ブランチ保護の Required check への組み込み判断（jspdf 解消後）」については、本 Issue 範囲外として §6.5 で「最低 2 週間の運用観察後に判断」と記す。`security-audit.yml` を Required にすると、新規 advisory 公開タイミングで develop の PR が無関係に止まるため、即必須化は副作用が大きい。

### 既存 `ci.yml` との関係

- `.github/workflows/ci.yml`（lint / typecheck / test / build の 4 ジョブ並列）は本 Issue では一切変更しない。`security-audit` は別ワークフローとして独立しており、Issue #49 完了時点（`working/plans/issue-49-github-actions-ci-workflow_260503153515.md` §1）で確立した「audit は `security-audit.yml` に集約」方針に整合する。

### `.claude` プロジェクトルールへの準拠

- `.claude/rules/` ディレクトリは存在しない。`/Users/YS/development/matatabi-calculator/.claude/ROI診断アプリ「またたび計算機」開発・設計ドキュメント一式.md` がプロジェクト要件・技術要件の正本で、本プランは「Next.js 16+ / TypeScript / Tailwind / jsPDF v2 系・html2canvas v1 系」の方針を維持する点で準拠する。`.claude/skills/plan-issue` などのスキル運用前提に従い、本プランは `working/plans/` 配下に置く想定（実装フェーズで保存）。

## 検証方法

1. **`scripts/audit-check.mjs` のローカル動作確認**: `node scripts/audit-check.mjs` を実行し、現状の `npm audit` 出力（jspdf critical 1 + dompurify moderate 1）に対して exit code 0 で終了することを確認。`ALLOWED_GHSA_IDS` を空集合に書き換えると jspdf critical 1 件で exit code 1 が返ることを確認（手動検証）。
2. **`npm run audit:check` のスクリプト経由実行**: `package.json` の `scripts.audit:check` 経由で 1. と同じ結果が得られることを確認。`npm run audit:critical`（旧名）が `npm error Missing script` で失敗することを確認（旧名削除の確認）。
3. **`npm audit --audit-level=high` 単体での赤化再現**: 比較対象として `npm audit --audit-level=high` を直接実行し、jspdf critical 1 件で exit code 1 が返ることを確認。本スクリプト経由では同じ実測値で exit code 0 になる差分が「除外スクリプトの効果」を示す。
4. **CI ワークフローの green 確認**: 変更を develop 派生ブランチに push し、`.github/workflows/security-audit.yml` の `audit` ジョブが GitHub Actions 上で green になることを確認（PR トリガと push トリガの両方）。
5. **`workflow_dispatch` 手動実行確認**: GitHub Actions UI から `security-audit` ワークフローを手動実行し、green になることを確認。
6. **新規 advisory 検知シミュレーション**: `ALLOWED_GHSA_IDS` を一時的に空集合に書き換えてコミットし、CI が赤化することを確認した上で revert（除外機能の有効性確認）。実機でなく `audit-check.mjs` 内のテスト用フラグで切り替えても可。
7. **`npm run lint` / `npm run typecheck` / `npm run build`**: スクリプト追加が既存ジョブに副作用を与えないこと（`scripts/audit-check.mjs` は ESM で TypeScript 解析対象外であること）を確認。
8. **文書整合性チェック**: `grep -n "audit-level=critical" docs/ .github/` で旧運用方針の残存箇所が無いこと、`grep -n "Issue #67\|#67" docs/security/jspdf-vulnerabilities.md` でヒットすること（追跡可能性）。
9. **`docs/security/jspdf-vulnerabilities.md §6.5` の最終判断・実施日記載確認**: 受け入れ条件「採用方針が確定し、§6.2 に記録される」が満たされていることを目視確認。
