# Reply Monitoring Date Range Filters — Design

**Date:** 2026-02-28
**Status:** Approved

## Overview

Add date range filter pickers to the **Date** (`createdAt`) and **Post Date** (`sourceTweetCreatedAt`) columns in the Reply Monitoring table. Users can specify a start and end date to narrow down which replies are shown.

## Approach

Inline column header dropdowns — consistent with the existing Account filter pattern. Each column header opens a small popover with date inputs. Active filters are indicated by a blue dot on the header.

## Frontend Changes (`reply-monitoring-table.tsx`)

### New state

```ts
dateFrom: string | null        // ISO date string for createdAt start
dateTo: string | null          // ISO date string for createdAt end
postDateFrom: string | null    // ISO date string for sourceTweetCreatedAt start
postDateTo: string | null      // ISO date string for sourceTweetCreatedAt end
datePicker: "date" | "postDate" | null  // which popover is open
```

### Date column header

The existing sort button is augmented with a filter icon. Clicking the filter icon toggles the popover. The sort arrow still functions independently.

Popover contains:
- **From** `<input type="date">`
- **To** `<input type="date">`
- **Clear** button to reset both values
- Closes on outside click (new `datePickerRef`)

Active state: blue dot indicator when either `dateFrom` or `dateTo` is set.

### Post Date column header

Currently a static text header — becomes a clickable button with the same popover pattern as Date.

Active state: blue dot indicator when either `postDateFrom` or `postDateTo` is set.

### fetchReplies signature extension

```ts
fetchReplies(
  page, tab, sort, order, accountId,
  dateFrom?, dateTo?, postDateFrom?, postDateTo?
)
```

All four date params are appended to the query string when non-null.

## API Changes (`/api/dashboard/engagement/replies/route.ts`)

### New query params

| Param | Maps to DB field | Prisma operator |
|---|---|---|
| `dateFrom` | `createdAt` | `gte` |
| `dateTo` | `createdAt` | `lte` |
| `postDateFrom` | `sourceTweetCreatedAt` | `gte` |
| `postDateTo` | `sourceTweetCreatedAt` | `lte` |

### where clause additions

```ts
if (dateFrom || dateTo) {
  where.createdAt = {
    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
    ...(dateTo   ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
  };
}
if (postDateFrom || postDateTo) {
  where.sourceTweetCreatedAt = {
    ...(postDateFrom ? { gte: new Date(postDateFrom) } : {}),
    ...(postDateTo   ? { lte: new Date(postDateTo + "T23:59:59Z") } : {}),
  };
}
```

`dateTo` and `postDateTo` use end-of-day (`T23:59:59Z`) so the selected day is fully included.

## Files Changed

1. `src/app/dashboard/engagement/reply-monitoring-table.tsx` — state, UI, fetchReplies
2. `src/app/api/dashboard/engagement/replies/route.ts` — query param parsing, where clause
