# Billing Page

## Overview

The `/dashboard/billing` page is the single source of truth for all billing and subscription management. It replaced the previous bare scaffold that only showed plan name, status badge, and flat checkout buttons. The Settings page now links here instead of embedding its own subscription section.

## Architecture

**Server Component** (`page.tsx`) handles auth, data fetching, and composes five card components. Two cards are client components (`NextBillingCard`, `SuccessRefresh`) — the rest are server components.

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

### Payment Method Fallback

Stripe Checkout does not always set a `default_payment_method` on the customer. `getStripeData()` first checks the customer's default payment method, then falls back to listing the customer's payment methods directly (`stripe.paymentMethods.list`).

### Post-Checkout Refresh

After a successful checkout, the Stripe webhook may not have updated the database by the time the billing page loads. The `SuccessRefresh` client component polls every 2 seconds (up to 10 attempts) using `router.refresh()` until the tier updates from FREE.

## Cards

### 1. Current Plan (`current-plan-card.tsx`)
- Icon: `workspace_premium`
- Displays tier display name (mapped via `getTierDisplayName`), status badge (green/yellow/red), billing period dates
- **Server component**
- FREE users see an **"Upgrade"** button linking to `/?current={tier}#pricing`
- Paid users see no button — plan changes are handled through the Stripe Customer Portal via "Manage Billing" in the Next Billing card
- Shows cancellation warning banner when `cancelAtPeriodEnd` is true

### 2. API Usage (`api-usage-card.tsx`)
- Icon: `data_usage`
- Usage progress bar with color coding: green (<70%), yellow (70-89%), red (90%+)
- Shows count / limit text, handles unlimited (Enterprise) tier

### 3. Payment Method (`payment-method-card.tsx`)
- Icon: `credit_card`
- Displays card brand, last 4 digits, expiry when available
- Empty state for free users or missing payment method

### 4. Next Billing (`next-billing-card.tsx`) — Client Component
- Icon: `event`
- Shows next charge date + amount from Stripe upcoming invoice
- Handles canceling subscriptions ("Cancels on {date}") and free users ("No upcoming charges")
- **"Manage Billing"** button in the card header (right-aligned) → `POST /api/billing/portal`
  - Only shown when `hasStripeSubscription` is true (i.e., user has a `stripeCustomerId`)
  - Hidden for enterprise users provisioned without a Stripe subscription
  - Opens the Stripe Customer Portal for cancellation and plan switching

### 5. Invoice History (`invoice-history-card.tsx`)
- Icon: `receipt_long`
- Table: Date, Amount, Status badge (paid/open/void/etc.), PDF download link
- Empty state when no invoices

## Query Parameters

The page handles checkout redirect parameters:
- `?success=1` — green banner: "Your subscription has been activated"
- `?canceled=1` — yellow banner: "Checkout was canceled"
- `?plan=pro` or `?plan=starter` — shows an upgrade prompt (UpgradePrompt component) with Monthly/Yearly toggle and "Subscribe Now" button that triggers the Stripe checkout flow. The prompt is hidden if the user is already on the target plan or higher.

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

## Layout

The page uses a responsive 2-column CSS Grid (`grid grid-cols-1 lg:grid-cols-2 gap-6`):

- **Row 1:** Current Plan | Payment Method
- **Row 2:** API Usage | Next Billing
- **Full-width:** Invoice History (`lg:col-span-2`)

Success/canceled banners sit above the grid and are unaffected by the grid layout. At viewport widths below `lg` (1024px), all cards stack into a single column.

## Styling

All cards follow the Settings page design system:
- Cards: `bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]`
- Section headers: Material Icons Round + semibold title with bottom border
- Page container: full-width with `py-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto`
- Buttons: `bg-primary text-white rounded-lg hover:bg-primary/90`
- Icons: Material Icons Round

## Files

