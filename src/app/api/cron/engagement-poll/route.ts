import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";
import { refreshTokenIfNeeded, XTokenExpiredError } from "@/lib/x/refresh-token";
import { fetchRecentTweets } from "@/lib/engagement/fetch-tweets";
import { generateReply } from "@/lib/engagement/generate-reply";
import { generateImage } from "@/lib/engagement/generate-image";
import { uploadMedia } from "@/lib/x/upload-media";
import { postTweet } from "@/lib/x/post-tweet";
import { engagementReplyLimit, engagementImageLimit } from "@/lib/ratelimit";
import { normalizeTier, hasTier } from "@/lib/api/tier";
import { computeTotalReplyCost } from "@/lib/engagement/cost-utils";
import { EngagementReplyStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startTime = Date.now();
  const now = new Date();
  console.log(`[cron] engagement-poll started at ${now.toISOString()}`);

  // Fetch all enabled monitored accounts
  const enabledAccounts = await prisma.monitoredAccount.findMany({
    where: { enabled: true },
    orderBy: { userId: "asc" },
  });

  console.log(`[cron] Found ${enabledAccounts.length} enabled monitored account(s)`);

  // Group by userId
  const byUserId = new Map<string, typeof enabledAccounts>();
  for (const account of enabledAccounts) {
    const group = byUserId.get(account.userId) ?? [];
    group.push(account);
    byUserId.set(account.userId, group);
  }

  let processed = 0;
  let replied = 0;
  let failed = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {
    globalPaused: 0,
    insufficientTier: 0,
    noXAccount: 0,
    tokenError: 0,
  };

  for (const [userId, accounts] of byUserId) {
    // Fetch user-level data in parallel
    const [xAccount, config, subscription] = await Promise.all([
      prisma.xAccount.findUnique({ where: { userId } }),
      prisma.engagementConfig.findUnique({ where: { userId }, select: { globalPaused: true } }),
      prisma.apiSubscription.findUnique({ where: { userId }, select: { tier: true } }),
    ]);

    const tier = normalizeTier(subscription?.tier);
    console.log(`[cron] User ${userId} | tier=${tier} | accounts=${accounts.length} | xAccount=${!!xAccount} | globalPaused=${config?.globalPaused ?? false}`);

    // Skip if globally paused
    if (config?.globalPaused) {
      console.log(`[cron] ↳ SKIP: globally paused`);
      skipped += accounts.length;
      skipReasons.globalPaused += accounts.length;
      continue;
    }

    // Check tier
    if (!hasTier(tier, "STARTER")) {
      console.log(`[cron] ↳ SKIP: insufficient tier (${tier}), need STARTER+`);
      skipped += accounts.length;
      skipReasons.insufficientTier += accounts.length;
      continue;
    }

    // Require connected X account
    if (!xAccount) {
      console.log(`[cron] ↳ SKIP: no X account connected`);
      skipped += accounts.length;
      skipReasons.noXAccount += accounts.length;
      continue;
    }

    // Refresh token — skip entire user if token is revoked
    let accessToken: string;
    try {
      accessToken = await refreshTokenIfNeeded(xAccount);
      console.log(`[cron] ↳ Token OK, processing ${accounts.length} account(s)`);
    } catch (err) {
      if (err instanceof XTokenExpiredError) {
        console.error(`[cron] ↳ SKIP: X token expired`);
      } else {
        console.error(`[cron] ↳ SKIP: token refresh failed`, err);
      }
      skipped += accounts.length;
      skipReasons.tokenError += accounts.length;
      continue;
    }

    // ── Retry PENDING replies (attempts < 3) ────────────────────────────
    const pendingReplies = await prisma.engagementReply.findMany({
      where: { userId, status: EngagementReplyStatus.PENDING, attempts: { lt: 3 } },
      orderBy: { createdAt: "asc" },
    });

    if (pendingReplies.length > 0) {
      console.log(`[cron] ↳ Found ${pendingReplies.length} PENDING reply(ies) to retry`);
    }

    for (const reply of pendingReplies) {
      const replyQuota = await engagementReplyLimit(userId, tier, new Date());
      if (!replyQuota.success) {
        console.log(`[cron]   Retry quota exhausted for user ${userId}, stopping retries`);
        break;
      }

      const account = accounts.find((a) => a.id === reply.monitoredAccountId);
      if (!account) {
        console.warn(`[cron]   Retry skipped reply ${reply.id}: monitored account disabled or removed`);
        continue;
      }

      const newAttempts = reply.attempts + 1;
      console.log(`[cron]   Retrying reply ${reply.id} for @${account.username} tweet ${reply.sourceTweetId} (attempt ${newAttempts})`);

      try {
        await prisma.engagementReply.update({
          where: { id: reply.id },
          data: { status: EngagementReplyStatus.GENERATING, attempts: newAttempts },
        });

        // Reuse existing reply text if already generated, otherwise regenerate
        let replyText = reply.replyText;
        let inputTokens = 0;
        let outputTokens = 0;
        if (!replyText) {
          const generated = await generateReply(reply.sourceTweetText ?? "", account.tone, account.customTonePrompt);
          replyText = generated.text;
          inputTokens = generated.inputTokens;
          outputTokens = generated.outputTokens;
        }

        let imageGenerated = false;
        let mediaIds: string[] | undefined;
        if (account.alwaysGenerateImage) {
          const imgQuota = await engagementImageLimit(userId, tier, new Date());
          if (imgQuota.success) {
            try {
              const imgResult = await generateImage(reply.sourceTweetText ?? "", replyText);
              if (imgResult.generated) {
                const { mediaId } = await uploadMedia(accessToken, `data:image/png;base64,${imgResult.imageBase64}`);
                mediaIds = [mediaId];
                imageGenerated = true;
              }
            } catch (imgErr) {
              console.warn(`[cron]   Image generation failed for retry ${reply.id}, posting without image:`, imgErr);
            }
          }
        }

        await prisma.engagementReply.update({
          where: { id: reply.id },
          data: { status: EngagementReplyStatus.POSTING, replyText },
        });

        const postedTweet = await postTweet(accessToken, replyText, mediaIds, reply.sourceTweetId);
        const costs = computeTotalReplyCost(inputTokens, outputTokens, imageGenerated);

        await prisma.engagementReply.update({
          where: { id: reply.id },
          data: {
            status: EngagementReplyStatus.POSTED,
            replyTweetId: postedTweet.id,
            replyTweetUrl: `https://x.com/i/web/status/${postedTweet.id}`,
            textGenerationCost: costs.textCost,
            imageGenerationCost: costs.imageCost,
            apiCallCost: costs.apiCost,
            totalCost: costs.totalCost,
            lastError: null,
          },
        });

        console.log(`[cron]   Retry succeeded: reply ${reply.id} → tweet ${postedTweet.id}`);
        replied++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`[cron]   Retry failed for reply ${reply.id} (attempt ${newAttempts}): ${errorMessage}`);
        await prisma.engagementReply.update({
          where: { id: reply.id },
          data: {
            status: newAttempts >= 3 ? EngagementReplyStatus.FAILED : EngagementReplyStatus.PENDING,
            lastError: errorMessage,
            attempts: newAttempts,
          },
        });
        failed++;
      }
    }

    // Process each monitored account for this user
    for (const account of accounts) {
      processed++;
      try {
        console.log(`[cron]   Checking @${account.username} (lastSeenTweetId=${account.lastSeenTweetId ?? "none"})`);
        const tweets = await fetchRecentTweets(accessToken, account.xUserId, account.lastSeenTweetId);

        if (tweets.length === 0) {
          console.log(`[cron]   @${account.username}: no new tweets`);
          await prisma.monitoredAccount.update({
            where: { id: account.id },
            data: { lastCheckedAt: new Date() },
          });
          continue;
        }

        console.log(`[cron]   @${account.username}: ${tweets.length} new tweet(s) → will reply to all (quota permitting)`);

        // Tweets are returned newest-first from X API
        const newestTweetId = tweets[0].id;
        let quotaExhausted = false;

        for (const tweet of tweets) {
          // If quota was exhausted by a previous tweet, log and record each remaining tweet as SKIPPED
          if (quotaExhausted) {
            console.log(`[cron]   SKIPPED tweet ${tweet.id} (@${account.username}): daily reply quota exhausted`);
            await prisma.engagementReply.create({
              data: {
                userId,
                monitoredAccountId: account.id,
                sourceTweetId: tweet.id,
                sourceTweetText: tweet.text,
                sourceTweetUrl: tweet.url,
                tone: account.tone,
                status: EngagementReplyStatus.SKIPPED,
                lastError: "Daily reply quota exhausted",
                attempts: 0,
              },
            });
            skipped++;
            continue;
          }

          // Check daily reply quota (increments counter)
          const replyQuota = await engagementReplyLimit(userId, tier, new Date());
          if (!replyQuota.success) {
            console.log(`[cron]   Daily reply quota exhausted for user ${userId} (limit=${replyQuota.limit}, remaining=0)`);
            quotaExhausted = true;
            // Log and record this tweet as SKIPPED too
            console.log(`[cron]   SKIPPED tweet ${tweet.id} (@${account.username}): daily reply quota exhausted`);
            await prisma.engagementReply.create({
              data: {
                userId,
                monitoredAccountId: account.id,
                sourceTweetId: tweet.id,
                sourceTweetText: tweet.text,
                sourceTweetUrl: tweet.url,
                tone: account.tone,
                status: EngagementReplyStatus.SKIPPED,
                lastError: "Daily reply quota exhausted",
                attempts: 0,
              },
            });
            skipped++;
            continue;
          }
          console.log(`[cron]   Quota OK (remaining=${replyQuota.remaining}), generating reply for tweet ${tweet.id}`);

          // Create PENDING record
          const replyRecord = await prisma.engagementReply.create({
            data: {
              userId,
              monitoredAccountId: account.id,
              sourceTweetId: tweet.id,
              sourceTweetText: tweet.text,
              sourceTweetUrl: tweet.url,
              tone: account.tone,
              status: EngagementReplyStatus.PENDING,
              attempts: 1,
            },
          });

          try {
            // Update to GENERATING
            await prisma.engagementReply.update({
              where: { id: replyRecord.id },
              data: { status: EngagementReplyStatus.GENERATING },
            });

            // Generate reply text
            const generated = await generateReply(tweet.text, account.tone, account.customTonePrompt);

            // Optionally generate and upload an image
            let imageGenerated = false;
            let mediaIds: string[] | undefined;

            if (account.alwaysGenerateImage) {
              const imgQuota = await engagementImageLimit(userId, tier, new Date());
              if (imgQuota.success) {
                try {
                  const imgResult = await generateImage(tweet.text, generated.text);
                  if (imgResult.generated) {
                    const { mediaId } = await uploadMedia(
                      accessToken,
                      `data:image/png;base64,${imgResult.imageBase64}`,
                    );
                    mediaIds = [mediaId];
                    imageGenerated = true;
                  }
                } catch (imgErr) {
                  console.warn(
                    `[cron] Image generation failed for reply ${replyRecord.id}, posting without image:`,
                    imgErr,
                  );
                }
              }
            }

            // Update to POSTING
            await prisma.engagementReply.update({
              where: { id: replyRecord.id },
              data: { status: EngagementReplyStatus.POSTING, replyText: generated.text },
            });

            // Post the reply tweet
            const postedTweet = await postTweet(accessToken, generated.text, mediaIds, tweet.id);

            // Compute costs
            const costs = computeTotalReplyCost(
              generated.inputTokens,
              generated.outputTokens,
              imageGenerated,
            );

            // Mark as POSTED
            await prisma.engagementReply.update({
              where: { id: replyRecord.id },
              data: {
                status: EngagementReplyStatus.POSTED,
                replyTweetId: postedTweet.id,
                replyTweetUrl: `https://x.com/i/web/status/${postedTweet.id}`,
                textGenerationCost: costs.textCost,
                imageGenerationCost: costs.imageCost,
                apiCallCost: costs.apiCost,
                totalCost: costs.totalCost,
                lastError: null,
              },
            });

            console.log(
              `[cron] Posted reply for @${account.username} tweet ${tweet.id} → reply ${postedTweet.id}`,
            );
            replied++;
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            const newAttempts = replyRecord.attempts + 1;

            console.error(
              `[cron] Failed reply for @${account.username} tweet ${tweet.id} (attempts=${newAttempts}): ${errorMessage}`,
              err,
            );

            // Mark FAILED permanently after max attempts, otherwise keep PENDING for retry
            await prisma.engagementReply.update({
              where: { id: replyRecord.id },
              data: {
                status:
                  newAttempts >= 3
                    ? EngagementReplyStatus.FAILED
                    : EngagementReplyStatus.PENDING,
                lastError: errorMessage,
                attempts: newAttempts,
              },
            });

            failed++;
          }
        }

        // Update lastSeenTweetId to newest tweet in this batch
        await prisma.monitoredAccount.update({
          where: { id: account.id },
          data: { lastSeenTweetId: newestTweetId, lastCheckedAt: new Date() },
        });
      } catch (err) {
        console.error(
          `[cron] Error fetching tweets for @${account.username} (${account.id}):`,
          err,
        );
        // Still update lastCheckedAt on fetch errors
        await prisma.monitoredAccount
          .update({ where: { id: account.id }, data: { lastCheckedAt: new Date() } })
          .catch(() => {});
        failed++;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[cron] engagement-poll done in ${durationMs}ms — processed=${processed}, replied=${replied}, failed=${failed}, skipped=${skipped}`,
    `| skipReasons: ${JSON.stringify(skipReasons)}`,
  );

  return NextResponse.json({ processed, replied, failed, skipped, skipReasons, durationMs });
}
