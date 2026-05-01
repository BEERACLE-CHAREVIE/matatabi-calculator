#!/bin/bash
set -euo pipefail

# Protected branches that cannot run this script
PROTECTED_BRANCHES=("develop" "main" "staging")

# === 0. Check dependencies ===
if ! command -v jq &>/dev/null; then
  echo "⚠️ エラー: jq がインストールされていません。インストールしてから再実行してください。"
  exit 1
fi

# === 1. Check current branch ===
branch=$(git branch --show-current)
for protected in "${PROTECTED_BRANCHES[@]}"; do
  if [[ "$branch" == "$protected" ]]; then
    echo "⚠️ エラー: 現在のブランチは '${branch}' です。フィーチャーブランチから実行してください。"
    exit 1
  fi
done
feature_branch="$branch"

# === 2. Check for associated PR ===
pr_output=$(gh pr view --json number,baseRefName,state,isDraft,body 2>&1) || {
  echo "⚠️ エラー: 現在のブランチに紐づくPRが見つかりません"
  echo "  詳細: $pr_output"
  exit 1
}
pr_json="$pr_output"

number=$(echo "$pr_json" | jq -r '.number')
base_ref=$(echo "$pr_json" | jq -r '.baseRefName')
state=$(echo "$pr_json" | jq -r '.state')
is_draft=$(echo "$pr_json" | jq -r '.isDraft')
pr_body=$(echo "$pr_json" | jq -r '.body')

# === 3. Handle PR state ===
skip_merge=false
messages=()

case "$state" in
  MERGED)
    skip_merge=true
    messages+=("ℹ️ PR #${number} は既にマージ済みです")
    ;;
  CLOSED)
    skip_merge=true
    messages+=("⚠️ 警告: PR #${number} はマージされずにクローズされています")
    ;;
  OPEN)
    if [[ "$is_draft" == "true" ]]; then
      echo "⚠️ エラー: PR #${number} はまだDraft状態です。Ready for reviewにしてから実行してください。"
      exit 1
    fi
    ;;
esac

# === 4. Merge the PR (if needed) ===
if [[ "$skip_merge" == "false" ]]; then
  if ! gh pr merge --merge --delete-branch; then
    echo "⚠️ エラー: PR #${number} のマージに失敗しました"
    exit 1
  fi
  messages+=("✅ PR #${number} をマージしました")
fi

# === 5. Switch to base branch and pull latest ===
if ! git switch "$base_ref"; then
  echo "⚠️ エラー: ブランチ '${base_ref}' への切り替えに失敗しました"
  exit 1
fi
if ! git pull origin "$base_ref"; then
  echo "⚠️ エラー: ブランチ '${base_ref}' のpullに失敗しました"
  exit 1
fi

# === 6. Delete feature branch (if not already deleted by gh pr merge) ===
git fetch --prune
if git branch --list "$feature_branch" | grep -q .; then
  if git branch -d "$feature_branch" 2>/dev/null; then
    messages+=("✅ ブランチ '${feature_branch}' を削除しました")
  else
    messages+=("⚠️ 警告: ブランチ '${feature_branch}' の削除に失敗しました。手動で削除してください。")
  fi
else
  messages+=("✅ ブランチ '${feature_branch}' を削除しました")
fi

messages+=("✅ ブランチ '${base_ref}' に切り替え、最新に更新しました")

# === 7. Close referenced issues (develop マージでは GitHub 自動クローズが発火しないため手動補完) ===
# PR 本文から "Closes #N" / "Close #N" / "Closed #N" / "Fix(es/ed) #N" / "Resolve(s/d) #N" を抽出
# (大文字小文字は問わない、コロン任意、複数番号「Closes #1, #2」も対応)
referenced_issues=$(echo "$pr_body" \
  | grep -ioE '(close[sd]?|fix(e[sd])?|resolve[sd]?):?[[:space:]]+#[0-9]+([[:space:]]*,[[:space:]]*#[0-9]+)*' \
  | grep -oE '#[0-9]+' \
  | tr -d '#' \
  | sort -u)

if [[ -n "$referenced_issues" ]]; then
  for issue_num in $referenced_issues; do
    issue_state=$(gh issue view "$issue_num" --json state -q .state 2>/dev/null) || {
      messages+=("ℹ️ Issue #${issue_num}: 取得失敗（スキップ）")
      continue
    }
    if [[ "$issue_state" == "OPEN" ]]; then
      if gh issue close "$issue_num" --comment "PR #${number} で \`${base_ref}\` にマージ済み。" >/dev/null 2>&1; then
        messages+=("✅ Issue #${issue_num} をクローズしました")
      else
        messages+=("⚠️ Issue #${issue_num} のクローズに失敗しました")
      fi
    else
      messages+=("ℹ️ Issue #${issue_num} は既に ${issue_state} 状態（スキップ）")
    fi
  done
fi

# === Output results ===
printf '%s\n' "${messages[@]}"
