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
| `SKIP: scheduled pause active` | Current time is within an enabled pause schedule window |
| `SKIP: insufficient tier (FREE), need STARTER+` | User is on FREE plan |
| `SKIP: no X account connected` | User hasn't connected X in Settings |
| `SKIP: X token expired` | OAuth refresh token is expired — user must reconnect |
| `SKIP: token refresh failed` | Temporary X API error — will retry next run |
| `not due yet (interval=Xm, elapsed=Ym)` | Account's `pollInterval` has not elapsed since `lastCheckedAt` |

The JSON response includes a `skipReasons` breakdown:
```json
{
  "processed": 5,
  "replied": 3,
  "failed": 0,
  "skipped": 8,
  "skipReasons": { "globalPaused": 0, "scheduledPause": 2, "insufficientTier": 6, "noXAccount": 0, "tokenError": 0, "notDueYet": 0 },
  "durationMs": 4201
}
```

---

## Pause Schedules

Pause schedules let users automatically suppress auto-replies during recurring daily time windows
(e.g., overnight 23:00–07:00) without manual toggling. Schedules are evaluated every cron run.

### How it works

1. Each `EngagementConfig` has zero or more `PauseSchedule` records and a `timezone` field.
2. At cron time, `isWithinPauseSchedule()` (in `src/lib/engagement/pause-utils.ts`) converts the current UTC time to the user's local timezone and checks whether it falls in any enabled schedule window.
3. Cross-midnight windows are supported: a schedule with `startTime = "23:00"` and `endTime = "07:00"` is active from 23:00 on one day through 06:59 the next day.
4. If any schedule matches, all accounts for that user are skipped for the current run with reason `scheduledPause`.

### Priority

| Condition | Behaviour |
|---|---|
| `globalPaused = true` | Manual override wins; all accounts skipped regardless of schedules |
| Schedule window active | Accounts skipped; `globalPaused` remains `false` |
| Both inactive | Accounts processed normally |

Clicking **Override On** in the banner sets `globalPaused = true`, immediately resuming the system even if a schedule window is currently active. Click **Resume** to clear the manual override.

### Exception dates

Each schedule can have a list of exception dates (`YYYY-MM-DD`). On an exception date the schedule is skipped, allowing auto-replies to run normally during what would otherwise be a paused window.

