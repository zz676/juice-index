# Cron Jobs

## Overview

Cron jobs are triggered via GitHub Actions workflows that call HTTP endpoints on the deployed application. This replaces the previous Vercel Cron configuration, which was limited to once-per-day execution on the Hobby plan.

## Endpoints

| Endpoint | Schedule | Workflow |
|----------|----------|----------|
| `/api/cron/publish-user-posts` | Every 5 minutes | `cron-publish-posts.yml` |
| `/api/cron/prune-usage` | Not yet scheduled | — |

All cron endpoints require a `Authorization: Bearer <CRON_SECRET>` header and accept `POST` requests.

## GitHub Actions Setup

### Required Repository Secrets

Add these under **Settings > Secrets and variables > Actions**:

- `APP_URL` — The base URL of the deployed app (e.g. `https://juice-index.vercel.app`)
- `CRON_SECRET` — Must match the `CRON_SECRET` environment variable configured in Vercel

### Workflow: `cron-publish-posts.yml`

- **Schedule:** `*/5 * * * *` (every 5 minutes, the GitHub Actions minimum)
- **Manual trigger:** Supports `workflow_dispatch` for on-demand runs
- **Failure handling:** Fails the workflow run if the endpoint returns a non-200 HTTP status

### Manual Trigger

To trigger a cron workflow manually:

1. Go to the repository's **Actions** tab
2. Select the workflow (e.g. **Cron – Publish Scheduled Posts**)
3. Click **Run workflow**

## Adding New Cron Jobs

To schedule the `prune-usage` endpoint (or any new cron endpoint):

1. Create a new workflow file in `.github/workflows/`
2. Use the same pattern as `cron-publish-posts.yml`
3. Set the appropriate `cron` schedule expression
4. Update this document
