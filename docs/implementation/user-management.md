# User Management & Tiered Access

## Overview
User management in Juice Index is designed around **API Subscriptions** and **RBAC (Role-Based Access Control)**.

## Dashboard Sidebar Profile
The sidebar in `src/app/dashboard/layout.tsx` displays the authenticated user's real profile:
- **Name & email**: Fetched on mount via `supabase.auth.getUser()`, reading `full_name`/`name` from `user_metadata`.
- **Avatar**: Shows the OAuth provider avatar (`avatar_url` or `picture` from `user_metadata`) when available; falls back to a circle with computed initials.
- **Popover**: The account popover shows the same real name and email.

## Account Settings
Located at `/dashboard/settings`.
- **Profile Updates**: Uses a Server Action (`updateProfile`) to securely modify user data.
- **Subscription View**: Displays current tier (`FREE`, `PRO`, `ENTERPRISE`) and status.

## Subscription Tiers
We enforce feature limits based on the user's subscription tier, stored in `ApiSubscription`.

### Tier Definitions
- **FREE**: Basic access. Rate limited to 10 queries/day.
- **PRO**: Enhanced access. Higher limits.
- **ENTERPRISE**: Custom limits.

### Implementation (`src/lib/api/tier.ts`)
- `normalizeTier(tier: string)`: Standardizes tier names.
- `tierLimit(tier: string)`: Returns the daily query limit for a given tier.

### Rate Limiting (`src/lib/ratelimit.ts`)
- Uses Redis (via Upstash or local) to track API usage.
- Enforced in `src/app/api/dashboard/studio/generate-chart/route.ts`.

## Middleware & Security
- **File**: `src/middleware.ts`
- **Logic**: 
    - Updates Supabase session on every request.
    - Protects all `/dashboard/*` routes.
    - Redirects unauthenticated users to `/login`.
    - Redirects authenticated users away from `/login` to `/dashboard`.

## Database Schema relevant to User Management
- `User`: Core identity, synced from Supabase.
- `ApiSubscription`: Links `User` to `Stripe` customer/subscription IDs and stores `tier`.
- `ApiKey`: Manages programmatic access tokens.
