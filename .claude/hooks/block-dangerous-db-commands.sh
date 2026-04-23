#!/bin/bash

# Claude Code PreToolUse Hook: DB削除系コマンドのブロック
# exit 0 = 許可, exit 2 = ブロック
# ブロック時は stderr にメッセージを出力

# jq が利用可能か確認
if ! command -v jq &> /dev/null; then
  echo "⛔ エラー: jq がインストールされていません。フックの実行にはjqが必要です。" >&2
  exit 1
fi

# stdin から JSON を読み取る
INPUT=$(cat)

# tool_input.command からコマンド文字列を取得
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# コマンドが空なら許可（Bashツール以外のケースへの安全策）
if [ -z "$COMMAND" ]; then
  exit 0
fi

# 小文字に変換して判定（大文字・小文字を問わず検知）
COMMAND_LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

# 制限対象パターンのチェック
if [[ "$COMMAND_LOWER" =~ migrate:fresh ]]; then
  echo "⛔ ブロック: migrate:fresh は全テーブルを削除して再マイグレーションを実行します。本当に必要な場合は手動で実行してください。" >&2
  exit 2
fi

if [[ "$COMMAND_LOWER" =~ migrate:reset ]]; then
  echo "⛔ ブロック: migrate:reset は全マイグレーションをロールバックします。本当に必要な場合は手動で実行してください。" >&2
  exit 2
fi

if [[ "$COMMAND_LOWER" =~ db:wipe ]]; then
  echo "⛔ ブロック: db:wipe は全テーブルを削除します。本当に必要な場合は手動で実行してください。" >&2
  exit 2
fi

if [[ "$COMMAND_LOWER" =~ drop[[:space:]]+database ]]; then
  echo "⛔ ブロック: DROP DATABASE はデータベース全体を削除します。本当に必要な場合は手動で実行してください。" >&2
  exit 2
fi

if [[ "$COMMAND_LOWER" =~ drop[[:space:]]+table ]]; then
  echo "⛔ ブロック: DROP TABLE はテーブルを削除します。本当に必要な場合は手動で実行してください。" >&2
  exit 2
fi

# 上記に該当しなければ許可
exit 0
