# Engagement Center — Operations Guide

## Overview

The Engagement Center auto-replies to new X posts from monitored accounts. The cron job
(`/api/cron/engagement-poll`) runs every 5 minutes via GitHub Actions and is tier-gated (STARTER+).

---

## Cron Job Logs

Each run logs per-user context and per-account activity. Key log lines:

```
[cron] User <userId> | tier=PRO | accounts=3 | xAccount=true | globalPaused=false
[cron] ↳ Token OK, processing 3 account(s)
[cron]   Checking @elonmusk (lastSeenTweetId=1234567890)
[cron]   @elonmusk: 2 new tweet(s) → will reply to all (quota permitting)
[cron]   Quota OK (remaining=24), generating reply for tweet 1234567891
[cron] Posted reply for @elonmusk tweet 1234567891 → reply 9876543210
```

### Skip reasons

| Log line | Meaning |
|---|---|
| `SKIP: globally paused` | User toggled "Pause All" in the dashboard |
| `SKIP: insufficient tier (FREE), need STARTER+` | User is on FREE plan |
| `SKIP: no X account connected` | User hasn't connected X in Settings |
| `SKIP: X token expired` | OAuth refresh token is expired — user must reconnect |
| `SKIP: token refresh failed` | Temporary X API error — will retry next run |

The JSON response includes a `skipReasons` breakdown:
```json
{
  "processed": 5,
  "replied": 3,
  "failed": 0,
  "skipped": 8,
  "skipReasons": { "globalPaused": 0, "insufficientTier": 8, "noXAccount": 0, "tokenError": 0 },
  "durationMs": 4201
}
```

---

## Quote Tweet Context Expansion

When a monitored account posts a quote tweet (e.g. quoting a post and writing "True"), the X API
returns only the quoting user's text by default. Without the original post, the AI generates a
contextless reply.

`fetchRecentTweets()` requests `expansions=referenced_tweets.id` and `tweet.fields=referenced_tweets`
in the same API call (no additional request). The response includes an `includes.tweets` array with
the full text of any referenced tweets.

**How it works:**

1. Each tweet's `referenced_tweets` array is checked for an entry with `type: "quoted"`.
2. If found, the quoted tweet's text is looked up from `includes.tweets` and attached as
   `FetchedTweet.quotedTweetText`.
3. `sourceTweetText` stored in the DB is formatted as:
   ```
   <quoting tweet text>

   [Quoting: <quoted tweet text>]
   ```
4. The AI prompt receives the original tweet text plus a separate quoted-context block:
   ```
   Tweet to reply to:
   "<quoting text>"

   This tweet is quoting another post that says:
   "<quoted text>"
   ```

**Edge cases:**

| Situation | Behavior |
|---|---|
| Non-quote tweet | `referenced_tweets` absent → `quotedTweetText` undefined → identical to previous behavior |
| Quoted tweet deleted | X API won't include it in `includes.tweets` → graceful degradation, no quoted context |
| Retweet of a quote tweet | Already excluded by `exclude=retweets,replies` |

**UI note:** The `[Quoting: ...]` suffix is stored in `sourceTweetText`. The engagement center
tooltip that displays `sourceTweetText` will naturally show the full context.

---

## Stale Tweet Protection

When a new monitored account is added, `lastSeenTweetId` is `null`. Without a recency guard the
X API would return up to 10 of the account's most recent tweets regardless of age, causing the
cron to generate replies to months-old posts.

`fetchRecentTweets()` always passes `start_time` set to **6 hours before now**. The X API applies
both `since_id` (when set) and `start_time`; tweets must satisfy both filters. This means:

- **New account (`lastSeenTweetId = null`)**: only tweets from the last 6 hours are returned.
- **Existing account**: `start_time` acts as a redundant safety net alongside `since_id`.

---

## Reply Status Workflow

```
PENDING → GENERATING → POSTING → POSTED
                               ↘ FAILED   (permanent after 3 attempts)
         SKIPPED               (quota exhausted, never attempted)
```

PENDING replies with `attempts < 3` are automatically retried on the next cron run.

---

## Manually Triggering the Cron

```bash
curl -X POST https://juiceindex.io/api/cron/engagement-poll \
  -H "Authorization: Bearer $CRON_SECRET"
```

Or use the GitHub Actions **Run workflow** button on the `cron-engagement-poll` workflow.

---

## Increasing Daily Quota for a User

**Option 1 — Reset today's Redis counter (one-time reset)**

