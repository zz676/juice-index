# Engagement Center - Design Document

## Overview

The Engagement Center adds automatic AI-generated replies to new X posts from monitored accounts. Users configure which accounts to monitor, set per-account reply tones and image generation preferences, and the system polls for new tweets every minute and replies automatically. The feature is tier-gated (STARTER+).

## Architecture

### Data Models

**MonitoredAccount** - Accounts to watch for new tweets:
- Links to a User and stores the X user ID, username, display name, avatar
- Per-account settings: tone (enum), custom tone prompt, always generate image flag, enabled flag
- Tracks `lastSeenTweetId` and `lastCheckedAt` for polling
- Unique constraint on `[userId, xUserId]`

**EngagementReply** - Log of every auto-reply attempt:
- Links to User and MonitoredAccount
- Stores source tweet info (id, text, url) and reply info (text, tweet id, url)
- Status workflow: PENDING → GENERATING → POSTING → POSTED (or FAILED/SKIPPED)
- Tracks tone used, error messages, attempt count, cost breakdown, timestamps
- Unique constraint on `[userId, sourceTweetId]` for idempotency

**FollowingCache** - Cached X following list:
- Stores the user's X following list locally (rate-limited endpoint)
- Unique constraint on `[userId, xUserId]`

**EngagementConfig** - Per-user global settings:
- `globalPaused` flag — pauses all auto-replies for the user

### Enums

- **ReplyTone**: HUMOR, SARCASTIC, HUGE_FAN, CHEERS, NEUTRAL, PROFESSIONAL
- **EngagementReplyStatus**: PENDING, GENERATING, POSTING, POSTED, FAILED, SKIPPED

### Tier Quotas

| Capability | FREE | STARTER | PRO | ENTERPRISE |
|---|---|---|---|---|
| Replies per day | 0 | 5 | 25 | Unlimited |
| Monitored accounts | 0 | 5 | 20 | Unlimited |
| Image generations per day | 0 | 2 | 10 | Unlimited |

## Core Library Functions

### Reply Generation (`src/lib/engagement/generate-reply.ts`)
- Uses Vercel AI SDK with `gpt-4o-mini` for cost-efficient volume
- Per-tone system prompts (HUMOR, SARCASTIC, HUGE_FAN, CHEERS, NEUTRAL, PROFESSIONAL)
- Prompt rules: under 280 chars, reply in same language as source tweet, reference source tweet, no hashtags/markdown/AI disclosure, 1-2 sentences, temperature 0.7

### Image Generation (`src/lib/engagement/generate-image.ts`)
- Uses `openai` package directly for DALL-E 3 API
- 1024×1024 standard-quality images based on tweet + reply context
- Returns raw base64 string (prefixed as `data:image/png;base64,` before upload)

### Tweet Fetching (`src/lib/engagement/fetch-tweets.ts`)
- `fetchRecentTweets()`: GET /2/users/:id/tweets with since_id, excludes retweets/replies
- `fetchFollowingList()`: GET /2/users/:id/following with pagination
- `lookupUserByUsername()`: GET /2/users/by/username/:username for handle validation

### Cost Utilities (`src/lib/engagement/cost-utils.ts`)
- GPT-4o-mini pricing: $0.15/1M input tokens, $0.60/1M output tokens
- DALL-E 3 standard 1024×1024: $0.04/image
- `computeTotalReplyCost()` returns `{ textCost, imageCost, apiCost, totalCost }`

## API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/dashboard/engagement/accounts` | GET, POST | List/add monitored accounts |
| `/api/dashboard/engagement/accounts/[id]` | PATCH, DELETE | Update/remove single account |
| `/api/dashboard/engagement/config` | GET, PATCH | Get/update global pause state |
| `/api/dashboard/engagement/import-following` | POST | Import X following list |
| `/api/dashboard/engagement/following` | GET | Get cached following list |
| `/api/dashboard/engagement/replies` | GET | Paginated reply history |
| `/api/dashboard/engagement/usage` | GET | Daily usage stats |
| `/api/cron/engagement-poll` | POST | Cron-triggered poll + auto-reply |
| `/api/dashboard/admin/engagement` | GET | Admin: per-user engagement metrics |
| `/api/dashboard/admin/engagement/[userId]/replies` | GET | Admin: user's reply history |

## Cron Job

`/api/cron/engagement-poll` — Triggered every **5 minutes** via GitHub Actions (`.github/workflows/cron-engagement-poll.yml`). Uses `APP_URL` and `CRON_SECRET` repository secrets. (Vercel Cron requires Pro plan; GitHub Actions covers the free tier.)

