---
name: finish
description: 現在のブランチのPRをマージし、分岐元ブランチに戻って最新化する
argument-hint: "[追加の指示（任意）]"
disable-model-invocation: true
allowed-tools: Bash
---

## 手順

現在のブランチのPRをマージし、分岐元ブランチにチェックアウトして最新の状態に更新する。

### 1. ベースブランチを特定

このプロジェクトではfeatureブランチは必ず `develop` から切るルールのため、ベースブランチは常に `develop` とする。なお、既存PRが存在する場合は `gh pr view --json baseRefName -q .baseRefName` で一致を確認しても良い。

### 2. PRの状態を確認

```bash
gh pr view --json isDraft -q .isDraft
```

結果が `true`（ドラフト状態）の場合は「⚠️ このPRはドラフト状態です。Ready にしてから /finish を実行してください。」と警告を出し、**処理を中断する**。

### 3. PRをマージ

`gh pr merge` で現在のブランチのPRをマージする：

```bash
gh pr merge --merge --delete-branch
```

- `--merge` でマージコミットを作成
- `--delete-branch` でリモート・ローカルのブランチを削除

### 4. ベースブランチに切り替えて最新化

```bash
git checkout <base>
git pull
```

### 5. 結果を表示

現在のブランチと最新のログを表示して完了を確認する。

### 補足ルール

- ユーザーから追加の指示がある場合: $ARGUMENTS
