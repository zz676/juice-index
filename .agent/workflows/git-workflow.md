---
description: Git workflow for pushing code changes via pull requests
---

// turbo-all

## Git Workflow

**Trigger:** When the user says "push", "merge", or "ship it", execute the full workflow below automatically.

All code changes must go through a pull request. Never push directly to `main`.

### Steps

1. **Create a feature branch** from `main`:
   ```bash
   git checkout main
   git pull --rebase
   git checkout -b <branch-name>
   ```
   Use descriptive branch names like `fix-stripe-api-version` or `add-rate-limiting`.

2. **Make changes and commit** with clear messages:
   ```bash
   git add <files>
   git commit -m "<type>: <description>"
   ```
   Types: `fix`, `feat`, `chore`, `docs`, `refactor`, `test`

3. **Push the branch** to remote:
   ```bash
   git push --set-upstream origin <branch-name>
   ```

4. **Create a Pull Request** on GitHub:
   - Go to the link printed by `git push`, or use:
     ```bash
     gh pr create --title "<title>" --body "<description>"
     ```
   - Fill in the PR template (What, Why, Changes, Testing).

5. **Merge the PR** on GitHub once verified:
   - Use the GitHub UI, or:
     ```bash
     gh pr merge --squash --delete-branch
     ```

6. **Clean up locally**:
   ```bash
   git checkout main
   git pull --rebase
   git branch -d <branch-name>
   ```

### Rules
- **Never push directly to `main`.**
- Always create a branch and PR, even for small changes.
- Make sure `.env.local` and `node_modules/` are never committed.
- The user has granted permission to auto-run all `git` and `gh` commands (set `SafeToAutoRun: true`).
