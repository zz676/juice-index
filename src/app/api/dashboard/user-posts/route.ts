import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { UserPostStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const url = request.nextUrl;
  const status = url.searchParams.get("status") as UserPostStatus | null;
  const search = url.searchParams.get("search") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

  const where: Record<string, unknown> = { userId: user.id };
  if (status && Object.values(UserPostStatus).includes(status)) {
    where.status = status;
  }
  if (search) {
    where.content = { contains: search, mode: "insensitive" };
  }

  const [posts, total, subscription] = await Promise.all([
    prisma.userPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.userPost.count({ where }),
    prisma.apiSubscription.findUnique({
      where: { userId: user.id },
      select: { tier: true },
    }),
  ]);

  const isPro = subscription?.tier === "PRO";

  return NextResponse.json({
    posts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    isPro,
  });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: { content?: string; action?: string; scheduledFor?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { content, action = "draft", scheduledFor } = body;

  if (!content || typeof content !== "string" || content.length === 0 || content.length > 280) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Content must be 1-280 characters" },
      { status: 400 }
    );
  }

  if (!["draft", "publish", "schedule"].includes(action)) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Action must be draft, publish, or schedule" },
      { status: 400 }
    );
  }

  let postStatus: UserPostStatus = UserPostStatus.DRAFT;
  let scheduledDate: Date | null = null;

  if (action === "schedule") {
    const subscription = await prisma.apiSubscription.findUnique({
      where: { userId: user.id },
      select: { tier: true },
    });
    if (subscription?.tier !== "PRO") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Scheduling requires a PRO subscription" },
        { status: 403 }
      );
    }
    if (!scheduledFor) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "scheduledFor is required for scheduling" },
        { status: 400 }
      );
    }
    scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "scheduledFor must be a valid future date" },
        { status: 400 }
      );
    }
    postStatus = UserPostStatus.SCHEDULED;
  } else if (action === "publish") {
    // Queued for immediate publishing by cron
    postStatus = UserPostStatus.SCHEDULED;
    scheduledDate = null;
  }

  const post = await prisma.userPost.create({
    data: {
      userId: user.id,
      content,
      status: postStatus,
      scheduledFor: scheduledDate,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
