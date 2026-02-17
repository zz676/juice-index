import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserPostStatus } from "@prisma/client";
import { postTweet } from "@/lib/x/post-tweet";
import { uploadMedia } from "@/lib/x/upload-media";
import { refreshTokenIfNeeded, XTokenExpiredError } from "@/lib/x/refresh-token";
import { verifyCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startTime = Date.now();
  const now = new Date();
  console.log(`[cron] publish-user-posts started at ${now.toISOString()}`);

  // Fetch posts that are SCHEDULED and their scheduledFor time has passed
  const posts = await prisma.userPost.findMany({
    where: {
      status: UserPostStatus.SCHEDULED,
      scheduledFor: { lte: now },
    },
    take: 10,
    orderBy: { scheduledFor: "asc" },
  });

  console.log(`[cron] Found ${posts.length} posts ready to publish`);

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

      // Refresh token if expired — fail permanently if token is revoked (retries won't help)
      let accessToken: string;
      try {
        accessToken = await refreshTokenIfNeeded(xAccount);
      } catch (err) {
        if (err instanceof XTokenExpiredError) {
          await prisma.userPost.update({
            where: { id: post.id },
            data: {
              status: UserPostStatus.FAILED,
              lastError: "X connection expired. Please reconnect your X account in Settings and reschedule.",
            },
          });
          results.push({ id: post.id, status: "FAILED", error: "X token expired" });
          continue;
        }
        throw err; // other errors go to the retry catch block
      }

      // Upload image if stored on the post
      let mediaIds: string[] | undefined;
      if (post.imageBase64) {
        const { mediaId } = await uploadMedia(accessToken, post.imageBase64);
        mediaIds = [mediaId];
      }

      // Post the tweet
      const tweet = await postTweet(accessToken, post.content, mediaIds);

      await prisma.userPost.update({
        where: { id: post.id },
        data: {
          status: UserPostStatus.PUBLISHED,
          tweetId: tweet.id,
          tweetUrl: `https://x.com/i/status/${tweet.id}`,
          publishedAt: new Date(),
          lastError: null,
          imageBase64: null,
        },
      });

      console.log(`[cron] Published post ${post.id} -> tweet ${tweet.id}`);
      results.push({ id: post.id, status: "PUBLISHED" });
    } catch (err) {
      console.error(`[cron] Failed to publish post ${post.id}:`, err);
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

  const published = results.filter((r) => r.status === "PUBLISHED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  const retrying = results.filter((r) => r.status === "RETRY").length;
  const durationMs = Date.now() - startTime;

  console.log(
    `[cron] Done in ${durationMs}ms — ${posts.length} found, ${published} published, ${failed} failed, ${retrying} retrying`,
  );

  return NextResponse.json({
    processed: results.length,
    published,
    failed,
    retrying,
    durationMs,
    results,
  });
}
