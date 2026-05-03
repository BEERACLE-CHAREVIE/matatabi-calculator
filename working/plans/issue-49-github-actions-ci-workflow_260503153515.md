# GitHub Actions CI ワークフロー整備プラン（lint / typecheck / build / audit）

## Context
現状 `.github/workflows/` 配下には `security-audit.yml` のみが存在し、PR 時の lint / typecheck / build を自動検証する CI が無い。`package.json` には `lint`（`eslint .`）・`typecheck`（`tsc --noEmit`）・`build`（`next build`）・`test`（`jest`）スクリプトが既に揃っており、Issue #48（Jest + RTL + Playwright によるテストスイート）も `ae1949e` でマージ済みのため、test ジョブも初版から有効化する。Issue #50（jspdf 系脆弱性）の判断は確定しており、`security-audit.yml` で `--audit-level=critical`（high/moderate は到達不能判定済み、新規 critical のみブロック）の運用方針は既に整合済みのため、本 Issue では**新規 audit ワークフローを別途作成せず、既存 `security-audit.yml` を本 Issue の audit 要件で要求される運用形態（週次 schedule + 手動実行 + push/PR）に維持**する。CI 必須化（branch protection）は GitHub 側設定のため、README に手順を追記する。

GitHub Issue: #49

## 変更対象ファイル