| File | Type | Purpose |
|------|------|---------|
| `page.tsx` | Server component | Auth, data fetching, card composition |
| `types.ts` | Types | SubscriptionData, PaymentMethodInfo, InvoiceInfo, UpcomingInvoiceInfo |
| `tier-display.ts` | Utility | Tier display names and API limits |
| `data.ts` | Data layer | getSubscription, getUsageCount, getStripeData |
| `current-plan-card.tsx` | Server component | Plan name, status, period, "Upgrade" link (FREE only) |
| `api-usage-card.tsx` | Server component | Usage progress bar |
| `payment-method-card.tsx` | Server component | Card on file |
| `next-billing-card.tsx` | Client component | Upcoming charge info + "Manage Billing" portal button |
| `invoice-history-card.tsx` | Server component | Invoice table with PDF links |
| `upgrade-prompt.tsx` | Client component | Upgrade CTA shown when `?plan=` is present |
| `success-refresh.tsx` | Client component | Polls and refreshes page after successful checkout until tier updates |

## Plan-Aware Redirect Flow

The pricing CTA behavior on the landing page (`/#pricing`) depends on authentication state and current plan context. The `PricingToggle` component (`src/components/landing/PricingToggle.tsx`) detects the logged-in user via Supabase client auth and renders different CTAs per tier.

### Current Plan Marking

When a FREE user clicks "Upgrade" on the billing page, the URL includes `?current={tier}#pricing`. Paid users manage plan changes through the Stripe Customer Portal ("Manage Billing"). The `PricingToggle` component:

1. Reads the `?current=` search param via `useSearchParams()` (wrapped in `<Suspense>` on the landing page)
2. For logged-in users, also fetches the tier via `GET /api/dashboard/tier` (takes priority over URL param)
3. Highlights the current plan card with a primary border, "Current Plan" badge, and disabled CTA button
4. Shows "Upgrade" / "Downgrade" labels on other plan CTAs relative to the current plan
5. Falls back to the default "Recommended" badge on Pro when no current plan context exists

### Logged-in users

- **Current plan:** Disabled "Current Plan" button (gray, no action)
- **Higher tier:** "Upgrade" triggers `POST /api/billing/checkout` for Starter/Pro, or shows mailto for Institutional
- **Lower tier:** "Downgrade" label — Analyst links to `/dashboard`, paid plans trigger checkout
- **Institutional:** "Contact Sales" mailto link (unchanged)

### Logged-out users

- **Analyst:** "Start Free" links to `/login?mode=magic&intent=signup`
- **Starter:** "Get Started" links to `/login?mode=magic&intent=signup&plan=starter`
- **Pro:** "Get Started" links to `/login?mode=magic&intent=signup&plan=pro`
- **Institutional:** "Contact Sales" mailto link (unchanged)

For logged-out users clicking "Get Started", the `?plan=` parameter is preserved through the full auth flow:

1. Login page passes `?next=/dashboard/billing?plan=pro` to the auth callback, which redirects after authentication
2. The billing page renders the `UpgradePrompt` component at the top, allowing the user to complete checkout via Stripe

Note: The standalone `/pricing` page has been retired and now returns a 308 permanent redirect to `/#pricing`. All dashboard-context upgrade links point to `/dashboard/billing` directly.

## Sidebar Nav

The billing page is accessible from the sidebar as **"Billing"** (previously "Subscription & Billing"), positioned after "Posts".

## Related

- Settings page now has a "Go to Billing" link instead of inline subscription management (see [settings-page.md](settings-page.md))
- Stripe portal API: `src/app/api/billing/portal/route.ts`
- Plan switch API: `src/app/api/billing/switch-plan/route.ts` — updates Stripe subscription price with proration (exists but not yet exposed in UI; plan changes go through the Stripe Customer Portal)
- Stripe client: `src/lib/stripe.ts`
- Pricing page: `src/app/pricing/page.tsx` — permanent redirect (308) to `/#pricing`
