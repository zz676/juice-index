# Email System (Phases 2–4) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add transactional emails via Resend — welcome email on first signup, payment confirmation on checkout, and a Resend webhook endpoint for delivery event tracking.

**Architecture:** A shared `src/lib/email.ts` module initialises the Resend SDK and exports typed send-helpers. Email templates are plain-HTML functions (no extra deps). Phase 2 hooks into the existing auth callback's `syncUser()`. Phase 3 hooks into the existing Stripe webhook's `checkout.session.completed` handler. Phase 4 adds a new `/api/resend/webhook` route that verifies Svix signatures and logs delivery events.

**Tech Stack:** `resend` (email SDK), `svix` (webhook signature verification), Next.js App Router, Prisma, TypeScript

---

## Task 1: Install packages and create Resend email client

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/lib/email.ts`

**Step 1: Install the two required packages**

```bash
npm install resend svix
```

Expected: Both appear in `package.json` `dependencies`.

**Step 2: Create the Resend client module**

Create `src/lib/email.ts`:

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.EMAIL_FROM ?? "Juice Index <noreply@juiceindex.io>";

export { resend, FROM };
```

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/lib/email.ts package.json package-lock.json
git commit -m "feat: install resend + svix; add Resend client module"
```

---

## Task 2: Create welcome email template

**Files:**
- Modify: `src/lib/email.ts`

**Step 1: Add `sendWelcomeEmail` helper**

Append to `src/lib/email.ts`:

```ts
export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h1 style="font-size:24px;margin-bottom:8px">Welcome to Juice Index, ${name}!</h1>
      <p style="font-size:16px;line-height:1.6">
        You're all set. Head to your dashboard to start querying data, building charts,
        and sharing insights.
      </p>
      <a href="https://juiceindex.io/dashboard"
         style="display:inline-block;margin-top:16px;padding:12px 24px;
                background:#6ada1b;color:#000;font-weight:600;
                border-radius:6px;text-decoration:none">
        Go to Dashboard
      </a>
      <p style="margin-top:32px;font-size:13px;color:#666">
        Questions? Reply to this email — we read every one.
      </p>
    </div>
  `;

  return resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Juice Index!",
    html,
  });
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add sendWelcomeEmail template"
```

---

## Task 3 (Phase 2): Send welcome email on first signup

The auth callback's `syncUser()` does a Prisma `user.upsert`. We detect "new user" by querying for the user _before_ the upsert — if absent, it's a first signup.

**Files:**
- Modify: `src/app/auth/callback/route.ts`

**Step 1: Import sendWelcomeEmail at the top of the file**

In `src/app/auth/callback/route.ts`, add to the existing import block at the bottom (after line 41):

```ts
import { sendWelcomeEmail } from '@/lib/email'
```

**Step 2: Detect new user and send welcome email inside `syncUser()`**

The function currently does a raw INSERT for `juice_api_subscriptions` and a `user.upsert`. Add a pre-check **before** the `user.upsert` block:

```ts
// Detect first-time signup BEFORE upsert
const existingUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } })
const isNewUser = existingUser === null
```

Then, **after** the `syncAccounts(...)` call and **before** `checkXPostingToken`, add:

```ts
// Send welcome email to new users (fire-and-forget)
if (isNewUser) {
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email!.split('@')[0]
  sendWelcomeEmail(user.email!, displayName).catch(console.error)
}
```

The full updated `syncUser` function should look like:

