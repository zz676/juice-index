# Phase 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden auth, replace mock dashboard data with real DB queries, improve Stripe webhook coverage, add caching, and polish mobile responsiveness.

**Architecture:** Incremental changes across auth routes, API endpoints, and the Data Explorer UI. Each task is self-contained and independently committable. A shared `getRedirectBase()` utility avoids duplication across auth pages.

**Tech Stack:** Next.js 15 App Router, Supabase Auth, Prisma 7 (PostgreSQL), Stripe webhooks, Tailwind v4, Vitest (new)

---

### Task 1: Set up Vitest test runner

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest dev dep + test script)

**Step 1: Install vitest**

Run: `npm install -D vitest`

**Step 2: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

**Step 3: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify vitest runs**

Run: `npx vitest run`
Expected: "No test files found" (clean exit, no config errors)

**Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Add `sanitizeNextPath` to auth callback (open redirect fix)

**Files:**
- Create: `src/lib/auth/sanitize-next-path.ts`
- Create: `src/lib/auth/sanitize-next-path.test.ts`
- Modify: `src/app/auth/callback/route.ts:10`

**Step 1: Write the failing test**

```ts
// src/lib/auth/sanitize-next-path.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeNextPath } from "./sanitize-next-path";

describe("sanitizeNextPath", () => {
  it("returns /dashboard for null", () => {
    expect(sanitizeNextPath(null)).toBe("/dashboard");
  });

  it("returns /dashboard for empty string", () => {
    expect(sanitizeNextPath("")).toBe("/dashboard");
  });

  it("allows valid relative paths", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/auth/reset-password")).toBe("/auth/reset-password");
    expect(sanitizeNextPath("/dashboard/explorer")).toBe("/dashboard/explorer");
  });

  it("rejects paths not starting with /", () => {
    expect(sanitizeNextPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("http://evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("evil.com/hack")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs (//)", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("//evil.com/path")).toBe("/dashboard");
  });

  it("rejects paths with backslash tricks", () => {
    expect(sanitizeNextPath("/\\evil.com")).toBe("/dashboard");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/sanitize-next-path.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```ts
