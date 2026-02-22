# Quoted Tweet Context Expansion

## Overview

When a monitored account posts a quote tweet (e.g. quoting another post and writing "True"), the
X API previously returned only the quoting user's short text. The AI had no visibility into the
original post being quoted and produced low-quality, context-free replies.

This feature fetches the referenced tweet's text as part of the same API request and threads it
through the reply generation pipeline, giving the AI full context before writing a response.

---

## Problem

Quote tweets like:

> "True"
> "Exactly this"
> "100%"

...are meaningless without the original post. The engagement cron was passing only those one-word
phrases to `generateReply()`, producing replies that didn't reference anything substantive.

---

## Solution

The X API supports an `expansions=referenced_tweets.id` parameter that returns the full text of
any referenced tweets in an `includes.tweets` array alongside the main timeline response. This
costs no additional API calls.

---

## Data Flow

```
X API response
  └── data[].referenced_tweets[]  →  find type="quoted"
  └── includes.tweets[]           →  lookup by id → quotedTweetText

FetchedTweet
  ├── id, text, url
  └── quotedTweetText?            →  optional, only set for quote tweets

engagement-poll cron
  ├── sourceTweetText (DB)        =  formatTweetWithQuote(text, quotedTweetText)
  │                                  → "Tweet text\n\n[Quoting: quoted text]"
  ├── generateReply(text, ..., quotedTweetText)
  │     └── AI prompt appends:
  │           This tweet is quoting another post that says:
  │           "<quoted text>"
  └── generateImage(formatTweetWithQuote(...), replyText)
```

---

## AI Prompt Change

Before:

```
Tweet to reply to:
"True"
```

After (for a quote tweet):

```
Tweet to reply to:
"True"

This tweet is quoting another post that says:
"Tesla just hit 2 million vehicles delivered this quarter"
```

---

## DB Storage

`sourceTweetText` in `juice_engagement_replies` stores the combined text:

```
True

[Quoting: Tesla just hit 2 million vehicles delivered this quarter]
```

The UI tooltip that displays `sourceTweetText` naturally shows the full context. No schema
migration was needed — the combined text fits in the existing column.

---

## Edge Cases

| Situation | Behavior |
|---|---|
| Non-quote tweet | `referenced_tweets` absent → `quotedTweetText` undefined → identical to previous behavior |
| Quoted tweet deleted | Not included in `includes.tweets` → lookup returns `undefined` → graceful degradation |
| Retweet of a quote tweet | Already excluded by `exclude=retweets,replies` at fetch time |
| Retry path | Uses `reply.sourceTweetText` from DB (already contains `[Quoting: ...]`) — no change needed |

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/engagement/types.ts` | Added `quotedTweetText?: string` to `FetchedTweet` |
| `src/lib/engagement/fetch-tweets.ts` | Updated `XTweetsResponse` to include `referenced_tweets` and `includes.tweets`; added `expansions` param; builds lookup map and resolves quoted text per tweet |
| `src/lib/engagement/generate-reply.ts` | Added `quotedTweetText` param to `generateReply()` and `buildReplyPrompt()`; appends quoted context block to AI prompt when present |
| `src/app/api/cron/engagement-poll/route.ts` | Added `formatTweetWithQuote()` helper; updated 3 DB write paths (2x SKIPPED, 1x PENDING) to use combined text; passed `quotedTweetText` to `generateReply()` and combined text to `generateImage()` |
| `docs/operation/engagement-center.md` | Added "Quote Tweet Context Expansion" section with behavior description and edge cases |

---

## PR

[#122 feat: expand quoted tweet context for engagement replies](https://github.com/zz676/juice-index/pull/122)
