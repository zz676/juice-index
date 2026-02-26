import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { EngagementReplyStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID_SORT_BY = ["createdAt", "status", "tone", "monitoredAccountId"] as const;
type SortBy = (typeof VALID_SORT_BY)[number];

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const url = request.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 10));

  const statusParam = url.searchParams.get("status") as EngagementReplyStatus | null;
  const accountId = url.searchParams.get("accountId") || null;
  const sortByParam = url.searchParams.get("sortBy") as SortBy | null;
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const sortBy: SortBy = VALID_SORT_BY.includes(sortByParam as SortBy) ? (sortByParam as SortBy) : "createdAt";

  const where: Record<string, unknown> = { userId: user.id };
  if (statusParam && Object.values(EngagementReplyStatus).includes(statusParam)) {
    where.status = statusParam;
  }
  if (accountId) {
    where.monitoredAccountId = accountId;
  }

  const accountFilterWhere: Record<string, unknown> = { userId: user.id };
  if (accountId) {
    accountFilterWhere.monitoredAccountId = accountId;
  }

  const [replies, total, statusCounts, costAggregate] = await Promise.all([
    prisma.engagementReply.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        sourceTweetId: true,
        sourceTweetText: true,
        sourceTweetUrl: true,
        replyText: true,
        replyTweetId: true,
        replyTweetUrl: true,
        replyImageUrl: true,
        imageStyleId: true,
        imageStyleName: true,
        tone: true,
        status: true,
        lastError: true,
        totalCost: true,
        createdAt: true,
        sourceTweetCreatedAt: true,
        monitoredAccountId: true,
        MonitoredAccount: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.engagementReply.count({ where }),
    prisma.engagementReply.groupBy({
      by: ["status"],
      where: accountFilterWhere,
      _count: { id: true },
    }),
    prisma.engagementReply.aggregate({
      where,
      _sum: { totalCost: true },
    }),
  ]);

  const statusCountMap = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.id])
  ) as Partial<Record<EngagementReplyStatus, number>>;

  return NextResponse.json({
    replies,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    statusCounts: statusCountMap,
    totalCost: costAggregate._sum.totalCost ?? 0,
  });
}
