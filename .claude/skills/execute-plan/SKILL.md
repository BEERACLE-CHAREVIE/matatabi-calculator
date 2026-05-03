---
name: execute-plan
description: Read a plan file and execute implementation, testing, PR creation, and review in one go. Usage /execute-plan <plan-file-path> [--codex]
disable-model-invocation: true
---

# Execute Plan: Implement → Test → Create PR → Review

Read a plan file and execute the full workflow from implementation to review automatically.

This skill does NOT depend on subagents. All steps (implementation, review, fix) are executed by the main assistant inline.

## Arguments

- A plan file path is **required** (e.g., `/execute-plan docs/plan.md`)
- `--codex` (optional): Use Codex CLI (OpenAI) for review. Defaults to inline Claude review when omitted
- Example: `/execute-plan docs/plan.md --codex`
- If no argument is provided, display the following message and abort:
  ```
  ⚠️ エラー: プランファイルのパスを指定してください。使い方: /execute-plan <plan-file-path> [--codex]
  ```

## Steps

### 1. Read the plan file

Read the specified plan file and understand its contents.

- If the file does not exist:
  ```
  ⚠️ エラー: プランファイルが見つかりません: {{path}}
  ```
- If the file is empty:
  ```
  ⚠️ エラー: プランファイルが空です: {{path}}
  ```
- On successful read:
  ```
  📋 プランファイルを読み込みました: {{path}}
  ─────────────────────────────
  {{Summarize the plan in 2-3 lines}}
  ─────────────────────────────
  ```

### 2. Check the current branch and create a new branch if needed

```bash
git branch --show-current
```

- If already on a feature branch, continue as-is
- If on `develop`, create a new branch using the procedure below
- If on `main` or any other non-feature branch, display error and abort:
  ```
  ⚠️ エラー: 新しいブランチは develop からのみ作成できます（現在: {{branch}}）
  次のコマンドでdevelopブランチに切り替えてから再実行してください:
  git switch develop
  ```

#### Branch creation procedure (inline)

1. Confirm the current branch is `develop` (only `develop` is allowed as the base branch for new feature branches)
2. Generate a branch name from the plan content:
   - Convert the plan summary into an English branch name
   - Conversion rules: all lowercase, replace spaces with hyphens (`-`), remove all characters except alphanumeric and hyphens
3. Add `feature/` prefix
4. Get today's date with `date +%Y%m%d` and append `_yyyyMMdd` suffix
   - Example: `feature/add-user-authentication_20260211`
5. Create and switch with `git switch -c <branch-name>`
6. Display success message:
   ```
   ✅ ブランチ '{{branch-name}}' を作成し、切り替えました
   ```

### 3. Implement and test (inline, by main assistant)

The main assistant performs implementation directly — do NOT delegate to a subagent.

1. **Read the plan file** thoroughly and understand each task in `## 変更対象ファイル`
2. **Investigate the codebase** as needed (Read existing files referenced by the plan, run `grep` / `find` to validate assumptions)
3. **Apply each change** described in the plan using Edit / Write tools
   - Skip items explicitly marked as 「変更を行わない」 / 「ユーザー手動作業」 in the plan, but record them in the PR body so the user remembers what they need to do manually
4. **Run the verification procedures** listed under `## 検証方法` of the plan
   - Typically: `npm run lint` / `npm run typecheck` / `npm run build` / project-specific test commands
   - Use Bash tool to execute. Capture and display the tail of each command's output
5. **Determine status**:
   - If all verifications pass → status = `succeeded`, proceed to Step 4
   - If any verification fails → status = `failed`. Display:
     ```
     ⚠️ テストが失敗しています。失敗内容を確認してください:
     {{summary of failures}}

     実装は完了していますが、テスト失敗のため以降のステップをスキップします。
     手動で修正後、/commit → /create-pr → /review-pr を実行してください。
     ```
     Abort processing here

### 4. Commit (inline)

Execute the following commit procedure directly (do NOT call the `/commit` skill).

1. **Check current state**
   ```bash
   git status
   git diff --stat
   ```
   - If the working tree contains files unrelated to this plan (e.g., other in-progress work), select only files relevant to the plan when staging in step 3 below

