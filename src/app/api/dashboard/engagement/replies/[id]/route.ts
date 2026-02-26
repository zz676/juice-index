import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { refreshTokenIfNeeded } from "@/lib/x/refresh-token";
import { uploadMedia } from "@/lib/x/upload-media";
import { postTweet } from "@/lib/x/post-tweet";
import { EngagementReplyStatus } from "@prisma/client";
import { pickUserTone } from "@/lib/engagement/pick-tone";
import { generateReply } from "@/lib/engagement/generate-reply";
import { generateImage } from "@/lib/engagement/generate-image";
import { uploadEngagementImage } from "@/lib/supabase/storage";
import { computeTotalReplyCost } from "@/lib/engagement/cost-utils";

export const runtime = "nodejs";

const REPLY_SELECT = {
  id: true,
  sourceTweetId: true,
  sourceTweetText: true,
  sourceTweetUrl: true,
  replyText: true,
  replyImageUrl: true,
  imageStyleId: true,
  imageStyleName: true,
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

  let body: { action: string; replyText?: string; withImage?: boolean; imageStyleId?: string | null };
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

  if (action === "regenerate") {
    const withImage = body.withImage === true;

    if (!reply.sourceTweetText) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "No source tweet text to regenerate from" },
        { status: 400 },
      );
    }

    const account = await prisma.monitoredAccount.findUnique({
      where: { id: reply.monitoredAccountId },
      select: { tone: true, toneWeights: true, temperature: true, accountContext: true, imageStyleId: true },
    });

    if (!account) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Account not found" }, { status: 404 });
    }

    const userTones = await prisma.userTone.findMany({ where: { userId: user.id } });
    const toneMap = new Map(userTones.map((t) => [t.id, t]));
    const picked = pickUserTone(account, toneMap);

    const recentReplies = await prisma.engagementReply
      .findMany({
        where: {
          monitoredAccountId: reply.monitoredAccountId,
          status: "POSTED",
          replyText: { not: null },
          id: { not: id },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { replyText: true },
      })
      .then((rows) => rows.map((r) => r.replyText!));

    const generated = await generateReply(reply.sourceTweetText, picked.prompt, {
      accountContext: account.accountContext ?? null,
      recentReplies,
      temperature: account.temperature ?? 0.8,
    });

    // Resolve image style: use body override, fall back to account's default
    let resolvedImageStyleId: string | null = null;
    let resolvedImageStyleName: string | null = null;
    let imageStylePrompt: string | undefined;

    if (withImage) {
      const styleId = body.imageStyleId !== undefined ? body.imageStyleId : account.imageStyleId;
      if (styleId) {
        const imageStyle = await prisma.userImageStyle.findFirst({
          where: { id: styleId, userId: user.id },
        });
        if (imageStyle) {
          resolvedImageStyleId = imageStyle.id;
          resolvedImageStyleName = imageStyle.name;
          imageStylePrompt = imageStyle.prompt;
        }
      }
      // If no style resolved, fall back to first seeded style
      if (!imageStylePrompt) {
        const firstStyle = await prisma.userImageStyle.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
        });
        if (firstStyle) {
          resolvedImageStyleId = firstStyle.id;
          resolvedImageStyleName = firstStyle.name;
          imageStylePrompt = firstStyle.prompt;
        }
      }
    }

    let newImageUrl: string | null = null;
    let imageGenerated = false;
    if (withImage) {
      try {
        const imgResult = await generateImage(reply.sourceTweetText, generated.text, imageStylePrompt);
        if (imgResult.generated) {
          newImageUrl = await uploadEngagementImage(id, imgResult.imageBase64);
          imageGenerated = true;
        }
      } catch (imgErr) {
        console.warn(`[regenerate] Image generation failed for reply ${id}:`, imgErr);
      }
    }

    const costs = computeTotalReplyCost(generated.inputTokens, generated.outputTokens, imageGenerated);

    const updated = await prisma.engagementReply.update({
      where: { id },
      data: {
        replyText: generated.text,
        replyImageUrl: withImage ? newImageUrl : null,
        imageStyleId: withImage ? resolvedImageStyleId : null,
        imageStyleName: withImage ? resolvedImageStyleName : null,
        userToneId: picked.toneId ?? null,
        userToneName: picked.toneName,
        status: EngagementReplyStatus.SENT_TO_TELEGRAM,
        textGenerationCost: costs.textCost,
        imageGenerationCost: costs.imageCost,
        apiCallCost: costs.apiCost,
        totalCost: costs.totalCost,
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
