import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { normalizeTier } from "@/lib/api/tier";
import { csvExportMonthlyLimit } from "@/lib/ratelimit";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/dashboard/csv-export
 *
 * Validates tier eligibility and monthly quota before allowing a CSV export.
 * The actual data serialization happens client-side; this endpoint tracks the
 * export count and returns a go/no-go response.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId: user.id },
    select: { tier: true, status: true },
  });

  const tier = normalizeTier(subscription?.tier);
  const rl = await csvExportMonthlyLimit(user.id, tier, new Date());

  if (!rl.success) {
    const msg =
      rl.limit === 0
        ? "CSV export is not available on the Free plan. Upgrade to Pro to export data."
        : `You've reached your monthly CSV export limit (${rl.limit}). Limit resets next month.`;
    return NextResponse.json(
      { error: "QUOTA_EXCEEDED", message: msg },
      { status: 403 }
    );
  }

  return NextResponse.json({
    allowed: true,
    remaining: rl.remaining,
    limit: rl.limit,
  });
}
