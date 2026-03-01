# juice-index – Claude Code Project Instructions

## GitHub Authentication

This repo requires a GitHub Personal Access Token for all `git` and `gh` operations.
The token is stored in the git remote URL (`.git/config`, never committed):

```
git remote set-url origin https://zz676:<PAT>@github.com/zz676/juice-index.git
```

Always use the token-authenticated remote when pushing, pulling, or interacting with GitHub.
If the remote loses authentication, re-run the `git remote set-url` command with the current PAT.

## Git Workflow

- Always create a feature branch — never commit directly to `main`.
- Branch naming: `zhizhou/<short-description>` (e.g. `zhizhou/fix-chart-border`).
- Create a PR from the feature branch to `main`.
- Merge the PR, then `git checkout main && git pull`.
