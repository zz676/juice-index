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
import { computeTotalReplyCost, computeTextGenerationCost } from "@/lib/engagement/cost-utils";
import { EngagementReplyStatus } from "@prisma/client";
import type { UserTone, MonitoredAccount } from "@prisma/client";

export const runtime = "nodejs";

const FALLBACK_TONE_PROMPTS: Record<string, string> = {
  HUMOR:
    "You are a witty, funny commentator. Write replies that are clever, playful, and entertaining — think light humor and clever wordplay. Never be mean-spirited.",
  SARCASTIC:
    "You are a dry, sarcastic observer. Write replies with a tongue-in-cheek tone that acknowledges the obvious or ironic aspects of the tweet. Keep it smart and understated, never cruel.",
  HUGE_FAN:
    "You are an enthusiastic, passionate fan of this account. Write replies that are genuinely excited, supportive, and show deep appreciation for their work. Energy is high but authentic.",
  CHEERS:
    "You are a positive, encouraging voice in this community. Write replies that celebrate progress, offer genuine support, and inspire optimism. Keep it warm and uplifting.",
  NEUTRAL:
    "You are a balanced, informative analyst. Write replies that add context, share relevant data points, or thoughtfully acknowledge the tweet's key insight. Keep tone objective.",
  PROFESSIONAL:
    "You are a professional executive and thought leader. Write replies that are insightful, polished, and add business or market perspective. Tone is confident and authoritative.",
};

function formatTweetWithQuote(text: string, quotedText?: string): string {
  if (!quotedText) return text;
  return `${text}\n\n[Quoting: ${quotedText}]`;
}

type PickedTone = { toneId: string | null; toneName: string; prompt: string };

function pickUserTone(
  account: MonitoredAccount,
  toneMap: Map<string, UserTone>,
): PickedTone {
  const weights = account.toneWeights as Record<string, number> | null;

  if (!weights) {
    const fallbackPrompt =
      FALLBACK_TONE_PROMPTS[account.tone] ?? FALLBACK_TONE_PROMPTS["NEUTRAL"];
    return { toneId: null, toneName: account.tone, prompt: fallbackPrompt };
  }

  const entries = Object.entries(weights).filter(
    ([id, w]) => w > 0 && toneMap.has(id),
  );

  if (entries.length === 0) {
    const fallbackPrompt =
      FALLBACK_TONE_PROMPTS[account.tone] ?? FALLBACK_TONE_PROMPTS["NEUTRAL"];
    return { toneId: null, toneName: account.tone, prompt: fallbackPrompt };
  }

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;

  for (const [id, weight] of entries) {
    rand -= weight;
    if (rand <= 0) {
      const tone = toneMap.get(id)!;
      return { toneId: id, toneName: tone.name, prompt: tone.prompt };
    }
  }

  // Fallback to first entry
  const tone = toneMap.get(entries[0][0])!;
  return { toneId: entries[0][0], toneName: tone.name, prompt: tone.prompt };
}

