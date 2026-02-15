# Tier Feature & Quota System

## Overview

Juice Index uses a 4-tier system for gating features and enforcing quotas. The centralized configuration lives in `/src/lib/api/quotas.ts` as the single source of truth for all tier limits.

## Tiers

| Tier | Display Name | Visibility | Price |
|------|-------------|------------|-------|
| FREE | Analyst (Free) | Public | $0/mo |
| STARTER | Starter | Public | $19.99/mo ($16.99/mo annual) |
| PRO | Pro | Public | $49.99/mo ($44.99/mo annual) |
| ENTERPRISE | Institutional | Public | Custom |

## Quota Summary

| Quota | Free | Starter | Pro | Enterprise |
|-------|------|---------|-----|------------|
| Daily API requests | 0 | 500 | 1,000 | 100,000 |
| Monthly API cap | 0 | 10,000 | 25,000 | Unlimited |
| API keys max | 0 | 1 | 2 | 10 |
| Studio queries/day | 3 | 10 | 50 | Unlimited |
| Chart generations/day | 1 | 5 | 20 | Unlimited |
| AI post drafts/day | 1 | 5 | 20 | Unlimited |
| Stored draft posts | 5 | 20 | Unlimited | Unlimited |
| Pending scheduled posts | 0 | 5 | 10 | Unlimited |
| CSV exports/month | 0 | 10 | 50 | Unlimited |
| Weekly publishes | 1 | 10 | 10 | Unlimited |
| Data delay (days) | 30 | 0 | 0 | 0 |
| Historical data (months) | 12 | 36 | 60 | Unlimited |
| Seats | 1 | 1 | 1 | 5+ |
| X accounts linked | 0 | 1 | 1 | 5 |

## Architecture

### Centralized Config (`/src/lib/api/quotas.ts`)

All tier quotas are defined in `TIER_QUOTAS` object. Other files import from this module:

- `/src/lib/api/tier.ts` — re-exports `TIER_QUOTAS` and uses it for `tierLimit()`
- `/src/lib/api/auth.ts` — uses `TIER_QUOTAS` for API rate limiting
- `/src/app/dashboard/billing/tier-display.ts` — uses `TIER_QUOTAS` for display limits

### Rate Limiting (`/src/lib/ratelimit.ts`)

Separate rate limit functions with distinct Redis key prefixes:

- `rateLimitDaily()` — API requests (`rl:{userId}:{date}`)
- `studioQueryLimit()` — AI queries (`studio:query:{userId}:{date}`)
- `studioChartLimit()` — chart generation (`studio:chart:{userId}:{date}`)
- `studioPostDraftLimit()` — post drafts (`studio:post:{userId}:{date}`)
- `csvExportMonthlyLimit()` — CSV exports (`csv:{userId}:{yearMonth}`)
- `weeklyPublishLimit()` — X publishes (`publish:{userId}:{isoWeek}`)
- `getWeeklyPublishUsage()` — read-only publish usage (no increment)
- `getStudioUsage()` — aggregated usage including publish count (returned via `/api/dashboard/studio/usage`)

### API Endpoint Tiers

- `/api/v1/brands/*` — requires PRO
- `/api/v1/industry/*` — requires ENTERPRISE

### AI Model Access

The Studio Analyst Composer (Step 4) supports multiple AI models gated by tier. Model definitions live in `/src/lib/studio/models.ts`.

| Model | Provider | Min Tier | Description |
|-------|----------|----------|-------------|
| GPT-4o Mini | OpenAI | FREE | Fast & affordable |
| GPT-4o | OpenAI | PRO | Best reasoning from OpenAI |
| Claude 3.5 Sonnet | Anthropic | PRO | Balanced speed & quality |
| Claude Opus 4 | Anthropic | ENTERPRISE | Most capable model |

Users can also adjust the temperature (0.0–1.0) for generation creativity. The model dropdown shows all models but locks those above the user's tier with a lock icon.

The backend validates model access at `POST /api/dashboard/studio/generate-post` — requests for a locked model return 403. The user's tier is fetched client-side via `GET /api/dashboard/tier`.

### Feature Gates

- **X posting/scheduling**: Requires STARTER+ (FREE tier blocked); weekly publish quota enforced
- **Chart watermark**: FREE tier charts have "Juice Index" watermark overlay
- **CSV export**: FREE tier blocked, PRO limited to 50/month
- **API keys**: FREE gets 0, PRO gets 2, ENTERPRISE gets 10
- **Draft posts**: FREE limited to 5, PRO+ unlimited
- **Scheduled posts**: FREE gets 0, PRO gets 10 pending max

## Key Files Changed

- `src/lib/api/quotas.ts` — new, centralized tier config
- `src/lib/api/tier.ts` — imports from quotas
- `src/lib/api/auth.ts` — imports from quotas
- `src/lib/ratelimit.ts` — added studio and CSV rate limiters
- `src/app/api/dashboard/user-posts/route.ts` — fixed scheduling bug, added tier gates
- `src/app/api/dashboard/studio/generate-chart/route.ts` — studio rate limits, watermark
- `src/app/api/dashboard/studio/generate-post/route.ts` — studio post draft limits, multi-model dispatch
- `src/app/api/dashboard/tier/route.ts` — client-facing tier endpoint
- `src/lib/studio/models.ts` — AI model registry and tier-based access helpers
- `src/app/api/dashboard/api-keys/route.ts` — new, API key management with quota enforcement
- `src/app/api/dashboard/csv-export/route.ts` — new, CSV export quota tracking
- `src/app/api/v1/brands/route.ts` — minTier changed to PRO
- `src/app/api/v1/brands/[brand]/metrics/route.ts` — minTier changed to PRO
- `src/app/api/v1/industry/*/route.ts` — minTier changed to ENTERPRISE (10 files)
- `src/app/pricing/page.tsx` — full feature comparison matrix
- `src/app/dashboard/billing/tier-display.ts` — imports from quotas
- `src/app/dashboard/billing/api-usage-card.tsx` — shows all quotas
- `src/app/dashboard/posts/page.tsx` — tier-gated buttons, upgrade prompts
- `src/app/dashboard/page.tsx` — data delay banner for FREE tier
- `src/components/dashboard/UpgradeBanner.tsx` — reusable upgrade prompt component
