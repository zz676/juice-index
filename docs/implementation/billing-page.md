# Billing Page

## Overview

The `/dashboard/billing` page is the single source of truth for all billing and subscription management. It replaced the previous bare scaffold that only showed plan name, status badge, and flat checkout buttons. The Settings page now links here instead of embedding its own subscription section.

## Architecture

**Server Component** (`page.tsx`) handles auth, data fetching, and composes six card components. Only one card (`PlanActionsCard`) is a client component — the rest are server components.

### Data Flow

```
page.tsx (server)
  ├─ Supabase auth.getUser() → auth check
  ├─ syncUserToPrisma() → ensure user exists
  ├─ data.ts
  │   ├─ getSubscription(userId) → raw SQL with .catch() fallback
  │   ├─ getUsageCount(userId) → prisma count with .catch(() => 0)
  │   └─ getStripeData(stripeCustomerId) → Promise.allSettled
  │       ├─ stripe.customers.retrieve (expanded default_payment_method)
  │       ├─ stripe.invoices.list (last 12)
  │       └─ stripe.invoices.retrieveUpcoming (catches error for canceled)
  └─ tier-display.ts → display names + tier limits
      │
      ▼
  Card Components (receive typed props)
```

### Database Resilience

The subscription query uses raw SQL instead of Prisma model queries because some environments are missing newer columns (`currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`). This matches the pattern established in `src/app/auth/callback/route.ts`. Queries are split into base columns + optional columns, each wrapped with `.catch()`.

### Stripe Resilience

`getStripeData()` uses `Promise.allSettled` so that a failure in one Stripe call (e.g., upcoming invoice for a canceled subscription) doesn't prevent the other data from rendering.

## Cards

### 1. Current Plan (`current-plan-card.tsx`)
- Icon: `workspace_premium`
- Displays tier display name (mapped via `getTierDisplayName`), status badge (green/yellow/red), billing period dates
- Shows cancellation warning banner when `cancelAtPeriodEnd` is true

### 2. API Usage (`api-usage-card.tsx`)
- Icon: `data_usage`
- Usage progress bar with color coding: green (<70%), yellow (70-89%), red (90%+)
- Shows count / limit text, handles unlimited (Enterprise) tier

### 3. Payment Method (`payment-method-card.tsx`)
- Icon: `credit_card`
- Displays card brand, last 4 digits, expiry when available
- Empty state for free users or missing payment method

### 4. Next Billing (`next-billing-card.tsx`)
- Icon: `event`
- Shows next charge date + amount from Stripe upcoming invoice
- Handles canceling subscriptions ("Cancels on {date}") and free users ("No upcoming charges")

### 5. Invoice History (`invoice-history-card.tsx`)
- Icon: `receipt_long`
- Table: Date, Amount, Status badge (paid/open/void/etc.), PDF download link
- Empty state when no invoices

### 6. Plan Actions (`plan-actions-card.tsx`) — Client Component
- Icon: `tune`
- "Change Plan" → links to `/pricing`
- "Manage Billing" → `POST /api/billing/portal` with loading spinner (same pattern as the old `subscription-section.tsx`)
- Error display banner

## Query Parameters

The page handles checkout redirect parameters:
- `?success=1` — green banner: "Your subscription has been activated"
- `?canceled=1` — yellow banner: "Checkout was canceled"

## Tier Display Names

| Tier | Display Name |
|------|-------------|
| FREE | Analyst (Free) |
| STARTER | Starter |
| PRO | Pro |
| ENTERPRISE | Institutional |

## Tier Limits

| Tier | Monthly API Limit |
|------|------------------|
| FREE | 100 |
| STARTER | 5,000 |
| PRO | 50,000 |
| ENTERPRISE | Unlimited |

## Styling

All cards follow the Settings page design system:
- Cards: `bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]`
- Section headers: Material Icons Round + semibold title with bottom border
- Page container: `max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto`
- Buttons: `bg-primary text-white rounded-lg hover:bg-primary/90`
- Icons: Material Icons Round

## Files

| File | Type | Purpose |
|------|------|---------|
| `page.tsx` | Server component | Auth, data fetching, card composition |
| `types.ts` | Types | SubscriptionData, PaymentMethodInfo, InvoiceInfo, UpcomingInvoiceInfo |
| `tier-display.ts` | Utility | Tier display names and API limits |
| `data.ts` | Data layer | getSubscription, getUsageCount, getStripeData |
| `current-plan-card.tsx` | Server component | Plan name, status, period |
| `api-usage-card.tsx` | Server component | Usage progress bar |
| `payment-method-card.tsx` | Server component | Card on file |
| `next-billing-card.tsx` | Server component | Upcoming charge info |
| `invoice-history-card.tsx` | Server component | Invoice table with PDF links |
| `plan-actions-card.tsx` | Client component | Change plan + Stripe portal |

## Related

- Settings page now has a "Go to Billing" link instead of inline subscription management (see [settings-page.md](settings-page.md))
- Stripe portal API: `src/app/api/billing/portal/route.ts`
- Stripe client: `src/lib/stripe.ts`
