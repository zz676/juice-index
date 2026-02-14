# Settings Page

## Overview

The `/dashboard/settings` page is a full-featured account management page for authenticated users. It provides six sections covering profile management, security, billing, preferences, and account deletion.

## Architecture

**Server Component** (`page.tsx`) fetches all data server-side and passes serialized props to client components. Each section is a separate client component for isolation and independent interactivity.

### Data Flow

```
page.tsx (server)
  ├─ Supabase auth.getUser() → authUser, identities
  ├─ Prisma user.findUnique() → name, email, avatarUrl, passwordHash
  ├─ Raw SQL → subscription (tier, status, billing columns)
  ├─ Prisma apiRequestLog.count() → usageCount
  └─ Prisma userPreference.findUnique() → preferences
      │
      ▼
  Client Components (receive serialized props)
```

### Database Resilience

The subscription query uses raw SQL instead of Prisma model queries because some environments are missing newer columns (`currentPeriodEnd`, `cancelAtPeriodEnd`). This matches the pattern established in `src/app/auth/callback/route.ts`. Queries for missing tables/columns are wrapped with `.catch()` fallbacks to ensure the page always renders.

## Sections

### 1. Profile (`profile-form.tsx`)

- Displays 64px circular avatar (OAuth image or initials fallback)
- Editable name field, read-only email field
- Uses `useActionState` with the `updateProfile` server action
- Avatar uses `referrerPolicy="no-referrer"` for Google avatar compatibility

### 2. Connected Accounts (`connected-accounts.tsx`)

- Shows Google and X (Twitter) OAuth providers
- Linked accounts display connected email; unlinked show "Not connected"
- **Link:** `supabase.auth.linkIdentity()` with redirect to `/auth/callback?next=/dashboard/settings`
- **Unlink:** `supabase.auth.unlinkIdentity()` then `router.refresh()`
- **Guard:** Unlink disabled when it's the only identity and no password is set

### 3. Password & Security (`password-section.tsx`)

- **OAuth-only mode:** Shows "Set Password" — expands to new + confirm fields
- **Has password mode:** Shows "Change Password" — current + new + confirm fields
- Verifies current password via `supabase.auth.signInWithPassword()` before updating
- Updates via `supabase.auth.updateUser({ password })` (client-side)

### 4. Subscription & Billing (`subscription-section.tsx`)

- Displays plan name, status badge, and usage bar (`usageCount / tierLimit`)
- Usage bar color: green (< 70%), yellow (70-89%), red (90%+)
- Tier limits: FREE=100, STARTER=5000, PRO=50000, ENTERPRISE=unlimited
- Shows cancellation warning banner when `cancelAtPeriodEnd` is true
- "Change Plan" links to `/pricing`; "Manage Billing" opens Stripe portal via `POST /api/billing/portal`

### 5. Notification Preferences (`notification-prefs.tsx`)

- Language: EN / ZH radio buttons
- Digest frequency: DAILY / WEEKLY / NONE radio buttons
- Alert toggle switch with threshold slider (0-100, shown when alerts enabled)
- Brand watchlist: checkbox grid of `Brand` enum values
- Topic interests: checkbox grid of `Topic` enum values
- Saved via `updatePreferences` server action (upserts `UserPreference` via Prisma)

### 6. Danger Zone (`danger-zone.tsx`)

- Red-bordered card with warning text
- "Delete Account" expands to inline confirmation requiring email input
- `deleteAccount` server action: cancels Stripe subscription, deletes API logs/keys/subscription, deletes user (cascading), removes Supabase auth user, redirects to `/login`

## Styling

All sections follow the dashboard design system:
- Cards: `bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]`
- Section headers: Material Icons Round + semibold title with bottom border
- Inputs: `rounded-lg border-slate-custom-200` with `focus:ring-primary/50`
- Buttons: `bg-primary text-white rounded-lg hover:bg-primary/90`
- Icons: Material Icons Round (not Lucide)
- Page container: `max-w-3xl mx-auto`

## Files

| File | Type | Purpose |
|------|------|---------|
| `page.tsx` | Server component | Data fetching, section layout |
| `actions.ts` | Server actions | `updateProfile`, `updatePreferences`, `deleteAccount` |
| `profile-form.tsx` | Client component | Name/email/avatar editing |
| `connected-accounts.tsx` | Client component | OAuth link/unlink |
| `password-section.tsx` | Client component | Set/change password |
| `subscription-section.tsx` | Client component | Plan, usage, billing portal |
| `notification-prefs.tsx` | Client component | Preferences form |
| `danger-zone.tsx` | Client component | Account deletion with confirmation |
