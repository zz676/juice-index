import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.apiSubscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "NO_SUBSCRIPTION", code: "NO_SUBSCRIPTION", message: "No subscription found" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/+$/, "") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
