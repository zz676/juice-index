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
    dailyApi: 100,
    monthlyApi: 50,
    maxApiKeys: 1,
    studioQueries: 99,
    chartGen: 80,
    postDrafts: 50,
    maxDrafts: 50,
    maxScheduled: 50,
    csvExports: 50,
    delayDays: 0,
    histMonths: 60,
    seats: 1,
    xAccounts: 1,
  },
  STARTER: {
    dailyApi: 500,
    monthlyApi: 100,
    maxApiKeys: 1,
    studioQueries: 100,
    chartGen: 100,
    postDrafts: 100,
    maxDrafts: 100,
    maxScheduled: 100,
    csvExports: 100,
    delayDays: 0,
    histMonths: 60,
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
