---
name: branch
description: 日本語の概要からfeatureブランチを作成する
argument-hint: "<日本語の概要>"
disable-model-invocation: true
allowed-tools: Bash
---

## 手順

日本語の概要を受け取り、`feature/英語概要_日付` 形式のブランチを作成する。

### 1. ブランチ名を組み立てる

`$ARGUMENTS` の日本語概要を英語のケバブケース（ハイフン区切り、小文字）に翻訳する。

例：
- 「ユーザー認証機能を追加」→ `add-user-authentication`
- 「レビュー一覧のページネーション」→ `review-list-pagination`
- 「ギア検索のバグ修正」→ `fix-gear-search-bug`

日付は `date +%Y%m%d` で取得し、以下の形式でブランチ名を組み立てる：

```
feature/<英語ケバブケース>_<YYYYMMDD>
```

### 2. ブランチを作成

```bash
git checkout -b <ブランチ名>
```

### 3. 結果を表示

作成したブランチ名と現在のブランチを表示する。
