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
  switch (tier) {
    case "STARTER":
      return 1000;
    case "PRO":
      return 10000;
    case "ENTERPRISE":
      return 100000;
    case "FREE":
    default:
      return 10; // Lower limit for internal tools/dashboard usage? Or keep as 100?
  }
}
