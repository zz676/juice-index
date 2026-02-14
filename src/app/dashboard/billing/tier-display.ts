const tierDisplayNames: Record<string, string> = {
  FREE: "Analyst (Free)",
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Institutional",
};

export function getTierDisplayName(tier: string): string {
  return tierDisplayNames[tier] ?? tier;
}

const tierLimits: Record<string, number> = {
  FREE: 100,
  STARTER: 5_000,
  PRO: 50_000,
  ENTERPRISE: Infinity,
};

export function getTierLimit(tier: string): number {
  return tierLimits[tier] ?? 100;
}
