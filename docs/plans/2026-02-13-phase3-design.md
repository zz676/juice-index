# Phase 3 Design: Auth Hardening, Real Data, Billing, Caching & Polish

**Date**: 2026-02-13
**Status**: Approved

## Summary

Phase 3 hardens the application for production deployment on Vercel. Work is ordered by priority: security fixes first, then data accuracy, billing robustness, performance, and UI polish.

## P0: Auth Hardening

### Open Redirect Prevention (`src/app/auth/callback/route.ts`)
- Add `sanitizeNextPath(next)` function that rejects any `next` value that doesn't start with `/` or starts with `//`.
- Defaults to `/dashboard` when invalid.

### Configurable Redirect Base URL
- `src/app/login/page.tsx` and `src/app/forgot-password/page.tsx` hardcode `window.location.origin`.
- Replace with a helper that reads `NEXT_PUBLIC_APP_URL` (falling back to `window.location.origin`).
- This matches the existing pattern in `src/app/api/billing/checkout/route.ts:56`.

### X/Twitter OAuth Provider Fallback (`src/app/login/page.tsx`)
- Supabase may register the provider as `"x"` or `"twitter"` depending on configuration.
- Add fallback logic: try preferred provider name first, retry with alternate if "provider not enabled" error occurs.
- Controlled by `NEXT_PUBLIC_X_OAUTH_PROVIDER` env var (default: `"x"`).

### Fix Forgot Password Link
- `src/app/login/page.tsx:235`: "Forgot password?" link points to `#`. Change to `/forgot-password`.

## P1: Real Dashboard Stats

### Replace Mock Data (`src/app/api/dashboard/stats/route.ts`)
- Current endpoint returns hardcoded JSON.
- Replace with real queries against shared data tables:
  - `NevSalesSummary` for penetration rate and weekly insured units.
  - `CpcaNevRetail` or `AutomakerRankings` for leading OEM.
  - Chart data from `NevSalesSummary` (recent weeks, current vs previous year).
- Graceful fallback: if tables are empty, return a structured "no data" response rather than mock numbers.

## P2: Stripe Webhook Enhancement

### Add `checkout.session.completed` Handler (`src/app/api/stripe/webhook/route.ts`)
- Current handler only covers `customer.subscription.created/updated/deleted`.
- Add `checkout.session.completed` as a safety net for initial subscription creation.
- Extract `userId` from `session.metadata` or `session.client_reference_id`.
- Upsert `ApiSubscription` with tier derived from the price ID.

## P3: Dashboard Stats Caching

### Response Caching (`src/app/api/dashboard/stats/route.ts`)
- Add `Cache-Control` headers for Vercel edge caching (e.g., `s-maxage=300, stale-while-revalidate=600`).
- Add simple in-memory TTL cache (5 min) to avoid repeated DB queries within the same serverless instance.

## P4: Data Explorer Mobile Polish

### Responsive Layout (`src/app/dashboard/explorer/page.tsx`)
- Left panel (450px fixed) doesn't stack on mobile.
- Make the `lg:w-[450px]` panel full-width on small screens with a collapsible toggle.
- Ensure chart area remains usable at narrow widths.
