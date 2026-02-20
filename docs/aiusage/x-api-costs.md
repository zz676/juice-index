# X API Cost Analysis (Pay-By-Use Tier)

Reference: https://developer.x.com/#pricing

X's pay-by-use model uses prepaid credits with no subscriptions or minimum spend. Credits are deducted per API request/resource. Different endpoints have different costs — rates are visible in the [Developer Console](https://console.x.com).

## X API Credit Costs

| Category | Unit | Cost |
|---|---|---|
| Posts: Read | per resource | $0.005 |
| User: Read | per resource | $0.010 |
| Following/Followers: Read | per resource | $0.010 |
| Content: Create (post tweets) | per request | $0.005 |
| Media Metadata (upload/delete media) | per request | $0.005 |
| Content: Manage | per request | $0.005 |

> **Deduplication**: Identical posts retrieved within a single UTC day incur only one charge. Retrieving the same post on different days counts as separate charges. Only successful responses generating data are billed.

## Engagement-Poll CRON Flow

The engagement-poll cron (`src/app/api/cron/engagement-poll/route.ts`) runs the following X API calls per cycle:

### Step 1: Poll tweets (per monitored account)

```
GET /2/users/{id}/tweets?max_results=10&exclude=retweets,replies&tweet.fields=id,text&since_id=...
```

- Returns up to 10 posts per account
- Cost: **$0.005 x N posts returned** (Posts: Read)
- Retweets and replies are excluded by the `exclude` param
- Only `id,text` fields requested — no expansions

**Quote tweets note**: Quote tweets are NOT excluded by the `retweets` filter, so they can appear in results. However, since we don't request `expansions=referenced_tweets.id`, only the quoting tweet itself is returned — the quoted/referenced tweet is **not** fetched as a separate resource. Each tweet in the response is a single $0.005 read regardless of whether it's a quote tweet.

### Step 2: Reply (per tweet found)

**Text-only reply:**

| API Call | Category | Cost |
|---|---|---|
| `POST /2/tweets` | Content: Create | $0.005 |
| **Total** | | **$0.005** |

**Reply with image:**

| API Call | Category | Cost |
|---|---|---|
| `POST /1.1/media/upload.json` | Media Metadata | $0.005 |
| `POST /2/tweets` | Content: Create | $0.005 |
| **Total** | | **$0.010** |

### Cost Per Cron Cycle (per monitored account, worst case)

| Scenario | Reads | Replies | X API Total |
|---|---|---|---|
| 0 new tweets | $0 | $0 | **$0** |
| 5 tweets, text-only replies | $0.025 | $0.025 | **$0.05** |
| 10 tweets, text-only replies | $0.05 | $0.05 | **$0.10** |
| 10 tweets, all with image replies | $0.05 | $0.10 | **$0.15** |

## Full Cost Breakdown Per Reply (All Services)

| Component | Cost | Source |
|---|---|---|
| GPT-4o-mini text generation | ~$0.0001-0.001 | `$0.15/1M input, $0.60/1M output` |
| DALL-E 3 image generation | $0.040 (if enabled) | `1024x1024 standard` |
| X API: post tweet | $0.005 | Content: Create |
| X API: media upload | $0.005 (if image) | Content: Create |
| **Total (text-only reply)** | **~$0.006** | |
| **Total (reply with image)** | **~$0.051** | |

DALL-E 3 image generation dominates the cost at $0.04/image — roughly 8x the X API cost for a reply with image.

## Other X API Calls (Non-Cron)

| Operation | Endpoint | Category | Cost | When |
|---|---|---|---|---|
| Lookup user by handle | `GET /2/users/by/username/{u}` | User: Read | $0.010/resource | Adding a monitored account |
| Fetch following list | `GET /2/users/{id}/following` | Following/Followers: Read | $0.010/resource | Importing following list |
| Publish scheduled post | `POST /2/tweets` | Content: Create | $0.005/request | Studio publish cron |
| Publish with image | upload + tweet | Media Metadata + Content: Create | $0.010 (2 requests) | Studio publish cron |

> **Warning**: Importing a following list is expensive — 1,000 followings = **$10.00** in API credits.

## Current Code Gap

`src/lib/engagement/cost-utils.ts` hardcodes `apiCost = 0` (line 32), which was accurate for the X Free tier but is incorrect under pay-by-use. This should be updated to reflect the $0.005 per Content: Create request.
