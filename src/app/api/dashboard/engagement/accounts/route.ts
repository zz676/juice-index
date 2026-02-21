import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { normalizeTier, hasTier } from "@/lib/api/tier";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import { lookupUserByUsername } from "@/lib/engagement/fetch-tweets";
import { refreshTokenIfNeeded } from "@/lib/x/refresh-token";
import type { ReplyTone } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const [accounts, subscription, xAccount] = await Promise.all([
    prisma.monitoredAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.apiSubscription.findUnique({
      where: { userId: user.id },
      select: { tier: true },
    }),
    prisma.xAccount.findUnique({
      where: { userId: user.id },
      select: { tokenError: true },
    }),
  ]);

  const tier = normalizeTier(subscription?.tier);
  const accountLimit = TIER_QUOTAS[tier].monitoredAccounts;

  return NextResponse.json({ accounts, accountLimit, xTokenError: xAccount?.tokenError ?? false });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId: user.id },
    select: { tier: true },
  });
  const tier = normalizeTier(subscription?.tier);

  if (!hasTier(tier, "STARTER")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Engagement Center requires a Starter subscription or higher." },
      { status: 403 }
    );
  }

  const accountLimit = TIER_QUOTAS[tier].monitoredAccounts;
  if (Number.isFinite(accountLimit)) {
    const existing = await prisma.monitoredAccount.count({ where: { userId: user.id } });
    if (existing >= accountLimit) {
      return NextResponse.json(
        { error: "QUOTA_EXCEEDED", message: `You can monitor at most ${accountLimit} accounts on your plan.` },
        { status: 403 }
      );
    }
  }

  let body: { username?: string; xUserId?: string; displayName?: string; avatarUrl?: string; tone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.username || typeof body.username !== "string") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "username is required" }, { status: 400 });
  }

  const username = body.username.replace(/^@/, "").trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid username" }, { status: 400 });
  }

  // Validate tone
  const VALID_TONES: ReplyTone[] = ["HUMOR", "SARCASTIC", "HUGE_FAN", "CHEERS", "NEUTRAL", "PROFESSIONAL"];
  const tone: ReplyTone = VALID_TONES.includes(body.tone as ReplyTone) ? (body.tone as ReplyTone) : "NEUTRAL";

  // If xUserId provided directly (from FollowingCache selection), skip lookup
  let xUserId = body.xUserId;
  let displayName = body.displayName ?? null;
  let avatarUrl = body.avatarUrl ?? null;

  if (!xUserId) {
    // Look up via X API
    const xAccount = await prisma.xAccount.findUnique({ where: { userId: user.id } });
    if (!xAccount) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "No X account connected. Connect your X account in Settings first." },
        { status: 400 }
      );
    }

    let accessToken: string;
    try {
      accessToken = await refreshTokenIfNeeded(xAccount);
    } catch {
      return NextResponse.json(
        { error: "X_TOKEN_ERROR", message: "Failed to refresh X token. Please reconnect your X account." },
        { status: 502 }
      );
    }

    let found;
    try {
      found = await lookupUserByUsername(accessToken, username);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("(401)")) {
        await prisma.xAccount.update({
          where: { id: xAccount.id },
          data: { tokenError: true },
        });
        return NextResponse.json(
          { error: "X_TOKEN_ERROR", message: "Your X connection is no longer valid. Please reconnect your X account in Settings." },
          { status: 502 }
        );
      }
      return NextResponse.json(
        { error: "X_API_ERROR", message: `Failed to look up @${username} on X: ${message}` },
        { status: 502 }
      );
    }
    if (!found) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `@${username} was not found on X.` },
        { status: 404 }
      );
    }
    xUserId = found.xUserId;
    displayName = found.displayName;
    avatarUrl = found.avatarUrl;
  }

  // Check for duplicate
  const duplicate = await prisma.monitoredAccount.findUnique({
    where: { userId_xUserId: { userId: user.id, xUserId } },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "CONFLICT", message: `@${username} is already being monitored.` },
      { status: 409 }
    );
  }

  const account = await prisma.monitoredAccount.create({
    data: { userId: user.id, xUserId, username, displayName, avatarUrl, tone },
  });

  return NextResponse.json({ account }, { status: 201 });
}
