import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { normalizeTier } from "@/lib/api/tier";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import { getEngagementUsage } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId: user.id },
    select: { tier: true },
  });
  const tier = normalizeTier(subscription?.tier);

  const [usage, accountCount] = await Promise.all([
    getEngagementUsage(user.id, tier),
    prisma.monitoredAccount.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    replyUsed: usage.replyUsed,
    replyLimit: usage.replyLimit,
    imageUsed: usage.imageUsed,
    imageLimit: usage.imageLimit,
    accountCount,
    accountLimit: TIER_QUOTAS[tier].monitoredAccounts,
  });
}
