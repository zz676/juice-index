# Admin Console

The Admin Console provides platform-level metrics and analytics for users with the `ADMIN` role. It is accessible at `/dashboard/admin` and appears as a sidebar nav item only for admins.

## Access Control

- The `UserRole` enum (`USER | ADMIN`) and the `role` field on the `User` model gate access.
- **Sidebar visibility**: The `/api/dashboard/tier` endpoint returns the user's `role` alongside their `tier`. The dashboard layout conditionally renders the "Admin Console" nav item when `role === "ADMIN"`.
- **Page-level guard**: The server component (`page.tsx`) checks the user's role via Prisma and redirects non-admins to `/dashboard`.
- **API-level guard**: The `requireAdmin()` helper (in `src/lib/auth/require-admin.ts`) wraps `requireUser()` and returns a 403 if the user is not an admin.

## Metrics

The admin dashboard displays four categories of metrics, organized into tabs:

### Revenue
- **MRR / ARR**: Computed from active Stripe subscriptions (monthly prices + yearly/12).
- **Subscribers by tier**: Count of active/trialing subscriptions grouped by tier.
- **Cancel-pending count**: Subscriptions with `cancelAtPeriodEnd = true`.
- **New subscriptions this month**: Subscriptions created since the start of the current month.
- **Webhook Health**: Stripe webhook processing metrics sourced from the `juice_stripe_webhook_events` table (`StripeWebhookEvent` model).
  - Events processed in the last 24 hours and 7 days.
  - Timestamp of the most recently processed event.
  - Total events processed (all time).
  - Breakdown of event types with counts over the last 30 days.

### Users
- **Total users**: All registered users.
- **New users (7d / 30d)**: Users registered in the last 7 and 30 days.
- **Active users (7d)**: Users with API activity in the last 7 days.
- **Users by tier**: Breakdown of users by their subscription tier.

### AI Usage
- **Per-model breakdown**: Request count, total cost, success rate, input/output tokens, average latency.
- **Daily cost trend (30d)**: Day-by-day AI cost for the last 30 days.

### API Activity
- **Request counts**: Today, this week (7d), this month (30d).
- **Average response time**: Mean `durationMs` from API request logs over the last 30 days.
- **Error rate**: Percentage of requests with status code >= 400 in the last 30 days.
- **Top 10 endpoints**: Most-called endpoints in the last 30 days.
- **Requests by tier**: API usage breakdown by subscription tier.

## KPI Trend Charts

The four KPI cards at the top of the dashboard (ARR, Total Users, AI Cost 30d, API Requests 30d) are clickable. Clicking a card reveals a 30-day trend area chart below the cards row.

**Behavior:**
- Click a KPI card to expand its trend chart. Click the same card again (or the close button) to collapse it.
- Only one chart is visible at a time — clicking a different card switches to that chart.
- Active cards show a colored border and a rotated chevron indicator.

**Data sources:**
| KPI | Chart shows | Source table |
|-----|-----------|--------------|
| ARR | Daily new subscriptions | `juice_api_subscriptions` |
| Total Users | Daily new signups | `juice_users` |
| AI Cost (30d) | Daily AI spend | `juice_ai_usage` (pre-existing `dailyCostTrend`) |
| API Requests (30d) | Daily request count | `juice_api_request_logs` |

Each KPI uses a distinct color: green (ARR), blue (Users), amber (AI Cost), violet (API Requests). The chart is rendered with `recharts` `AreaChart` with a gradient fill.

## Architecture

| File | Purpose |
|------|---------|
| `src/lib/auth/require-admin.ts` | Reusable admin auth guard for API routes |
| `src/app/api/dashboard/tier/route.ts` | Returns `role` alongside `tier` for sidebar gating |
| `src/app/dashboard/layout.tsx` | Conditionally renders admin nav item |
| `src/app/dashboard/admin/types.ts` | TypeScript interfaces for all metric data |
| `src/app/dashboard/admin/data.ts` | Server-side data queries (raw SQL + Stripe API) |
| `src/app/dashboard/admin/page.tsx` | Server component with auth guard + parallel data fetch |
| `src/app/dashboard/admin/admin-dashboard.tsx` | Client component with tabbed UI |
| `src/app/api/dashboard/admin/metrics/route.ts` | API route for client-side data refresh |

## Granting Admin Access

To grant admin access to a user, update their role directly in the database:

```sql
UPDATE juice_users SET role = 'ADMIN' WHERE email = '<user-email>';
```

## Client-Side Refresh

The admin dashboard includes a "Refresh" button that calls `GET /api/dashboard/admin/metrics`. The response is cached for 60 seconds (`Cache-Control: private, max-age=60`).
