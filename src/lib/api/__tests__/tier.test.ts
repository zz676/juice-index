import { describe, it, expect } from "vitest";
import { normalizeTier, hasTier, tierLimit } from "../tier";
import { TIER_QUOTAS } from "../quotas";
import type { ApiTier } from "../tier";

describe("normalizeTier", () => {
  it.each([
    ["pro", "PRO"],
    ["Pro", "PRO"],
    ["PRO", "PRO"],
    ["starter", "STARTER"],
    ["Starter", "STARTER"],
    ["STARTER", "STARTER"],
    ["enterprise", "ENTERPRISE"],
    ["Enterprise", "ENTERPRISE"],
    ["ENTERPRISE", "ENTERPRISE"],
    ["free", "FREE"],
    ["FREE", "FREE"],
  ] as const)("normalizeTier(%j) → %j", (input, expected) => {
    expect(normalizeTier(input)).toBe(expected);
  });

  it("returns FREE for null", () => {
    expect(normalizeTier(null)).toBe("FREE");
  });

  it("returns FREE for undefined", () => {
    expect(normalizeTier(undefined)).toBe("FREE");
  });

  it("returns FREE for empty string", () => {
    expect(normalizeTier("")).toBe("FREE");
  });

  it("returns FREE for invalid values", () => {
    expect(normalizeTier("invalid")).toBe("FREE");
    expect(normalizeTier("gold")).toBe("FREE");
    expect(normalizeTier("premium")).toBe("FREE");
  });
});

describe("hasTier", () => {
  it("same tier always passes", () => {
    const tiers: ApiTier[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];
    for (const t of tiers) {
      expect(hasTier(t, t)).toBe(true);
    }
  });

  it("FREE cannot reach PRO", () => {
    expect(hasTier("FREE", "PRO")).toBe(false);
  });

  it("FREE cannot reach STARTER", () => {
    expect(hasTier("FREE", "STARTER")).toBe(false);
  });

  it("ENTERPRISE meets any minimum tier", () => {
    expect(hasTier("ENTERPRISE", "FREE")).toBe(true);
    expect(hasTier("ENTERPRISE", "STARTER")).toBe(true);
    expect(hasTier("ENTERPRISE", "PRO")).toBe(true);
    expect(hasTier("ENTERPRISE", "ENTERPRISE")).toBe(true);
  });

  it("PRO meets STARTER and FREE but not ENTERPRISE", () => {
    expect(hasTier("PRO", "FREE")).toBe(true);
    expect(hasTier("PRO", "STARTER")).toBe(true);
    expect(hasTier("PRO", "PRO")).toBe(true);
    expect(hasTier("PRO", "ENTERPRISE")).toBe(false);
  });

  it("STARTER meets FREE but not PRO", () => {
    expect(hasTier("STARTER", "FREE")).toBe(true);
    expect(hasTier("STARTER", "STARTER")).toBe(true);
    expect(hasTier("STARTER", "PRO")).toBe(false);
  });
});

describe("tierLimit", () => {
  it.each(["FREE", "STARTER", "PRO", "ENTERPRISE"] as const)(
    "returns dailyApi for %s",
    (tier) => {
      expect(tierLimit(tier)).toBe(TIER_QUOTAS[tier].dailyApi);
    }
  );
});
