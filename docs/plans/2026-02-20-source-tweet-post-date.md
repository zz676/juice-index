# Source Tweet Post Date Column Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Post Date" column to the replies monitoring table showing when the source tweet was published on X.

**Architecture:** Add `sourceTweetCreatedAt` to the Prisma schema, fetch `created_at` from the X API, store it on creation, expose it via the replies API, and render a new column in the table. The existing "Date" column (reply processed time) is kept unchanged.

**Tech Stack:** Prisma (schema + migration), TypeScript, Next.js API routes, React table component.

---

### Task 1: Add `sourceTweetCreatedAt` to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the field**

In `prisma/schema.prisma`, find the `EngagementReply` model and add after `sourceTweetUrl`:

```prisma
sourceTweetCreatedAt DateTime?
```

**Step 2: Generate and apply migration**

```bash
npx prisma migrate dev --name add-source-tweet-created-at
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

**Step 3: Verify TypeScript types updated**

```bash
npx tsc --noEmit
```

Expected: no errors (new optional field doesn't break existing code).

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add sourceTweetCreatedAt field to EngagementReply"
```

---

### Task 2: Update `FetchedTweet` type and X API fetch

**Files:**
- Modify: `src/lib/engagement/types.ts`
- Modify: `src/lib/engagement/fetch-tweets.ts`

**Step 1: Add `createdAt` to `FetchedTweet`**

In `src/lib/engagement/types.ts`, update `FetchedTweet`:

```typescript
export interface FetchedTweet {
  id: string;
  text: string;
  url: string;
  quotedTweetText?: string;
  createdAt?: string; // ISO 8601 from X API created_at field
}
```

**Step 2: Update `XTweetsResponse` to include `created_at`**

In `src/lib/engagement/fetch-tweets.ts`, update the `XTweetsResponse` data array type (line 17):

```typescript
interface XTweetsResponse {
  data?: Array<{
    id: string;
    text: string;
    created_at?: string;
    referenced_tweets?: Array<{ type: string; id: string }>;
  }>;
  includes?: { tweets?: Array<{ id: string; text: string }> };
  meta?: { newest_id?: string };
}
```

**Step 3: Add `created_at` to the tweet fields requested**

In `fetchRecentTweets`, update the `tweet.fields` param (line 58):

```typescript
"tweet.fields": "id,text,referenced_tweets,created_at",
```

**Step 4: Include `createdAt` in the returned `FetchedTweet`**

In the `data.data.map` callback (around line 82), add `createdAt`:

```typescript
return {
  id: t.id,
  text: t.text,
  url: `https://x.com/i/web/status/${t.id}`,
  ...(quotedTweetText !== undefined && { quotedTweetText }),
  ...(t.created_at !== undefined && { createdAt: t.created_at }),
};
```

**Step 5: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 6: Commit**

```bash
git add src/lib/engagement/types.ts src/lib/engagement/fetch-tweets.ts
git commit -m "feat: fetch and expose created_at from X API for source tweets"
```

---

### Task 3: Store `sourceTweetCreatedAt` in the engagement poll

**Files:**
- Modify: `src/app/api/cron/engagement-poll/route.ts`

There are **three** `prisma.engagementReply.create` calls to update. Add `sourceTweetCreatedAt: tweet.createdAt ? new Date(tweet.createdAt) : null` to each.

**Step 1: Update the first `create` (quota-exhausted SKIPPED, ~line 293)**

Find:
```typescript
await prisma.engagementReply.create({
  data: {
    userId,
    monitoredAccountId: account.id,
    sourceTweetId: tweet.id,
    sourceTweetText: formatTweetWithQuote(tweet.text, tweet.quotedTweetText),
    sourceTweetUrl: tweet.url,
    tone: account.tone,
    status: EngagementReplyStatus.SKIPPED,
    lastError: "Daily reply quota exhausted",
    attempts: 0,
  },
});
```

Replace with (add `sourceTweetCreatedAt`):
```typescript
await prisma.engagementReply.create({
  data: {
    userId,
    monitoredAccountId: account.id,
    sourceTweetId: tweet.id,
    sourceTweetText: formatTweetWithQuote(tweet.text, tweet.quotedTweetText),
    sourceTweetUrl: tweet.url,
    sourceTweetCreatedAt: tweet.createdAt ? new Date(tweet.createdAt) : null,
    tone: account.tone,
    status: EngagementReplyStatus.SKIPPED,
    lastError: "Daily reply quota exhausted",
    attempts: 0,
  },
});
```

**Step 2: Update the second `create` (mid-loop SKIPPED, ~line 318)**

Same pattern — there's a second identical SKIPPED create for when quota is first detected. Apply the same addition:
```typescript
sourceTweetCreatedAt: tweet.createdAt ? new Date(tweet.createdAt) : null,
```

**Step 3: Update the third `create` (PENDING record, ~line 338)**

Find:
```typescript
const replyRecord = await prisma.engagementReply.create({
  data: {
    userId,
    monitoredAccountId: account.id,
    sourceTweetId: tweet.id,
    sourceTweetText: formatTweetWithQuote(tweet.text, tweet.quotedTweetText),
    sourceTweetUrl: tweet.url,
    tone: account.tone,
    status: EngagementReplyStatus.PENDING,
    attempts: 1,
  },
});
```

Replace with:
```typescript
const replyRecord = await prisma.engagementReply.create({
  data: {
    userId,
    monitoredAccountId: account.id,
    sourceTweetId: tweet.id,
    sourceTweetText: formatTweetWithQuote(tweet.text, tweet.quotedTweetText),
    sourceTweetUrl: tweet.url,
    sourceTweetCreatedAt: tweet.createdAt ? new Date(tweet.createdAt) : null,
    tone: account.tone,
    status: EngagementReplyStatus.PENDING,
    attempts: 1,
  },
});
```

**Step 4: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add src/app/api/cron/engagement-poll/route.ts
git commit -m "feat: store sourceTweetCreatedAt when creating engagement reply records"
```