2. **Run formatter (if applicable to the project)**
   - For Laravel projects: `./vendor/bin/sail pint`
   - For Node/Next.js projects: skip (Prettier/ESLint --fix is not standard in this project)
   - If a formatter exists and it fails, display a warning but continue processing

3. **Stage relevant changes**
   - Prefer **explicit file paths** (`git add path/to/file ...`) over `git add -A` when other unrelated changes exist in the working tree
   - When the entire working tree is plan-related, `git add -A` is acceptable

4. **Check staged diff**
   ```bash
   git diff --cached --stat
   ```
   - If there is no diff, display the following message and abort:
     ```
     ⚠️ エラー: コミットする変更がありません
     ```

5. **Auto-generate commit message**
   - Analyze the staged diff and generate a concise commit message in Japanese
   - Rules:
     - First line: Conventional Commits style prefix + summary (e.g., `feat(deploy): ...`, `fix(...): ...`, `docs(...): ...`)
     - Body: bullet list of key changes (3–6 bullets typically)
     - If the plan references an Issue, include `Closes #N` line at the end of the body so the PR also benefits from the linkage (the same line will be re-stated in the PR body)
     - Append `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` at the end

6. **Execute commit**
   ```bash
   git commit -m "$(cat <<'EOF'
   コミットメッセージ1行目

   - 変更点 1
   - 変更点 2

   Closes #N

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
   - On success, display:
     ```
     ✅ コミットしました: "コミットメッセージの1行目"
     ```

### 5. Create a PR (inline)

Execute the following PR creation procedure directly (do NOT call the `/create-pr` skill).

1. **Fetch latest remote branches**
   ```bash
   git fetch origin
   ```

2. **Push current branch if not yet pushed**
   ```bash
   git ls-remote --heads origin $(git rev-parse --abbrev-ref HEAD)
   ```
   - If the remote tracking branch does **not** exist (empty output), push:
     ```bash
     git push -u origin HEAD
     ```
   - If it already exists, skip this step

3. **Check diff against the base branch**
   ```bash
   git diff origin/develop...HEAD
   git log origin/develop...HEAD --oneline
   ```

4. **Generate PR title and body**
   - **PR title**: A concise summary of the changes (in Japanese, mirror the commit subject; include `(#N)` suffix if the plan references an Issue)
   - **PR body**: Fill in all sections (概要, 詳細, 参考, 注意事項) based on the actual changes
   - **Issue linking**: If a GitHub issue number is referenced in the plan context, include `Closes #N` in the 参考 section
   - **Manual work checklist**: If the plan contains `M{N}.` items (manual user actions outside the repo), reproduce that checklist verbatim under 詳細 so the merger remembers what to do post-merge

5. **Create PR and open in browser**
   **IMPORTANT**: Use HEREDOC in a Bash command to create the temporary body file. Do NOT use the Write tool.
   ```bash
   cat > prbody.tmp << 'EOF'
   ## 概要
   {{概要}}

   ## 詳細
   {{詳細}}

   ## 参考
   {{参考}}

   ## 注意事項
   {{注意事項}}
   EOF

   gh pr create --draft --base develop --title "{{PRタイトル}}" --body-file prbody.tmp && \
   gh pr view --web

   rm -f prbody.tmp
   ```

   - On success, display:
     ```
     ✅ Pull Request を作成しました（Draft）
     ```
   - Record the created PR number for the next step

### 6. Review & Fix Loop (max 3 iterations, inline)

The review and fix steps are executed **inline by the main assistant** following the procedures defined in `.claude/skills/review-pr/SKILL.md` and `.claude/skills/review-fix/SKILL.md`. Do NOT spawn subagents.

When `--codex` is specified, the review step is replaced with the codex-review-pr script (still no subagent).

Record the cycle start time for pendulum detection filtering:
```bash
CYCLE_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

```
loop_count = 0
pendulum_consecutive_count = 0

while loop_count < 3:
  loop_count++

  ## Review (branch by reviewer)

  if reviewer == "claude":
    Execute the /review-pr procedure inline (do NOT call a subagent):

    1. Follow `.claude/skills/review-pr/SKILL.md` Steps 1–7 against the current PR number:
       - Fetch PR details, changed files, and full diff
       - Determine and read the applicable `.claude/rules/` files
       - Evaluate TODO comments in changed files
       - Analyze the diff for code quality / bugs / security / performance / best practices
       - Compose the review in the standard Markdown format. The 総合評価 section MUST contain exactly one of: "LGTM" / "軽微な修正後にマージ可" / "修正が必要" / "大幅な修正が必要"
       - Post the review comment using `gh pr comment {{pr-number}} --body-file ...`
    2. Read back the latest 総合評価 from the comment you just posted (or fetch via `gh api repos/{owner}/{repo}/issues/{{pr-number}}/comments --jq '[.[] | select(.body | test("総合評価"))] | last | .body'`):
       - Contains "LGTM" → break loop, go to Step 7
       - Otherwise → proceed to fix step
       - Section not found / posting failed → break loop, display warning, go to Step 7

  if reviewer == "codex":
    1. Run the codex-review-pr script via Bash:
       ```bash
       bash .claude/skills/codex-review-pr/codex-review-pr.sh {{pr-number}}
       ```
       * If the script exits with non-zero, break the loop, display the error, and go to Step 7

    2. Fetch the latest PR comment and check the verdict:
       ```bash
       gh api repos/{owner}/{repo}/issues/{{pr-number}}/comments --jq '[.[] | select(.body | test("総合評価"))] | last | .body'
       ```
       Parse the "総合評価" section from the comment body:
       - Contains "LGTM" → break loop, go to Step 7
       - Otherwise → proceed to fix step
       - Section not found → break loop, display warning, go to Step 7

  ## Pendulum detection and integrated analysis (only when loop_count >= 2)

  Skip this sub-step if `loop_count < 2`.

  When `loop_count >= 2`, perform the following before fixing:

  1. **Fetch review history from PR comments (current cycle only)**: Retrieve only review comments posted during this review cycle that match the review format. Filter by timestamp and content pattern (`総合評価` section) to exclude comments from previous cycles and non-review comments. Use the `$CYCLE_START` timestamp recorded before the loop started to filter comments:
     ```bash
     gh api repos/{owner}/{repo}/issues/{{pr-number}}/comments \
       --jq '[.[] | select(.body | test("総合評価")) | select(.created_at >= "'"$CYCLE_START"'")] | .[] | .body'
     ```
     This returns only review comments posted after the current cycle started that contain the "総合評価" section.

  2. **Detect pendulum pattern**: Compare the **current review** (the latest review comment) against the **immediately previous review comment** for contradictory findings targeting the **same file and same code region** (same file + overlapping line range or same function/method). Only count a pendulum when the current review newly asks for the opposite action — do not re-detect old contradictions from earlier iterations. A pendulum is detected when:
     - The current review says "do X" for `file:line` and the immediately previous review said "undo X" or "do opposite of X" for the same location (or vice versa)
     - Examples: "add try/catch" vs "remove try/catch", "inline this" vs "extract this", "add validation" vs "validation is unnecessary"

  3. **On pendulum detected**:
     - Generate an integrated analysis summary:
       - Which file/location is oscillating
       - What each review suggested (with approximate iteration/comment order)
       - A recommended resolution that considers all review history
     - Carry this analysis into the fix step (see below) so it overrides individual conflicting comments
     - Track pendulum detection count in `pendulum_consecutive_count` variable (incremented each time pendulum is detected in consecutive iterations)
     - If `pendulum_consecutive_count >= 2` (pendulum detected in 2 consecutive iterations):
       - Display:
         ```
         ⚠️ 振り子パターンが2回連続で検出されました。自動修正を中断し、設計判断をユーザーに委ねます。
         ```
       - Break the loop, go to Step 7 (early exit)

  4. **On no pendulum detected**: Continue as normal. Reset `pendulum_consecutive_count = 0`.

  ## Fix (common, inline)

  Execute the /review-fix procedure inline (do NOT call a subagent):

  1. Follow `.claude/skills/review-fix/SKILL.md` Steps 1–6 to:
     - Confirm the current branch is the PR's feature branch (not a protected branch)
     - Fetch inline review comments AND general PR comments
     - Display the comments to the user (compact form is acceptable inside the loop)
     - Apply the requested code modifications
       - **If a pendulum analysis exists from the previous sub-step, prepend a clear note in your displayed reasoning**: 「⚠️ 振り子パターン検出: 統合分析の推奨方針に従って修正します。個別の指摘より本方針を優先します」 followed by the analysis summary. Apply fixes consistent with the analysis, not with individual conflicting comments.
     - Re-run the same verification commands used in Step 3 (lint / typecheck / build / tests). If any fail, fix the failures before committing.
     - Stage the changes (prefer explicit file paths)
     - Generate a Japanese commit message of the form `fix(review): PR #{{pr-number}} のレビュー指摘に対応 (loop {{loop_count}})` with a bullet list of fixed items
     - Append `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
     - Commit and `git push`
  2. Continue to next iteration

```

After the loop:
- If LGTM:
  ```
  ✅ レビューLGTM ({{loop_count}}回目)
  ```
- If not LGTM after 3 iterations:
  ```
  ⚠️ 3回のレビューループでLGTMに至りませんでした。手動で確認してください。
  ```

#### Codex review evaluation (only when `--codex` is specified and NOT LGTM after 3 iterations)

When the loop ends without LGTM and `--codex` was used, evaluate the remaining review comments directly. Use the review comment body already fetched in the last iteration of the loop (Step 6, codex review section).

1. **Analyze each remaining review comment** from the latest review body
   - Classify each comment into one of three categories:
     - **(A) 対応が必要**: Genuine issues (bugs, security vulnerabilities, logic errors, missing error handling)
     - **(B) 対応推奨（必須ではない）**: Valid suggestions but not blocking (naming improvements, minor refactoring, style preferences beyond linter rules)
     - **(C) 過剰な指摘（対応不要）**: Overly strict or subjective comments (stylistic preferences already handled by linter, unnecessary abstractions, trivial nitpicks)

2. **Determine recommended action**
   - If there are any **(A)** items → recommend "手動修正が必要"
   - If there are only **(B)** and/or **(C)** items → recommend "マージ可"

3. **Display evaluation result**
   ```
   🔍 レビュー指摘の妥当性評価
   ─────────────────────────────
   (A) 対応が必要:
     - {{指摘内容の要約}}
   (B) 対応推奨（必須ではない）:
     - {{指摘内容の要約}}
   (C) 過剰な指摘（対応不要）:
     - {{指摘内容の要約}}
   ─────────────────────────────

   💡 推奨アクション: {{マージ可 / 手動修正が必要}}
   ```
   - If a category has no items, display "なし" for that category
   - Save the recommended action string for Step 7

### 7. Completion message

On completion of all steps, display the following summary:

```
══════════════════════════════════════════
✅ Execute Plan 完了
══════════════════════════════════════════
📋 プラン:      {{plan-file-path}}
🌿 ブランチ:    {{branch-name}}
📝 コミット:    {{commit-hash-short}} "{{commit-message-first-line}}"
🔀 PR:          #{{number}} {{PR title}}
🔍 レビュー:    {{レビュー結果 (例: "LGTM (1回目)" or "3回ループ後も未解決")}}
💡 評価:        {{評価サマリー (--codex かつ LGTM未達の場合のみ表示。例: "推奨アクション: マージ可")}}
══════════════════════════════════════════

次のステップ:
- LGTMの場合: /finish でマージ
- 未解決の指摘がある場合: 手動で確認・修正後、/review-fix で対応
- 評価が「マージ可」の場合: 指摘内容を確認の上、問題なければ /finish でマージ
```

## Error Handling

- No argument: Display usage message and abort
- Plan file not found / empty: Display error and abort
- Verification failure in Step 3: Abort in implemented state (skip commit and PR creation)
- Commit/PR/Review errors: Display error message and abort

## Important Notes

- This skill performs all work inline through the main assistant; no subagents are spawned. This is a deliberate design choice so the skill works without project-specific subagent definitions.
- Plan file format is flexible (Markdown recommended)
- All user-facing messages should be in Japanese
- Review-fix loop iterates up to 3 times; manual intervention is expected if LGTM is not reached
- Pendulum detection prevents the loop from oscillating on contradictory feedback (kicks in from iteration 2)
