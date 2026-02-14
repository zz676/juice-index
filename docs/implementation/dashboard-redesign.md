# Dashboard Overview Page Redesign

## Summary

Redesigned the dashboard overview page to provide more KPI visibility (6 stat cards instead of 3), an interactive multi-brand delivery chart using Recharts, and a post management system with both a compact overview widget and a dedicated full page.

## New Layout

1. **6 Overview Stat Cards** (2 rows of 3)
2. **Monthly Delivery Chart** with multi-brand filter, chart type toggle, and period selector
3. **Bottom Split**: News & Catalysts (left) | Compact Post Table (right)

## API Endpoints

### `GET /api/dashboard/stats`

Returns 6 stat cards (expanded from 3):

| Card | Data Source | Value Format |
|------|-----------|-------------|
| NEV Monthly Retail | `CpcaNevRetail` | wan units + YoY% |
| Weekly Retail Sales | `NevSalesSummary` | k units + YoY% |
| Leading OEM | `AutomakerRankings` | automaker name + badge |
| NEV Monthly Production | `CpcaNevProduction` | wan units + YoY% |
| Battery Installation | `ChinaBatteryInstallation` | GWh + production subtitle |
| Total NEV Exports | `PlantExports` (aggregated) | wan units + month badge |

### `GET /api/dashboard/delivery-chart`

Multi-brand monthly delivery chart data.

**Query params**: `brands` (comma-separated Brand enum), `months` (6/12/24, default 12)

**Data source**: `EVMetric` where metric=DELIVERY, periodType=MONTHLY

**Brand colors**:

| Brand | Color |
|-------|-------|
| BYD | #e60012 |
| NIO | #004de6 |
| XPeng | #00b4d8 |
| Li Auto | #00c853 |
| Zeekr | #6366f1 |
| Xiaomi | #ff6900 |
| Tesla China | #cc0000 |
| Leapmotor | #0ea5e9 |
| Geely | #1e40af |

### `GET /api/dashboard/posts`

List posts with filtering and pagination.

**Query params**: `status`, `search`, `page`, `limit`

### `PATCH /api/dashboard/posts/[id]`

Update post status, translatedTitle, or translatedSummary. Sets `approvedAt` on APPROVED.

### `DELETE /api/dashboard/posts/[id]`

Delete a post by ID.

## Component Architecture

All new components live in `src/components/dashboard/`:

| Component | Type | Purpose |
|-----------|------|---------|
| `StatCard` | Server-safe | Extracted stat card with icon, value, change indicator, badge |
| `StatusBadge` | Server-safe | Status-to-color badge (PENDING=yellow, APPROVED=blue, PUBLISHED=green, REJECTED=red) |
| `DeliveryChart` | Client | Recharts bar/line chart with brand filter dropdown, period selector, chart type toggle |
| `CompactPostTable` | Client | Overview widget with status tabs, compact rows, delete action, "View All" link |

## Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard Overview | `/dashboard` | Redesigned with 6 cards, delivery chart, news+catalysts, post widget |
| Post Management | `/dashboard/posts` | Full table with search, status tabs with counts, pagination, approve/publish/delete actions |

## Sidebar Navigation

Added "Posts" nav item (icon: `article`) between Overview and Data Explorer.

## Clickable News Items

The "Latest News" section renders real data from the `Post` model (PUBLISHED posts). Each news card is wrapped in an `<a>` tag that opens the original source article in a new tab.

- **API** (`GET /api/dashboard/feed`): Returns `sourceUrl` from the `Post` model, mapped as `url` in the response. Mock fallback items use `url: "#"`.
- **Frontend** (`/dashboard` page): News cards are `<a href={url} target="_blank" rel="noopener noreferrer">` elements. The `DashboardFeed` interface includes an optional `url` field.
- **"View All"** link navigates to `/dashboard/posts` (the post management page).

## Caching

All API routes use 5-minute in-memory caching, consistent with the existing stats route pattern.
