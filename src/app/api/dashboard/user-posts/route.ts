import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { UserPostStatus, AuthProvider } from "@prisma/client";
import { normalizeTier, hasTier } from "@/lib/api/tier";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import { weeklyPublishLimit, getWeeklyPublishUsage } from "@/lib/ratelimit";

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

  const [posts, total, subscription, xAccount, xLoginAccount] = await Promise.all([
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
    prisma.xAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    }),
    prisma.account.findFirst({
      where: { userId: user.id, provider: AuthProvider.X },
      select: { id: true },
    }),
  ]);

  const userTier = normalizeTier(subscription?.tier);
  const canPublish = hasTier(userTier, "STARTER");
  const canSchedule = hasTier(userTier, "STARTER");

  const publishUsage = await getWeeklyPublishUsage(user.id, userTier);

  return NextResponse.json({
    posts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    isPro: canPublish,
    tier: userTier,
    canPublish,
    canSchedule,
    hasXAccount: !!xAccount,
    hasXLoginIdentity: !!xLoginAccount,
    publishUsed: publishUsage.used,
    publishLimit: publishUsage.limit,
    publishReset: publishUsage.reset,
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

  // Resolve user tier once for all checks
  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId: user.id },
    select: { tier: true },
  });
  const userTier = normalizeTier(subscription?.tier);
  const quotas = TIER_QUOTAS[userTier];

  if (action === "publish") {
    // FREE tier cannot publish to X
    if (!hasTier(userTier, "STARTER")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Publishing to X requires a Starter subscription or higher. Upgrade to publish." },
        { status: 403 }
      );
    }
    // Check weekly publish quota
    const rl = await weeklyPublishLimit(user.id, userTier, new Date());
    if (!rl.success) {
      return NextResponse.json(
        { error: "QUOTA_EXCEEDED", message: `Weekly publish limit reached (${rl.limit}/${rl.limit}). Resets next Monday.` },
        { status: 429 }
      );
    }
    // Queued for immediate publishing by cron
    postStatus = UserPostStatus.SCHEDULED;
    scheduledDate = null;
  } else if (action === "schedule") {
    if (!hasTier(userTier, "STARTER")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Scheduling requires a Starter subscription or higher" },
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

    // Enforce max pending scheduled posts
    if (Number.isFinite(quotas.maxScheduled)) {
      const pendingCount = await prisma.userPost.count({
        where: { userId: user.id, status: UserPostStatus.SCHEDULED },
      });
      if (pendingCount >= quotas.maxScheduled) {
        return NextResponse.json(
          { error: "QUOTA_EXCEEDED", message: `You can have at most ${quotas.maxScheduled} pending scheduled posts. Delete or publish some first.` },
          { status: 403 }
        );
      }
    }

    postStatus = UserPostStatus.SCHEDULED;
  }

  // Enforce max stored drafts for FREE tier
  if (action === "draft" && Number.isFinite(quotas.maxDrafts)) {
    const draftCount = await prisma.userPost.count({
      where: { userId: user.id, status: UserPostStatus.DRAFT },
    });
    if (draftCount >= quotas.maxDrafts) {
      return NextResponse.json(
        { error: "QUOTA_EXCEEDED", message: `You can store at most ${quotas.maxDrafts} drafts. Delete some to create new ones, or upgrade to Pro for unlimited drafts.` },
        { status: 403 }
      );
    }
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
