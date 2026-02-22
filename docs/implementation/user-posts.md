# User Posts: Compose, Publish & Schedule to X

## Feature Summary

Users can compose, manage, and publish their own posts to X (Twitter) directly from the dashboard. Starter-tier and above users can publish and schedule posts. This is separate from the automated `Post` pipeline — user-authored content lives in the `UserPost` model.

## Data Model

### UserPost (`juice_user_posts`)

| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Foreign key to User |
| content | String | Tweet text (dynamic char limit: 280 for free X accounts, 25,000 for X Premium; validated in API) |
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

**Response:** `{ posts, pagination: { page, limit, total, totalPages }, isPro, charLimit }`

### `POST /api/dashboard/user-posts`

Create a new post.

**Body:** `{ content: string, action: "draft" | "publish" | "schedule", scheduledFor?: string }`

- `draft` — saves as DRAFT
- `publish` — publishes to X synchronously (refreshes token, calls X API, returns PUBLISHED post); enforces weekly publish quota (returns 429 if exceeded); returns 400 if no X account connected, 502 on X API failure
- `schedule` — STARTER+ only, sets SCHEDULED with future `scheduledFor`

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

**Trigger:** Vercel Cron via `vercel.json` (every minute). See `vercel.json` at project root.

**Behavior:**
1. Fetches up to 10 posts with `status=SCHEDULED` and `scheduledFor <= now` (only future-scheduled posts; "Publish Now" is handled synchronously in the POST/PATCH handlers)
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

- **Compose Panel** — collapsible card with textarea (dynamic char counter based on X Premium status), Save Draft / Post Now / Schedule buttons
- **Tier gating** — Schedule button disabled for free users; date/time pickers shown for STARTER+ users
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

### `GET /api/dashboard/studio/publish-info`

Lightweight preflight endpoint called on Studio page mount (to enable early X account pre-check) and again when the publish modal opens (to refresh quota data). Returns tier, X account status, and weekly publish quota usage.

**Response:** `{ tier, canPublish, hasXAccount, xUsername, xDisplayName, xAvatarUrl, isXPremium, charLimit, publishUsed, publishLimit, publishReset }`

## Weekly Publish Quota

Publishing to X is rate-limited per week (ISO week, resets Monday UTC):

| Tier | Weekly Publishes |
|------|-----------------|
| FREE | 0 (disabled) |
| STARTER | 1 |
| PRO | 10 |
| ENTERPRISE | Unlimited |

Enforced in `POST /api/dashboard/user-posts` (action=publish). Returns 429 if quota exceeded. The quota counter uses Upstash Redis with key pattern `publish:{userId}:{isoWeek}`.

## Studio Publish Modal

The Studio page (`/dashboard/studio`) includes a publish confirmation modal that:

1. Shows X account connection status (green if connected, yellow warning if not) with "Premium" badge if X Premium is enabled
2. Displays weekly publish quota as a progress bar
3. Previews the post content with dynamic character count (280 or 25,000 based on X Premium status), color-coded warnings
4. Offers an "Attach chart image" toggle when a chart image exists
5. Disables the Confirm button if: no X account, quota exhausted, over character limit, or FREE tier

### X Account Pre-check

The publish info endpoint is fetched on page mount so that `hasXAccount` is available early. When the user clicks the Publish button, if `hasXAccount` is `false`, a toast ("X account not connected. Connect in Settings to publish.") is shown and the modal does not open. This avoids the user entering the publish flow only to discover they can't publish.

### Save Draft on Cancel

When the user dismisses the publish modal (via Cancel button, close X, or backdrop click), an inline confirmation prompt replaces the action bar with three options:

- **Don't Save** — closes the modal without saving
- **Save Draft** — saves the current post draft via `POST /api/dashboard/user-posts` with `action: "draft"`, shows a success/error toast, then closes the modal
- **Go Back** — dismisses the prompt and returns to the normal modal view

The prompt state resets automatically when the modal closes.

For FREE tier users, the Publish button renders as disabled with a lock icon and shows an upgrade toast on click.

## X Premium & Dynamic Character Limits

The system supports both X free accounts (280 char limit) and X Premium accounts (25,000 char limit). The `isXPremium` boolean flag on the `XAccount` model determines which limit applies.

### How It Works

1. **Settings Toggle**: Users enable/disable X Premium via a toggle switch in Settings > Connected Accounts. This calls the `toggleXPremium` server action which flips `XAccount.isXPremium`.

2. **Backend Validation**: The `POST` and `PATCH` handlers for `/api/dashboard/user-posts` fetch the user's `XAccount.isXPremium` and validate content length against `getXCharLimit(isXPremium)` from `src/lib/x/char-limits.ts`.

3. **Frontend Display**: The character limit flows to the frontend via:
   - `GET /api/dashboard/user-posts` returns `charLimit` (used on Posts page)
   - `GET /api/dashboard/studio/publish-info` returns `charLimit` and `isXPremium` (used in Studio)

4. **AI Draft Generation**: The LLM prompt in `buildPrompt()` includes `"Your response MUST be under ${charLimit} characters."` so generated drafts respect the user's limit.

5. **Editable Drafts**: The Studio page renders the AI-generated draft in an editable `<textarea>` (not a read-only div), allowing users to trim or modify content before publishing.

### Key Files

| File | Role |
|------|------|
| `src/lib/x/char-limits.ts` | `X_FREE_CHAR_LIMIT` (280), `X_PREMIUM_CHAR_LIMIT` (25,000), `getXCharLimit()` |
| `src/app/dashboard/settings/actions.ts` | `toggleXPremium` server action |
| `src/app/dashboard/settings/connected-accounts.tsx` | X Premium toggle UI |

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
| `src/lib/x/char-limits.ts` | X character limit constants and helper |
| `src/lib/x/post-tweet.ts` | X API tweet creation |
| `src/lib/x/refresh-token.ts` | X OAuth token refresh |
| `src/app/api/dashboard/user-posts/route.ts` | GET (list) + POST (create) |
| `src/app/api/dashboard/user-posts/[id]/route.ts` | GET + PATCH + DELETE |
| `src/app/api/dashboard/user-posts/[id]/cancel/route.ts` | POST cancel |
| `src/app/api/dashboard/studio/publish-info/route.ts` | Publish preflight info |
| `src/app/api/cron/publish-user-posts/route.ts` | Cron publisher |
| `src/components/dashboard/StatusBadge.tsx` | Status badge styles |
| `src/components/dashboard/CompactPostTable.tsx` | Dashboard widget |
| `src/app/dashboard/studio/publish-modal.tsx` | Studio publish confirmation modal |
| `src/app/dashboard/posts/page.tsx` | Full posts page |
