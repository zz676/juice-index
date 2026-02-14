import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe, priceId, type Plan, type Interval } from "@/lib/stripe";

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

  const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/+$/, "") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
    client_reference_id: user.id,
    customer_email: user.email || undefined,
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
