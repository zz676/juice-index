import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeTier, type ApiTier } from "@/lib/api/tier";
import { getStudioUsage } from "@/lib/ratelimit";

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
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const subscription = await prisma.apiSubscription.findUnique({
      where: { userId: user.id },
      select: { tier: true, status: true },
    });

    let tier: ApiTier = "FREE";
    if (
      subscription &&
      (subscription.status.toLowerCase() === "active" ||
        subscription.status.toLowerCase() === "trialing")
    ) {
      tier = normalizeTier(subscription.tier);
    }

    const usage = await getStudioUsage(user.id, tier);

    return NextResponse.json(usage, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "INTERNAL", message: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}
