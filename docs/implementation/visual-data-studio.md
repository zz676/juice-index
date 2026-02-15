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
