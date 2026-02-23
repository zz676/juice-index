# Visual Data Studio Implementation Status

**Date**: 2026-02-12
**Project**: Visual Data Studio Port (ev-platform -> juice-index)

## Overview
This document tracks the implementation progress of porting the Visual Data Studio features to the `juice-index` codebase. The goal is to integrate the data explorer, dashboard, and billing components into the main application.

## ✅ Phase 1: Frontend Porting (Complete)
Successfully ported all React components and pages from the legacy codebase, adapting them to the new Next.js App Router structure and Tailwind CSS.

### Pages
- **Landing Page** (`src/app/page.tsx`): Hero section, features grid, pricing preview.
- **Pricing** (`src/app/pricing/page.tsx`): Tier comparison logic.
- **Dashboard** (`src/app/dashboard/page.tsx`): Overview with summary cards, charts, and news feed.
- **Studio** (`src/app/dashboard/studio/page.tsx`): 4-step workflow (Prompt -> Logic -> Viz -> Composer).

### Infrastructure
- **Styling**: Integrated Tailwind v4 alongside legacy CSS (scoped under `.legacy-ui`).
- **Layouts**: Created dedicated dashboard layout (`src/app/dashboard/layout.tsx`) with sidebar navigation.
- **Assets**: Migrated Material Icons and custom fonts.

## ✅ Phase 2: API & Backend (Complete)
Implemented the necessary API endpoints to power the frontend features, replacing mock data with real backend logic.

### Data Explorer API
- **Endpoint**: `POST /api/dashboard/studio/generate-chart`
- **Logic**: Uses Vercel AI SDK (`gpt-4o`) to convert natural language prompts into SQL queries.
- **Security**: 
  - Validates SQL to ensure only `SELECT` statements are executed.
  - Enforces authentication via Supabase.
- **Rate Limiting**: Implemented strict daily limits based on user tier:
  - **Free**: 10 queries/day
  - **Starter**: 1,000 queries/day
  - **Pro**: 10,000 queries/day

### Dashboard Data API
- **Stats**: `GET /api/dashboard/stats` - Returns summary metrics and main chart data.
- **Feed**: `GET /api/dashboard/feed` - Returns latest news from the `Post` table and upcoming catalysts.

### Database Schema
- **New Models**: Added `ApiKey`, `ApiRequestLog` for tracking usage.
- **Updates**: Enhanced `ApiSubscription` to support Stripe fields and tier management.

## ✅ Phase 3: Auth Hardening, Real Data & Polish (Complete)

### 1. Auth Hardening
- **Open Redirect Prevention**: Auth callback sanitizes the `next` parameter via `sanitizeNextPath` (`src/lib/auth/sanitize-next-path.ts`).
- **Configurable Redirect Base**: Login and forgot-password pages use `NEXT_PUBLIC_APP_URL` via `getRedirectBase` (`src/lib/auth/redirect-base.ts`), matching the billing checkout pattern.
- **X/Twitter Provider Fallback**: Login tries both `"x"` and `"twitter"` provider names for Supabase OAuth compatibility.
- **Forgot Password Link**: Fixed broken `href="#"` to point to `/forgot-password`.

### 2. Real Dashboard Stats
- `GET /api/dashboard/stats` now queries `NevSalesSummary`, `CpcaNevRetail`, and `AutomakerRankings` for live data.
- Returns a structured empty response when no data exists (no more hardcoded mock JSON).

### 3. Stripe Webhook Enhancement
- Added `checkout.session.completed` handler alongside existing `customer.subscription.*` events.
- Extracts `userId` from session metadata or `client_reference_id`, upserts `ApiSubscription`.

