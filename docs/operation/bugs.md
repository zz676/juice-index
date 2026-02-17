# Operational Bugs & Fixes

## X Media Upload — 403 Forbidden (Empty Body)

**Symptom**: Publishing a post with an attached chart image fails with `X Media Upload error (403):` (empty response body). Text-only posts work fine.

**Root cause**: The `upload.twitter.com` v1.1 media upload endpoint does **not** accept OAuth 2.0 Bearer tokens. It rejects them at the gateway level with an empty 403 — the request never reaches the API. This applies to both the simple upload and the chunked upload (INIT/APPEND/FINALIZE) on that domain. The `api.x.com` domain does not host the media upload endpoint (returns 404).

**Fix**: Switched media upload to use **OAuth 1.0a signing** with the app-level credentials (`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`) instead of the user's OAuth 2.0 Bearer token. The upload uses `multipart/form-data` so that body params are excluded from the OAuth signature (avoids signature mismatches).

The user's OAuth 2.0 token is still used for the tweet creation (`api.x.com/2/tweets`), which references the `media_id` returned by the upload.

**File**: `src/lib/x/upload-media.ts`

---

## X Media Upload — 401 Code 89 (Invalid or Expired Token)

**Symptom**: Media upload fails with `{"errors":[{"message":"Invalid or expired token","code":89}]}`.

**Root cause**: The OAuth 1.0a credentials (`X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`) stored in `.env.local` were invalidated after the X developer app was reconfigured (e.g., credentials regenerated, permissions changed).

**Fix**: Regenerate all credentials in the X Developer Portal (Keys and tokens section) and update `.env.local`:
- `X_API_KEY` / `X_API_SECRET`
- `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET`
- `X_BEARER_TOKEN`

---

## X Media Upload — 401 Code 32 (Could Not Authenticate You)

**Symptom**: Media upload fails with `{"errors":[{"message":"Could not authenticate you","code":32}]}`. Tokens are valid (code 89 is not returned).

**Root cause**: OAuth 1.0a signature mismatch. When using `application/x-www-form-urlencoded`, body params must be included in the OAuth signature base string — but the media upload endpoint has undocumented rules about which params to include (e.g., `media_data` is excluded, but `media_category` inclusion is ambiguous).

**Fix**: Switched to `multipart/form-data` for the upload request. With multipart, body params are **never** included in the OAuth signature per the OAuth 1.0a spec, eliminating the ambiguity entirely. The OAuth signature only contains the `oauth_*` parameters.

**File**: `src/lib/x/upload-media.ts`

---

## X Token Refresh — 400 "Value Passed for Token Was Invalid"

**Symptom**: Publishing fails with `Token refresh failed (400): {"error":"invalid_request","error_description":"Value passed for the token was invalid."}`. Affects all users.

**Root cause**: The user's OAuth 2.0 refresh token (stored encrypted in the `XAccount` DB record) was invalidated because the X developer app credentials were changed. X invalidates all existing tokens when app credentials are regenerated.

**Fix (immediate)**: User must disconnect and reconnect their X posting account in Settings to obtain fresh tokens.

**Fix (UX improvement)**: Added `XTokenExpiredError` class in `src/lib/x/refresh-token.ts`. When the refresh token is invalid, the API now returns a clear 401 with message "Your X connection has expired. Please reconnect your X account in Settings." instead of a generic 502. For cron-scheduled posts, the post is marked FAILED immediately (no retries) with an actionable error message.

**Files**: `src/lib/x/refresh-token.ts`, `src/app/api/dashboard/user-posts/route.ts`, `src/app/api/dashboard/user-posts/[id]/route.ts`, `src/app/api/cron/publish-user-posts/route.ts`

---

## Supabase X Login — "Unable to Exchange External Code"

**Symptom**: After authorizing on X, the user is redirected to `/login?error=auth` with error description `Unable to exchange external code`.

**Root cause**: Supabase's server-side token exchange with X fails because the X app's Client Secret configured in the Supabase dashboard does not match the one in the X Developer Portal (typically after credentials were regenerated).

**Fix**: In the X Developer Portal, verify the Client ID and Client Secret match what's configured in Supabase Dashboard > Authentication > Providers > Twitter. Also verify `https://<project-ref>.supabase.co/auth/v1/callback` is listed as a redirect URI in the X app settings.

---

## Token Lifecycle Reference

| Token | Lifetime | Auto-refresh | Invalidation triggers |
|-------|----------|-------------|----------------------|
| OAuth 2.0 Access Token | 2 hours | Yes (via refresh token in `refreshTokenIfNeeded`) | Refresh token rotation, app credential change |
| OAuth 2.0 Refresh Token | ~6 months | Rotated on each refresh (new token saved to DB) | App credential change, user revokes access |
| OAuth 1.0a App Tokens | Permanent | N/A (static env vars) | Manual regeneration in X Developer Portal |

---

## Dashboard "Upgrade to Pro" Banner Shown to Pro Users

**Symptom**: After logging in as a Pro subscriber, the dashboard overview page still displays the banner: "Data shown is delayed by 30 days and limited to 1 year of history. Upgrade to Pro for real-time data and 5 years of history."

**Root cause**: The dashboard page (`src/app/dashboard/page.tsx`) was fetching the user's tier from `/api/dashboard/user-posts?limit=1`. That endpoint calls `normalizeTier(subscription?.tier)` on the raw subscription tier column **without checking whether the subscription status is `active` or `trialing`**. The dedicated `/api/dashboard/tier` endpoint has the proper status check (only returns the real tier if the subscription is active/trialing, otherwise defaults to `"FREE"`).

The dashboard layout sidebar already used the correct `/api/dashboard/tier` endpoint — only the page-level tier state was wrong.

**Fix**: Switched the dashboard page to fetch tier from `/api/dashboard/tier` instead of deriving it from the user-posts response. The `tier === "FREE"` condition on the banner now evaluates correctly for paid users.

**File**: `src/app/dashboard/page.tsx` (lines 44-55)

**PR**: #102

---

## Prisma Client Missing `isXPremium` Field — 500 on publish-info

**Symptom**: The `/api/dashboard/studio/publish-info` endpoint returns a 500 error with `PrismaClientValidationError: Unknown field 'isXPremium' for select statement on model 'XAccount'`.

**Root cause**: The `isXPremium` field was added to the `XAccount` model in `prisma/schema.prisma` (line 572) but `npx prisma generate` was not run afterward. The generated Prisma client in `node_modules/.prisma/client` did not include the new field, so any query selecting it failed at validation time.

**Fix**: Run `npx prisma generate` to regenerate the client, then restart the dev server. No code changes needed — this is a local environment sync issue.

**Prevention**: After any `schema.prisma` change, always run `npx prisma generate` before testing. If using `prisma db push` or `prisma migrate`, the client is regenerated automatically.
