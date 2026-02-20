import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

type SortBy = "name" | "email" | "totalReplies" | "successRate" | "lastReplyDate" | "totalCost";

type AdminEngagementRow = {
  userId: string;
  name: string | null;
  email: string;
  totalReplies: bigint;
  postedReplies: bigint;
  failedReplies: bigint;
  totalCost: number | null;
  lastReplyDate: Date | null;
};

type SummaryRow = {
  totalReplies: bigint;
  totalCost: number | null;
  activeUsers: bigint;
};

export async function GET(request: NextRequest) {
  try {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = request.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  const sortByParam = url.searchParams.get("sortBy") as SortBy | null;
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "ASC" : "DESC";

  const VALID_SORT: SortBy[] = ["name", "email", "totalReplies", "successRate", "lastReplyDate", "totalCost"];
  const sortBy: SortBy = VALID_SORT.includes(sortByParam as SortBy) ? (sortByParam as SortBy) : "totalReplies";

  const orderClause: Record<SortBy, string> = {
    name: `u.name ${sortOrder}`,
    email: `u.email ${sortOrder}`,
    totalReplies: `total_replies ${sortOrder}`,
    successRate: `posted_replies::float / NULLIF(total_replies, 0) ${sortOrder} NULLS LAST`,
    lastReplyDate: `last_reply_date ${sortOrder} NULLS LAST`,
    totalCost: `total_cost ${sortOrder} NULLS LAST`,
  };

  const offset = (page - 1) * limit;

  const [rows, summary] = await Promise.all([
    prisma.$queryRaw<AdminEngagementRow[]>(
      Prisma.sql`
        SELECT
          u.id AS "userId",
          u.name,
          u.email,
          COUNT(r.id)::bigint AS "totalReplies",
          COUNT(CASE WHEN r.status = 'POSTED' THEN 1 END)::bigint AS "postedReplies",
          COUNT(CASE WHEN r.status = 'FAILED' THEN 1 END)::bigint AS "failedReplies",
          SUM(r."totalCost") AS "totalCost",
          MAX(r."createdAt") AS "lastReplyDate"
        FROM juice_users u
        INNER JOIN juice_engagement_replies r ON r."userId" = u.id
        GROUP BY u.id, u.name, u.email
        ORDER BY ${Prisma.raw(orderClause[sortBy])}
        LIMIT ${limit} OFFSET ${offset}
      `
    ),
    prisma.$queryRaw<SummaryRow[]>(
      Prisma.sql`
        SELECT
          COUNT(r.id)::bigint AS "totalReplies",
          SUM(r."totalCost") AS "totalCost",
          COUNT(DISTINCT r."userId")::bigint AS "activeUsers"
        FROM juice_engagement_replies r
      `
    ),
  ]);

  const totalUsersRow = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(DISTINCT r."userId")::bigint AS count
      FROM juice_engagement_replies r
    `
  );
  const totalUsers = Number(totalUsersRow[0]?.count ?? 0);

  const s = summary[0] ?? { totalReplies: 0n, totalCost: null, activeUsers: 0n };
  const totalReplies = Number(s.totalReplies);
  const totalCost = s.totalCost ?? 0;
  const activeUsers = Number(s.activeUsers);

  const users = rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    email: r.email,
    totalReplies: Number(r.totalReplies),
    postedReplies: Number(r.postedReplies),
    failedReplies: Number(r.failedReplies),
    successRate: Number(r.totalReplies) > 0
      ? Math.round((Number(r.postedReplies) / Number(r.totalReplies)) * 100)
      : 0,
    totalCost: r.totalCost ?? 0,
    lastReplyDate: r.lastReplyDate,
  }));

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total: totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
    },
    summary: {
      totalReplies,
      totalCost,
      avgCostPerReply: totalReplies > 0 ? totalCost / totalReplies : 0,
      activeUsers,
    },
  });
  } catch (err) {
    console.error("[admin/engagement GET]", err);
    return NextResponse.json(
      { error: "Internal server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
