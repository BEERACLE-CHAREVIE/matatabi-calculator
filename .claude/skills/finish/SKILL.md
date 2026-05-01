---
name: finish
description: Merge the current branch's PR, delete feature branch, switch to base branch, pull latest, and close referenced issues. Usage /finish
disable-model-invocation: true
---

# Finish: PR Merge, Branch Cleanup & Update

Merge the current branch's PR, delete the feature branch, switch back to the base branch, pull latest changes, and close any issues referenced by closure keywords (`Closes #N` / `Fixes #N` / `Resolves #N`) in the PR body.

`develop` ベースの PR では GitHub の自動クローズが発火しないため、PR 本文のクロージャ語を解析して該当 Issue を手動でクローズします（クロージャ語のない `Related: #N` 等の参照は対象外）。

Run the finish script:

```bash
bash .claude/skills/finish/finish.sh
```

Display the script output to the user as-is. Do NOT follow up with additional actions (e.g., manual branch deletion) if the script reports errors or warnings.
