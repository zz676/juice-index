import { describe, it, expect } from "vitest";
import { TIER_QUOTAS, getQuota, type TierQuota } from "../quotas";
import type { ApiTier } from "../tier";

const ALL_TIERS: ApiTier[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

const REQUIRED_FIELDS: (keyof TierQuota)[] = [
  "dailyApi",
  "monthlyApi",
  "maxApiKeys",
  "studioQueries",
  "chartGen",
  "postDrafts",
  "maxDrafts",
  "maxScheduled",
  "csvExports",
  "delayDays",
  "histMonths",
  "seats",
  "xAccounts",
];

describe("TIER_QUOTAS", () => {
  it("has all 4 tiers defined", () => {
    expect(Object.keys(TIER_QUOTAS).sort()).toEqual(
      [...ALL_TIERS].sort()
    );
  });

  it.each(ALL_TIERS)(
    "%s has all 13 required fields",
    (tier) => {
      const quota = TIER_QUOTAS[tier];
      for (const field of REQUIRED_FIELDS) {
        expect(quota).toHaveProperty(field);
        expect(typeof quota[field]).toBe("number");
      }
    }
  );

  it("FREE has strictest limits", () => {
    const free = TIER_QUOTAS.FREE;
    expect(free.dailyApi).toBe(0);
    expect(free.monthlyApi).toBe(0);
    expect(free.maxApiKeys).toBe(0);
    expect(free.csvExports).toBe(0);
    expect(free.delayDays).toBe(30);
    expect(free.maxScheduled).toBe(0);
  });

  it("ENTERPRISE has most permissive limits", () => {
    const ent = TIER_QUOTAS.ENTERPRISE;
    expect(ent.monthlyApi).toBe(Infinity);
    expect(ent.studioQueries).toBe(Infinity);
    expect(ent.chartGen).toBe(Infinity);
    expect(ent.postDrafts).toBe(Infinity);
    expect(ent.maxDrafts).toBe(Infinity);
    expect(ent.maxScheduled).toBe(Infinity);
    expect(ent.csvExports).toBe(Infinity);
    expect(ent.histMonths).toBe(Infinity);
  });

  describe("tier hierarchy (FREE ≤ STARTER ≤ PRO ≤ ENTERPRISE)", () => {
    // delayDays is an inverse metric — higher is more restrictive, so we
    // check it separately with a reversed comparison.
    const INVERSE_FIELDS: (keyof TierQuota)[] = ["delayDays"];
    const ASCENDING_FIELDS = REQUIRED_FIELDS.filter(
      (f) => !INVERSE_FIELDS.includes(f)
    );

    it.each(ASCENDING_FIELDS)(
      "%s increases or stays equal across tiers",
      (field) => {
        for (let i = 0; i < ALL_TIERS.length - 1; i++) {
          const lower = TIER_QUOTAS[ALL_TIERS[i]][field];
          const upper = TIER_QUOTAS[ALL_TIERS[i + 1]][field];
          expect(upper).toBeGreaterThanOrEqual(lower);
        }
      }
    );

    it("delayDays decreases or stays equal across tiers", () => {
      for (let i = 0; i < ALL_TIERS.length - 1; i++) {
        const lower = TIER_QUOTAS[ALL_TIERS[i]].delayDays;
        const upper = TIER_QUOTAS[ALL_TIERS[i + 1]].delayDays;
        expect(upper).toBeLessThanOrEqual(lower);
      }
    });
  });
});

describe("getQuota", () => {
  it.each(ALL_TIERS)(
    "returns correct object for %s",
    (tier) => {
      expect(getQuota(tier)).toBe(TIER_QUOTAS[tier]);
    }
  );
});
