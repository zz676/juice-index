import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserPostStatus } from "@prisma/client";
import { postTweet } from "@/lib/x/post-tweet";
import { refreshTokenIfNeeded } from "@/lib/x/refresh-token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Unauthorized" },
      { status: 401 }
    );
  }

  const now = new Date();

  // Fetch posts that are SCHEDULED and either have no scheduledFor (immediate)
  // or their scheduledFor time has passed
  const posts = await prisma.userPost.findMany({
    where: {
      status: UserPostStatus.SCHEDULED,
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
    },
    take: 10,
    orderBy: { createdAt: "asc" },
  });

  const results: { id: string; status: string; error?: string }[] = [];

  for (const post of posts) {
    // Mark as PUBLISHING and increment attempts
    await prisma.userPost.update({
      where: { id: post.id },
      data: { status: UserPostStatus.PUBLISHING, attempts: post.attempts + 1 },
    });

    try {
      // Load user's XAccount
      const xAccount = await prisma.xAccount.findUnique({
        where: { userId: post.userId },
      });

      if (!xAccount) {
        await prisma.userPost.update({
          where: { id: post.id },
          data: {
            status: UserPostStatus.FAILED,
            lastError: "No X account connected",
          },
        });
        results.push({
          id: post.id,
          status: "FAILED",
          error: "No X account connected",
        });
        continue;
      }

      // Refresh token if expired
      const accessToken = await refreshTokenIfNeeded(xAccount);

      // Post the tweet
      const tweet = await postTweet(accessToken, post.content);

      await prisma.userPost.update({
        where: { id: post.id },
        data: {
          status: UserPostStatus.PUBLISHED,
          tweetId: tweet.id,
          tweetUrl: `https://x.com/i/status/${tweet.id}`,
          publishedAt: new Date(),
          lastError: null,
        },
      });

      results.push({ id: post.id, status: "PUBLISHED" });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      const newAttempts = post.attempts + 1;

      if (newAttempts < 3) {
        // Retry on next cron run
        await prisma.userPost.update({
          where: { id: post.id },
          data: {
            status: UserPostStatus.SCHEDULED,
            lastError: errorMessage,
          },
        });
        results.push({ id: post.id, status: "RETRY", error: errorMessage });
      } else {
        await prisma.userPost.update({
          where: { id: post.id },
          data: {
            status: UserPostStatus.FAILED,
            lastError: errorMessage,
          },
        });
        results.push({ id: post.id, status: "FAILED", error: errorMessage });
      }
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
