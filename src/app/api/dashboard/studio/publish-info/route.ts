import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { normalizeTier, hasTier } from "@/lib/api/tier";
import { getWeeklyPublishUsage } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const [subscription, xAccount] = await Promise.all([
    prisma.apiSubscription.findUnique({
      where: { userId: user.id },
      select: { tier: true },
    }),
    prisma.xAccount.findUnique({
      where: { userId: user.id },
      select: { username: true, displayName: true, avatarUrl: true },
    }),
  ]);

  const tier = normalizeTier(subscription?.tier);
  const canPublish = hasTier(tier, "STARTER");
  const publishUsage = await getWeeklyPublishUsage(user.id, tier);

  return NextResponse.json({
    tier,
    canPublish,
    hasXAccount: !!xAccount,
    xUsername: xAccount?.username ?? null,
    xDisplayName: xAccount?.displayName ?? null,
    xAvatarUrl: xAccount?.avatarUrl ?? null,
    publishUsed: publishUsage.used,
    publishLimit: publishUsage.limit,
    publishReset: publishUsage.reset,
  });
}
