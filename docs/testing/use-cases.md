# Visual Data Studio (VDS) Use Cases

Use cases describe specific user interactions and expected outcomes, serving as the basis for manual testing and automated E2E scenarios.

## 1. Data Explorer (Core Feature)

### UC-1: Explore EV Sales Data (Natural Language Query)
**Actor**: Pro User
**Goal**: View EV sales trend for a specific brand.
**Preconditions**: User is logged in, has active Pro subscription.
**Steps**:
1. User navigates to `/dashboard/studio`.
2. User enters prompt: "Show me BYD sales trend for 2024".
3. System processes prompt via LLM -> SQL.
4. System executes SQL against `Shared Data Tables` (e.g., `CpcaNevRetail`).
5. System displays a line chart showing monthly sales figures.
6. User clicks "Customize Chart".
7. User changes chart type to "Bar".
**Expected Result**: Chart updates instantly to bar format without re-querying API.

### UC-2: Invalid Query Handling
**Actor**: User
**Goal**: Receive meaningful error feedback.
**Preconditions**: User is logged in.
**Steps**:
1. User navigates to `/dashboard/studio`.
2. User enters nonsense query: "Show me the price of tea in China".
3. System attempts to generate SQL.
4. System determines query is irrelevant to available schema.
**Expected Result**: System displays error message: "I can only help with EV market data. Please try a different query."

### UC-3: Free Tier Limit Enforcement
**Actor**: Free User
**Goal**: Attempt to use advanced features restricted to Pro.
**Preconditions**: User is logged in, free tier (0 credits remaining).
**Steps**:
1. User navigates to `/dashboard/studio`.
2. User enters query.
3. System checks API usage limits (Rate Limiting).
4. System detects limit reached.
**Expected Result**: System blocks request and displays upgrade modal: "You have reached your daily limit. Upgrade to Pro for unlimited access."

## 2. Authentication & Access

### UC-4: Social Login (Google / X)
**Actor**: New or Returning User
**Goal**: Log in via OAuth provider.
**Preconditions**: None.
**Steps**:
1. User clicks "Sign in with Google" or "Sign in with X".
2. System redirects to provider OAuth page.
3. User authorizes `Juice Index`.
4. System handling callback creates/updates `User` and `Account` records in `juice_` tables.
5. System redirects to `/dashboard`.
**Expected Result**: User is logged in with correct profile data.

### UC-5: Email & Password Login
**Actor**: User preferring credentials.
**Goal**: Log in with email/password.
**Preconditions**: User has set a password.
**Steps**:
1. User enters email and password.
2. User clicks "Sign In".
3. System validates credentials against `juice_users` (passwordHash).
**Expected Result**: User is logged in.

### UC-5b: Magic Link Login
**Actor**: User preferring passwordless code.
**Goal**: Log in via email link.
**Steps**:
1. User enters email.
2. User clicks "Send Magic Link".
3. System sends email via Supabase.
4. User clicks link in email -> Redirects to `/auth/callback` -> `/dashboard`.
**Expected Result**: User is logged in without password.

## 3. Billing (Stripe)

### UC-6: Upgrade to Pro
**Actor**: Free User
**Goal**: Purchase subscription.
**Preconditions**: User logged in.
**Steps**:
1. User clicks "Upgrade" in dashboard sidebar.
2. User selects "Pro Monthly" plan ($29/mo).
3. System redirects to Stripe Checkout.
4. User completes payment.
5. Stripe sends webhook `checkout.session.completed`.
6. System updates `ApiSubscription` table with status `active`.
**Expected Result**: User is redirected back to dashboard, and "Pro" badge is visible.

## 4. Dashboard Stats

### UC-7: View Market Overview
**Actor**: Any User
**Goal**: See high-level market stats.
**Preconditions**: Logged in.
**Steps**:
1. User lands on `/dashboard`.
2. System fetches latest aggregated stats (Total EV Sales, YoY Growth) from `NevSalesSummary`.
**Expected Result**: Cards verify against latest data in `NevSalesSummary` table.
