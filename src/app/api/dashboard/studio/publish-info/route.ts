import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { normalizeTier, hasTier } from "@/lib/api/tier";
import { getWeeklyPublishUsage } from "@/lib/ratelimit";
import { getXCharLimit } from "@/lib/x/char-limits";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Anonymous users: return default publish info (no X account, no publish access)
  if (!user) {
    return NextResponse.json({
      tier: "FREE",
      canPublish: false,
      hasXAccount: false,
      xUsername: null,
      xDisplayName: null,
      xAvatarUrl: null,
      isXPremium: false,
      charLimit: getXCharLimit(false),
      publishUsed: 0,
      publishLimit: 1,
      publishReset: 0,
    });
  }

  const [subscription, xAccount] = await Promise.all([
    prisma.apiSubscription.findUnique({
      where: { userId: user.id },
      select: { tier: true },
    }),
    prisma.xAccount.findUnique({
      where: { userId: user.id },
      select: { username: true, displayName: true, avatarUrl: true, isXPremium: true },
    }),
  ]);

  const tier = normalizeTier(subscription?.tier);
  const canPublish = hasTier(tier, "STARTER");
  const publishUsage = await getWeeklyPublishUsage(user.id, tier);
  const isXPremium = xAccount?.isXPremium ?? false;
  const charLimit = getXCharLimit(isXPremium);

  return NextResponse.json({
    tier,
    canPublish,
    hasXAccount: !!xAccount,
    xUsername: xAccount?.username ?? null,
    xDisplayName: xAccount?.displayName ?? null,
    xAvatarUrl: xAccount?.avatarUrl ?? null,
    isXPremium,
    charLimit,
    publishUsed: publishUsage.used,
    publishLimit: publishUsage.limit,
    publishReset: publishUsage.reset,
  });
}