1. Verify cron auth (Bearer `CRON_SECRET`)
2. Query all enabled `MonitoredAccount` records
3. Group by userId; for each user:
   - Skip if `globalPaused === true`
   - Skip if tier < STARTER
   - Skip if no X account connected
   - Refresh OAuth token (skip user on `XTokenExpiredError`)
4. For each account:
   - Fetch recent tweets since `lastSeenTweetId`
   - For each new tweet: check daily reply quota, create `PENDING` reply record, generate text, optionally generate + upload image, post reply, update to `POSTED`
   - On error: mark `FAILED` (or keep `PENDING` for retry if attempts < 3)
   - Update `lastSeenTweetId` and `lastCheckedAt`
5. Return `{ processed, replied, failed, skipped, skipReasons, durationMs }`

## Dashboard UI

New "Engagement" nav item (between Posts and Settings, icon: `forum`).

### Page structure (`/dashboard/engagement`)
- **GlobalPauseBanner** — amber/green status bar with Pause All / Resume All toggle
- **UsageBar** — three progress bars: replies (daily), images (daily), accounts (total)
- **Tabs**:
  - **Monitored Accounts** — grid of `AccountCard`s + "Add Account" form + Import Following modal
  - **Reply Monitoring** — `ReplyMonitoringTable` with status-filter tabs, sortable columns, pagination

### Components
| Component | File |
|---|---|
| GlobalPauseBanner | `src/app/dashboard/engagement/global-pause-banner.tsx` |
| UsageBar | `src/app/dashboard/engagement/usage-bar.tsx` |
| AccountCard | `src/app/dashboard/engagement/account-card.tsx` |
| ImportFollowingModal | `src/app/dashboard/engagement/import-following-modal.tsx` |
| ReplyMonitoringTable | `src/app/dashboard/engagement/reply-monitoring-table.tsx` |
| Main page | `src/app/dashboard/engagement/page.tsx` |

## Admin Console

New **Engagement** tab in the Admin Console (icon: `forum`):
- **KPI cards**: Total Replies, Total Cost, Avg Cost/Reply, Active Users
- **User table**: sortable by name, email, replies, success rate, cost, last reply date
- **Expandable rows**: click a user row to reveal their reply history with full cost breakdown

Admin components:
- `src/app/dashboard/admin/engagement-tab.tsx`

## Files

### New files (20):
- `src/lib/engagement/types.ts`
- `src/lib/engagement/generate-reply.ts`
- `src/lib/engagement/generate-image.ts`
- `src/lib/engagement/fetch-tweets.ts`
- `src/lib/engagement/cost-utils.ts`
- `src/app/api/dashboard/engagement/accounts/route.ts`
- `src/app/api/dashboard/engagement/accounts/[id]/route.ts`
- `src/app/api/dashboard/engagement/config/route.ts`
- `src/app/api/dashboard/engagement/import-following/route.ts`
- `src/app/api/dashboard/engagement/following/route.ts`
- `src/app/api/dashboard/engagement/replies/route.ts`
- `src/app/api/dashboard/engagement/usage/route.ts`
- `src/app/api/cron/engagement-poll/route.ts`
- `src/app/api/dashboard/admin/engagement/route.ts`
- `src/app/api/dashboard/admin/engagement/[userId]/replies/route.ts`
- `src/app/dashboard/engagement/page.tsx`
- `src/app/dashboard/engagement/global-pause-banner.tsx`
- `src/app/dashboard/engagement/usage-bar.tsx`
- `src/app/dashboard/engagement/account-card.tsx`
- `src/app/dashboard/engagement/import-following-modal.tsx`
- `src/app/dashboard/engagement/reply-monitoring-table.tsx`
- `src/app/dashboard/admin/engagement-tab.tsx`
- `docs/design/engagement-center.md`

### Modified files (7):
- `prisma/schema.prisma` — Add 2 enums, 4 models, User relations
- `src/lib/api/quotas.ts` — Add `dailyReplies`, `monitoredAccounts`, `dailyImageGen` quota fields
- `src/lib/ratelimit.ts` — Add `engagementReplyLimit()`, `engagementImageLimit()`, `getEngagementUsage()`
- `src/lib/x/post-tweet.ts` — Add `replyToTweetId` parameter
- `src/components/dashboard/StatusBadge.tsx` — Add GENERATING, POSTING, POSTED, SKIPPED styles
- `src/app/dashboard/layout.tsx` — Add Engagement nav item
- `src/app/dashboard/admin/admin-dashboard.tsx` — Add Engagement tab
- `src/app/dashboard/admin/types.ts` — Add engagement admin types
- `vercel.json` — Add 1-minute cron schedule for engagement-poll
