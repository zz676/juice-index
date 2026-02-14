# User Posts: Compose, Publish & Schedule to X

## Feature Summary

Users can compose, manage, and publish their own posts to X (Twitter) directly from the dashboard. Pro-tier users gain access to scheduling posts for future publication. This is separate from the automated `Post` pipeline — user-authored content lives in the `UserPost` model.

## Data Model

### UserPost (`juice_user_posts`)

| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Foreign key to User |
| content | String | Tweet text (max 280 chars, validated in API) |
| status | UserPostStatus | DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED |
| scheduledFor | DateTime? | Future publish time (PRO only); null = publish immediately |
| publishedAt | DateTime? | When the tweet was posted |
| tweetId | String? | X tweet ID |
| tweetUrl | String? | Direct link to the tweet |
| lastError | String? | Last error message for failed posts |
| attempts | Int | Number of publish attempts (max 3 before FAILED) |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Indexes:**
- `(userId, status)` — filter user's posts by status
- `(status, scheduledFor)` — cron job picks up due posts
- `(userId, createdAt DESC)` — default listing order

### UserPostStatus Enum

- **DRAFT** — saved but not queued
- **SCHEDULED** — queued for publishing (immediate or future)
- **PUBLISHING** — currently being posted (transient)
- **PUBLISHED** — successfully posted to X
- **FAILED** — publish failed after max retries

## API Endpoints

All endpoints require authentication via Supabase session cookie.

### `GET /api/dashboard/user-posts`

List the current user's posts with pagination and filtering.

**Query params:** `status?`, `search?`, `page?` (default 1), `limit?` (default 20, max 50)

**Response:** `{ posts, pagination: { page, limit, total, totalPages }, isPro }`

### `POST /api/dashboard/user-posts`

Create a new post.

**Body:** `{ content: string, action: "draft" | "publish" | "schedule", scheduledFor?: string }`

- `draft` — saves as DRAFT
- `publish` — sets status to SCHEDULED with `scheduledFor: null` (cron picks up immediately)
- `schedule` — PRO only, sets SCHEDULED with future `scheduledFor`

### `GET /api/dashboard/user-posts/[id]`

Fetch a single post (must belong to current user).

### `PATCH /api/dashboard/user-posts/[id]`

Update a DRAFT or FAILED post. Same body format as POST.

### `DELETE /api/dashboard/user-posts/[id]`

Delete a post. Only DRAFT, SCHEDULED, or FAILED posts can be deleted. PUBLISHED and PUBLISHING posts are protected.

### `POST /api/dashboard/user-posts/[id]/cancel`

Cancel a SCHEDULED post, reverting it to DRAFT and clearing `scheduledFor`.

## Cron: Publish User Posts

**Endpoint:** `POST /api/cron/publish-user-posts`

**Auth:** `Authorization: Bearer <CRON_SECRET>`

**Behavior:**
1. Fetches up to 10 posts with `status=SCHEDULED` and `scheduledFor <= now` (or `scheduledFor IS NULL` for immediate)
2. For each post:
   - Sets status to PUBLISHING, increments attempts
   - Loads the user's XAccount
   - Refreshes the OAuth token if expired
   - Calls the X API v2 to create a tweet
   - On success: PUBLISHED + stores tweetId/tweetUrl/publishedAt
   - On failure with attempts < 3: back to SCHEDULED for retry
   - On failure with attempts >= 3: FAILED + stores lastError

## X API Integration

### `src/lib/x/post-tweet.ts`

Posts a tweet via `POST https://api.x.com/2/tweets` with bearer token auth.

### `src/lib/x/refresh-token.ts`

Refreshes an expired OAuth 2.0 token via `POST https://api.x.com/2/oauth2/token` with client credentials. Updates the XAccount record in the database.

**Required env vars:** `X_CLIENT_ID`, `X_CLIENT_SECRET`

## UI Components

### Posts Page (`/dashboard/posts`)

- **Compose Panel** — collapsible card with textarea (280-char counter), Save Draft / Post Now / Schedule buttons
- **PRO gating** — Schedule button disabled with "PRO" badge for free users; date/time pickers shown for PRO users
- **Status Tabs** — All, Draft, Scheduled, Published, Failed (each with count)
- **Posts Table** — Content, Status, Date, Actions columns with context-appropriate actions per status
- **Pagination** — Standard prev/next with page numbers

### Compact Post Widget (Dashboard)

- Shows latest 8 user posts from `/api/dashboard/user-posts?limit=8`
- Status tabs: All, Scheduled, Published, Draft, Failed
- Quick actions: cancel (scheduled), delete (draft/failed), view on X (published)
- Links to full posts page

### StatusBadge

Extended with styles for: DRAFT (slate), SCHEDULED (purple), PUBLISHING (blue), FAILED (red).

## Auth Guard

`src/lib/auth/require-user.ts` provides a reusable `requireUser()` function that:
- Creates a Supabase server client
- Checks for authenticated user
- Returns `{ user, error }` where error is a 401 NextResponse if unauthenticated

## File Map

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | UserPost model + UserPostStatus enum |
| `src/lib/auth/require-user.ts` | Auth guard utility |
| `src/lib/x/post-tweet.ts` | X API tweet creation |
| `src/lib/x/refresh-token.ts` | X OAuth token refresh |
| `src/app/api/dashboard/user-posts/route.ts` | GET (list) + POST (create) |
| `src/app/api/dashboard/user-posts/[id]/route.ts` | GET + PATCH + DELETE |
| `src/app/api/dashboard/user-posts/[id]/cancel/route.ts` | POST cancel |
| `src/app/api/cron/publish-user-posts/route.ts` | Cron publisher |
| `src/components/dashboard/StatusBadge.tsx` | Status badge styles |
| `src/components/dashboard/CompactPostTable.tsx` | Dashboard widget |
| `src/app/dashboard/posts/page.tsx` | Full posts page |
