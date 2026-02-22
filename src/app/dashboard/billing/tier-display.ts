import { TIER_QUOTAS } from "@/lib/api/quotas";

const tierDisplayNames: Record<string, string> = {
  FREE: "Analyst (Free)",
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Institutional",
};

export function getTierDisplayName(tier: string): string {
  return tierDisplayNames[tier] ?? tier;
}

export function getTierLimit(tier: string): number {
  const key = tier as keyof typeof TIER_QUOTAS;
  return TIER_QUOTAS[key]?.monthlyApi ?? 0;
}

export function getTierDailyLimit(tier: string): number {
  const key = tier as keyof typeof TIER_QUOTAS;
  return TIER_QUOTAS[key]?.dailyApi ?? 0;
}
