# Engagement Center - Design Document

## Overview

The Engagement Center adds automatic AI-generated replies to new X posts from monitored accounts. Users configure which accounts to monitor, set per-account reply tones and image generation preferences, and the system polls for new tweets and replies automatically. The feature is tier-gated (STARTER+).

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
- Optional image (url and base64)
- Status workflow: PENDING -> GENERATING -> POSTING -> POSTED (or FAILED/SKIPPED)
- Tracks tone used, error messages, attempt count, timestamps
- Unique constraint on `[userId, sourceTweetId]` for idempotency

**FollowingCache** - Cached X following list:
- Stores the user's X following list locally (rate-limited endpoint)
- Unique constraint on `[userId, xUserId]`

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
- Prompt rules: under 280 chars, reference source tweet, no hashtags/markdown/AI disclosure, 1-2 sentences, temperature 0.7

### Image Generation (`src/lib/engagement/generate-image.ts`)
- Uses `openai` package directly for DALL-E 3 API
- 1024x1024 standard-quality images based on tweet + reply context
- Returns base64-encoded PNG

### Tweet Fetching (`src/lib/engagement/fetch-tweets.ts`)
- `fetchRecentTweets()`: GET /2/users/:id/tweets with since_id, excludes retweets/replies
- `fetchFollowingList()`: GET /2/users/:id/following with pagination
- `lookupUserByUsername()`: GET /2/users/by/username/:username for handle validation

## API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/dashboard/engagement/accounts` | GET, POST | List/add monitored accounts |
| `/api/dashboard/engagement/accounts/[id]` | PATCH, DELETE | Update/remove single account |
| `/api/dashboard/engagement/import-following` | POST | Import X following list |
| `/api/dashboard/engagement/following` | GET | Get cached following list |
| `/api/dashboard/engagement/replies` | GET | Paginated reply history |
| `/api/dashboard/engagement/usage` | GET | Daily usage stats |

## Cron Job

`/api/cron/engagement-poll` - Runs every 5 minutes via GitHub Actions:

1. Verify cron auth
2. Query enabled MonitoredAccounts with user OAuth tokens and tier info
3. For each account:
   - Check tier >= STARTER
   - Check daily reply quota
   - Refresh OAuth token if needed
   - Fetch recent tweets since lastSeenTweetId
   - For each new tweet: generate reply, optionally generate image, post reply
   - Update lastSeenTweetId and lastCheckedAt
4. Return summary

## Dashboard UI

New "Engagement" tab in dashboard navigation (between Posts and Settings).

### Tabs
1. **Monitored Accounts** - Grid of account cards with tone/image settings
2. **Reply History** - Paginated list of auto-replies with status badges

### Components
- Usage bar (replies today, images today, accounts count)
- Account cards with tone selector, image toggle, enable/disable
- Add account section (manual @handle input + import from following)
- Import following modal with search/filter and checkbox selection
- Reply history with status filters and reply cards

## Dependencies

| Package | Purpose |
|---|---|
| `openai` | DALL-E 3 image generation API (separate from @ai-sdk/openai) |

## Files

### New files (17):
- `src/lib/engagement/types.ts` - Shared TypeScript types
- `src/lib/engagement/generate-reply.ts` - AI reply generation
- `src/lib/engagement/generate-image.ts` - DALL-E image generation
- `src/lib/engagement/fetch-tweets.ts` - X API wrappers
- `src/app/api/dashboard/engagement/accounts/route.ts` - Account CRUD
- `src/app/api/dashboard/engagement/accounts/[id]/route.ts` - Single account ops
- `src/app/api/dashboard/engagement/import-following/route.ts` - Import following
- `src/app/api/dashboard/engagement/following/route.ts` - Cached following
- `src/app/api/dashboard/engagement/replies/route.ts` - Reply history
- `src/app/api/dashboard/engagement/usage/route.ts` - Usage stats
- `src/app/api/cron/engagement-poll/route.ts` - Cron poll + auto-reply
- `src/app/dashboard/engagement/page.tsx` - Main page
- `src/app/dashboard/engagement/usage-bar.tsx` - Usage indicators
- `src/app/dashboard/engagement/account-card.tsx` - Account settings card
- `src/app/dashboard/engagement/import-following-modal.tsx` - Import modal
- `src/app/dashboard/engagement/reply-history.tsx` - Reply history tab
- `docs/engagement-center.md` - Feature documentation

### Modified files (5):
- `prisma/schema.prisma` - Add 2 enums, 3 models, User relations
- `src/lib/api/quotas.ts` - Add 3 quota fields
- `src/lib/ratelimit.ts` - Add engagement rate limit + usage functions
- `src/lib/x/post-tweet.ts` - Add replyToTweetId parameter
- `src/app/dashboard/layout.tsx` - Add nav item