### 4. Caching
- In-memory TTL cache (5 min) on `/api/dashboard/stats` to reduce DB load.
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` headers for Vercel edge caching.

### 5. Mobile Responsiveness
- Studio sidebar is collapsible on mobile via a toggle button.
- Sidebar auto-collapses after query generation on small screens.

## ✅ Phase 3.5: Step 1 Model Selector (Complete)

Added a model selector dropdown to Step 1 ("Ask Intelligence") so users can choose which AI model powers query generation, matching the existing Step 4 dropdown pattern.

### Frontend (`src/app/dashboard/studio/page.tsx`)
- Added `queryModelId` and `isQueryModelDropdownOpen` state (independent from Step 4's `selectedModelId`).
- Replaced the static "Juice-7B (Fast)" placeholder with a fully functional model dropdown using `MODEL_REGISTRY`.
- Tier-gated: FREE users can only select GPT-4o Mini; PRO/ENTERPRISE models show a lock icon with an upgrade toast.
- Passes `modelId` in the `generateRunnableQuery` API call body.

### Backend (`src/app/api/dashboard/studio/generate-chart/route.ts`)
- Accepts optional `modelId` from the request payload.
- Validates tier access via `canAccessModel()` — returns 403 if the user's plan doesn't include the requested model.
- Resolves the correct AI SDK provider (`openai()` or `anthropic()`) based on `ModelDefinition.provider`.
- Falls back to `gpt-4o-mini` when no `modelId` is provided (preserves existing behavior).

## ✅ Phase 3.6: Canvas Migration & UI Scroll Fix (Complete)

### 1. Migrate from `chartjs-node-canvas` to `@napi-rs/canvas`
The server-side chart rendering previously used `chartjs-node-canvas` which depends on the native `canvas` C++ module. This worked locally after `npm rebuild canvas` but failed on Vercel Lambda because native C++ addons aren't supported. Migrated to `@napi-rs/canvas`, a Rust-based alternative with prebuilt binaries for all platforms including Vercel's Lambda (Linux x64/arm64).

**Changes:**
- **`package.json`**: Removed `chartjs-node-canvas` and `canvas`; added `@napi-rs/canvas`.
- **`src/app/api/dashboard/studio/generate-chart/route.ts`**:
  - Replaced `ChartJSNodeCanvas` singleton with a `renderChartToBuffer()` function using `@napi-rs/canvas`'s `createCanvas` + Chart.js directly.
  - Replaced `getLogoImage()` to use `@napi-rs/canvas`'s `loadImage()` (async).
  - Updated watermark plugin to use a pre-loaded logo variable (since Chart.js plugin hooks are synchronous).
  - Registered Chart.js components at module level with `Chart.register(…registerables, ChartDataLabels)`.
- **`next.config.mjs`**: Replaced `canvas`/`chartjs-node-canvas` externals with `@napi-rs/canvas`; removed deprecated `experimental.serverComponentsExternalPackages`.

### 2. Vertical Scroll for Visualization & Data Section
Added `overflow-y-auto max-h-[80vh]` to the Visualization & Data section (`page.tsx`) so content scrolls independently when it exceeds 80% of viewport height (e.g., chart + customizer + generated image + data table).

## ✅ Phase 3.7: NioPowerSnapshot Studio Support (Complete)

Wired the existing `NioPowerSnapshot` Prisma table into the Studio query generation pipeline so users can ask about NIO swap stations, charging infrastructure, and cumulative usage stats.

### Changes
- **Keyword gate** (`EV_KEYWORDS`): Added "swap", "charging", "pile", "infrastructure", "power", "station" so infrastructure queries pass the pre-filter.
- **Allowed tables** (`query-executor.ts`): Added `nioPowerSnapshot` to `ALLOWED_TABLES` and `getTableInfo()` with all 10 fields (`asOfTime`, `totalStations`, `swapStations`, `highwaySwapStations`, `cumulativeSwaps`, `chargingStations`, `chargingPiles`, `cumulativeCharges`, `thirdPartyPiles`, `thirdPartyUsagePercent`).
- **Table name normalization** (`table-name.ts`): Added canonical entry and aliases (`niopowersnapshot`, `nio_power_snapshot`, `nio_power`, `power_snapshot`).
- **Live DB hints** (`getLiveHints()`): Added a query to fetch the `NioPowerSnapshot` date range (`MIN`/`MAX` of `asOfTime`) and include it in the AI system prompt.

### Example queries now supported
- "NIO swap stations trend"
- "NIO charging piles over time"
- "How many total swap stations does NIO have?"

## ✅ Phase 3.8: Field Type Registry & Query System Bug Fixes (Complete)

Introduced a field type registry as a single source of truth for all allowed Studio tables, fixing 5 systemic bugs in the query generation and execution pipeline.

### New File: `src/lib/studio/field-registry.ts`

A registry mapping each of the 15 allowed tables to their exact Prisma field types. Key distinctions encoded:
- `eVMetric.brand` → `Enum(Brand)`, `eVMetric.period` → `Int` (month number 1–12, not a string)
- `plantExports.brand` → `String` (not the Brand enum)
- `batteryMakerRankings.periodType` → `String` (not the PeriodType enum)
- `nioPowerSnapshot.cumulativeSwaps/cumulativeCharges` → `BigInt`
- `nioPowerSnapshot.asOfTime` → `DateTime`

Exported utilities: `ALLOWED_TABLE_NAMES`, `getTableDef`, `getFieldNames`, `isStringField`, `getBigIntFields`, `convertBigIntsToNumbers`, `formatFieldsForPrompt`, `getAllowedTablesList`.

### Bug Fixes

**Bug 1: `mode: "insensitive"` on non-String fields (Prisma crash)**
- Replaced `addInsensitiveMode` / `applyCaseInsensitive` (which blindly wrapped all string values) with schema-aware `coerceWhereClause` / `applyQueryCoercion`.
- Now only fields typed `String` in the registry receive `mode: "insensitive"`. Enum fields (`brand`, `metric`, `periodType`, `vehicleType`), DateTime fields, and other non-String fields pass through unchanged.

**Bug 2: BigInt JSON serialization crash**
- `nioPowerSnapshot.cumulativeSwaps` and `cumulativeCharges` are `BigInt`. `JSON.stringify` (used inside `NextResponse.json()`) throws a `TypeError` on BigInt values.
- Fixed by calling `convertBigIntsToNumbers(table, rows)` from the registry before both Mode 0 and Mode 1 `NextResponse.json()` responses.

**Bug 3: `detectYField` ignores BigInt**
- `detectYField` used `typeof v === "number"` which misses `typeof v === "bigint"`, causing chart Y-axis auto-detection to fail for `nioPowerSnapshot`.
- Added `isNumericValue(v)` helper (`typeof v === "number" || typeof v === "bigint"`) and replaced all `typeof === "number"` checks in `detectYField`.

**Bug 4: AI has no date context**
- AI system prompt now includes `Today's date: ${today}` and a new rule 13 instructing the AI to compute actual ISO dates from relative expressions ("last 30 days", "past month", etc.).