type AccountStat = {
  username: string;
  newTweets: number;
  replied: number;
  failed: number;
  skipped: number;
};

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

  let accountsChecked = 0;
  let replied = 0;
  let failed = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {
    globalPaused: 0,
    insufficientTier: 0,
    noXAccount: 0,
    tokenError: 0,
    notDueYet: 0,
  };
  // Per-account stats, keyed by account.id
  const accountStats = new Map<string, AccountStat>();

  for (const [userId, accounts] of byUserId) {
    // Fetch user-level data in parallel
    const [xAccount, config, subscription, userTones] = await Promise.all([
      prisma.xAccount.findUnique({ where: { userId } }),
      prisma.engagementConfig.findUnique({ where: { userId }, select: { globalPaused: true } }),
      prisma.apiSubscription.findUnique({ where: { userId }, select: { tier: true } }),
      prisma.userTone.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    ]);

    // Build tone map for weighted random selection
    const userToneMap = new Map<string, UserTone>(userTones.map((t) => [t.id, t]));

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
      // Clear any previous token error on success
      if (xAccount.tokenError) {
        await prisma.xAccount.update({
          where: { id: xAccount.id },
          data: { tokenError: false },
        });
      }
      console.log(`[cron] ↳ Token OK, processing ${accounts.length} account(s)`);
    } catch (err) {
      if (err instanceof XTokenExpiredError) {
        console.error(`[cron] ↳ SKIP: X token expired`);
        // Mark error and notify user (deduped — only once per incident)
        if (!xAccount.tokenError) {
          await prisma.xAccount.update({
            where: { id: xAccount.id },
            data: { tokenError: true },
          });
          await prisma.notification.create({
            data: {
              userId,
              type: "SYSTEM",
              title: "X account needs reconnecting",
              message:
                "Your X connection has expired. Auto-replies are paused until you reconnect in Settings.",
              link: "/dashboard/settings",
              read: false,
            },
          });
        }
      } else {
        console.error(`[cron] ↳ SKIP: token refresh failed`, err);
      }
      skipped += accounts.length;
      skipReasons.tokenError += accounts.length;
      continue;
    }

    // Initialize per-account stat entries for this user's accounts
    for (const acc of accounts) {
      accountStats.set(acc.id, { username: acc.username, newTweets: 0, replied: 0, failed: 0, skipped: 0 });
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
          const selected = pickUserTone(account, userToneMap);
          // Fetch recent replies for this account
          const recentReplyTexts = await prisma.engagementReply
            .findMany({
              where: { monitoredAccountId: account.id, status: "POSTED", replyText: { not: null } },
              orderBy: { createdAt: "desc" },
              take: 5,
              select: { replyText: true },
            })
            .then((rows) => rows.map((r) => r.replyText!));

          const textStart = Date.now();
          const generated = await generateReply(reply.sourceTweetText ?? "", selected.prompt, {
            accountContext: account.accountContext,
            recentReplies: recentReplyTexts,
            temperature: account.temperature,
          });
          const textDurationMs = Date.now() - textStart;
          replyText = generated.text;
          inputTokens = generated.inputTokens;
          outputTokens = generated.outputTokens;
          prisma.aIUsage.create({
            data: {
              type: "text",
              model: "gpt-4.1-mini",
              source: "engagement-reply",
              inputTokens,
              outputTokens,
              cost: computeTextGenerationCost(inputTokens, outputTokens),
              durationMs: textDurationMs,
              success: true,
            },
          }).catch(() => {});
        }

        let imageGenerated = false;
        let mediaIds: string[] | undefined;
        if (account.imageFrequency > 0 && Math.random() * 100 < account.imageFrequency) {
          const imgQuota = await engagementImageLimit(userId, tier, new Date());
          if (imgQuota.success) {
            try {
              const imgStart = Date.now();
              const imgResult = await generateImage(reply.sourceTweetText ?? "", replyText);
              const imgDurationMs = Date.now() - imgStart;
              if (imgResult.generated) {
                const { mediaId } = await uploadMedia(accessToken, `data:image/png;base64,${imgResult.imageBase64}`);
                mediaIds = [mediaId];
                imageGenerated = true;
                prisma.aIUsage.create({
                  data: {
                    type: "image",
                    model: "dall-e-3",
                    size: "1024x1024",
                    source: "engagement-reply",
                    cost: 0.04,
                    durationMs: imgDurationMs,
                    success: true,
                  },
                }).catch(() => {});
              }
            } catch (imgErr) {
              console.warn(`[cron]   Image generation failed for retry ${reply.id}, posting without image:`, imgErr);
              prisma.aIUsage.create({
                data: {
                  type: "image",
                  model: "dall-e-3",
                  size: "1024x1024",
                  source: "engagement-reply",
                  cost: 0,
                  success: false,
                  errorMsg: imgErr instanceof Error ? imgErr.message : "Image generation failed",
                },
              }).catch(() => {});
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
        const retryStat = accountStats.get(reply.monitoredAccountId);
        if (retryStat) retryStat.replied++;
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
        const retryStat = accountStats.get(reply.monitoredAccountId);
        if (retryStat) retryStat.failed++;
      }
    }

    // Process each monitored account for this user
    for (const account of accounts) {
      const interval = account.pollInterval ?? 5;
      if (interval > 5 && account.lastCheckedAt) {
        const elapsedMs = Date.now() - account.lastCheckedAt.getTime();
        if (elapsedMs < interval * 60 * 1000) {
          console.log(`[cron]   @${account.username}: not due yet (interval=${interval}m, elapsed=${Math.round(elapsedMs / 60000)}m)`);
          skipped++;
          skipReasons.notDueYet++;
          continue;
        }
      }
      accountsChecked++;
      const stat = accountStats.get(account.id)!;
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

        stat.newTweets = tweets.length;
        console.log(`[cron]   @${account.username}: ${tweets.length} new tweet(s) → will reply to all (quota permitting)`);

        // Fetch recent replies for repetition avoidance
        const recentReplyTexts = await prisma.engagementReply
          .findMany({
            where: { monitoredAccountId: account.id, status: "POSTED", replyText: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { replyText: true },
          })
          .then((rows) => rows.map((r) => r.replyText!));

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
                sourceTweetText: formatTweetWithQuote(tweet.text, tweet.quotedTweetText),
                sourceTweetUrl: tweet.url,
                sourceTweetCreatedAt: tweet.createdAt ? new Date(tweet.createdAt) : null,
                tone: account.tone,
                status: EngagementReplyStatus.SKIPPED,
                lastError: "Daily reply quota exhausted",
                attempts: 0,
              },
            });
            skipped++;
            stat.skipped++;
            continue;
          }

          // Check daily reply quota (increments counter)
          const replyQuota = await engagementReplyLimit(userId, tier, new Date());
          if (!replyQuota.success) {
            console.log(`[cron]   Daily reply quota exhausted for user ${userId} (limit=${replyQuota.limit}, remaining=0)`);
            quotaExhausted = true;
            console.log(`[cron]   SKIPPED tweet ${tweet.id} (@${account.username}): daily reply quota exhausted`);
            await prisma.engagementReply.create({
              data: {
                userId,
                monitoredAccountId: account.id,
                sourceTweetId: tweet.id,
                sourceTweetText: formatTweetWithQuote(tweet.text, tweet.quotedTweetText),
                sourceTweetUrl: tweet.url,
                sourceTweetCreatedAt: tweet.createdAt ? new Date(tweet.createdAt) : null,
                tone: account.tone,
                status: EngagementReplyStatus.SKIPPED,
                lastError: "Daily reply quota exhausted",
                attempts: 0,
              },
            });
            skipped++;
            stat.skipped++;
            continue;
          }
          console.log(`[cron]   Quota OK (remaining=${replyQuota.remaining}), generating reply for tweet ${tweet.id}`);

          // Pick tone for this reply
          const selected = pickUserTone(account, userToneMap);

          // Create PENDING record
          const replyRecord = await prisma.engagementReply.create({
            data: {
              userId,
              monitoredAccountId: account.id,
              sourceTweetId: tweet.id,
              sourceTweetText: formatTweetWithQuote(tweet.text, tweet.quotedTweetText),
              sourceTweetUrl: tweet.url,
              sourceTweetCreatedAt: tweet.createdAt ? new Date(tweet.createdAt) : null,
              tone: account.tone,
              userToneId: selected.toneId,
              userToneName: selected.toneName,
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
            const textStart = Date.now();
            const generated = await generateReply(tweet.text, selected.prompt, {
              quotedTweetText: tweet.quotedTweetText,
              accountContext: account.accountContext,
              recentReplies: recentReplyTexts,
              temperature: account.temperature,
            });
            const textDurationMs = Date.now() - textStart;
            prisma.aIUsage.create({
              data: {
                type: "text",
                model: "gpt-4.1-mini",
                source: "engagement-reply",
                inputTokens: generated.inputTokens,
                outputTokens: generated.outputTokens,
                cost: computeTextGenerationCost(generated.inputTokens, generated.outputTokens),
                durationMs: textDurationMs,
                success: true,
              },
            }).catch(() => {});

            // Optionally generate and upload an image
            let imageGenerated = false;
            let mediaIds: string[] | undefined;

            if (account.imageFrequency > 0 && Math.random() * 100 < account.imageFrequency) {
              const imgQuota = await engagementImageLimit(userId, tier, new Date());
              if (imgQuota.success) {
                try {
                  const imgStart = Date.now();
                  const imgResult = await generateImage(formatTweetWithQuote(tweet.text, tweet.quotedTweetText), generated.text);
                  const imgDurationMs = Date.now() - imgStart;
                  if (imgResult.generated) {
                    const { mediaId } = await uploadMedia(
                      accessToken,
                      `data:image/png;base64,${imgResult.imageBase64}`,
                    );
                    mediaIds = [mediaId];
                    imageGenerated = true;
                    prisma.aIUsage.create({
                      data: {
                        type: "image",
                        model: "dall-e-3",
                        size: "1024x1024",
                        source: "engagement-reply",
                        cost: 0.04,
                        durationMs: imgDurationMs,
                        success: true,
                      },
                    }).catch(() => {});
                  }
                } catch (imgErr) {
                  console.warn(
                    `[cron] Image generation failed for reply ${replyRecord.id}, posting without image:`,
                    imgErr,
                  );
                  prisma.aIUsage.create({
                    data: {
                      type: "image",
                      model: "dall-e-3",
                      size: "1024x1024",
                      source: "engagement-reply",
                      cost: 0,
                      success: false,
                      errorMsg: imgErr instanceof Error ? imgErr.message : "Image generation failed",
                    },
                  }).catch(() => {});
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
              `[cron] Posted reply for @${account.username} tweet ${tweet.id} → reply ${postedTweet.id} (tone: ${selected.toneName})`,
            );
            replied++;
            stat.replied++;
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
            stat.failed++;
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
        stat.failed++;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const accounts = [...accountStats.values()].sort((a, b) => a.username.localeCompare(b.username));

  console.log(
    `[cron] engagement-poll done in ${durationMs}ms — accountsChecked=${accountsChecked}, replied=${replied}, failed=${failed}, skipped=${skipped}`,
    `| skipReasons: ${JSON.stringify(skipReasons)}`,
  );

  return NextResponse.json({ accountsChecked, replied, failed, skipped, skipReasons, durationMs, accounts });
}
