import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { EngagementReplyStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID_SORT_BY = ["createdAt", "status", "tone", "totalCost"] as const;
type SortBy = (typeof VALID_SORT_BY)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { userId } = await params;

  const url = request.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  const sortByParam = url.searchParams.get("sortBy") as SortBy | null;
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const statusParam = url.searchParams.get("status") as EngagementReplyStatus | null;

  const sortBy: SortBy = VALID_SORT_BY.includes(sortByParam as SortBy) ? (sortByParam as SortBy) : "createdAt";

  const where: Record<string, unknown> = { userId };
  if (statusParam && Object.values(EngagementReplyStatus).includes(statusParam)) {
    where.status = statusParam;
  }

  // Verify user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "NOT_FOUND", message: "User not found" }, { status: 404 });
  }

  const [replies, total] = await Promise.all([
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
        tone: true,
        status: true,
        lastError: true,
        attempts: true,
        textGenerationCost: true,
        imageGenerationCost: true,
        apiCallCost: true,
        totalCost: true,
        createdAt: true,
        updatedAt: true,
        MonitoredAccount: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.engagementReply.count({ where }),
  ]);

  return NextResponse.json({
    user: targetUser,
    replies,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
