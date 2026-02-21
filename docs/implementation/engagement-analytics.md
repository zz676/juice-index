# Engagement Analytics

## Overview

The Engagement Center (`/dashboard/engagement`) includes two features for per-account analysis:

1. **Account filter in Reply Monitoring** — filter the replies table by a specific monitored account and see aggregate totals.
2. **Account Analytics tab** — interactive chart showing daily reply count and API cost trends for a selected account.

---

## Reply Monitoring — Account Filter

A dropdown above the status tabs lets users filter the reply table to a single monitored account. When an account is selected, a summary bar appears beneath the filter showing:

- **Total Replies** — total number of replies matching the current status tab + account filter.
- **Total Fees** — sum of `totalCost` across all matching replies (not just the current page).

The filter appends `accountId` as a URL param to `/api/dashboard/engagement/replies`. The `statusCounts` shown in the tabs are also scoped to the selected account so counts stay accurate.

---

## Account Analytics Tab

The **Account Analytics** tab renders `AccountAnalyticsChart`, which:

- Supports selecting one or more accounts from a dropdown (all accounts selected by default).
- Offers a granularity toggle (daily / hourly) and a matching time range selector.
- Fetches aggregates from `/api/dashboard/engagement/analytics`.
- Renders a multi-line `LineChart` via Recharts, one line per selected account.
- Shows aggregate summary cards (total replies, total cost) below the chart.
- When more than one account is selected, shows a **Per Account** breakdown table with:
  - Color swatch and avatar matching the chart line
  - Reply count and API cost per account
  - Clickable **replies** and **cost** column headers to sort ascending or descending (defaults to replies descending)

---

## API Endpoints

### `GET /api/dashboard/engagement/replies`

Existing endpoint; updated to:

| Change | Detail |
|--------|--------|
| `statusCounts` fix | Now respects the `accountId` filter so tab counts match the filtered view |
| `totalCost` field | Returns `totalCost: number` (sum of all matching replies, not page-scoped) |

### `GET /api/dashboard/engagement/analytics`

New endpoint.

**Query params:**

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `accountId` | Yes | — | ID of the monitored account |
| `days` | No | 30 | Number of days to look back (7–90) |

**Response:**

```json
{
  "data": [
    { "date": "2025-01-15", "replies": 5, "cost": 0.0123 }
  ],
  "summary": {
    "totalReplies": 42,
    "totalCost": 0.1234
  }
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/dashboard/engagement/page.tsx` | Added `analytics` tab; passes `accounts` to `ReplyMonitoringTable`; renders `AccountAnalyticsChart` |
| `src/app/dashboard/engagement/reply-monitoring-table.tsx` | Added `accounts` prop, account filter dropdown, summary stats bar |
| `src/app/api/dashboard/engagement/replies/route.ts` | Returns `totalCost`; fixes `statusCounts` to scope by account |
| `src/app/dashboard/engagement/account-analytics-chart.tsx` | New component — account selector, day range, Recharts line chart, summary cards |
| `src/app/api/dashboard/engagement/analytics/route.ts` | New endpoint — daily aggregates via raw SQL `GROUP BY DATE` |
