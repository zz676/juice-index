import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe, priceId, type Plan, type Interval } from "@/lib/stripe";
import { getRedirectBase } from "@/lib/auth/redirect-base";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.enum(["starter", "pro"]),
  interval: z.enum(["month", "year"]),
});

async function getAuthedUser() {
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
  return data.user;
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "BAD_REQUEST", code: "BAD_REQUEST", message: "Invalid input" }, { status: 400 });
  }

  const plan = body.data.plan as Plan;
  const interval = body.data.interval as Interval;
  const price = priceId(plan, interval);

  const appUrl = getRedirectBase();
  if (!appUrl) {
    return NextResponse.json(
      { error: "SERVER_CONFIG", message: "Application URL is not configured" },
      { status: 500 }
    );
  }

  const firstMonthCoupon = process.env.STRIPE_FIRST_MONTH_COUPON;
  const discounts = firstMonthCoupon && interval === "month"
    ? [{ coupon: firstMonthCoupon }]
    : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(discounts && { discounts }),
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
    client_reference_id: user.id,
    customer_email: user.email || undefined,
    payment_method_collection: "always",
    saved_payment_method_options: {
      payment_method_save: "enabled",
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
    },
    metadata: {
      userId: user.id,
      plan,
      interval,
    },
  });

  return NextResponse.json({ url: session.url });
}
