import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const url = request.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

  const where = { userId: user.id };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return NextResponse.json({
    notifications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    unreadCount,
  });
}

export async function PATCH(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: { ids?: string[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: body.ids }, userId: user.id },
      data: { read: true },
    });
  } else {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Provide { ids: string[] } or { all: true }" },
      { status: 400 }
    );
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return NextResponse.json({ success: true, unreadCount });
}
