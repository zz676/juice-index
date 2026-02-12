# Authentication Architecture

## Overview
Juice Index uses a **hybrid authentication system** combining **Supabase Auth** (for identity management) and a local **PostgreSQL database** (for application-specific user data and relations).

## Core Components

### 1. Identity Providers
We support the following login methods via Supabase:
- **Google OAuth**: For widespread accessibility.
- **X (Twitter) OAuth**: Targeting the crypto/tech audience.
- **Magic Link**: Passwordless email login for high security and low friction.
- **Email & Password**: Traditional fallback.

### 2. User Synchronization (`src/app/auth/callback/route.ts`)
A critical part of our architecture is the synchronization between Supabase `auth.users` and our public `User` table.

**The Sync Flow:**
1.  User authenticates via Supabase (OAuth or Magic Link).
2.  Supabase redirects to `/auth/callback`.
3.  The callback route verifies the code/token.
4.  **Sync Logic**: The route checks if a corresponding record exists in `public.User` (matched by `id`).
    - **Upsert**: It creates or updates the `User` record with the latest email, name, and avatar from Supabase metadata.
    - **Subscription Init**: If no `ApiSubscription` exists, it creates one with `tier: 'FREE'`.
5.  Session is established, and user is redirected to `/dashboard`.

### 3. Session Management
- **Client-Side**: `createClient()` in `@/lib/supabase/client` using `@supabase/ssr` (Browser Client).
- **Server-Side**: `createClient()` in `@/lib/supabase/server` using `@supabase/ssr` (Server Client).
- **Middleware**: `src/middleware.ts` ensures session token is refreshed and protects private routes.

## Files
- `src/app/login/page.tsx`: Unified login UI.
- `src/app/auth/callback/route.ts`: Handler for OAuth redirects and user syncing.
- `src/app/forgot-password/page.tsx`: Password reset request form.
- `src/app/auth/reset-password/page.tsx`: Password update form (authenticated state).

## Configuration
Requires the following environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- OAuth Provider Client IDs/Secrets (configured in Supabase Dashboard).
