# Tier Feature & Quota System

## Overview

Juice Index uses a 4-tier system for gating features and enforcing quotas. The centralized configuration lives in `/src/lib/api/quotas.ts` as the single source of truth for all tier limits. The studio page sources all quota limits (global and per-model) from the `/api/dashboard/studio/usage` endpoint to avoid stale-tier display issues.

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
| Studio queries/day (global) | 3 | 15 | 50 | Unlimited |
| Chart generations/day | 1 | 5 | 20 | Unlimited |
| AI post drafts/day (global) | 1 | 5 | 20 | Unlimited |
| Stored draft posts | 5 | 20 | Unlimited | Unlimited |
| Pending scheduled posts | 0 | 5 | 10 | Unlimited |
| CSV exports/month | 0 | 10 | 50 | Unlimited |
| Weekly publishes | 1 | 10 | 10 | Unlimited |
| Data delay (days) | 30 | 0 | 0 | 0 |
| Historical data (months) | 12 | 36 | 60 | Unlimited |
| Seats | 1 | 1 | 1 | 5+ |
| X accounts linked | 0 | 1 | 1 | 5 |

## Per-Model Daily Quotas

Each AI model has its own daily sub-limit within the global cap. Both the global cap and the per-model cap must pass for a request to succeed.

### Studio Queries (per day)

| Model | Free | Starter | Pro | Enterprise |
|-------|------|---------|-----|------------|
| GPT-4o Mini | 3 | 15 | 50 | Unlimited |
| GPT-4o | — | 5 | 25 | Unlimited |
| Claude 3.5 Sonnet | — | 5 | 25 | Unlimited |
| Claude Opus 4 | — | — | 10 | Unlimited |

### Post Drafts (per day)

| Model | Free | Starter | Pro | Enterprise |
|-------|------|---------|-----|------------|
| GPT-4o Mini | 1 | 5 | 20 | Unlimited |
| GPT-4o | — | 3 | 10 | Unlimited |
| Claude 3.5 Sonnet | — | 3 | 10 | Unlimited |
| Claude Opus 4 | — | — | 5 | Unlimited |

## Architecture

### Centralized Config (`/src/lib/api/quotas.ts`)

All tier quotas are defined in `TIER_QUOTAS` object. Server-side files import from this module:

- `/src/lib/api/tier.ts` — re-exports `TIER_QUOTAS` and uses it for `tierLimit()`
- `/src/lib/api/auth.ts` — uses `TIER_QUOTAS` for API rate limiting
- `/src/lib/ratelimit.ts` — uses `TIER_QUOTAS` in `getStudioUsage()` to compute limits
- `/src/app/dashboard/billing/tier-display.ts` — uses `TIER_QUOTAS` for display limits
- `/src/app/dashboard/billing/api-usage-card.tsx` — uses `TIER_QUOTAS` for per-model quota display

The studio page (`/src/app/dashboard/studio/page.tsx`) does **not** import `TIER_QUOTAS`. It reads all limits from the `/api/dashboard/studio/usage` response to avoid stale data from the cached `/api/dashboard/tier` endpoint (`max-age=60`).

The `TierQuota` type includes:
- `studioQueriesByModel: Record<string, number>` — per-model query sub-limits
- `postDraftsByModel: Record<string, number>` — per-model draft sub-limits
- `getModelQuota(tier, modelId, category)` — helper to look up a model's limit

### Rate Limiting (`/src/lib/ratelimit.ts`)

Separate rate limit functions with distinct Redis key prefixes:

**Global limiters:**
- `rateLimitDaily()` — API requests (`rl:{userId}:{date}`)
- `studioQueryLimit()` — AI queries (`studio:query:{userId}:{date}`)
- `studioChartLimit()` — chart generation (`studio:chart:{userId}:{date}`)
- `studioPostDraftLimit()` — post drafts (`studio:post:{userId}:{date}`)
- `csvExportMonthlyLimit()` — CSV exports (`csv:{userId}:{yearMonth}`)
- `weeklyPublishLimit()` — X publishes (`publish:{userId}:{isoWeek}`)

