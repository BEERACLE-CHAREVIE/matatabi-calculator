---
name: fix-review
description: PRレビューコメントの指摘を取得し、コードを自動修正してコミット・プッシュする
argument-hint: "[追加の指示（任意）]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

## 手順

現在のブランチに紐づくPRのレビューコメントを取得し、指摘事項を自動修正してコミット・プッシュする。

### 1. PR を特定

以下のコマンドで現在のブランチに紐づく PR を取得する：

```bash
gh pr view --json number,url,headRefName,baseRefName
```

PR が存在しない場合は「⚠️ 現在のブランチに紐づくPRが見つかりません。」と警告を出し、**処理を中断する**。

### 2. レビューコメントを取得

以下のコマンドを**並列で**実行し、レビューコメントを収集する：

- PRレビューコメント（コード行へのコメント）：
  ```bash
  gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate
  ```
- PR通常コメント（会話コメント）：
  ```bash
  gh api repos/{owner}/{repo}/issues/{number}/comments --paginate
  ```
- PRレビュー一覧（レビュー本文を含む）：
  ```bash
  gh api repos/{owner}/{repo}/pulls/{number}/reviews --paginate
  ```

`{owner}/{repo}` は `gh repo view --json owner,name -q '.owner.login + "/" + .name'` で取得する。

### 3. コメントをフィルタリング

取得したコメントから以下を**除外**する：

- bot が投稿したコメント（`user.type` が `"Bot"` のもの）
- PRレビューコメントのうち、解決済みのスレッドに属するもの

セルフレビュー（`🤖 Generated with [Claude Code]` を含むコメント）も修正対象に含める。

残ったコメントが0件の場合は「✅ 未対応のレビューコメントはありません。」と表示して**処理を終了する**。

### 4. 指摘内容を分析・分類

フィルタ後のコメントを分析し、以下の重要度に分類する：

- **🔴 重要（Critical）**: セキュリティ、バグ、データ損失のリスクがある指摘
- **🟡 推奨（Recommended）**: コード品質、パフォーマンス、保守性に関する指摘
- **🟢 軽微（Minor）**: スタイル、命名、コメントなど軽微な指摘
- **ℹ️ 質問・確認**: 修正不要な質問や確認事項（修正対象外）

各コメントについて、対象ファイルパス・行番号（PRレビューコメントの場合は `path` と `line`/`original_line`）・指摘内容を整理する。

「ℹ️ 質問・確認」に分類されたものは修正対象外とし、後の報告で「対応不要と判断」として記載する。

### 5. コードを修正

重要度の高い順に（🔴 → 🟡 → 🟢）指摘を修正する：

1. 対象ファイルを `Read` で読み込み、指摘箇所を確認する
2. 指摘内容に基づいて `Edit` でコードを修正する
3. 修正が他の箇所に影響しないか、`Grep` / `Glob` で確認する
4. プロジェクトのルール（CLAUDE.md）を遵守する

### 6. コミット・プッシュ

`/commit` スキルと同じ手順でコミットし、プッシュする：

1. `git status` / `git diff` / `git diff --cached` / `git log --oneline -10` を並列で実行
2. 関連ファイルを `git add` でステージする（`.env` や認証情報ファイルは除外、`git add -A` は使わない）
3. 差分を分析して日本語のコミットメッセージを生成し、`git commit` を実行
   - コミットメッセージの例: 「レビュー指摘に基づきXXXを修正」
   - 末尾に `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` を付与
4. pre-commit hook が失敗した場合は修正して新しいコミットを作成（`--amend` しない）
5. `git push` でリモートにプッシュ

### 7. 結果を表示

以下の情報をユーザーに表示する：

- PRのURL
- 修正したコメント数 / 全コメント数
- 修正内容のサマリー（重要度別の件数）

### 補足ルール

- ユーザーから追加の指示がある場合: $ARGUMENTS
