import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { refreshTokenIfNeeded } from "@/lib/x/refresh-token";
import { fetchTweetById } from "@/lib/engagement/fetch-tweets";
import { generateReply } from "@/lib/engagement/generate-reply";
import { generateImage } from "@/lib/engagement/generate-image";
import { computeTotalReplyCost } from "@/lib/engagement/cost-utils";
import { pickToneByWeights, FALLBACK_TONE_PROMPTS } from "@/lib/engagement/pick-tone";
import { REPLY_MODELS, DEFAULT_REPLY_MODEL } from "@/lib/engagement/models";
import type { UserTone } from "@prisma/client";

export const runtime = "nodejs";

const TWEET_URL_RE = /(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/;

function extractTweetId(input: string): string | null {
  const m = input.match(TWEET_URL_RE);
  return m?.[1] ?? null;
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireUser();
  if (authError) return authError;
  const userId = user.id;

  let body: {
    tweetInput?: string;
    toneId?: string;
    toneWeights?: Record<string, number>;
    adHocTone?: string;
    temperature?: number;
    accountContext?: string;
    generateImage?: boolean;
    imageStyleId?: string;
    model?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { tweetInput, toneId, toneWeights, adHocTone, temperature, accountContext, generateImage: doImage, imageStyleId, model: requestedModel } = body;

  // Validate model ID
  const modelId = requestedModel && REPLY_MODELS.some((m) => m.id === requestedModel)
    ? requestedModel
    : DEFAULT_REPLY_MODEL;

  if (!tweetInput?.trim()) {
    return NextResponse.json({ message: "tweetInput is required" }, { status: 400 });
  }

  // --- Resolve tweet text ---
  let tweetText: string;
  let quotedTweetText: string | undefined;

  const tweetId = extractTweetId(tweetInput.trim());
  if (tweetId) {
    // Fetch from X API using user's credentials
    const xAccount = await prisma.xAccount.findUnique({ where: { userId } });
    if (!xAccount) {
      return NextResponse.json({ message: "No X account connected. Connect your X account in Settings to fetch tweets by URL." }, { status: 400 });
    }

    let accessToken: string;
    try {
      accessToken = await refreshTokenIfNeeded(xAccount);
    } catch {
      return NextResponse.json({ message: "X account token expired. Please reconnect in Settings." }, { status: 400 });
    }

    console.log(`[Playground] Fetching tweet ${tweetId} for user ${userId}`);
    const fetched = await fetchTweetById(accessToken, tweetId);
    if (!fetched) {
      console.warn(`[Playground] Tweet ${tweetId} not found or inaccessible for user ${userId}`);
      return NextResponse.json({ message: "Could not fetch tweet. It may be private or deleted." }, { status: 400 });
    }
    console.log(`[Playground] Tweet ${tweetId} fetched — length: ${fetched.text.length} chars`);

    tweetText = fetched.text;
    quotedTweetText = fetched.quotedTweetText;
  } else {
    // Treat as raw tweet text
    tweetText = tweetInput.trim();
  }

  // --- Resolve tone prompt ---
  let tonePrompt: string;
  let resolvedToneName: string;

  if (adHocTone?.trim()) {
    tonePrompt = adHocTone.trim();
    resolvedToneName = "Ad-hoc";
  } else if (toneId) {
    // Single tone mode
    const tone = await prisma.userTone.findFirst({
      where: { id: toneId, userId },
    });
    if (!tone) {
      return NextResponse.json({ message: "Tone not found" }, { status: 400 });
    }
    tonePrompt = tone.prompt;
    resolvedToneName = tone.name;
  } else if (toneWeights && Object.keys(toneWeights).length > 0) {
    // Weight-based mode
    const userTones = await prisma.userTone.findMany({ where: { userId } });
    const toneMap = new Map<string, UserTone>(userTones.map((t) => [t.id, t]));
    const picked = pickToneByWeights(toneWeights, toneMap);
    if (!picked) {
      tonePrompt = FALLBACK_TONE_PROMPTS["NEUTRAL"];
      resolvedToneName = "Neutral (fallback)";
    } else {
      tonePrompt = picked.prompt;
      resolvedToneName = picked.toneName;
    }
  } else {
    // No tone specified — use neutral fallback
    tonePrompt = FALLBACK_TONE_PROMPTS["NEUTRAL"];
    resolvedToneName = "Neutral";
  }

  // --- Generate reply ---
  const generated = await generateReply(tweetText, tonePrompt, {
    quotedTweetText,
    accountContext: accountContext ?? null,
    temperature: temperature ?? 0.8,
    model: modelId,
  });

  // --- Optionally generate image ---
  let imageBase64: string | undefined;
  let imageGenerated = false;
  let imageStyleName: string | undefined;

  if (doImage) {
    // Resolve image style prompt
    let imageStylePrompt: string | undefined;
    if (imageStyleId) {
      const imageStyle = await prisma.userImageStyle.findFirst({
        where: { id: imageStyleId, userId },
      });
      if (imageStyle) {
        imageStylePrompt = imageStyle.prompt;
        imageStyleName = imageStyle.name;
      }
    }
    // Fall back to first seeded style if none resolved
    if (!imageStylePrompt) {
      const firstStyle = await prisma.userImageStyle.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      if (firstStyle) {
        imageStylePrompt = firstStyle.prompt;
        imageStyleName = firstStyle.name;
      }
    }

    try {
      const imgResult = await generateImage(tweetText, generated.text, imageStylePrompt);
      if (imgResult.generated) {
        imageBase64 = imgResult.imageBase64;
        imageGenerated = true;
      }
    } catch {
      // Image generation failed — still return the reply text
    }
  }

  // --- Compute costs ---
  const costs = computeTotalReplyCost(generated.inputTokens, generated.outputTokens, imageGenerated, modelId);

  return NextResponse.json({
    replyText: generated.text,
    toneUsed: resolvedToneName,
    modelUsed: modelId,
    inputTokens: generated.inputTokens,
    outputTokens: generated.outputTokens,
    costs,
    ...(imageBase64 !== undefined && { imageBase64 }),
    ...(imageStyleName !== undefined && { imageStyleName }),
  });
}
