import type { ApiTier } from "./tier";

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
  delayDays: number;
  histMonths: number;
  seats: number;
  xAccounts: number;
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
    delayDays: 30,
    histMonths: 12,
    seats: 1,
    xAccounts: 0,
  },
  STARTER: {
    dailyApi: 500,
    monthlyApi: 10_000,
    maxApiKeys: 1,
    studioQueries: 10,
    chartGen: 5,
    postDrafts: 5,
    maxDrafts: 20,
    maxScheduled: 5,
    csvExports: 10,
    delayDays: 0,
    histMonths: 36,
    seats: 1,
    xAccounts: 1,
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
    delayDays: 0,
    histMonths: 60,
    seats: 1,
    xAccounts: 1,
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
    delayDays: 0,
    histMonths: Infinity,
    seats: 5,
    xAccounts: 5,
  },
};

export function getQuota(tier: ApiTier): TierQuota {
  return TIER_QUOTAS[tier];
}