// src/lib/auth/sanitize-next-path.ts
export function sanitizeNextPath(next: string | null): string {
  if (!next) return "/dashboard";
  if (!next.startsWith("/")) return "/dashboard";
  if (next.startsWith("//")) return "/dashboard";
  if (next.includes("\\")) return "/dashboard";
  return next;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/sanitize-next-path.test.ts`
Expected: All 6 tests PASS

**Step 5: Wire into auth callback**

In `src/app/auth/callback/route.ts`, change line 10:

```diff
-    const next = searchParams.get('next') ?? '/dashboard'
+    const next = sanitizeNextPath(searchParams.get('next'))
```

Add import at top of file (after existing imports, before the `GET` function):

```ts
import { sanitizeNextPath } from '@/lib/auth/sanitize-next-path'
```

**Step 6: Verify build**

Run: `npx next build`
Expected: Build succeeds with no errors

**Step 7: Commit**

```bash
git add src/lib/auth/sanitize-next-path.ts src/lib/auth/sanitize-next-path.test.ts src/app/auth/callback/route.ts
git commit -m "fix: prevent open redirect in auth callback"
```

---

### Task 3: Extract `getRedirectBase` utility

**Files:**
- Create: `src/lib/auth/redirect-base.ts`
- Create: `src/lib/auth/redirect-base.test.ts`

**Step 1: Write the failing test**

```ts
// src/lib/auth/redirect-base.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { getRedirectBase } from "./redirect-base";

describe("getRedirectBase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns NEXT_PUBLIC_APP_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://juiceindex.com");
    expect(getRedirectBase()).toBe("https://juiceindex.com");
  });

  it("strips trailing slash from NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://juiceindex.com/");
    expect(getRedirectBase()).toBe("https://juiceindex.com");
  });

  it("returns fallback when env var is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getRedirectBase("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("returns empty string when env var unset and no fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getRedirectBase()).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/redirect-base.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```ts
// src/lib/auth/redirect-base.ts

/**
 * Returns the base URL for auth redirects.
 * Reads NEXT_PUBLIC_APP_URL, stripping trailing slashes.
 * Falls back to the provided fallback (typically window.location.origin on the client).
 */
export function getRedirectBase(fallback: string = ""): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return fallback;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/redirect-base.test.ts`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/lib/auth/redirect-base.ts src/lib/auth/redirect-base.test.ts
git commit -m "feat: add getRedirectBase utility for auth redirects"
```

---

### Task 4: Wire `getRedirectBase` into login page + fix forgot-password link + X/Twitter fallback

**Files:**
- Modify: `src/app/login/page.tsx:35-49` (handleSocialLogin)
- Modify: `src/app/login/page.tsx:57` (onSubmit appUrl)
- Modify: `src/app/login/page.tsx:235` (forgot-password link)

**Step 1: Add import and helper at top of LoginForm**

In `src/app/login/page.tsx`, add import:

```ts
import { getRedirectBase } from "@/lib/auth/redirect-base";
```

**Step 2: Replace handleSocialLogin function (lines 35-49)**

Replace the entire `handleSocialLogin` function with:

```ts
  async function handleSocialLogin(provider: "google" | "x") {
    setIsLoading(true);
    setStatus(null);
    try {
      const appUrl = getRedirectBase(window.location.origin);

      // Supabase may register X as "x" or "twitter" depending on config
      type OAuthProvider = "google" | "x" | "twitter";
      const candidates: OAuthProvider[] =
        provider === "x" ? ["x", "twitter"] : ["google"];

      let lastError: Error | null = null;
      for (const candidate of candidates) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: candidate,
          options: { redirectTo: `${appUrl}/auth/callback` },
        });
        if (!error) return;

        const msg = error.message.toLowerCase();
        if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
          lastError = error;
          continue;
        }
        throw error;
      }
      if (lastError) throw lastError;
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Login failed" });
      setIsLoading(false);
    }
  }
```

**Step 3: Replace `window.location.origin` in onSubmit (line 57)**

Change:
```diff
-    const appUrl = window.location.origin;
+    const appUrl = getRedirectBase(window.location.origin);
```

**Step 4: Fix forgot-password link (line 235)**

Change:
```diff
-                    <Link href="#" className="text-xs font-medium text-primary hover:text-primary-dark">
+                    <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-primary-dark">
```

**Step 5: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "fix: use configurable redirect base, X/Twitter fallback, fix forgot-password link"
```

---

### Task 5: Wire `getRedirectBase` into forgot-password page

**Files:**
- Modify: `src/app/forgot-password/page.tsx:20-22`

**Step 1: Add import**

```ts
import { getRedirectBase } from "@/lib/auth/redirect-base";
```

**Step 2: Replace hardcoded origin in onSubmit (line 21)**

Change:
```diff
-            const { error } = await supabase.auth.resetPasswordForEmail(email, {
-                redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
-            });
+            const appUrl = getRedirectBase(window.location.origin);
+            const { error } = await supabase.auth.resetPasswordForEmail(email, {
+                redirectTo: `${appUrl}/auth/callback?next=/auth/reset-password`,
+            });
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/forgot-password/page.tsx
git commit -m "fix: use configurable redirect base in forgot-password page"
```

---

### Task 6: Replace mock dashboard stats with real DB queries

**Files:**
- Modify: `src/app/api/dashboard/stats/route.ts` (full rewrite)

**Step 1: Rewrite the stats endpoint**

Replace the entire file content of `src/app/api/dashboard/stats/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch latest weekly sales summaries (most recent 9 weeks)
    const recentSummaries = await prisma.nevSalesSummary.findMany({
      orderBy: [{ year: "desc" }, { endDate: "desc" }],
      take: 9,
    });

    // Fetch latest CPCA retail data for YoY comparison
    const latestRetail = await prisma.cpcaNevRetail.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Fetch #1 ranked automaker from most recent month
    const topAutomaker = await prisma.automakerRankings.findFirst({
      where: { ranking: 1 },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // If no data exists, return an empty-but-structured response
    if (!recentSummaries.length && !latestRetail && !topAutomaker) {
      return NextResponse.json({
        cards: [],
        chart: { labels: [], currentYear: [], previousYear: [] },
        empty: true,
      });
    }

    // Build summary cards
    const latestSummary = recentSummaries[0] ?? null;
    const retailUnits = latestSummary
      ? `${Math.round(latestSummary.retailSales / 1000)}k`
      : "—";
    const retailYoyStr = latestSummary?.retailYoy != null
      ? `${latestSummary.retailYoy >= 0 ? "+" : ""}${latestSummary.retailYoy.toFixed(1)}%`
      : "";

    const penetrationCard = latestRetail
      ? {
          icon: "electric_car",
          label: "NEV Monthly Retail",
          value: `${(latestRetail.value / 10000).toFixed(1)}万`,
          change: latestRetail.yoyChange != null
            ? `${latestRetail.yoyChange >= 0 ? "+" : ""}${latestRetail.yoyChange.toFixed(1)}% YoY`
            : "",
          up: (latestRetail.yoyChange ?? 0) >= 0,
        }
      : { icon: "electric_car", label: "NEV Monthly Retail", value: "—" };

    const weeklyCard = {
      icon: "local_shipping",
      label: "Weekly Retail Sales",
      value: retailUnits,
      change: retailYoyStr,
      up: (latestSummary?.retailYoy ?? 0) >= 0,
    };

    const oemCard = topAutomaker
      ? {
          icon: "leaderboard",
          label: "Leading OEM",
          value: topAutomaker.automaker,
          badge: `#1 — ${topAutomaker.year}/${String(topAutomaker.month).padStart(2, "0")}`,
        }
      : { icon: "leaderboard", label: "Leading OEM", value: "—" };

    const cards = [penetrationCard, weeklyCard, oemCard];

    // Build chart data from recent summaries (reverse to chronological order)
    const chronological = [...recentSummaries].reverse();
    const labels = chronological.map((s) => {
      // Use endDate as label (e.g., "1/12" for Jan 12)
      const parts = s.endDate.split("-");
      return parts.length >= 3
        ? `${parseInt(parts[1])}/${parseInt(parts[2])}`
        : s.endDate;
    });
    const currentYear = chronological.map((s) =>
      Math.round(s.retailSales / 1000)
    );
    const previousYear = chronological.map((s) =>
      s.wholesaleSales != null ? Math.round(s.wholesaleSales / 1000) : 0
    );

    const chart = { labels, currentYear, previousYear };

    return NextResponse.json({ cards, chart });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/dashboard/stats/route.ts
git commit -m "feat: replace mock dashboard stats with real DB queries"
```

---

### Task 7: Add `checkout.session.completed` to Stripe webhook

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts:23-60`

**Step 1: Add checkout.session.completed handler**

After the existing subscription event block (after line 59), add a new `else if` block. The full event handling section should look like:

```ts
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    // ... existing subscription handler (keep as-is) ...
  } else if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId =
      (session.metadata?.userId as string) ||
      (session.client_reference_id as string) || "";
    if (!userId) {
      return NextResponse.json({ received: true });
    }

    // Only process subscription checkouts
    if (session.mode !== "subscription" || !session.subscription) {
      return NextResponse.json({ received: true });
    }

    // Fetch the subscription to get price/tier info
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    const price = sub.items?.data?.[0]?.price?.id as string | undefined;
    const tier = price ? tierFromPrice(price) : "PRO";

    await prisma.apiSubscription.upsert({
      where: { userId },
      update: {
        tier,
        status: sub.status,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.toString() ?? "",
        stripeSubscriptionId: sub.id,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
      create: {
        userId,
        tier,
        status: sub.status,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.toString() ?? "",
        stripeSubscriptionId: sub.id,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
    });
  }
```

**Step 2: Fix the import at top of file**

The file currently has `import prisma from "@/lib/prisma"` (default import) on line 2. Verify this matches your prisma export. The other files use `import { prisma } from "@/lib/prisma"`. Check `src/lib/prisma.ts` to see which is correct and use that consistently.

**Step 3: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: handle checkout.session.completed in Stripe webhook"
```

---

### Task 8: Add caching to dashboard stats API

**Files:**
- Modify: `src/app/api/dashboard/stats/route.ts`

**Step 1: Add in-memory cache and cache headers**

At the top of the file (after imports), add:

```ts
let cachedResponse: { data: unknown; expiry: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

**Step 2: Wrap the GET handler with cache logic**

At the start of the `GET` function body, before the try block:

```ts
  // Serve from in-memory cache if fresh
  if (cachedResponse && Date.now() < cachedResponse.expiry) {
    return NextResponse.json(cachedResponse.data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }
```

Before the final `return NextResponse.json(...)` in the success path, store the result:

```ts
    const result = { cards, chart };
    cachedResponse = { data: result, expiry: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/dashboard/stats/route.ts
git commit -m "perf: add in-memory TTL cache and Cache-Control to dashboard stats"
```

---

### Task 9: Mobile-responsive Data Explorer layout

**Files:**
- Modify: `src/app/dashboard/explorer/page.tsx:447-498`

**Step 1: Add mobile toggle state**

After the existing state declarations (around line 51), add:

```ts
const [showSidebar, setShowSidebar] = useState(true);
```

**Step 2: Add mobile toggle button to header**

In the header section (line 463), add a toggle button before the existing content:

Inside the header `<div className="flex items-center gap-4">`, add as the first child:

```tsx
            <button
              onClick={() => setShowSidebar((v) => !v)}
              className="lg:hidden p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/50 transition-all"
            >
              <span className="material-icons-round text-sm">
                {showSidebar ? "chevron_left" : "menu"}
              </span>
            </button>
```

**Step 3: Make left panel responsive**

Change the left panel container (line 498) from:

```tsx
<div className="w-full lg:w-[450px] bg-slate-custom-50 border-r border-slate-custom-200 flex flex-col overflow-y-auto">
```

to:

```tsx
<div className={`${showSidebar ? "w-full lg:w-[450px]" : "hidden lg:flex lg:w-[450px]"} bg-slate-custom-50 border-r border-slate-custom-200 flex flex-col overflow-y-auto`}>
```

**Step 4: On mobile, auto-hide sidebar after generating query**

At the end of `generateRunnableQuery` (before the `finally` block), add:

```ts
      // On mobile, collapse sidebar to show results
      if (window.innerWidth < 1024) setShowSidebar(false);
```

**Step 5: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/app/dashboard/explorer/page.tsx
git commit -m "ui: make Data Explorer sidebar collapsible on mobile"
```

---

### Task 10: Final verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run build**

Run: `npx next build`
Expected: Clean build, no errors or warnings

**Step 3: Run lint**

Run: `npx next lint`
Expected: No new errors
