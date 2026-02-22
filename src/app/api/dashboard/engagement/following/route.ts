import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const url = request.nextUrl;
  const search = url.searchParams.get("search")?.toLowerCase() || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  const where: Record<string, unknown> = { userId: user.id };
  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { displayName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.followingCache.findMany({
      where,
      orderBy: { username: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { xUserId: true, username: true, displayName: true, avatarUrl: true },
    }),
    prisma.followingCache.count({ where }),
  ]);

  return NextResponse.json({
    entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
