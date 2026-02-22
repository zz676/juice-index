import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { refreshTokenIfNeeded } from "@/lib/x/refresh-token";
import { uploadMedia } from "@/lib/x/upload-media";
import { postTweet } from "@/lib/x/post-tweet";
import { EngagementReplyStatus } from "@prisma/client";

export const runtime = "nodejs";

const REPLY_SELECT = {
  id: true,
  sourceTweetId: true,
  sourceTweetText: true,
  sourceTweetUrl: true,
  replyText: true,
  replyImageUrl: true,
  replyTweetId: true,
  replyTweetUrl: true,
  tone: true,
  status: true,
  lastError: true,
  totalCost: true,
  createdAt: true,
  sourceTweetCreatedAt: true,
  monitoredAccountId: true,
  MonitoredAccount: { select: { username: true, displayName: true, avatarUrl: true } },
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const reply = await prisma.engagementReply.findFirst({
    where: { id, userId: user.id },
  });

  if (!reply) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Reply not found" }, { status: 404 });
  }

  let body: { action: string; replyText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  if (action === "update-text") {
    if (!body.replyText || typeof body.replyText !== "string") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "replyText is required" },
        { status: 400 },
      );
    }
    const updated = await prisma.engagementReply.update({
      where: { id },
      data: { replyText: body.replyText.trim() },
      select: REPLY_SELECT,
    });
    return NextResponse.json({ reply: updated });
  }

  if (action === "mark-posted") {
    const updated = await prisma.engagementReply.update({
      where: { id },
      data: { status: EngagementReplyStatus.POSTED_T },
      select: REPLY_SELECT,
    });
    return NextResponse.json({ reply: updated });
  }

  if (action === "discard") {
    const updated = await prisma.engagementReply.update({
      where: { id },
      data: { status: EngagementReplyStatus.DISCARDED },
      select: REPLY_SELECT,
    });
    return NextResponse.json({ reply: updated });
  }

  if (action === "post-to-x") {
    if (!reply.replyText) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "No reply text to post" },
        { status: 400 },
      );
    }

    const xAccount = await prisma.xAccount.findUnique({ where: { userId: user.id } });
    if (!xAccount) {
      return NextResponse.json(
        { error: "NO_X_ACCOUNT", message: "No X account connected" },
        { status: 400 },
      );
    }

    const accessToken = await refreshTokenIfNeeded(xAccount);

    let mediaIds: string[] | undefined;
    if (reply.replyImageUrl) {
      try {
        const imgRes = await fetch(reply.replyImageUrl);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const { mediaId } = await uploadMedia(
            accessToken,
            `data:image/png;base64,${base64}`,
          );
          mediaIds = [mediaId];
        }
      } catch (imgErr) {
        console.warn(`[replies/[id]] Failed to re-upload image for reply ${id}, posting without image:`, imgErr);
      }
    }

    const postedTweet = await postTweet(
      accessToken,
      reply.replyText,
      mediaIds,
      reply.sourceTweetId,
    );

    const updated = await prisma.engagementReply.update({
      where: { id },
      data: {
        status: EngagementReplyStatus.POSTED_T,
        replyTweetId: postedTweet.id,
        replyTweetUrl: `https://x.com/i/web/status/${postedTweet.id}`,
        lastError: null,
      },
      select: REPLY_SELECT,
    });
    return NextResponse.json({ reply: updated });
  }

  return NextResponse.json(
    { error: "BAD_REQUEST", message: "Unknown action" },
    { status: 400 },
  );
}