**Bug 5: AI doesn't know field types or enum values**
- `tableDoc` now uses `formatFieldsForPrompt(table.name)` instead of `table.fields.join(", ")`, giving the AI rich type information, e.g.:
  `brand: Enum(Brand) [BYD, NIO, XPENG, ...], metric: Enum(MetricType) [...], year: Int, period: Int`
- New rule 14 reinforces strict type adherence, clarifies `eVMetric.period` is a number, and explains that String fields receive automatic case-insensitive matching.
- Updated the query example from `"brand":"Tesla"` to `"brand":"TESLA_CHINA"` to reinforce correct enum value usage.

### Refactor: `src/lib/query-executor.ts`

- Removed the hardcoded `ALLOWED_TABLES` array and `AllowedTable` type (180+ lines of duplicate data).
- `getTableInfo()` and `getAllowedTables()` now delegate to the registry, ensuring a single source of truth.

## ✅ Phase 3.9: Axis Column Selection in ChartCustomizer (Complete)

Added an **Axes** section to `ChartCustomizer` so users can change which columns are used for the X and Y axes without re-prompting.

### Architecture

**Shared utility** (`src/lib/studio/build-chart-data.ts`):
- Extracted from the generate-chart API route: `toNumber`, `toLabel`, `detectXField`, `detectYField`, `buildChartData`, `deriveColumns`.
- Safe for both server and client import (no server-only dependencies).
- `buildChartData(rows, xField?, yField?)` accepts optional axis overrides; falls back to auto-detection when not supplied.
- `deriveColumns(rows)` returns `{ columns, numericColumns }` from the first row of a result set.

**ChartCustomizer** (`src/components/explorer/ChartCustomizer.tsx`):
- New optional props: `columns`, `numericColumns`, `xField`, `yField`, `onAxisChange`.
- New **Axes** tab (first tab, `swap_horiz` icon) — only shown when `columns.length > 1`.
- X Axis `<select>` populated from all `columns`; Y Axis `<select>` restricted to `numericColumns`.
- `useEffect` resets active section to "type" when the Axes tab disappears (e.g., after a single-column query).

**Studio page** (`src/app/dashboard/studio/page.tsx`):
- Derives `columns`/`numericColumns` via `deriveColumns()` on each query result and on share-state restore.
- Resets `columns`/`numericColumns` to `[]` when a new query plan is generated (before the query runs).
- `handleAxisChange` callback calls `buildChartData(rawData, newXField, newYField)` client-side — no new API call.
- Passes all five new props to `ChartCustomizer`.

**generate-chart route** (`src/app/api/dashboard/studio/generate-chart/route.ts`):
- Refactored to import `buildChartData`, `toNumber`, `PreviewPoint` from the shared utility; removed ~87 lines of duplicate inline code.

### Design doc
See [`docs/plans/2026-02-23-axis-column-selection-design.md`](../plans/2026-02-23-axis-column-selection-design.md).

## 🚀 Next Steps (Phase 4)

### 1. Deployment
- Deploy to Vercel.
- Set environment variables (`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, etc.) in production.

### 2. Billing Verification
- Test Stripe webhook events end-to-end in deployed environment.
- Test upgrade flows from Free -> Starter -> Pro.

### 3. Data Ingestion Monitoring
- Verify data freshness in `NevSalesSummary`, `CpcaNevRetail`, `AutomakerRankings` tables.
- Set up alerts if data becomes stale.
