import { nextUtcMidnightEpochSeconds } from "@/lib/api/delay";
import { TIER_QUOTAS, getModelQuota } from "@/lib/api/quotas";
import type { ApiTier } from "@/lib/api/tier";
import { MODEL_REGISTRY } from "@/lib/studio/models";

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

async function upstashGet(key: string): Promise<number> {
  const { url, token } = getUpstash();
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const json = (await res.json()) as UpstashResponse<string | null>;
  if (!res.ok || json.error) {
    throw new Error(json.error || `Upstash GET failed (${res.status})`);
  }
  return Number(json.result ?? 0);
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
  const reset = nextUtcMidnightEpochSeconds(now);

  try {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const dateKey = `${y}${m}${d}`;

    const secondsUntilReset = Math.max(1, reset - Math.floor(now.getTime() / 1000));

    const key = `rl:${identifier}:${dateKey}`;
    const count = await upstashIncr(key);
    if (count === 1) {
      await upstashExpire(key, secondsUntilReset);
    }

    const remaining = Math.max(0, limit - count);
    return { success: count <= limit, limit, remaining, reset };
  } catch (err) {
    console.error("Rate limit check failed (fail-closed), blocking request:", err);
    return { success: false, limit, remaining: 0, reset };
  }
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
  const reset = nextUtcMidnightEpochSeconds(now);
  if (!Number.isFinite(limit)) {
    return { success: true, limit: Infinity, remaining: Infinity, reset };
  }

  try {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const dateKey = `${y}${m}${d}`;

    const secondsUntilReset = Math.max(1, reset - Math.floor(now.getTime() / 1000));

    const key = `${prefix}:${userId}:${dateKey}`;
    const count = await upstashIncr(key);
    if (count === 1) {
      await upstashExpire(key, secondsUntilReset);
    }

    const remaining = Math.max(0, limit - count);
    return { success: count <= limit, limit, remaining, reset };
  } catch (err) {
    console.error(`Rate limit check failed (${prefix}), fail-closed — blocking request:`, err);
    return { success: false, limit, remaining: 0, reset };
  }
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

export function studioModelQueryLimit(
  userId: string,
  tier: ApiTier,
  modelId: string,
  now: Date,
): Promise<RateLimitResult> {
  const limit = getModelQuota(tier, modelId, "studioQueriesByModel");
  return rateLimitDailyPrefixed(`studio:query:model:${modelId}`, userId, limit, now);
}

export function studioModelPostDraftLimit(
  userId: string,
  tier: ApiTier,
  modelId: string,
  now: Date,
): Promise<RateLimitResult> {
  const limit = getModelQuota(tier, modelId, "postDraftsByModel");
  return rateLimitDailyPrefixed(`studio:post:model:${modelId}`, userId, limit, now);
}

export type CompositeRateLimitResult = {
  globalResult: RateLimitResult;
  modelResult: RateLimitResult;
  success: boolean;
  failedOn: "global" | "model" | null;
};

/**
 * Checks both global studio query limit and per-model sub-limit.
 * Both must pass for success. Global is checked first.
 */
export async function enforceStudioQueryLimits(
  userId: string,
  tier: ApiTier,
  modelId: string,
  now: Date,
): Promise<CompositeRateLimitResult> {
  const globalResult = await studioQueryLimit(userId, tier, now);
  if (!globalResult.success) {
    return { globalResult, modelResult: globalResult, success: false, failedOn: "global" };
  }
  const modelResult = await studioModelQueryLimit(userId, tier, modelId, now);
  return {
    globalResult,
    modelResult,
    success: modelResult.success,
    failedOn: modelResult.success ? null : "model",
  };
}

/**
 * Checks both global post draft limit and per-model sub-limit.
 * Both must pass for success. Global is checked first.
 */
export async function enforceStudioPostDraftLimits(
  userId: string,
  tier: ApiTier,
  modelId: string,
  now: Date,
): Promise<CompositeRateLimitResult> {
  const globalResult = await studioPostDraftLimit(userId, tier, now);
  if (!globalResult.success) {
    return { globalResult, modelResult: globalResult, success: false, failedOn: "global" };
  }
  const modelResult = await studioModelPostDraftLimit(userId, tier, modelId, now);
  return {
    globalResult,
    modelResult,
    success: modelResult.success,
    failedOn: modelResult.success ? null : "model",
  };
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

/**
 * Returns the ISO week key for a given date, e.g. "2026W07".
 */
function isoWeekKey(now: Date): string {
  // Compute ISO week number. Thursday of the current week determines the year.
  const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day (Mon=1..Sun=7)
  const day = tmp.getUTCDay() || 7; // Convert Sun=0 to 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Returns the epoch seconds of the next Monday 00:00 UTC after `now`.
 */
function nextMondayUtcEpochSeconds(now: Date): number {
  const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = tmp.getUTCDay() || 7; // Mon=1..Sun=7
  const daysUntilMonday = day === 1 ? 7 : 8 - day; // always next Monday
  tmp.setUTCDate(tmp.getUTCDate() + daysUntilMonday);
  return Math.floor(tmp.getTime() / 1000);
}

/**
 * Weekly rate limiter for publish actions. Increments counter and checks limit.
 */
export async function weeklyPublishLimit(
  userId: string,
  tier: ApiTier,
  now: Date
): Promise<RateLimitResult> {
  const limit = TIER_QUOTAS[tier].weeklyPublishes;
  const reset = nextMondayUtcEpochSeconds(now);

  if (!Number.isFinite(limit)) {
    return { success: true, limit: Infinity, remaining: Infinity, reset };
  }
  if (limit === 0) {
    return { success: false, limit: 0, remaining: 0, reset };
  }

  try {
    const wk = isoWeekKey(now);
    const key = `publish:${userId}:${wk}`;
    const secondsUntilReset = Math.max(1, reset - Math.floor(now.getTime() / 1000));
    const count = await upstashIncr(key);
    if (count === 1) {
      await upstashExpire(key, secondsUntilReset);
    }
    const remaining = Math.max(0, limit - count);
    return { success: count <= limit, limit, remaining, reset };
  } catch (err) {
    console.error("Weekly publish rate limit check failed (fail-closed), blocking request:", err);
    return { success: false, limit, remaining: 0, reset };
  }
}

/**
 * Read-only getter for current weekly publish usage (does not increment).
 */
export async function getWeeklyPublishUsage(
  userId: string,
  tier: ApiTier
): Promise<{ used: number; limit: number; reset: number }> {
  const limit = TIER_QUOTAS[tier].weeklyPublishes;
  const now = new Date();
  const reset = nextMondayUtcEpochSeconds(now);

  if (!Number.isFinite(limit)) {
    return { used: 0, limit: Infinity, reset };
  }

  try {
    const wk = isoWeekKey(now);
    const key = `publish:${userId}:${wk}`;
    const used = await upstashGet(key);
    return { used, limit, reset };
  } catch (err) {
    console.warn("Failed to fetch weekly publish usage, returning zeros:", err);
    return { used: 0, limit, reset };
  }
}

export type ModelUsageEntry = {
  modelId: string;
  queryUsed: number;
  queryLimit: number;
  draftUsed: number;
  draftLimit: number;
};

export type StudioUsage = {
  queryUsed: number;
  queryLimit: number;
  draftUsed: number;
  draftLimit: number;
  chartUsed: number;
  chartLimit: number;
  publishUsed: number;
  publishLimit: number;
  modelUsage: ModelUsageEntry[];
};

export async function getStudioUsage(userId: string, tier: ApiTier): Promise<StudioUsage> {
  const modelIds = MODEL_REGISTRY.map((m) => m.id);
  const emptyModelUsage: ModelUsageEntry[] = modelIds.map((id) => ({
    modelId: id,
    queryUsed: 0,
    queryLimit: getModelQuota(tier, id, "studioQueriesByModel"),
    draftUsed: 0,
    draftLimit: getModelQuota(tier, id, "postDraftsByModel"),
  }));

  try {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const dateKey = `${y}${m}${d}`;

    const wk = isoWeekKey(now);

    // Fetch global counters + per-model counters in parallel
    const results = await Promise.all([
      upstashGet(`studio:query:${userId}:${dateKey}`),
      upstashGet(`studio:post:${userId}:${dateKey}`),
      upstashGet(`studio:chart:${userId}:${dateKey}`),
      upstashGet(`publish:${userId}:${wk}`),
      ...modelIds.map((id) => upstashGet(`studio:query:model:${id}:${userId}:${dateKey}`)),
      ...modelIds.map((id) => upstashGet(`studio:post:model:${id}:${userId}:${dateKey}`)),
    ]);

    const [queryUsed, draftUsed, chartUsed, publishUsed] = results;
    const modelQueryCounts = results.slice(4, 4 + modelIds.length);
    const modelDraftCounts = results.slice(4 + modelIds.length);

    const modelUsage: ModelUsageEntry[] = modelIds.map((id, i) => ({
      modelId: id,
      queryUsed: modelQueryCounts[i] ?? 0,
      queryLimit: getModelQuota(tier, id, "studioQueriesByModel"),
      draftUsed: modelDraftCounts[i] ?? 0,
      draftLimit: getModelQuota(tier, id, "postDraftsByModel"),
    }));

    return {
      queryUsed,
      queryLimit: TIER_QUOTAS[tier].studioQueries,
      draftUsed,
      draftLimit: TIER_QUOTAS[tier].postDrafts,
      chartUsed,
      chartLimit: TIER_QUOTAS[tier].chartGen,
      publishUsed,
      publishLimit: TIER_QUOTAS[tier].weeklyPublishes,
      modelUsage,
    };
  } catch (err) {
    console.warn("Failed to fetch studio usage, returning zeros:", err);
    return {
      queryUsed: 0,
      queryLimit: TIER_QUOTAS[tier].studioQueries,
      draftUsed: 0,
      draftLimit: TIER_QUOTAS[tier].postDrafts,
      chartUsed: 0,
      chartLimit: TIER_QUOTAS[tier].chartGen,
      publishUsed: 0,
      publishLimit: TIER_QUOTAS[tier].weeklyPublishes,
      modelUsage: emptyModelUsage,
    };
  }
}
