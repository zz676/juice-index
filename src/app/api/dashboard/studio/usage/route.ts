import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeTier, type ApiTier } from "@/lib/api/tier";
import { getStudioUsage } from "@/lib/ratelimit";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import { MODEL_REGISTRY } from "@/lib/studio/models";

export async function GET(req: NextRequest) {
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
    } = await supabase.auth.getUser();

    // Anonymous users: return FREE tier usage keyed by IP
    if (!user) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const identifier = `anon:${ip}`;
      const usage = await getStudioUsage(identifier, "FREE").catch(() => ({
        queryUsed: 0,
        queryLimit: TIER_QUOTAS.FREE.studioQueries,
        draftUsed: 0,
        draftLimit: TIER_QUOTAS.FREE.postDrafts,
        chartUsed: 0,
        chartLimit: TIER_QUOTAS.FREE.chartGen,
        publishUsed: 0,
        publishLimit: TIER_QUOTAS.FREE.weeklyPublishes,
        modelUsage: MODEL_REGISTRY.map((m) => ({
          modelId: m.id,
          queryUsed: 0,
          queryLimit: TIER_QUOTAS.FREE.studioQueriesByModel[m.id] ?? 0,
          draftUsed: 0,
          draftLimit: TIER_QUOTAS.FREE.postDraftsByModel[m.id] ?? 0,
        })),
      }));
      return NextResponse.json(usage, {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      });
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
