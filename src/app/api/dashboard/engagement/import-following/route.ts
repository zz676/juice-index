import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { hasTier, normalizeTier } from "@/lib/api/tier";
import { fetchFollowingList } from "@/lib/engagement/fetch-tweets";
import { refreshTokenIfNeeded } from "@/lib/x/refresh-token";

export const runtime = "nodejs";

export async function POST() {
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

  const xAccount = await prisma.xAccount.findUnique({ where: { userId: user.id } });
  if (!xAccount) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "No X account connected." },
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

  // Fetch all pages of the following list
  const allEntries: Awaited<ReturnType<typeof fetchFollowingList>>["entries"] = [];
  let nextToken: string | undefined;

  do {
    const page = await fetchFollowingList(accessToken, xAccount.xUserId, nextToken);
    allEntries.push(...page.entries);
    nextToken = page.nextToken;
  } while (nextToken && allEntries.length < 5000);

  if (allEntries.length === 0) {
    return NextResponse.json({ imported: 0, total: 0 });
  }

  // Upsert all entries into FollowingCache
  await prisma.$transaction(
    allEntries.map((entry) =>
      prisma.followingCache.upsert({
        where: { userId_xUserId: { userId: user.id, xUserId: entry.xUserId } },
        update: {
          username: entry.username,
          displayName: entry.displayName,
          avatarUrl: entry.avatarUrl,
        },
        create: {
          userId: user.id,
          xUserId: entry.xUserId,
          username: entry.username,
          displayName: entry.displayName,
          avatarUrl: entry.avatarUrl,
        },
      })
    ),
    { isolationLevel: "ReadCommitted" }
  );

  const total = await prisma.followingCache.count({ where: { userId: user.id } });
  return NextResponse.json({ imported: allEntries.length, total });
}