**Example use case:** overnight pause 23:00–07:00 with exception `2026-12-31` (New Year's Eve — you want replies to go out).

### Limits

| Resource | Limit |
|---|---|
| Schedules per user | 10 |
| Exception dates per schedule | 50 |

### Data model

```
EngagementConfig
  timezone       String   -- IANA (e.g. "America/New_York")
  PauseSchedules PauseSchedule[]

PauseSchedule
  engagementConfigId String
  label              String?    -- optional display name
  startTime          String     -- "HH:mm" 24-hour
  endTime            String     -- "HH:mm" 24-hour
  enabled            Boolean
  PauseExceptions    PauseException[]

PauseException
  pauseScheduleId String
  date            String    -- "YYYY-MM-DD"
  @@unique([pauseScheduleId, date])
```

### Debugging via SQL

Check a user's current schedules and exceptions:
```sql
SELECT
  ps.id,
  ps.label,
  ps."startTime",
  ps."endTime",
  ps.enabled,
  ec.timezone,
  COUNT(pe.id) AS exceptions
FROM juice_pause_schedules ps
JOIN juice_engagement_configs ec ON ec.id = ps."engagementConfigId"
LEFT JOIN juice_pause_exceptions pe ON pe."pauseScheduleId" = ps.id
WHERE ec."userId" = '<userId>'
GROUP BY ps.id, ec.timezone;
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

## Source Tweet Publish Date

The `sourceTweetCreatedAt` field stores the timestamp when the source tweet was originally published on X. It is fetched from the X API's `created_at` field and stored on the `EngagementReply` record.

**How it works:**

- `fetchRecentTweets()` requests `tweet.fields=created_at` alongside the existing tweet fields.
- The value is an ISO 8601 string from the X API (e.g. `"2026-02-20T14:32:00.000Z"`).
- It is stored as `sourceTweetCreatedAt DateTime?` on `juice_engagement_replies` for every new reply record.
- The Engagement Center table displays it as a **"Post Date"** column (formatted as "Mon D, HH:MM AM/PM"), next to the existing **"Date"** column (which shows when the reply was processed).

**Null values:** Records created before this field was introduced, or in the rare case the X API omits `created_at`, will have `NULL` stored. The UI shows "—" for those rows.

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

### Auto-post accounts (`autoPost: true`)
```
PENDING → GENERATING → POSTING → POSTED
                               ↘ FAILED   (permanent after 3 attempts)
         SKIPPED               (quota exhausted, never attempted)
```

### Manual-post accounts (`autoPost: false`)
```
PENDING → GENERATING → SENT_TO_TELEGRAM  (Telegram notification sent, awaiting user action)
                       → POSTED          (user tapped "✅ Posted" in Telegram or used dashboard)
                       → DISCARDED       (user tapped "❌ Discard" or used dashboard)
```

PENDING replies with `attempts < 3` are automatically retried on the next cron run. For `autoPost: false` accounts, the retry routes to Telegram instead of X.

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

## Tone System (UserTone)

Replies are generated using a per-user tone library stored in `juice_user_tones`. Each `UserTone` record has:

| Field | Description |
|---|---|
| `name` | Display name (e.g. "Humor", "My Custom Tone") |
| `prompt` | Full system prompt passed to the AI |
| `color` | UI color key (slate, blue, yellow, orange, pink, green, purple, teal) |

**Default tones:** On first access of `/api/dashboard/engagement/tones`, 6 default tones are seeded for the user: Humor, Sarcastic, Huge Fan, Cheers, Neutral, Professional. These can be edited or deleted.

**Tone Settings tab:** The Engagement Center has a 4th tab "Tone Settings" where users can view, edit, and create custom tones with full prompt control.

---

## Per-Account Auto-Post Toggle

Each `MonitoredAccount` has an `autoPost` boolean field (default: `false`).

| `autoPost` | Behavior |
|---|---|
| `true` | Reply is generated and posted directly to X via the API (original behavior) |
| `false` | Reply is generated, image (if any) is uploaded to Supabase Storage, and a Telegram notification is sent with inline "✅ Posted" / "❌ Discard" buttons |

The toggle is visible in the account card as **"Auto Post to X"**. Toggle it off to use the manual Telegram review flow.

**Telegram flow details:**
1. Cron generates reply text (and image if `imageFrequency > 0`)
2. If image generated: uploaded to `engagement-images` Supabase Storage bucket (public URL)
3. `sendToTelegram()` called — sends `sendPhoto` (with caption) or `sendMessage` + separate photo
4. Reply status set to `SENT_TO_TELEGRAM`, `replyImageUrl` stored
5. User reviews the Telegram message and taps a button:
   - **✅ Posted**: status → `POSTED`
   - **❌ Discard**: status → `DISCARDED`

**Message format:** The reply text is sent inside a `<pre>` block. Telegram renders this as a code block with a native copy icon — tap it to copy just the reply text without the header or tweet links.

---

## Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the token
2. Add the bot to your target chat and get the `chat_id` (use `getUpdates` or a helper bot)
3. Set environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`
4. Register the webhook after deploy:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://yourdomain.com/api/telegram/webhook?token=<TELEGRAM_WEBHOOK_SECRET>"
```

5. Create the `engagement-images` bucket in Supabase Storage with **public** read access

---

## Reply Detail Panel

In the Reply Monitoring table, clicking any row opens a slide-out panel showing:

- **Source tweet** text and link to X
- **Reply text** — editable textarea for `SENT_TO_TELEGRAM` and `DISCARDED` statuses; read-only for `POSTED`
- **Image preview** (if `replyImageUrl` is set)
- **Metadata**: tone, cost, generation date

**Available actions (by status):**

| Status | Available actions |
|---|---|
| `SENT_TO_TELEGRAM` | Save Edit · Post to X · Mark as Posted · Discard |
| `DISCARDED` | Save Edit · Post to X · Mark as Posted |
| `POSTED` | View reply link (if auto-posted via API) |
| `PENDING` / `FAILED` | Discard |

- **Save Edit**: updates `replyText` in DB via PATCH `/api/dashboard/engagement/replies/[id]`
- **Post to X**: downloads image from Supabase (if any), uploads to X, posts tweet, sets status to `POSTED`
- **Mark as Posted**: sets status to `POSTED` without making an X API call (for manually posted replies)
- **Discard**: sets status to `DISCARDED`

---

## Per-Account Tone Weights, Temperature, and Context

Each `MonitoredAccount` has personalization fields:

| Field | Description |
|---|---|
| `toneWeights` | JSON map of `{ userToneId: weight }`. Weights are arbitrary numbers — only the ratio matters. Null = fall back to legacy `tone` enum. |
| `temperature` | Float 0.1–1.0, default 0.8. Controls reply creativity/randomness. |
| `accountContext` | Free-text description shown to the AI (e.g. "Tech blogger covering AI startups"). |
| `pollInterval` | Int (minutes), default 5. Allowed values: 5, 10, 15, 30, 60, 1440, 10080. Accounts with interval > 5 are skipped by the cron if `lastCheckedAt` is within the interval window. |

**Weighted random tone selection:** At reply generation time, `pickUserTone()` picks a tone proportional to its weight. A weight of 0 excludes that tone. Example: Humor=40, Neutral=60 → Neutral picked ~60% of the time.

**Legacy fallback:** If `toneWeights` is null (pre-existing accounts), the legacy `tone` enum is used with the corresponding default prompt.

---

## Selective Image Generation

When `alwaysGenerateImage` is enabled on an account, images are generated for **approximately 1/3 of replies** (controlled by `Math.random() < 1/3`). This reduces DALL-E 3 costs while keeping visual variety.

---

## AI Model

Text replies are generated using **GPT-4.1-mini** (previously gpt-4o-mini). Prompts use a split system/user message structure:
- **System message:** Tone prompt + account context + recent reply history + reply rules
- **User message:** The tweet text to reply to

Recent replies (up to 5) are passed to avoid repetitive openings and patterns.

**Reply generation rules (applied globally to all accounts):**
- Keep replies under 25 words; short punchy sentences or fragments are fine
- Max output tokens: 80 (approx. 60 words — limits verbosity while giving headroom)
- End with 1-2 relevant emoji when it fits naturally (e.g. 📈, 💀, ☕️)
- Occasionally open with a casual reaction ("Honestly,", "Pretty wild,", "Wait,") — not every time
- Occasionally use first-person for a personal touch ("I think", "Reminds me of") — not every time
- No filler phrases ("It's worth noting", "This is interesting")
- Never start with generic affirmations ("Great point!", "Absolutely!")

---

## AI Usage Tracking

Every GPT-4.1-mini and DALL-E 3 call made by the cron job is logged to the `juice_ai_usage` table with `source = 'engagement-reply'`. This allows the admin AI Usage dashboard to include engagement costs alongside Studio usage.

Logged fields per call:

| Field | Text generation | Image generation |
|---|---|---|
| `type` | `"text"` | `"image"` |
| `model` | `"gpt-4.1-mini"` | `"dall-e-3"` |
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
