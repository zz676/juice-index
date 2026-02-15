import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type {
  RevenueMetrics,
  MRRData,
  UserMetrics,
  AIUsageMetrics,
  AIModelUsage,
  DailyCostTrend,
  DailyCount,
  APIActivityMetrics,
  TopEndpoint,
  WebhookHealthMetrics,
} from "./types";

// ── Revenue ───────────────────────────────────────────────────────────────────

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const [tierRows, cancelPendingRows, newSubRows, subTrendRows] = await Promise.all([
    prisma.$queryRaw<{ tier: string; count: bigint }[]>`
      SELECT "tier", COUNT(*)::bigint AS "count"
      FROM "public"."juice_api_subscriptions"
      WHERE "status" IN ('active', 'trialing')
      GROUP BY "tier"
      ORDER BY "count" DESC
    `.catch(() => [] as { tier: string; count: bigint }[]),

    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "public"."juice_api_subscriptions"
      WHERE "cancelAtPeriodEnd" = true AND "status" = 'active'
    `.catch(() => [{ count: 0n }]),

    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "public"."juice_api_subscriptions"
      WHERE "createdAt" >= date_trunc('month', CURRENT_DATE)
        AND "status" IN ('active', 'trialing')
    `.catch(() => [{ count: 0n }]),

    prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE("createdAt") AS "date", COUNT(*)::bigint AS "count"
      FROM "public"."juice_api_subscriptions"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY "date" ASC
    `.catch(() => [] as { date: Date; count: bigint }[]),
  ]);

  const dailySubTrend: DailyCount[] = subTrendRows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
    count: Number(r.count),
  }));

  return {
    subscribersByTier: tierRows.map((r) => ({
      tier: r.tier,
      count: Number(r.count),
    })),
    cancelPendingCount: Number(cancelPendingRows[0]?.count ?? 0),
    newSubsThisMonth: Number(newSubRows[0]?.count ?? 0),
    dailySubTrend,
  };
}

// ── MRR (via Stripe) ─────────────────────────────────────────────────────────

export async function getMRR(): Promise<MRRData> {
  try {
    const stripe = getStripe();
    let mrr = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: { status: "active"; limit: number; starting_after?: string } = {
        status: "active",
        limit: 100,
      };
      if (startingAfter) params.starting_after = startingAfter;

      const subs = await stripe.subscriptions.list(params);
      for (const sub of subs.data) {
        for (const item of sub.items.data) {
          const amount = item.price.unit_amount ?? 0;
          const interval = item.price.recurring?.interval;
          if (interval === "month") {
            mrr += amount;
          } else if (interval === "year") {
            mrr += Math.round(amount / 12);
          }
        }
      }
      hasMore = subs.has_more;
      if (subs.data.length > 0) {
        startingAfter = subs.data[subs.data.length - 1].id;
      }
    }

    const mrrDollars = mrr / 100;
    return { mrr: mrrDollars, arr: mrrDollars * 12 };
  } catch {
    return { mrr: 0, arr: 0 };
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUserMetrics(): Promise<UserMetrics> {
  const [totalRows, new7dRows, new30dRows, activeRows, tierRows, signupTrendRows] =
    await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count" FROM "public"."juice_users"
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count" FROM "public"."juice_users"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count" FROM "public"."juice_users"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId")::bigint AS "count"
        FROM "public"."juice_api_request_logs"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ tier: string; count: bigint }[]>`
        SELECT COALESCE(s."tier", 'FREE') AS "tier", COUNT(*)::bigint AS "count"
        FROM "public"."juice_users" u
        LEFT JOIN "public"."juice_api_subscriptions" s
          ON u."id" = s."userId" AND s."status" IN ('active', 'trialing')
        GROUP BY COALESCE(s."tier", 'FREE')
        ORDER BY "count" DESC
      `.catch(() => [] as { tier: string; count: bigint }[]),

      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE("createdAt") AS "date", COUNT(*)::bigint AS "count"
        FROM "public"."juice_users"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY "date" ASC
      `.catch(() => [] as { date: Date; count: bigint }[]),
    ]);

  const dailySignupTrend: DailyCount[] = signupTrendRows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
    count: Number(r.count),
  }));

  return {
    totalUsers: Number(totalRows[0]?.count ?? 0),
    newLast7d: Number(new7dRows[0]?.count ?? 0),
    newLast30d: Number(new30dRows[0]?.count ?? 0),
    activeUsersLast7d: Number(activeRows[0]?.count ?? 0),
    usersByTier: tierRows.map((r) => ({
      tier: r.tier,
      count: Number(r.count),
    })),
    dailySignupTrend,
  };
}

// ── AI Usage ──────────────────────────────────────────────────────────────────

