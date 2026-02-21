import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const url = request.nextUrl;
  const accountId = url.searchParams.get("accountId");
  const granularity = url.searchParams.get("granularity") === "hour" ? "hour" : "day";

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  const since = new Date();
  if (granularity === "hour") {
    const days = Math.min(7, Math.max(1, Number(url.searchParams.get("days")) || 1));
    since.setDate(since.getDate() - days);
    // keep current hour boundary — no floor to midnight
  } else {
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days")) || 30));
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
  }

  const where = {
    userId: user.id,
    monitoredAccountId: accountId,
    createdAt: { gte: since },
  };

  const [rawRows, summary] = await Promise.all([
    granularity === "hour"
      ? prisma.$queryRaw<Array<{ bucket: Date; replies: bigint; cost: number }>>`
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
      : prisma.$queryRaw<Array<{ bucket: Date; replies: bigint; cost: number }>>`
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
    prisma.engagementReply.aggregate({
      where,
      _count: { id: true },
      _sum: { totalCost: true },
    }),
  ]);

  const data = rawRows.map((row) => ({
    date: new Date(row.bucket).toISOString(),
    replies: Number(row.replies),
    cost: Number(row.cost ?? 0),
  }));

  return NextResponse.json({
    data,
    granularity,
    summary: {
      totalReplies: summary._count.id,
      totalCost: summary._sum.totalCost ?? 0,
    },
  });
}