---

### Task 4: Expose `sourceTweetCreatedAt` in the user replies API

**Files:**
- Modify: `src/app/api/dashboard/engagement/replies/route.ts`

**Step 1: Add field to select clause**

In the `prisma.engagementReply.findMany` select (around line 45), add after `createdAt: true`:

```typescript
sourceTweetCreatedAt: true,
```

**Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/api/dashboard/engagement/replies/route.ts
git commit -m "feat: include sourceTweetCreatedAt in replies API response"
```

---

### Task 5: Add "Post Date" column to the replies table

**Files:**
- Modify: `src/app/dashboard/engagement/reply-monitoring-table.tsx`

**Step 1: Add `sourceTweetCreatedAt` to `ReplyRow` interface**

Find the `ReplyRow` interface (line 8) and add after `createdAt: string;`:

```typescript
sourceTweetCreatedAt: string | null;
```

**Step 2: Add "Post Date" column header**

In the `<thead>` section, after the existing "Date" `<th>` (around line 308), add:

```tsx
<th className="px-4 py-3 text-left text-xs font-semibold text-slate-custom-500">
  Post Date
</th>
```

**Step 3: Add "Post Date" cell in each row**

In the `<tbody>` rows, after the existing "Date" `<td>` (around line 400), add:

```tsx
<td className="px-4 py-3">
  <span className="text-xs text-slate-custom-500">
    {reply.sourceTweetCreatedAt
      ? new Date(reply.sourceTweetCreatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—"}
  </span>
</td>
```

**Step 4: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: clean build with no type errors.

**Step 5: Commit**

```bash
git add src/app/dashboard/engagement/reply-monitoring-table.tsx
git commit -m "feat: add Post Date column showing source tweet publish date"
```

---

### Task 6: Update docs and open PR

**Step 1: Update the docs**

The design doc at `docs/plans/2026-02-20-source-tweet-post-date-design.md` already covers the context. Update `docs/` if there is a broader engagement feature doc.

**Step 2: Create PR**

Use the `linkedin-dev-workflow:submit` skill or run:

```bash
gh pr create \
  --title "feat: add Post Date column showing source tweet publish date" \
  --body "$(cat <<'EOF'
## What
Adds a \"Post Date\" column to the replies monitoring table showing when the source tweet was originally published on X. See [docs/plans/2026-02-20-source-tweet-post-date-design.md](docs/plans/2026-02-20-source-tweet-post-date-design.md).

## Why
The existing \"Date\" column shows when the reply was processed by our system. Users want to know when the original post was published to understand the age/context of the tweet they replied to.

## Changes
- `prisma/schema.prisma`: Add `sourceTweetCreatedAt DateTime?` to `EngagementReply` model
- `src/lib/engagement/types.ts`: Add `createdAt?: string` to `FetchedTweet` interface
- `src/lib/engagement/fetch-tweets.ts`: Request `created_at` tweet field from X API, include in returned tweets
- `src/app/api/cron/engagement-poll/route.ts`: Store `sourceTweetCreatedAt` on all three reply create calls
- `src/app/api/dashboard/engagement/replies/route.ts`: Include `sourceTweetCreatedAt` in select
- `src/app/dashboard/engagement/reply-monitoring-table.tsx`: Add `sourceTweetCreatedAt` to `ReplyRow`, add "Post Date" column

## Testing
- `npx tsc --noEmit` passes cleanly
- `npm run build` succeeds
- Existing records show "—" in Post Date column (no backfill)
- New records populated via engagement poll will show the tweet's publish time
EOF
)"
```
