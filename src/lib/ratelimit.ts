import { nextUtcMidnightEpochSeconds } from "@/lib/api/delay";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import type { ApiTier } from "@/lib/api/tier";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // unix seconds
};

type UpstashResponse<T> = {
  result?: T;
  error?: string;
};

function getUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function upstashIncr(key: string): Promise<number> {
  const { url, token } = getUpstash();
  const res = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const json = (await res.json()) as UpstashResponse<number>;
  if (!res.ok || json.error) {
    throw new Error(json.error || `Upstash INCR failed (${res.status})`);
  }
  return Number(json.result ?? 0);
}

async function upstashExpire(key: string, seconds: number): Promise<void> {
  const { url, token } = getUpstash();
  const res = await fetch(`${url}/expire/${encodeURIComponent(key)}/${seconds}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const json = (await res.json()) as UpstashResponse<number>;
  if (!res.ok || json.error) {
    throw new Error(json.error || `Upstash EXPIRE failed (${res.status})`);
  }
}

export async function rateLimitDaily(identifier: string, limit: number, now: Date): Promise<RateLimitResult> {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const dateKey = `${y}${m}${d}`;

  const reset = nextUtcMidnightEpochSeconds(now);
  const secondsUntilReset = Math.max(1, reset - Math.floor(now.getTime() / 1000));

  const key = `rl:${identifier}:${dateKey}`;
  const count = await upstashIncr(key);
  if (count === 1) {
    await upstashExpire(key, secondsUntilReset);
  }

  const remaining = Math.max(0, limit - count);
  return {
    success: count <= limit,
    limit,
    remaining,
    reset,
  };
}

/**
 * Generic daily rate limiter with a custom key prefix.
 * Used for Studio features (queries, charts, post drafts).
 */
async function rateLimitDailyPrefixed(
  prefix: string,
  userId: string,
  limit: number,
  now: Date
): Promise<RateLimitResult> {
  if (!Number.isFinite(limit)) {
    const reset = nextUtcMidnightEpochSeconds(now);
    return { success: true, limit: Infinity, remaining: Infinity, reset };
  }
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const dateKey = `${y}${m}${d}`;

  const reset = nextUtcMidnightEpochSeconds(now);
  const secondsUntilReset = Math.max(1, reset - Math.floor(now.getTime() / 1000));

  const key = `${prefix}:${userId}:${dateKey}`;
  const count = await upstashIncr(key);
  if (count === 1) {
    await upstashExpire(key, secondsUntilReset);
  }

  const remaining = Math.max(0, limit - count);
  return { success: count <= limit, limit, remaining, reset };
}

export function studioQueryLimit(userId: string, tier: ApiTier, now: Date): Promise<RateLimitResult> {
  return rateLimitDailyPrefixed("studio:query", userId, TIER_QUOTAS[tier].studioQueries, now);
}

export function studioChartLimit(userId: string, tier: ApiTier, now: Date): Promise<RateLimitResult> {
  return rateLimitDailyPrefixed("studio:chart", userId, TIER_QUOTAS[tier].chartGen, now);
}

export function studioPostDraftLimit(userId: string, tier: ApiTier, now: Date): Promise<RateLimitResult> {
  return rateLimitDailyPrefixed("studio:post", userId, TIER_QUOTAS[tier].postDrafts, now);
}

/**
 * Monthly rate limiter for CSV exports. Uses year-month as the key window.
 */
export async function csvExportMonthlyLimit(
  userId: string,
  tier: ApiTier,
  now: Date
): Promise<RateLimitResult> {
  const limit = TIER_QUOTAS[tier].csvExports;
  if (!Number.isFinite(limit)) {
    return { success: true, limit: Infinity, remaining: Infinity, reset: 0 };
  }
  if (limit === 0) {
    return { success: false, limit: 0, remaining: 0, reset: 0 };
  }

  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const monthKey = `${y}${m}`;

  const key = `csv:${userId}:${monthKey}`;
  const count = await upstashIncr(key);
  if (count === 1) {
    // Expire at end of month + 1 day buffer
    const nextMonth = new Date(Date.UTC(y, now.getUTCMonth() + 1, 1));
    const secondsUntilNextMonth = Math.max(1, Math.floor((nextMonth.getTime() - now.getTime()) / 1000) + 86400);
    await upstashExpire(key, secondsUntilNextMonth);
  }

  const remaining = Math.max(0, limit - count);
  return { success: count <= limit, limit, remaining, reset: 0 };
}
