# X Posting OAuth Flow

## Overview

Users with a **Starter** or higher subscription can connect their own X (Twitter) account to publish posts directly from their Juice Index dashboard. This uses the X OAuth 2.0 PKCE flow, separate from the Supabase login OAuth, to obtain `tweet.write`-scoped tokens.

## Architecture

### Account Sync (`juice_accounts`)

When a user logs in via OAuth (Google/X/GitHub), the `syncAccounts()` helper in `src/lib/auth/sync-accounts.ts` maps Supabase identity provider strings (both `"twitter"` and `"x"`) to `AuthProvider.X` and upserts records in the `juice_accounts` table. This is called from both:

- `src/app/auth/callback/route.ts` (OAuth callback)
- `src/lib/auth/sync-user.ts` (`syncUserToPrisma()` for the `/api/auth/sync` route)

### X OAuth 2.0 PKCE Flow

The posting flow is entirely separate from login:

1. **`GET /api/x/authorize`** — Checks tier quota, generates PKCE challenge, stores `{state, codeVerifier}` in an HttpOnly cookie, redirects to X authorization URL.

2. **`GET /api/x/callback`** — Validates state, exchanges authorization code for tokens, fetches X user profile, upserts `XAccount` record, redirects to Settings.

3. **`POST /api/x/disconnect`** — Deletes the user's `XAccount` record.

### Token Refresh

`src/lib/x/refresh-token.ts` handles automatic token refresh before expiry. Uses the `X_OAUTH_CLIENT_ID` and `X_OAUTH_CLIENT_SECRET` environment variables.

## Tier Gating

| Tier       | X Accounts Allowed |
|------------|--------------------|
| FREE       | 0                  |
| STARTER    | 1                  |
| PRO        | 1                  |
| ENTERPRISE | 5                  |

FREE users see a disabled "Connect X for Posting" button with an upgrade prompt.

## X-Login User Nudge

Users who signed in with X (Twitter) as their login provider already have an `AuthProvider.X` record in `juice_accounts`, but this does **not** grant posting ability — posting requires a separate OAuth flow with `tweet.write` scope. To help these users discover the posting feature, targeted nudges appear in two places:

### Posts page (`/dashboard/posts`)

- **X-login users (Starter+, no XAccount)**: A **blue info banner** reads "You signed in with X — connect it for posting" with a link to Settings.
- **Non-X-login users (Starter+, no XAccount)**: The existing **yellow warning banner** ("No X account connected") is shown unchanged.

### Settings page (`/dashboard/settings`)

In the "X Posting Account" card, when a user has an eligible tier but no connected XAccount:
- If the user signed in with X, an additional line appears above the connect button: "You're already signed in with X — connect it for posting in one click."
- If the user signed in with another provider, the default text is shown.

### How it works

- **API**: `GET /api/dashboard/user-posts` queries `juice_accounts` for an `AuthProvider.X` record for the current user and returns `hasXLoginIdentity: boolean` alongside `hasXAccount`.
- **Settings page**: The server component checks `authUser.identities` for a `"twitter"` or `"x"` provider and passes `hasXLoginIdentity` as a prop to `<XPostingAccount>`.

## Error Visibility

"Publish Now" posts are published synchronously — the API calls the X API directly and returns success or failure immediately. Scheduled posts (with a future `scheduledFor`) are published by the cron job. In both cases, errors are surfaced as follows:

- **Studio page**: On synchronous publish success, the toast reads "Post published to X!". On failure, the error message from the X API is shown directly in the toast.
- **Posts page (`/dashboard/posts`)**: FAILED posts show `lastError` inline below the status badge — no need to expand the row.
- **CompactPostTable**: FAILED posts show `lastError` inline below the post content/date.

## Environment Variables

Required in `.env.local`:

- `X_OAUTH_CLIENT_ID` — X OAuth 2.0 Client ID
- `X_OAUTH_CLIENT_SECRET` — X OAuth 2.0 Client Secret
- `NEXT_PUBLIC_SITE_URL` — Base URL for OAuth redirect URI construction

## Database Tables

- **`juice_accounts`** — Stores OAuth provider accounts (login identities)
- **`juice_x_accounts`** — Stores X posting credentials (access/refresh tokens, profile)

## UI Components

- **`src/app/dashboard/settings/x-posting-account.tsx`** — Client component showing connected X account or connect/upgrade prompt
- **`src/app/dashboard/settings/page.tsx`** — Server page with "X Posting Account" section
- **`src/app/dashboard/posts/page.tsx`** — Warning banner when user is PRO+ but has no X account connected

## Files Changed

| File | Change |
|------|--------|
| `src/lib/auth/sync-accounts.ts` | New — syncs OAuth identities to `juice_accounts` |
| `src/lib/x/oauth.ts` | New — X OAuth 2.0 PKCE utilities |
| `src/app/api/x/authorize/route.ts` | New — initiates X OAuth flow |
| `src/app/api/x/callback/route.ts` | New — handles X OAuth callback |
| `src/app/api/x/disconnect/route.ts` | New — disconnects X account |
| `src/app/dashboard/settings/x-posting-account.tsx` | New — X posting account UI component |
| `src/app/auth/callback/route.ts` | Modified — calls `syncAccounts()` |
| `src/lib/auth/sync-user.ts` | Modified — calls `syncAccounts()` |
| `src/lib/x/refresh-token.ts` | Modified — fixed env var names |
| `src/app/dashboard/settings/page.tsx` | Modified — added X Posting Account section |
| `src/app/api/dashboard/user-posts/route.ts` | Modified — added `hasXAccount` to response |
| `src/app/dashboard/posts/page.tsx` | Modified — added X account warning banner |
