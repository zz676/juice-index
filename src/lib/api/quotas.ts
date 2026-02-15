import type { ApiTier } from "./tier";

export type ModelQuotas = Record<string, number>;

export type TierQuota = {
  dailyApi: number;
  monthlyApi: number;
  maxApiKeys: number;
  studioQueries: number;
  chartGen: number;
  postDrafts: number;
  maxDrafts: number;
  maxScheduled: number;
  csvExports: number;
  weeklyPublishes: number;
  delayDays: number;
  histMonths: number;
  seats: number;
  xAccounts: number;
  studioQueriesByModel: ModelQuotas;
  postDraftsByModel: ModelQuotas;
};

export const TIER_QUOTAS: Record<ApiTier, TierQuota> = {
  FREE: {
    dailyApi: 0,
    monthlyApi: 0,
    maxApiKeys: 0,
    studioQueries: 3,
    chartGen: 1,
    postDrafts: 1,
    maxDrafts: 5,
    maxScheduled: 0,
    csvExports: 0,
    weeklyPublishes: 1,
    delayDays: 30,
    histMonths: 12,
    seats: 1,
    xAccounts: 0,
    studioQueriesByModel: {
      "gpt-4o-mini": 3,
    },
    postDraftsByModel: {
      "gpt-4o-mini": 1,
    },
  },
  STARTER: {
    dailyApi: 500,
    monthlyApi: 100,
    maxApiKeys: 1,
    studioQueries: 15,
    chartGen: 5,
    postDrafts: 5,
    maxDrafts: 20,
    maxScheduled: 5,
    csvExports: 10,
    weeklyPublishes: 10,
    delayDays: 0,
    histMonths: 60,
    seats: 1,
    xAccounts: 1,
    studioQueriesByModel: {
      "gpt-4o-mini": 15,
      "gpt-4o": 5,
      "claude-3-5-sonnet": 5,
    },
    postDraftsByModel: {
      "gpt-4o-mini": 5,
      "gpt-4o": 3,
      "claude-3-5-sonnet": 3,
    },
  },
  PRO: {
    dailyApi: 1_000,
    monthlyApi: 25_000,
    maxApiKeys: 2,
    studioQueries: 50,
    chartGen: 20,
    postDrafts: 20,
    maxDrafts: Infinity,
    maxScheduled: 10,
    csvExports: 50,
    weeklyPublishes: 10,
    delayDays: 0,
    histMonths: 60,
    seats: 1,
    xAccounts: 1,
    studioQueriesByModel: {
      "gpt-4o-mini": 50,
      "gpt-4o": 25,
      "claude-3-5-sonnet": 25,
      "claude-opus-4": 10,
    },
    postDraftsByModel: {
      "gpt-4o-mini": 20,
      "gpt-4o": 10,
      "claude-3-5-sonnet": 10,
      "claude-opus-4": 5,
    },
  },
  ENTERPRISE: {
    dailyApi: 100_000,
    monthlyApi: Infinity,
    maxApiKeys: 10,
    studioQueries: Infinity,
    chartGen: Infinity,
    postDrafts: Infinity,
    maxDrafts: Infinity,
    maxScheduled: Infinity,
    csvExports: Infinity,
    weeklyPublishes: Infinity,
    delayDays: 0,
    histMonths: Infinity,
    seats: 5,
    xAccounts: 5,
    studioQueriesByModel: {
      "gpt-4o-mini": Infinity,
      "gpt-4o": Infinity,
      "claude-3-5-sonnet": Infinity,
      "claude-opus-4": Infinity,
    },
    postDraftsByModel: {
      "gpt-4o-mini": Infinity,
      "gpt-4o": Infinity,
      "claude-3-5-sonnet": Infinity,
      "claude-opus-4": Infinity,
    },
  },
};

export function getQuota(tier: ApiTier): TierQuota {
  return TIER_QUOTAS[tier];
}

export function getModelQuota(
  tier: ApiTier,
  modelId: string,
  category: "studioQueriesByModel" | "postDraftsByModel",
): number {
  return TIER_QUOTAS[tier][category][modelId] ?? 0;
}
