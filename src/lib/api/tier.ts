import { TIER_QUOTAS } from "./quotas";

export type ApiTier = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export function normalizeTier(value: string | null | undefined): ApiTier {
  const v = (value || "").toUpperCase();
  if (v === "STARTER" || v === "PRO" || v === "ENTERPRISE") return v;
  return "FREE";
}

const TIER_RANK: Record<ApiTier, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  ENTERPRISE: 3,
};

export function hasTier(tier: ApiTier, minTier: ApiTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[minTier];
}

export function tierLimit(tier: ApiTier): number {
  return TIER_QUOTAS[tier].dailyApi;
}

export { TIER_QUOTAS, getQuota, getModelQuota, type TierQuota, type ModelQuotas } from "./quotas";
