import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getStripe, tierFromPrice } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/billing/sync
 * Pulls the user's active Stripe subscription by customer email and syncs it
 * to the local DB. Used as a fallback when webhooks haven't fired yet (e.g.
 * immediately after checkout on the success redirect).
 */
export async function POST() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const stripe = getStripe();

  // Check if we already have a stripeCustomerId in the DB
  const existingSub = await prisma.apiSubscription.findUnique({
    where: { userId: auth.user.id },
    select: { stripeCustomerId: true },
  });

  let customerId = existingSub?.stripeCustomerId ?? null;

  // Fall back to looking up the customer by email
  if (!customerId && auth.user.email) {
    const customers = await stripe.customers.list({
      email: auth.user.email,
      limit: 1,
    });
    customerId = customers.data[0]?.id ?? null;
  }

  if (!customerId) {
    return NextResponse.json({ synced: false });
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
    expand: ["data.items.data.price"],
  });

  const sub = subs.data[0];
  if (!sub) {
    return NextResponse.json({ synced: false });
  }

  const price = sub.items.data[0]?.price?.id;
  const tier = price ? tierFromPrice(price) : "PRO";

  await prisma.apiSubscription.upsert({
    where: { userId: auth.user.id },
    update: {
      tier,
      status: sub.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    },
    create: {
      userId: auth.user.id,
      tier,
      status: sub.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    },
  });

  return NextResponse.json({ synced: true, tier });
}
