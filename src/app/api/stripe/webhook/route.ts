import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe, tierFromPrice } from "@/lib/stripe";

export const runtime = "nodejs";

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
  }

  return NextResponse.json({ received: true });
}
