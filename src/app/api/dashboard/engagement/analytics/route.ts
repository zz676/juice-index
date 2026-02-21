import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const url = request.nextUrl;
  const accountIdsParam = url.searchParams.get("accountIds") || "";
  const requestedIds = accountIdsParam.split(",").filter(Boolean);
  const granularity = url.searchParams.get("granularity") === "hour" ? "hour" : "day";

  if (requestedIds.length === 0) {
    return NextResponse.json({ error: "accountIds is required" }, { status: 400 });
  }

  // Validate all accounts belong to the user
  const validAccounts = await prisma.monitoredAccount.findMany({
    where: { id: { in: requestedIds }, userId: user.id },
    select: { id: true, username: true },
  });

  if (validAccounts.length === 0) {
    return NextResponse.json({ series: {}, accountMap: {}, summary: {} });
  }

  const validIds = validAccounts.map((a) => a.id);
  const accountMap = Object.fromEntries(validAccounts.map((a) => [a.id, a.username]));

  const since = new Date();
  if (granularity === "hour") {
    const days = Math.min(7, Math.max(1, Number(url.searchParams.get("days")) || 1));
    since.setDate(since.getDate() - days);
  } else {
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days")) || 30));
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
  }

  type RawRow = { bucket: Date; replies: bigint; cost: number };

  const [seriesResults, summaryResults] = await Promise.all([
    Promise.all(
      validIds.map((accountId) =>
        granularity === "hour"
          ? prisma.$queryRaw<RawRow[]>`
              SELECT
                DATE_TRUNC('hour', "createdAt") AS bucket,
                COUNT(*) AS replies,
                SUM("totalCost") AS cost
              FROM juice_engagement_replies
              WHERE "userId" = ${user.id}
                AND "monitoredAccountId" = ${accountId}
                AND "createdAt" >= ${since}
              GROUP BY DATE_TRUNC('hour', "createdAt")
              ORDER BY bucket ASC
            `
          : prisma.$queryRaw<RawRow[]>`
              SELECT
                DATE("createdAt") AS bucket,
                COUNT(*) AS replies,
                SUM("totalCost") AS cost
              FROM juice_engagement_replies
              WHERE "userId" = ${user.id}
                AND "monitoredAccountId" = ${accountId}
                AND "createdAt" >= ${since}
              GROUP BY DATE("createdAt")
              ORDER BY bucket ASC
            `,
      ),
    ),
    Promise.all(
      validIds.map((accountId) =>
        prisma.engagementReply.aggregate({
          where: { userId: user.id, monitoredAccountId: accountId, createdAt: { gte: since } },
          _count: { id: true },
          _sum: { totalCost: true },
        }),
      ),
    ),
  ]);

  const series: Record<string, Array<{ date: string; replies: number; cost: number }>> = {};
  validIds.forEach((accountId, i) => {
    series[accountId] = seriesResults[i].map((row) => ({
      date: new Date(row.bucket).toISOString(),
      replies: Number(row.replies),
      cost: Number(row.cost ?? 0),
    }));
  });

  const summary: Record<string, { totalReplies: number; totalCost: number }> = {};
  validIds.forEach((accountId, i) => {
    summary[accountId] = {
      totalReplies: summaryResults[i]._count.id,
      totalCost: summaryResults[i]._sum.totalCost ?? 0,
    };
  });

  return NextResponse.json({ series, accountMap, summary, granularity });
}
