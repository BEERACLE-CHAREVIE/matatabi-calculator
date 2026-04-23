---
name: pr
description: コミット履歴と差分からPRを自動作成する
argument-hint: "[追加の指示（任意）]"
disable-model-invocation: true
allowed-tools: Bash
---

## 手順

ベースブランチとの差分・コミット履歴を分析し、PRタイトル・本文を自動生成して PR を作成する。

### 1. 保護ブランチのチェック

現在のブランチが `main`、`develop`、`staging` のいずれかの場合は「⚠️ 保護ブランチ上では PR を作成できません。feature ブランチに切り替えてください。」と警告を出し、**処理を中断する**。

### 2. ベースブランチを特定

このプロジェクトではfeatureブランチは必ず `develop` から切るルールのため、ベースブランチは常に `develop` とする。

### 3. 未コミットの変更を処理

`git status` でステージされていない変更や未追跡ファイルがあれば、`/commit` スキルと同じ手順でコミットする：

1. 関連ファイルを `git add` でステージする（`.env` や認証情報ファイルは除外、`git add -A` は使わない）
2. 差分を分析してコミットメッセージを生成し、`git commit` を実行する

変更がなければこのステップはスキップする。

### 4. 現在の状態を確認

ベースブランチを `<base>` として、以下のコマンドを**並列で**実行して全体像を把握する：

- `git status`
- `git log <base>..HEAD --oneline`（ベースブランチからの全コミット）
- `git diff <base>...HEAD`（ベースブランチとの全差分）
- `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`（リモート追跡の有無）

### 5. PRタイトルと本文を生成

**全コミット**（最新だけでなくブランチの全コミット）と差分を分析し、以下を生成する：

- **タイトル**: 変更の要約（日本語、70文字以内）
- **本文**: 以下のフォーマットで作成

```markdown
## Summary
<箇条書きで変更内容を説明（日本語）>

## Test plan
<テスト方法のチェックリスト>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 6. プッシュとPR作成

確認なしでそのまま実行する：

1. リモートに未プッシュなら `git push -u origin HEAD` を実行
2. `gh pr create --draft --base <base> --title "タイトル" --body "$(cat <<'EOF' ... EOF)"` で PR をドラフト状態で作成（本文は HEREDOC 形式、`--base` でベースブランチを明示）
3. 作成した PR の URL を表示する

### 補足ルール

- ユーザーから追加の指示がある場合: $ARGUMENTS
