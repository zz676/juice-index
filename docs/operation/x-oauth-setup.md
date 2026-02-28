# X OAuth Setup Guide

Juice Index uses **two separate X (Twitter) developer apps** — one for login (Supabase auth) and one for posting (our OAuth2 PKCE flow). Getting the configuration wrong between these two apps is the most common source of X-related issues.

---

## Overview: Two X Apps

| | Login App | Posting App |
|---|---|---|
| **Purpose** | Supabase social login ("Sign in with X") | Publishing tweets from the dashboard |
| **Env var** | Configured inside Supabase dashboard | `X_OAUTH_CLIENT_ID` + `X_OAUTH_CLIENT_SECRET` in Vercel |
| **Callback URL** | `https://<project>.supabase.co/auth/v1/callback` | `https://juiceindex.io/api/x/callback` |
| **App type** | Any (Public or Confidential) | **Web App, Automated App or Bot (Confidential client)** |
| **Permissions** | Read | **Read and Write** |
| **Scopes used** | `tweet.read users.read` | `tweet.read tweet.write users.read offline.access` |

> `offline.access` (refresh tokens) is **only available to Confidential clients**. If the posting app is set to Public/Native, token refresh will silently fail and the user will be logged out after 2 hours.

---

## Step 1 — Create / Configure the Posting App

1. Go to [developer.x.com](https://developer.x.com) → your project → **+ Add App** (or use an existing app).
2. Under **App settings → User authentication settings**:
   - **App permissions**: `Read and Write`
   - **Type of App**: `Web App, Automated App or Bot`
   - **Callback URI / Redirect URL**:
     - `https://juiceindex.io/api/x/callback` (production)
     - `http://localhost:3000/api/x/callback` (local dev)
   - **Website URL**: `https://juiceindex.io`
3. Save. Copy the **OAuth 2.0 Client ID** and **Client Secret** from the **Keys and tokens** tab.

---

## Step 2 — Configure Vercel Environment Variables

In the Vercel project dashboard → **Settings → Environment Variables**, set:

| Variable | Value | Environment |
|---|---|---|
| `X_OAUTH_CLIENT_ID` | OAuth 2.0 Client ID from the posting app | Production + Preview |
| `X_OAUTH_CLIENT_SECRET` | Client Secret from the posting app | Production + Preview |
| `NEXT_PUBLIC_SITE_URL` | `https://juiceindex.io` | Production |
| `TOKEN_ENCRYPTION_KEY` | 64 hex chars (32 bytes) — generate once and never rotate | Production + Preview |

Generate `TOKEN_ENCRYPTION_KEY`:
```bash
openssl rand -hex 32
```

For local dev, copy these to `.env.local`.

---

## Step 3 — Configure the Login App in Supabase

1. In Supabase dashboard → **Authentication → Providers → X (Twitter)**.
2. Enter the **API Key** and **API Secret Key** (OAuth 1.0a) from the login app's **Keys and tokens** tab.
   - These are the *consumer* keys, not the OAuth 2.0 client ID/secret.
3. Callback URL shown by Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Add that URL to the **login app's** callback list in the X developer portal.

> **Do not** put the login app's keys in Vercel. They are only used by Supabase.
> **Do not** put the posting app's keys in Supabase. They are only used by our API routes.

---

## Step 4 — Verify the Flow Works

1. Log in to juiceindex.io with any method (not necessarily X).
2. Go to **Settings → Connected Accounts → X Posting → Enable Posting**.
3. You should be redirected to `x.com/i/oauth2/authorize?...` and see a consent screen.
4. After granting access you should land on `/dashboard/settings?x_connected=true`.

Check Vercel logs (Functions tab) for:
```
[X OAuth] Authorize — clientId: <id> redirectUri: https://juiceindex.io/api/x/callback
[X OAuth] Token exchange complete — accessToken: present (...), refreshToken: present (...)
[X OAuth] Profile fetched — username: <handle> xUserId: <id>
[X OAuth] XAccount upserted for user <uuid>
```

---

## Troubleshooting

### "Something went wrong" on X's authorization page

| Symptom | Likely cause | Fix |
|---|---|---|
| 400 from `/i/api/2/oauth2/authorize` | Wrong callback URL, wrong app type, or spend cap | See below |
| `SpendCapReached` in Vercel logs | X API billing cycle spend cap reached | Increase spend cap in X developer console or wait for reset (monthly) |
| 403 from X API calls | Permissions are Read-only, or spend cap | Change to Read + Write, or increase cap |
| Blank screen / no redirect | `X_OAUTH_CLIENT_ID` or `NEXT_PUBLIC_SITE_URL` misconfigured | Check Vercel env vars |

### Spend cap

X enforces a monthly spend cap on API access. When it is reached:
- **All** X API calls return 403 `SpendCapReached` — including OAuth token exchange.
- The error appears in Vercel logs as: `X API error (403) /users/by/username/...: SpendCapReached`.
- The cap resets at the start of each billing cycle.
- Fix: Go to X developer console → Billing → increase the spend cap, or wait for the monthly reset.

### Token expired / `tokenError: true`

When any X API call returns 401, the system sets `tokenError: true` on the XAccount record and shows an amber warning banner in the UI. The user must click **Reconnect** to re-authorize. This is a normal situation when the refresh token expires (typically after 6 months of inactivity) or when X revokes access.

### User can log in with X but can't enable posting

These use different apps. The login app only needs Supabase configured. The posting app needs `X_OAUTH_CLIENT_ID`/`X_OAUTH_CLIENT_SECRET` in Vercel. Verify both are set correctly.

### Reconnect flow

Users can always reconnect even if already connected — the callback upserts (overwrites) the existing tokens. The UI shows a **Reconnect** button at all times alongside **Disconnect**.

---

## Local Development

`.env.local` required keys:
```env
X_OAUTH_CLIENT_ID=...
X_OAUTH_CLIENT_SECRET=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
TOKEN_ENCRYPTION_KEY=<64 hex chars>
```

The posting app must have `http://localhost:3000/api/x/callback` in its callback list.

Supabase local dev: if using `supabase start`, the auth callback is `http://localhost:54321/auth/v1/callback` — add that to the login app.