### 1. CI ワークフローの新規追加（lint / typecheck / build / test を並列実行）
- **新規**: `/Users/YS/development/matatabi-calculator/.github/workflows/ci.yml`
- **変更箇所**: ファイル全体（新規作成）
- **変更内容**:
  - 冒頭にコメントブロックで設計根拠を残す（既存 `security-audit.yml` の慣習に倣う）：
    - `# 設計根拠: Issue #49（CI 整備）`
    - `# 関連 Issue: #48（test ジョブ） / #50（audit は security-audit.yml に集約）`
  - `name: ci`
  - トリガ:
    ```yaml
    on:
      pull_request:
        branches: [main, develop]
      push:
        branches: [main, develop]
    ```
  - 並行実行の抑制（同一 PR で連続 push が走った場合の旧ジョブ自動キャンセル）：
    ```yaml
    concurrency:
      group: ci-${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true
    ```
  - `jobs:` 配下に 4 ジョブ（`lint` / `typecheck` / `test` / `build`）を**並列**で定義する。Issue #49 受け入れ条件「妥当な時間（5 分以内目安）で完走」を満たすため依存（`needs:`）は付けない。各ジョブは以下の共通ステップを採る：
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` with:
       - `node-version-file: ".nvmrc"`（`.nvmrc` の `20` を真実の源として参照する。`engines.node` の `>=20.0.0` と整合）
       - `cache: "npm"`
    3. `npm ci`
    4. ジョブ固有コマンド（下記）
  - 各ジョブの固有コマンド：
    - `lint`: `npm run lint`
    - `typecheck`: `npm run typecheck`
    - `test`: `npm test -- --ci --runInBand`（`--ci` で snapshot 自動更新を抑止、`--runInBand` で flake を抑える。`jest.config.mjs` の `coverageThreshold` は default で適用）。**E2E（Playwright）は CI 上ではブラウザインストール時間が大きく 5 分目安から外れるため、本ワークフローでは含めない**（Jest 単体に限定。E2E は別 Issue で必要時に追加検討する旨を冒頭コメントに明記）。
    - `build`: `npm run build`（`next build` は `output: "export"` で `out/` を生成）
  - 各ジョブに最小権限の `permissions: { contents: read }` を付与する（`security-audit.yml` の慣習と整合）。
- **理由**: Issue #49 受け入れ条件 1（PR で lint / typecheck / build が自動実行）・3（妥当な時間）を達成。Issue #48 マージ済みのため test も初版から有効化する。Issue 本文の「#48 マージ後に有効化」は既に満たされている。`.nvmrc` を Node バージョンの真実の源とするのは、リポジトリ内に既に `.nvmrc=20` があり、`engines.node` と二重管理する負債を防ぐため。`concurrency` を付けるのは、開発フェーズで複数コミットを連続 push する運用が想定され、無駄な GitHub Actions 利用枠消費を防ぐため。

### 2. 既存 security-audit ワークフローを Issue #49 audit 要件に合わせて維持
- **変更を行わない**: `/Users/YS/development/matatabi-calculator/.github/workflows/security-audit.yml`
- **判断根拠**:
  - 既存ファイルは Issue #49 が要求する audit 要件をすべて満たしている：
    - 週次 schedule（`cron: "0 0 * * 1"` = 毎週月曜 09:00 JST）
    - `workflow_dispatch`（手動実行）
    - `push` / `pull_request`（main / develop）
    - `npm audit --audit-level=critical`（Issue 本文「jsPDF 系の既知脆弱性（#50）は方針確定後に audit-level の運用と整合させる」に対し、`docs/security/jspdf-vulnerabilities.md §6` で `critical` のみブロックする運用が確定済み）
  - Issue #49 本文の `audit.yml` 仕様（`--audit-level=high`）と既存 `security-audit.yml`（`--audit-level=critical`）は乖離しているが、**Issue #50 の最終判断（#52 でマージ済み）で high / moderate は到達不能判定済み**のため、`critical` のみブロックする既存運用が正である。Issue #49 本文の `high` 指定は #50 確定前のドラフトであり、本文「audit-level の運用と整合させる」の指示に従い `critical` を維持する。
  - 別ファイル `audit.yml` を新規作成すると `security-audit.yml` と二重実行になり、保守負債を増やすだけで価値がない。
- **理由**: Issue #49 受け入れ条件 3（週次 audit が動作する）は既存ファイルで既に達成済み。重複作成を避け、`security-audit.yml` を本 Issue の audit 担当として正式位置付ける。本判断は本プランの「### 3. README 追記」内で運用文書化する。

### 3. README に CI 運用手順と branch protection 設定手順を追記
- **変更**: `/Users/YS/development/matatabi-calculator/README.md`
- **変更箇所**: 「型検証・Lint」セクション（45-50 行付近）の直後に「CI / 品質ゲート」節を新設。「デプロイ」セクション（52 行）の前に挿入する。
- **変更内容**:
  - 新節「## CI / 品質ゲート」を追加し、以下の小節を含める：
    - **概要**: 本リポジトリは GitHub Actions で以下 2 ワークフローを運用していることを記載：
      - `.github/workflows/ci.yml`: PR / push（main / develop）で lint / typecheck / test / build を並列実行
      - `.github/workflows/security-audit.yml`: 週次 + 手動 + push/PR で `npm audit --audit-level=critical` 実行
    - **ローカル再現手順**: `npm ci && npm run lint && npm run typecheck && npm test && npm run build` を順次実行することで CI と同等の検証を再現できる旨を記載。
    - **branch protection 設定手順（リポジトリ管理者向け）**: 以下の手順を箇条書きで記載：
      1. GitHub の Settings → Branches → Branch protection rules で `main` と `develop` をそれぞれ保護対象に追加
      2. 「Require status checks to pass before merging」を有効化し、必須チェックとして `ci / lint`・`ci / typecheck`・`ci / test`・`ci / build` の 4 つを選択（少なくとも 1 度ワークフロー実行後に候補に表示される）
      3. `security-audit / audit` は週次運用のため必須チェックから除外する（PR 単位の合否と週次運用が混在すると CI 体感が悪化するため）
      4. 「Require branches to be up to date before merging」は任意（develop のリベース運用方針に応じて）
      5. 「Restrict who can push to matching branches」と「Require pull request before merging」を有効化
    - **CI バッジ（任意）**: README 冒頭に CI バッジを追加するかどうかは「任意」と明記し、実装は本 Issue では行わない方針を記載（追加する場合のサンプルマークダウンを参考としてコメント形式で示す）：
      ```
      ![ci](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg?branch=develop)
      ```
- **理由**: Issue #49 受け入れ条件 5（README に運用手順が追記）を達成。受け入れ条件 2（branch protection 設定後にマージブロック）の手順を残すことで、リポジトリ管理者が後続作業として実施可能になる。バッジは任意条件のため運用負荷を増やさず、必要時の追加方法のみ案内する方針とする。

### 4. package.json スクリプトの変更不要確認
- **変更を行わない**: `/Users/YS/development/matatabi-calculator/package.json`
- **判断根拠**: Issue 本文「`package.json`（`typecheck` script を追加）」とあるが、現行 `package.json` の 9 行目に既に `"typecheck": "tsc --noEmit"` が定義済み。`lint` / `build` / `test` も既存。改修不要。
- **理由**: 二重定義や不要な変更を避け、最小差分とする。

## 設計上の考慮点

### Node バージョンの真実の源
- `.nvmrc` (`20`)、`engines.node` (`>=20.0.0`)、Cloudflare Pages の `NODE_VERSION=20`、既存 `security-audit.yml` の `node-version: 20` の 4 系統が存在する。CI では `node-version-file: ".nvmrc"` を採用し、ローカルの `nvm use` と完全一致させる。`security-audit.yml` は既存仕様（`node-version: 20` 文字列直書き）を維持し、本 Issue では触らない（差分最小化）。将来 Node 22 への更新時は `.nvmrc` のみ書き換えれば CI が追従する。

### test ジョブの初版有効化判断
- Issue 本文では「#48 マージ後に有効化」とされていたが、本プラン作成時点（2026-05-03）で #48 は `ae1949e` でマージ済みかつ `f4c2ec8` でレビュー反映までクローズ済み。初版から `test` ジョブを含めることで、後続 Issue で再度ワークフロー編集する手間を省く。
- E2E（Playwright）は `playwright.config.ts` の `webServer` で `npm run build && npx serve out -p 3000` を起動する設計のため、CI で実行するとブラウザインストール（`playwright install --with-deps`）+ build + 3 ブラウザ並列実行で容易に 5 分超過する。受け入れ条件 4「5 分以内目安」を満たすため、E2E は CI 必須化対象から除外し、本 Issue では Jest のみを `test` ジョブに含める。

### npm cache 戦略
- `actions/setup-node@v4` の `cache: "npm"` は `package-lock.json` のハッシュをキーにキャッシュする。`npm ci` は `package-lock.json` 必須のため、`packageManager: "npm@10.9.2"` 指定とも整合。Corepack 有効化は CI では不要（`actions/setup-node@v4` が同梱の npm を使う）。

### ジョブ並列化と所要時間試算
- `lint` / `typecheck` / `test` / `build` を並列化することで、各ジョブは「checkout（~5s）+ setup-node + cache hit（~10s）+ npm ci（cache hit 時 ~30s）+ 各コマンド」程度に収まる。最も重い `build`（Next.js 16 + 静的 export）でも 2 分前後を見込み、5 分以内目安を達成可能。

### audit ワークフローの既存ファイル維持判断（Issue #49 と #50 の整合）
- Issue #49 本文の `--audit-level=high` 指定は #50 判断確定前のドラフトで、Issue 本文に明示「jsPDF 系の既知脆弱性（#50）は方針確定後に audit-level の運用と整合させる」とある。#50 は CLOSED 済みで `docs/security/jspdf-vulnerabilities.md §6` により `critical` のみブロック運用が確定。よって既存 `security-audit.yml`（`--audit-level=critical`）が正で、本 Issue で別 `audit.yml` を新設しないのは Issue 趣旨と整合する。

### concurrency 設定の根拠
- 本プロジェクトは並行 PR が増える本実装フェーズに入るため、PR 内の連続 push（`fix(review): ...` コミット等）で同じ commit に対する旧 CI ジョブをキャンセルしないと GitHub Actions の使用枠を浪費する。`security-audit.yml` には現在 `concurrency` は付いていないが、こちらは週次 schedule + 短時間 audit のため必要性が低い。CI のみに `concurrency` を付与する。

### 既存規約との整合
- `security-audit.yml` のヘッダーコメント「# 設計根拠: ... # 関連 Issue: ...」フォーマットを `ci.yml` でも踏襲する。
- `permissions: { contents: read }` を最小権限として付与する慣習を踏襲する。
- ステップ名は日本語（既存 `security-audit.yml` は「Setup Node.js」「Install dependencies」「npm audit ...」と英語+日本語混在）に揃え、各ジョブで「Checkout」「Setup Node.js」「Install dependencies」「Run lint」等を採用する。

## 検証方法

1. `.github/workflows/ci.yml` を作成後、まずローカルで CI ジョブと同等のコマンドを順次実行し、すべて exit 0 を確認する：
   - `npm ci`
   - `npm run lint`
   - `npm run typecheck`
   - `npm test -- --ci --runInBand`
   - `npm run build`
2. ブランチを push し、GitHub Actions タブで `ci` ワークフローの 4 ジョブが並列起動・全グリーンとなることを確認する。
3. PR を作成し、`pull_request` トリガで `ci` が起動することを確認する（受け入れ条件 1）。
4. 試しに lint エラー（未使用変数等）を意図的に入れた commit を push し、`ci / lint` ジョブが赤化することを確認する。確認後リバート。
5. 既存 `security-audit.yml` を `workflow_dispatch` から手動実行し、`npm audit --audit-level=critical` ジョブがグリーンで完走することを確認する（受け入れ条件 3）。
6. 同 PR の Actions 実行ログで各 CI ジョブの所要時間が概ね 3 分以下、合計（並列のため最長ジョブの所要時間で律速）が 5 分以内に収まることを確認する（受け入れ条件 4）。キャッシュヒットを確認するため 2 回目の push で `Cache restored from key: ...` のログを目視確認する。
7. README プレビューを GitHub 上で確認し、CI / 品質ゲート節と branch protection 手順が読みやすく整形されていることを確認する（受け入れ条件 5）。
8. リポジトリ管理者が GitHub Settings で `main` / `develop` に branch protection を設定し、必須チェックとして `ci / lint`・`ci / typecheck`・`ci / test`・`ci / build` を選択する（受け入れ条件 2、本作業は Issue マージ後の手動作業として README に手順を残す）。