**Per-model limiters:**
- `studioModelQueryLimit()` — per-model queries (`studio:query:model:{modelId}:{userId}:{date}`)
- `studioModelPostDraftLimit()` — per-model drafts (`studio:post:model:{modelId}:{userId}:{date}`)

**Composite enforcers (check global + per-model):**
- `enforceStudioQueryLimits(userId, tier, modelId, now)` — returns `{ success, failedOn: "global" | "model" | null }`
- `enforceStudioPostDraftLimits(userId, tier, modelId, now)` — same pattern

**Read-only:**
- `getWeeklyPublishUsage()` — read-only publish usage (no increment)
- `getStudioUsage()` — aggregated usage + limits including per-model breakdown (returned via `/api/dashboard/studio/usage`); single source of truth for the studio UI

### API Endpoint Tiers

- `/api/v1/brands/*` — requires PRO
- `/api/v1/industry/*` — requires ENTERPRISE

### AI Model Access

The Studio Analyst Composer (Step 4) supports multiple AI models gated by tier. Model definitions live in `/src/lib/studio/models.ts`.

| Model | Provider | Min Tier | API Pricing (per MTok) | Description |
|-------|----------|----------|------------------------|-------------|
| GPT-4o Mini | OpenAI | FREE | $0.15 in / $0.60 out | Fast & affordable |
| GPT-4o | OpenAI | STARTER | $2.50 in / $10.00 out | Best reasoning from OpenAI |
| Claude 3.5 Sonnet | Anthropic | STARTER | $3.00 in / $15.00 out | Balanced speed & quality |
| Claude Opus 4 | Anthropic | PRO | $15.00 in / $75.00 out | Most capable model |

*Pricing reflects provider API costs (OpenAI / Anthropic) as of early 2025. These are the costs Juice Index pays per request — end users are not billed per token.*

Users can also adjust the temperature (0.0–1.0) for generation creativity. The model dropdown shows all models but locks those above the user's tier with a lock icon. Exhausted models (per-model quota reached) are also disabled with a usage indicator.

The backend validates model access and per-model quotas at:
- `POST /api/dashboard/studio/generate-post` — composite global + per-model draft enforcement
- `POST /api/dashboard/studio/generate-chart` — composite global + per-model query enforcement (Mode 1 only; Mode 0 uses global-only since no AI model is called)

Requests for a locked model return 403. Per-model quota exceeded returns 429 with `modelLimited: true`.

### Feature Gates

- **X posting/scheduling**: Requires STARTER+ (FREE tier blocked); weekly publish quota enforced
- **Chart watermark**: FREE tier charts have "Juice Index" watermark overlay
- **CSV export**: FREE tier blocked, PRO limited to 50/month
- **API keys**: FREE gets 0, PRO gets 2, ENTERPRISE gets 10
- **Draft posts**: FREE limited to 5, PRO+ unlimited
- **Scheduled posts**: FREE gets 0, PRO gets 10 pending max

## Key Files

- `src/lib/api/quotas.ts` — centralized tier config with per-model quotas
- `src/lib/api/tier.ts` — imports from quotas, re-exports `getModelQuota`
- `src/lib/api/auth.ts` — uses `TIER_QUOTAS` for API rate limiting
- `src/lib/ratelimit.ts` — global + per-model rate limiters and composite enforcers
- `src/lib/studio/models.ts` — AI model registry and tier-based access helpers
- `src/app/api/dashboard/studio/generate-chart/route.ts` — studio rate limits with per-model enforcement
- `src/app/api/dashboard/studio/generate-post/route.ts` — post draft limits with per-model enforcement
- `src/app/api/dashboard/studio/usage/route.ts` — returns per-model usage breakdown
- `src/app/dashboard/studio/page.tsx` — model dropdowns with quota indicators
- `src/app/dashboard/billing/api-usage-card.tsx` — shows per-model quota section
- `src/app/api/dashboard/tier/route.ts` — client-facing tier endpoint