```ts
async function syncUser(user: SupabaseUser) {
    if (!user.email) return

    // Detect first-time signup BEFORE upsert
    const existingUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } })
    const isNewUser = existingUser === null

    // 1. Sync User
    await prisma.user.upsert({
        where: { id: user.id },
        update: {
            email: user.email,
            avatarUrl: user.user_metadata?.avatar_url,
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            updatedAt: new Date(),
        },
        create: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
            avatarUrl: user.user_metadata?.avatar_url,
            updatedAt: new Date(),
        },
    })

    // 2. Ensure ApiSubscription exists.
    const now = new Date()
    const subscriptionId = globalThis.crypto?.randomUUID?.() ?? `${user.id}-${Date.now()}`

    await prisma.$executeRaw`
      INSERT INTO "public"."juice_api_subscriptions" ("id", "userId", "tier", "status", "createdAt", "updatedAt")
      VALUES (${subscriptionId}, ${user.id}, 'FREE', 'active', ${now}, ${now})
      ON CONFLICT ("userId") DO NOTHING
    `

    // 3. Sync OAuth accounts (juice_accounts)
    await syncAccounts(user.id, user.identities ?? [])

    // 4. Send welcome email to new users (fire-and-forget)
    if (isNewUser) {
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
      sendWelcomeEmail(user.email, displayName).catch(console.error)
    }

    // 5. Proactively check X posting token health (fire-and-forget)
    checkXPostingToken(user.id).catch(console.error)
}
```

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat(phase-2): send welcome email on first signup"
```

---

## Task 4: Create payment confirmation email template

**Files:**
- Modify: `src/lib/email.ts`

**Step 1: Add `sendPaymentConfirmationEmail` helper**

Append to `src/lib/email.ts`:

```ts
export async function sendPaymentConfirmationEmail(opts: {
  to: string;
  name: string;
  tier: string;          // e.g. "STARTER" | "PRO"
  amountFormatted: string; // e.g. "$29.00"
  periodEnd: Date;
}) {
  const { to, name, tier, amountFormatted, periodEnd } = opts;
  const tierLabel = tier.charAt(0) + tier.slice(1).toLowerCase(); // "Starter" | "Pro"
  const renewDate = periodEnd.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h1 style="font-size:24px;margin-bottom:8px">Payment confirmed, ${name}!</h1>
      <p style="font-size:16px;line-height:1.6">
        Your <strong>Juice Index ${tierLabel}</strong> subscription is active.
        You were charged <strong>${amountFormatted}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:15px">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#555">Plan</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${tierLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#555">Amount</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${amountFormatted}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#555">Renews</td>
          <td style="padding:8px 0;font-weight:600">${renewDate}</td>
        </tr>
      </table>
      <a href="https://juiceindex.io/dashboard/billing"
         style="display:inline-block;padding:12px 24px;
                background:#6ada1b;color:#000;font-weight:600;
                border-radius:6px;text-decoration:none">
        View Billing
      </a>
      <p style="margin-top:32px;font-size:13px;color:#666">
        You can manage or cancel your subscription any time from your billing dashboard.
      </p>
    </div>
  `;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your Juice Index ${tierLabel} subscription is confirmed`,
    html,
  });
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add sendPaymentConfirmationEmail template"
```

---

## Task 5 (Phase 3): Send payment confirmation from Stripe webhook

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

**Step 1: Import the send helper and stripe customer lookup**

Add to the top of `src/app/api/stripe/webhook/route.ts` (after existing imports):

```ts
import { sendPaymentConfirmationEmail } from "@/lib/email";
```

**Step 2: Add email send inside the `checkout.session.completed` handler**

After the `prisma.apiSubscription.upsert(...)` call inside the `checkout.session.completed` block (around line 120), add:

```ts
    // Send payment confirmation email
    try {
      // Resolve user email + name from DB
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (dbUser?.email) {
        // Resolve amount from Stripe session
        const amountTotal = session.amount_total as number | null;
        const currency = (session.currency as string | null) ?? "usd";
        const amountFormatted = amountTotal != null
          ? new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amountTotal / 100)
          : "";
        await sendPaymentConfirmationEmail({
          to: dbUser.email,
          name: dbUser.name ?? dbUser.email.split("@")[0],
          tier,
          amountFormatted,
          periodEnd: new Date(sub.current_period_end * 1000),
        });
      }
    } catch (emailErr) {
      console.error("[stripe-webhook] payment confirmation email failed:", emailErr);
    }
```

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat(phase-3): send payment confirmation email on checkout.session.completed"
```

---

## Task 6 (Phase 4): Resend webhook endpoint for event tracking

Resend uses Svix for webhook signatures. The `RESEND_WEBHOOK_SECRET` env var holds the `whsec_...` value.

**Files:**
- Create: `src/app/api/resend/webhook/route.ts`

**Step 1: Create the webhook route**

Create `src/app/api/resend/webhook/route.ts`:

```ts
import { NextResponse } from "next/server";
import { Webhook } from "svix";

export const runtime = "nodejs";

// Resend webhook event types we care about
type ResendEmailEvent = {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.delivery_delayed"
    | "email.complained"
    | "email.bounced"
    | "email.opened"
    | "email.clicked";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    [key: string]: unknown;
  };
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  // Read raw body for signature verification
  const body = await request.text();

  // Svix headers
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing svix headers" }, { status: 400 });
  }

  let event: ResendEmailEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEmailEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resend-webhook] signature verification failed:", message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Log the event — extend this to write to DB or alert on bounces/complaints
  console.log(`[resend-webhook] ${event.type}`, {
    emailId: event.data.email_id,
    to: event.data.to,
    subject: event.data.subject,
    createdAt: event.created_at,
  });

  // Alert on hard failures
  if (event.type === "email.bounced" || event.type === "email.complained") {
    console.warn(`[resend-webhook] ⚠️  ${event.type} for`, event.data.to);
  }

  return NextResponse.json({ received: true });
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Build check**

```bash
npm run build
```

Expected: succeeds with no errors.

**Step 4: Commit**

```bash
git add src/app/api/resend/webhook/route.ts
git commit -m "feat(phase-4): add Resend webhook endpoint with Svix signature verification"
```

---

## Task 7: Final verification

**Step 1: Full build**

```bash
npm run build
```

Expected: clean build.

**Step 2: Register webhook URL in Resend dashboard**

1. Log in to [resend.com](https://resend.com) → Webhooks
2. Add endpoint: `https://juiceindex.io/api/resend/webhook`
3. Select events: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`
4. Copy the signing secret into `.env.local` as `RESEND_WEBHOOK_SECRET=whsec_...`

**Step 3: Manual smoke test — welcome email**

Create a brand-new test account on juiceindex.io (or locally with a `+test` email alias). Verify:
- Welcome email arrives within ~30 seconds
- CTA link points to `/dashboard`

**Step 4: Manual smoke test — payment confirmation**

Complete a Stripe test-mode checkout. Verify:
- Payment confirmation email arrives
- Tier, amount, and renewal date are correct
- "View Billing" link works

**Step 5: Commit docs update**

```bash
git add docs/
git commit -m "docs: add email system implementation plan"
```
