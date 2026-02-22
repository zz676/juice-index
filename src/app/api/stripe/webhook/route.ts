import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, tierFromPrice } from "@/lib/stripe";

export const runtime = "nodejs";

/** Reject events created more than 5 minutes ago (Stripe recommendation). */
const MAX_EVENT_AGE_SECONDS = 300;

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "BAD_REQUEST", code: "BAD_REQUEST", message: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "BAD_SIGNATURE", code: "BAD_SIGNATURE", message }, { status: 400 });
  }

  // Clock tolerance: reject events older than 5 minutes
  const eventAge = Math.floor(Date.now() / 1000) - event.created;
  if (eventAge > MAX_EVENT_AGE_SECONDS) {
    return NextResponse.json(
      { error: "STALE_EVENT", code: "STALE_EVENT", message: "Event is too old" },
      { status: 400 },
    );
  }

  // Idempotency: skip events we've already processed
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // We only need a small set of events to keep subscription state correct.
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as any;
    const userId = sub?.metadata?.userId as string | undefined;
    if (!userId) {
      return NextResponse.json({ received: true });
    }

    const price = sub.items?.data?.[0]?.price?.id as string | undefined;
    const tier = price ? tierFromPrice(price) : "PRO";

    await prisma.apiSubscription.upsert({
      where: { userId },
      update: {
        tier,
        status: sub.status,
        stripeCustomerId: sub.customer,
        stripeSubscriptionId: sub.id,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
      create: {
        userId,
        tier,
        status: sub.status,
        stripeCustomerId: sub.customer,
        stripeSubscriptionId: sub.id,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
    });
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
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : "",
        stripeSubscriptionId: sub.id,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
      create: {
        userId,
        tier,
        status: sub.status,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : "",
        stripeSubscriptionId: sub.id,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
    });
  }

  // Record event as processed for idempotency
  try {
    await prisma.stripeWebhookEvent.create({
      data: { id: event.id, eventType: event.type },
    });
  } catch {
    // Ignore duplicate key errors (race condition between parallel webhook deliveries)
  }

  return NextResponse.json({ received: true });
}
