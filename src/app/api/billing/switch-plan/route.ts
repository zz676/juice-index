import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { stripe, priceId, type Plan, type Interval } from "@/lib/stripe";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.enum(["starter", "pro"]),
  interval: z.enum(["month", "year"]),
});

async function getAuthedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function POST(request: NextRequest) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid input" },
      { status: 400 }
    );
  }

  const sub = await prisma.apiSubscription.findUnique({
    where: { userId },
    select: { stripeSubscriptionId: true },
  });

  if (!sub?.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "NO_SUBSCRIPTION", message: "No active subscription to switch" },
      { status: 400 }
    );
  }

  const targetPlan = body.data.plan as Plan;
  const targetInterval = body.data.interval as Interval;
  const newPriceId = priceId(targetPlan, targetInterval);

  // Retrieve the current subscription to get the item ID
  const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
  const currentItem = stripeSub.items.data[0];
  if (!currentItem) {
    return NextResponse.json(
      { error: "NO_ITEM", message: "Subscription has no items" },
      { status: 400 }
    );
  }

  // Switch the price on the existing subscription
  // proration_behavior: "create_prorations" gives credit for unused time on old plan
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    items: [{ id: currentItem.id, price: newPriceId }],
    proration_behavior: "create_prorations",
    metadata: {
      userId,
      plan: targetPlan,
      interval: targetInterval,
    },
  });

  return NextResponse.json({ success: true });
}
