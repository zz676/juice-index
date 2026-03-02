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
  dailyReplies: number;
  monitoredAccounts: number;
  dailyImageGen: number;
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
      "o3-mini": 3,
      "grok-4-1-fast-reasoning": 3,
    },
    postDraftsByModel: {
      "o3-mini": 1,
      "grok-4-1-fast-reasoning": 1,
    },
    dailyReplies: 0,
    monitoredAccounts: 0,
    dailyImageGen: 0,
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
      "o3-mini": 15,
      "grok-4-1-fast-reasoning": 15,
      "gpt-5-mini": 5,
      "gemini-3.1-pro-preview": 5,
      "claude-sonnet-4-6": 5,
    },
    postDraftsByModel: {
      "o3-mini": 5,
      "grok-4-1-fast-reasoning": 5,
      "gpt-5-mini": 3,
      "gemini-3.1-pro-preview": 3,
      "claude-sonnet-4-6": 3,
    },
    dailyReplies: 5,
    monitoredAccounts: 5,
    dailyImageGen: 2,
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
      "o3-mini": 50,
      "grok-4-1-fast-reasoning": 50,
      "gpt-5-mini": 25,
      "gemini-3.1-pro-preview": 25,
      "claude-sonnet-4-6": 25,
      "gpt-5.2": 10,
      "claude-opus-4-6": 10,
    },
    postDraftsByModel: {
      "o3-mini": 20,
      "grok-4-1-fast-reasoning": 20,
      "gpt-5-mini": 10,
      "gemini-3.1-pro-preview": 10,
      "claude-sonnet-4-6": 10,
      "gpt-5.2": 5,
      "claude-opus-4-6": 5,
    },
    dailyReplies: 25,
    monitoredAccounts: 20,
    dailyImageGen: 10,
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
      "o3-mini": Infinity,
      "grok-4-1-fast-reasoning": Infinity,
      "gpt-5-mini": Infinity,
      "gemini-3.1-pro-preview": Infinity,
      "claude-sonnet-4-6": Infinity,
      "gpt-5.2": Infinity,
      "claude-opus-4-6": Infinity,
    },
    postDraftsByModel: {
      "o3-mini": Infinity,
      "grok-4-1-fast-reasoning": Infinity,
      "gpt-5-mini": Infinity,
      "gemini-3.1-pro-preview": Infinity,
      "claude-sonnet-4-6": Infinity,
      "gpt-5.2": Infinity,
      "claude-opus-4-6": Infinity,
    },
    dailyReplies: Infinity,
    monitoredAccounts: Infinity,
    dailyImageGen: Infinity,
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
