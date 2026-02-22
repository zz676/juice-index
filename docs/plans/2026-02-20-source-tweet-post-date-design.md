# Design: Source Tweet Publish Date Column

**Date:** 2026-02-20

## Summary

Add a "Post Date" column to the replies monitoring table that shows when the source tweet was originally published on X, rather than when the reply was processed.

## Problem

The existing "Date" column shows `EngagementReply.createdAt` — the timestamp when the system created the reply record. This reflects when the tweet was *detected and processed*, not when the post was *published*. Users want to know the age of the post they're replying to.

## Decision

- Add `sourceTweetCreatedAt DateTime?` to the `EngagementReply` schema.
- Fetch `created_at` from the X API when polling tweets.
- Store it on the reply record.
- Expose it through the user replies API.
- Add a "Post Date" column to the table (keep existing "Date" column).
- Existing records show "—" for Post Date (no backfill possible).

## Scope of Changes

| Layer | File | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | Add `sourceTweetCreatedAt DateTime?` field |
| Types | `src/lib/engagement/types.ts` | Add `createdAt?: string` to `FetchedTweet` |
| X API | `src/lib/engagement/fetch-tweets.ts` | Request `created_at` tweet field, include in response |
| Poll | `src/app/api/cron/engagement-poll/route.ts` | Pass `sourceTweetCreatedAt` when creating reply records |
| API | `src/app/api/dashboard/engagement/replies/route.ts` | Include `sourceTweetCreatedAt` in select |
| Table | `src/app/dashboard/engagement/reply-monitoring-table.tsx` | Add field to `ReplyRow`, add "Post Date" column |
