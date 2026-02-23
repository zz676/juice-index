# Security Hardening

Pre-production security improvements applied to the Juice Index platform.

## Changes Summary

### CRITICAL — Security Headers & CORS (middleware.ts)

All responses now include:
- `Strict-Transport-Security` (HSTS with preload)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` restricting script/style/connect sources
- `Permissions-Policy` disabling camera, microphone, geolocation

CORS policy:
- **Public API** (`/api/v1/*`): `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: false` (bearer-token only, no cookies)
- **Dashboard/billing APIs**: Restricted to the app's own origin
- Preflight `OPTIONS` requests handled with 204

### CRITICAL — Rate Limiting Fail-Closed (ratelimit.ts)

Changed all rate limiter catch blocks from fail-open to fail-closed:
- When Upstash Redis is unreachable, requests are now **blocked** (429) instead of allowed through
- Applies to: daily API limits, studio query/chart/post limits, weekly publish limits
- Read-only usage getters remain fail-open (informational only)
- Errors logged with `console.error` for monitoring

### HIGH — Stripe Webhook Hardening (webhook/route.ts, schema.prisma)

- **Clock tolerance**: Events older than 5 minutes are rejected (Stripe best practice)
- **Idempotency**: New `StripeWebhookEvent` table stores processed event IDs; duplicates are skipped
- Race conditions between parallel webhook deliveries handled gracefully

### HIGH — Token Encryption (crypto.ts, x/refresh-token.ts, x/callback/route.ts)

- New `src/lib/crypto.ts` provides AES-256-GCM encryption/decryption
- X/Twitter access and refresh tokens are encrypted before database storage
- Decryption is transparent — handles both encrypted and plaintext tokens (migration-safe)
- Requires `TOKEN_ENCRYPTION_KEY` environment variable (32 bytes, hex or base64 encoded)
- When the env var is absent, tokens pass through unencrypted (development mode)

### HIGH — LLM Prompt Injection Defenses (generate-chart, generate-post)

- System prompt now includes explicit security rules forbidding credential/SQL leakage
- User input wrapped with `[USER QUERY]:` delimiter to separate from system instructions
- LLM output sanitized: patterns matching API keys, tokens, and env var names are redacted

### MEDIUM — Error Handling (studio routes)

- All catch blocks in API routes now return generic error messages
- Prisma-specific errors are suppressed from client responses
- Internal error details logged server-side only

### MEDIUM — Cron Endpoint Hardening (cron-auth.ts)

- Shared `verifyCronAuth()` helper extracts auth logic
- Verifies `CRON_SECRET` bearer token (primary)
- Checks `x-vercel-cron-signature` header when present (defense in depth)

### MEDIUM — API Key Audit Logging (api-keys/route.ts)

- Key creation events logged with `[AUDIT]` prefix including userId and keyId

### MEDIUM — Dependency Audit

- Ran `npm audit fix` — resolved `qs` DoS vulnerability
- Remaining 8 moderate vulnerabilities are in Prisma dev tooling transitive dependencies (hono, lodash via chevrotain) — not exploitable in application code

### LOW — Site Password Gate (middleware.ts)

A temporary password gate can be enabled to restrict access to the entire site while in pre-launch or maintenance mode.

**How it works**

- When the `SITE_PASSWORD` environment variable is set, all requests are checked for a `_site_pass` cookie whose value matches the password.
- Requests without the cookie are redirected (307) to `/gate`, a simple password form.
- On successful submission, the cookie is set for the session and the user proceeds normally.
- Remove `SITE_PASSWORD` from the environment to disable the gate entirely — no code changes required.

**Bypass list**

Certain routes must remain accessible regardless of the gate (external callers that cannot carry a browser cookie). Current bypass list in `src/middleware.ts`:

| Path | Reason |
|------|--------|
| `/gate` | The gate page itself |
| `/api/gate` | Gate form submission endpoint |
| `/api/stripe/webhook` | Stripe posts events server-to-server |
| `/api/cron` (prefix) | GitHub Actions cron jobs (`engagement-poll`, `publish-user-posts`, `prune-usage`) |
| `/api/telegram/webhook` | Telegram posts button callbacks server-to-server |
| `/api/v1` (prefix) | Public data API — accessed by external clients without a session |
| `/api/openapi.json` | Public OpenAPI spec — fetched by external tooling |

**Adding new bypasses**

If you add a new route that is called by an external service (not a browser), add it to `GATE_BYPASS` in `src/middleware.ts`. The `isBypassed()` helper matches both exact paths and any path starting with `<entry>/`.

**Environment variable**

| Variable | Required | Description |
|----------|----------|-------------|
| `SITE_PASSWORD` | Optional | When set, enables the site-wide password gate. Unset to disable. |

## New Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TOKEN_ENCRYPTION_KEY` | Production | 32-byte key for X token encryption (hex or base64) |

Generate with: `openssl rand -hex 32`

## New Database Table

```sql
-- StripeWebhookEvent (juice_stripe_webhook_events)
-- Stores processed Stripe event IDs for idempotency
CREATE TABLE juice_stripe_webhook_events (
  id TEXT PRIMARY KEY,        -- Stripe event ID (evt_xxx)
  eventType TEXT NOT NULL,    -- e.g. customer.subscription.updated
  processedAt TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON juice_stripe_webhook_events (processedAt);
```

Run `npx prisma migrate dev` to apply.

## Post-Deploy Checklist

### Secrets Management

- Verify Vercel deployment uses Vercel Environment Variables (encrypted at rest), not a `.env.local` file on the server.
- Ensure `CRON_SECRET` is a strong random value (32+ chars). Generate with: `openssl rand -hex 32`
- Add `TOKEN_ENCRYPTION_KEY` to Vercel env vars: `openssl rand -hex 32`
- If `.env.local` was ever committed to git, rotate **all** keys immediately (Stripe, Supabase, Upstash, OpenAI, X OAuth).

### Session & Auth Configuration

- Check Supabase dashboard (Authentication > Settings) for session expiry. Default: 1hr access token / 1 week refresh. Adjust if needed.
- Verify expired sessions on API routes (`/api/*`) return 401 JSON, not a redirect to `/login`.

### Database Connection Limits

- Confirm `DATABASE_URL` points to PgBouncer pooler (port 6543) and `DIRECT_URL` to direct connection (port 5432).
- Verify Supabase plan supports expected traffic (free tier = 60 direct connections).

### Monitoring & Alerting

- Set up [Sentry](https://sentry.io) (`@sentry/nextjs`) for server-side error tracking.
- Enable Stripe webhook failure alerts in [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks).
- Set up Upstash Redis usage alerts in [Upstash Console](https://console.upstash.com).

### Audit Logging

- `ApiRequestLog` captures all public API calls (already implemented).
- Expand structured `[AUDIT]` logging to cover: subscription changes, X account connections, account deletions. These appear in Vercel function logs.

### Data Backup & Recovery

- In Supabase Dashboard > Settings > Database, verify daily backups are enabled (paid plans only).
- Document restore procedure: Supabase Dashboard > Backups > Restore.

### Legal / Compliance

- Add `/privacy` and `/terms` pages before launch.
- Define a data retention policy (e.g., `ApiRequestLog` pruned after 90 days).
- Add cookie consent banner if serving EU users (Supabase auth uses cookies).

## Verification

1. **Security headers**: Scan production URL with securityheaders.com
2. **CORS**: `curl -H "Origin: https://evil.com" -v` against `/api/v1/` endpoints
3. **Rate limiting**: Exceed limit and verify 429 response; kill Redis and verify 429 (fail-closed)
4. **Stripe webhooks**: Use `stripe trigger checkout.session.completed` to test flow; send same event twice to verify idempotency
5. **Token encryption**: Connect X account; verify DB stores encrypted tokens (iv:ct:tag format)
6. **Error leakage**: Send malformed requests; verify no Prisma/internal errors in responses