export async function getAIUsageMetrics(): Promise<AIUsageMetrics> {
  const [modelRows, trendRows] = await Promise.all([
    prisma.$queryRaw<
      {
        model: string;
        requestCount: bigint;
        totalCost: number;
        successCount: bigint;
        inputTokens: bigint;
        outputTokens: bigint;
        avgLatencyMs: number;
      }[]
    >`
      SELECT
        "model",
        COUNT(*)::bigint AS "requestCount",
        COALESCE(SUM("cost"), 0)::float AS "totalCost",
        COUNT(*) FILTER (WHERE "success" = true)::bigint AS "successCount",
        COALESCE(SUM("inputTokens"), 0)::bigint AS "inputTokens",
        COALESCE(SUM("outputTokens"), 0)::bigint AS "outputTokens",
        COALESCE(AVG("durationMs"), 0)::float AS "avgLatencyMs"
      FROM "public"."juice_ai_usage"
      GROUP BY "model"
      ORDER BY "totalCost" DESC
    `.catch(
      () =>
        [] as {
          model: string;
          requestCount: bigint;
          totalCost: number;
          successCount: bigint;
          inputTokens: bigint;
          outputTokens: bigint;
          avgLatencyMs: number;
        }[]
    ),

    prisma.$queryRaw<{ date: Date; cost: number }[]>`
      SELECT
        DATE("createdAt") AS "date",
        COALESCE(SUM("cost"), 0)::float AS "cost"
      FROM "public"."juice_ai_usage"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY "date" ASC
    `.catch(() => [] as { date: Date; cost: number }[]),
  ]);

  const byModel: AIModelUsage[] = modelRows.map((r) => ({
    model: r.model,
    requestCount: Number(r.requestCount),
    totalCost: r.totalCost,
    successRate:
      Number(r.requestCount) > 0
        ? Number(r.successCount) / Number(r.requestCount)
        : 0,
    inputTokens: Number(r.inputTokens),
    outputTokens: Number(r.outputTokens),
    avgLatencyMs: Math.round(r.avgLatencyMs),
  }));

  const dailyCostTrend: DailyCostTrend[] = trendRows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
    cost: r.cost,
  }));

  return { byModel, dailyCostTrend };
}

// ── Webhook Health ───────────────────────────────────────────────────────────

export async function getWebhookHealthMetrics(): Promise<WebhookHealthMetrics> {
  const [totalRows, last24hRows, last7dRows, lastProcessedRows, typeRows] =
    await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count"
        FROM "public"."juice_stripe_webhook_events"
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count"
        FROM "public"."juice_stripe_webhook_events"
        WHERE "processedAt" >= NOW() - INTERVAL '24 hours'
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count"
        FROM "public"."juice_stripe_webhook_events"
        WHERE "processedAt" >= NOW() - INTERVAL '7 days'
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ processedAt: Date | null }[]>`
        SELECT "processedAt"
        FROM "public"."juice_stripe_webhook_events"
        ORDER BY "processedAt" DESC
        LIMIT 1
      `.catch(() => [{ processedAt: null }] as { processedAt: Date | null }[]),

      prisma.$queryRaw<{ eventType: string; count: bigint }[]>`
        SELECT "eventType", COUNT(*)::bigint AS "count"
        FROM "public"."juice_stripe_webhook_events"
        WHERE "processedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY "eventType"
        ORDER BY "count" DESC
      `.catch(() => [] as { eventType: string; count: bigint }[]),
    ]);

  const lastAt = lastProcessedRows[0]?.processedAt;

  return {
    totalEventsProcessed: Number(totalRows[0]?.count ?? 0),
    eventsLast24h: Number(last24hRows[0]?.count ?? 0),
    eventsLast7d: Number(last7dRows[0]?.count ?? 0),
    lastProcessedAt: lastAt instanceof Date ? lastAt.toISOString() : null,
    eventsByType: typeRows.map((r) => ({
      eventType: r.eventType,
      count: Number(r.count),
    })),
  };
}

// ── API Activity ──────────────────────────────────────────────────────────────

export async function getAPIActivityMetrics(): Promise<APIActivityMetrics> {
  const [todayRows, weekRows, monthRows, perfRows, topRows, tierRows, requestTrendRows] =
    await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count"
        FROM "public"."juice_api_request_logs"
        WHERE "createdAt" >= CURRENT_DATE
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count"
        FROM "public"."juice_api_request_logs"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS "count"
        FROM "public"."juice_api_request_logs"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      `.catch(() => [{ count: 0n }]),

      prisma.$queryRaw<{ avgMs: number; errorRate: number }[]>`
        SELECT
          COALESCE(AVG("durationMs"), 0)::float AS "avgMs",
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE (COUNT(*) FILTER (WHERE "statusCode" >= 400))::float / COUNT(*)::float
          END AS "errorRate"
        FROM "public"."juice_api_request_logs"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      `.catch(() => [{ avgMs: 0, errorRate: 0 }]),

      prisma.$queryRaw<{ endpoint: string; method: string; count: bigint }[]>`
        SELECT "endpoint", "method", COUNT(*)::bigint AS "count"
        FROM "public"."juice_api_request_logs"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY "endpoint", "method"
        ORDER BY "count" DESC
        LIMIT 10
      `.catch(() => [] as { endpoint: string; method: string; count: bigint }[]),

      prisma.$queryRaw<{ tier: string; count: bigint }[]>`
        SELECT COALESCE("tierAtRequest", 'FREE') AS "tier", COUNT(*)::bigint AS "count"
        FROM "public"."juice_api_request_logs"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY COALESCE("tierAtRequest", 'FREE')
        ORDER BY "count" DESC
      `.catch(() => [] as { tier: string; count: bigint }[]),

      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE("createdAt") AS "date", COUNT(*)::bigint AS "count"
        FROM "public"."juice_api_request_logs"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY "date" ASC
      `.catch(() => [] as { date: Date; count: bigint }[]),
    ]);

  const topEndpoints: TopEndpoint[] = topRows.map((r) => ({
    endpoint: r.endpoint,
    method: r.method,
    count: Number(r.count),
  }));

  const dailyRequestTrend: DailyCount[] = requestTrendRows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
    count: Number(r.count),
  }));

  return {
    requestsToday: Number(todayRows[0]?.count ?? 0),
    requestsThisWeek: Number(weekRows[0]?.count ?? 0),
    requestsThisMonth: Number(monthRows[0]?.count ?? 0),
    avgResponseTimeMs: Math.round(perfRows[0]?.avgMs ?? 0),
    errorRate: perfRows[0]?.errorRate ?? 0,
    topEndpoints,
    requestsByTier: tierRows.map((r) => ({
      tier: r.tier,
      count: Number(r.count),
    })),
    dailyRequestTrend,
  };
}