1. Open the [Upstash console](https://console.upstash.com) → your Redis database → Data Browser
2. Search for: `engagement:reply:<userId>:<YYYYMMDD>` (e.g. `engagement:reply:f26fa805-...:20260219`)
3. Delete the key — the counter resets to 0, giving the user a fresh daily quota

**Option 2 — Temporarily upgrade to ENTERPRISE (unlimited)**

Run in Supabase SQL editor:
```sql
-- Upgrade
UPDATE juice_api_subscriptions SET tier = 'ENTERPRISE' WHERE "userId" = '<userId>';

-- Revert when done
UPDATE juice_api_subscriptions SET tier = 'PRO' WHERE "userId" = '<userId>';
```

ENTERPRISE tier has unlimited replies (`Infinity`), bypassing the rate limiter entirely.

---

## Manually Retrying Failed Replies

Use this when replies are stuck as FAILED and you want to force a retry beyond the 3-attempt limit.

**Step 1 — Find the affected monitored account ID**

```sql
SELECT id, username, "lastSeenTweetId"
FROM juice_monitored_accounts
WHERE "userId" = '<userId>';
```

**Step 2 — Reset the reply records to PENDING**

```sql
UPDATE juice_engagement_replies
SET status = 'PENDING', attempts = 0, "lastError" = NULL
WHERE status = 'FAILED'
  AND "userId" = '<userId>';
```

**Step 3 — Reset lastSeenTweetId so the tweets are re-fetched (if needed)**

Only required if the reply records were never created (tweets were never seen).
```sql
UPDATE juice_monitored_accounts
SET "lastSeenTweetId" = NULL
WHERE id = '<monitoredAccountId>';
```

**Step 4 — Trigger the cron**

```bash
curl -X POST https://juiceindex.io/api/cron/engagement-poll \
  -H "Authorization: Bearer $CRON_SECRET"
```

> Note: resetting `lastSeenTweetId` without resetting the reply records creates duplicate
> `EngagementReply` rows (the cron uses `create`, not `upsert`). Always do both steps together.

---

## X Token Expiry

**Symptom**: Cron logs show `SKIP: X token expired` for a user. Their replies stop completely.

**Cause**: X OAuth 2.0 refresh tokens expire after ~6 months of inactivity, or when the user revokes app access from `twitter.com/settings/connected_apps`.

**Fix (user action)**: The user must go to Settings → X Account → Disconnect → Reconnect. This generates a fresh token pair stored in `juice_x_accounts`.

**Future improvement**: Surface a warning banner on `/dashboard/engagement` when a token expiry is detected, prompting the user to reconnect.

---

## X Notifications Behavior

- Every successfully posted reply generates a real X notification to the original tweet author.
- Retried replies that succeed also notify — but since each tweet has exactly one `EngagementReply` record, there are no duplicate posts under normal operation.
- SKIPPED and FAILED replies never post and never generate notifications.
- The app owner's X notification feed shows all auto-replies as activity under "Your replies".

---

## AI Usage Tracking

Every GPT-4o-mini and DALL-E 3 call made by the cron job is logged to the `juice_ai_usage` table with `source = 'engagement-reply'`. This allows the admin AI Usage dashboard to include engagement costs alongside Studio usage.

Logged fields per call:

| Field | Text generation | Image generation |
|---|---|---|
| `type` | `"text"` | `"image"` |
| `model` | `"gpt-4o-mini"` | `"dall-e-3"` |
| `size` | — | `"1024x1024"` |
| `source` | `"engagement-reply"` | `"engagement-reply"` |
| `inputTokens` / `outputTokens` | from API response | — |
| `cost` | computed via `computeTextGenerationCost()` | `0.04` (or `0` on failure) |
| `durationMs` | measured around the API call | measured around the API call |
| `success` | `true` / `false` | `true` / `false` |
| `errorMsg` | set on failure | set on failure |

Both the new-tweet path and the retry path log AI calls. Text generation is only logged when text is actually regenerated (reused text from a previous attempt is not re-logged).

To query engagement AI spend:
```sql
SELECT DATE("createdAt") AS day, SUM(cost) AS total_cost, COUNT(*) AS calls
FROM juice_ai_usage
WHERE source = 'engagement-reply'
GROUP BY 1
ORDER BY 1 DESC;
```

---

## Quota Reference

| Capability | FREE | STARTER | PRO | ENTERPRISE |
|---|---|---|---|---|
| Replies per day | 0 | 5 | 25 | Unlimited |
| Monitored accounts | 0 | 5 | 20 | Unlimited |
| Image generations per day | 0 | 2 | 10 | Unlimited |

Redis keys expire at UTC midnight. Keys:
- `engagement:reply:<userId>:<YYYYMMDD>` — daily reply counter
- `engagement:image:<userId>:<YYYYMMDD>` — daily image counter
