import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeTier } from "@/lib/api/tier";

export async function GET() {
  try {
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
              // noop
            }
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ tier: "FREE", role: "USER" }, { status: 200 });
    }

    const [subscription, dbUser] = await Promise.all([
      prisma.apiSubscription.findUnique({
        where: { userId: user.id },
        select: { tier: true, status: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      }),
    ]);

    let tier = "FREE";
    if (
      subscription &&
      (subscription.status.toLowerCase() === "active" ||
        subscription.status.toLowerCase() === "trialing")
    ) {
      tier = normalizeTier(subscription.tier);
    }

    return NextResponse.json(
      { tier, role: dbUser?.role ?? "USER" },
      {
        status: 200,
        headers: { "Cache-Control": "private, max-age=60" },
      }
    );
  } catch {
    return NextResponse.json(
      { tier: "FREE", role: "USER", error: "INTERNAL" },
      { status: 500 }
    );
  }
}
