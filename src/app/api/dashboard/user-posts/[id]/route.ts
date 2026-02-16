import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { UserPostStatus } from "@prisma/client";
import { getXCharLimit } from "@/lib/x/char-limits";
import { normalizeTier, hasTier } from "@/lib/api/tier";
import { weeklyPublishLimit } from "@/lib/ratelimit";
import { refreshTokenIfNeeded } from "@/lib/x/refresh-token";
import { postTweet } from "@/lib/x/post-tweet";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const post = await prisma.userPost.findUnique({ where: { id } });
  if (!post || post.userId !== user.id) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Post not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ post });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const post = await prisma.userPost.findUnique({ where: { id } });
  if (!post || post.userId !== user.id) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Post not found" },
      { status: 404 }
    );
  }

  if (
    post.status !== UserPostStatus.DRAFT &&
    post.status !== UserPostStatus.FAILED &&
    post.status !== UserPostStatus.SCHEDULED
  ) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Only DRAFT, FAILED, or SCHEDULED posts can be edited" },
      { status: 400 }
    );
  }

  // SCHEDULED posts can only be rescheduled or cancelled back to draft
  if (post.status === UserPostStatus.SCHEDULED) {
    let bodyPeek: { action?: string };
    try {
      bodyPeek = await request.clone().json();
    } catch {
      bodyPeek = {};
    }
    if (bodyPeek.action && bodyPeek.action !== "schedule" && bodyPeek.action !== "draft") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "SCHEDULED posts can only be rescheduled or cancelled to draft" },
        { status: 400 }
      );
    }
  }

  let body: { content?: string; action?: string; scheduledFor?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { content, action, scheduledFor } = body;

  const data: Record<string, unknown> = {};

  if (content !== undefined) {
    const xAccount = await prisma.xAccount.findUnique({
      where: { userId: user.id },
      select: { isXPremium: true },
    });
    const charLimit = getXCharLimit(xAccount?.isXPremium ?? false);

    if (typeof content !== "string" || content.length === 0 || content.length > charLimit) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: `Content must be 1-${charLimit.toLocaleString()} characters` },
        { status: 400 }
      );
    }
    data.content = content;
  }

  if (action) {
    if (!["draft", "publish", "schedule"].includes(action)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Action must be draft, publish, or schedule" },
        { status: 400 }
      );
    }

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
      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "scheduledFor must be a valid future date" },
          { status: 400 }
        );
      }
      data.status = UserPostStatus.SCHEDULED;
      data.scheduledFor = scheduledDate;
    } else if (action === "publish") {
      // Tier check
      const pubSubscription = await prisma.apiSubscription.findUnique({
        where: { userId: user.id },
        select: { tier: true },
      });
      const pubTier = normalizeTier(pubSubscription?.tier);
      if (!hasTier(pubTier, "STARTER")) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Publishing to X requires a Starter subscription or higher." },
          { status: 403 }
        );
      }
      // Weekly quota check
      const rl = await weeklyPublishLimit(user.id, pubTier, new Date());
      if (!rl.success) {
        return NextResponse.json(
          { error: "QUOTA_EXCEEDED", message: `Weekly publish limit reached (${rl.limit}/${rl.limit}). Resets next Monday.` },
          { status: 429 }
        );
      }
      // Look up X account
      const xAccountForPublish = await prisma.xAccount.findUnique({
        where: { userId: user.id },
      });
      if (!xAccountForPublish) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "No X account connected. Connect your X account in Settings to publish." },
          { status: 400 }
        );
      }
      // Refresh token and publish
      let accessToken: string;
      try {
        accessToken = await refreshTokenIfNeeded(xAccountForPublish);
      } catch (err) {
        return NextResponse.json(
          { error: "PUBLISH_FAILED", message: `Failed to refresh X token: ${err instanceof Error ? err.message : "Unknown error"}` },
          { status: 502 }
        );
      }
      const postContent = (content as string) || post.content;
      let tweet: { id: string; text: string };
      try {
        tweet = await postTweet(accessToken, postContent);
      } catch (err) {
        return NextResponse.json(
          { error: "PUBLISH_FAILED", message: `Failed to publish to X: ${err instanceof Error ? err.message : "Unknown error"}` },
          { status: 502 }
        );
      }
      // Update post as published
      const publishedPost = await prisma.userPost.update({
        where: { id },
        data: {
          ...(content !== undefined ? { content } : {}),
          status: UserPostStatus.PUBLISHED,
          tweetId: tweet.id,
          tweetUrl: `https://x.com/i/status/${tweet.id}`,
          publishedAt: new Date(),
          scheduledFor: null,
          lastError: null,
          attempts: 0,
        },
      });
      return NextResponse.json({ post: publishedPost });
    } else {
      data.status = UserPostStatus.DRAFT;
      data.scheduledFor = null;
    }

    // Reset error state when re-submitting
    data.lastError = null;
    data.attempts = 0;
  }

  const updated = await prisma.userPost.update({ where: { id }, data });

  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const post = await prisma.userPost.findUnique({ where: { id } });
  if (!post || post.userId !== user.id) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Post not found" },
      { status: 404 }
    );
  }

  if (post.status === UserPostStatus.PUBLISHED) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Published posts cannot be deleted" },
      { status: 400 }
    );
  }

  if (post.status === UserPostStatus.PUBLISHING) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Cannot delete a post that is currently being published" },
      { status: 400 }
    );
  }

  await prisma.userPost.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
