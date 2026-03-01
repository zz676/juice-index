import { describe, it, expect } from "vitest";
import {
  MODEL_REGISTRY,
  DEFAULT_MODEL_ID,
  DEFAULT_TEMPERATURE,
  getModelById,
  canAccessModel,
} from "../models";
import type { ApiTier } from "@/lib/api/tier";
import { TIER_QUOTAS, getModelQuota } from "@/lib/api/quotas";

const REQUIRED_MODEL_FIELDS = [
  "id",
  "displayName",
  "provider",
  "providerModelId",
  "minTier",
  "defaultMaxTokens",
  "description",
] as const;

describe("MODEL_REGISTRY", () => {
  it("has exactly 6 models", () => {
    expect(MODEL_REGISTRY).toHaveLength(6);
  });

  it.each(MODEL_REGISTRY.map((m) => [m.id, m]))(
    "%s has all required fields",
    (_id, model) => {
      for (const field of REQUIRED_MODEL_FIELDS) {
        expect(model).toHaveProperty(field);
      }
    }
  );
});

describe("defaults", () => {
  it("DEFAULT_MODEL_ID is grok-4-1-fast-reasoning", () => {
    expect(DEFAULT_MODEL_ID).toBe("grok-4-1-fast-reasoning");
  });

  it("DEFAULT_MODEL_ID exists in the registry", () => {
    expect(getModelById(DEFAULT_MODEL_ID)).toBeDefined();
  });

  it("DEFAULT_TEMPERATURE is 0.4", () => {
    expect(DEFAULT_TEMPERATURE).toBe(0.4);
  });
});

describe("getModelById", () => {
  it("returns Grok 4.1 Fast for grok-4-1-fast-reasoning", () => {
    const model = getModelById("grok-4-1-fast-reasoning");
    expect(model).toBeDefined();
    expect(model!.displayName).toBe("Grok 4.1 Fast");
  });

  it("returns undefined for nonexistent model", () => {
    expect(getModelById("nonexistent")).toBeUndefined();
  });

  it.each(MODEL_REGISTRY.map((m) => m.id))(
    "finds %s in the registry",
    (id) => {
      expect(getModelById(id)).toBeDefined();
      expect(getModelById(id)!.id).toBe(id);
    }
  );
});

describe("canAccessModel", () => {
  describe("FREE tier", () => {
    it("can access grok-4-1-fast-reasoning (FREE model)", () => {
      expect(canAccessModel("FREE", "grok-4-1-fast-reasoning")).toBe(true);
    });

    it("cannot access gpt-5-mini (STARTER model)", () => {
      expect(canAccessModel("FREE", "gpt-5-mini")).toBe(false);
    });

    it("cannot access gemini-3.1-pro-preview (STARTER model)", () => {
      expect(canAccessModel("FREE", "gemini-3.1-pro-preview")).toBe(false);
    });

    it("cannot access claude-sonnet-4-6 (STARTER model)", () => {
      expect(canAccessModel("FREE", "claude-sonnet-4-6")).toBe(false);
    });

    it("cannot access gpt-5.2 (PRO model)", () => {
      expect(canAccessModel("FREE", "gpt-5.2")).toBe(false);
    });

    it("cannot access claude-opus-4-6 (PRO model)", () => {
      expect(canAccessModel("FREE", "claude-opus-4-6")).toBe(false);
    });

    it("returns false for nonexistent model", () => {
      expect(canAccessModel("FREE", "nonexistent")).toBe(false);
    });
  });

  describe("STARTER tier", () => {
    it("can access grok-4-1-fast-reasoning (FREE model)", () => {
      expect(canAccessModel("STARTER", "grok-4-1-fast-reasoning")).toBe(true);
    });

    it("can access gpt-5-mini (STARTER model)", () => {
      expect(canAccessModel("STARTER", "gpt-5-mini")).toBe(true);
    });

    it("can access gemini-3.1-pro-preview (STARTER model)", () => {
      expect(canAccessModel("STARTER", "gemini-3.1-pro-preview")).toBe(true);
    });

    it("can access claude-sonnet-4-6 (STARTER model)", () => {
      expect(canAccessModel("STARTER", "claude-sonnet-4-6")).toBe(true);
    });

    it("cannot access gpt-5.2 (PRO model)", () => {
      expect(canAccessModel("STARTER", "gpt-5.2")).toBe(false);
    });

    it("cannot access claude-opus-4-6 (PRO model)", () => {
      expect(canAccessModel("STARTER", "claude-opus-4-6")).toBe(false);
    });
  });

  describe("PRO tier", () => {
    it("can access grok-4-1-fast-reasoning (FREE model)", () => {
      expect(canAccessModel("PRO", "grok-4-1-fast-reasoning")).toBe(true);
    });

    it("can access claude-sonnet-4-6 (STARTER model)", () => {
      expect(canAccessModel("PRO", "claude-sonnet-4-6")).toBe(true);
    });

    it("can access gpt-5.2 (PRO model)", () => {
      expect(canAccessModel("PRO", "gpt-5.2")).toBe(true);
    });

    it("can access claude-opus-4-6 (PRO model)", () => {
      expect(canAccessModel("PRO", "claude-opus-4-6")).toBe(true);
    });
  });

  describe("ENTERPRISE tier", () => {
    it("can access all models", () => {
      for (const model of MODEL_REGISTRY) {
        expect(canAccessModel("ENTERPRISE", model.id)).toBe(true);
      }
    });

    it("returns false for nonexistent model", () => {
      expect(canAccessModel("ENTERPRISE", "nonexistent")).toBe(false);
    });
  });

  describe("higher tiers always access lower-tier models", () => {
    const TIER_ORDER: ApiTier[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

    it.each(MODEL_REGISTRY.map((m) => [m.id, m.minTier]))(
      "%s (minTier=%s) is accessible by all tiers at or above",
      (modelId, minTier) => {
        const minIdx = TIER_ORDER.indexOf(minTier as ApiTier);
        for (let i = 0; i < TIER_ORDER.length; i++) {
          if (i >= minIdx) {
            expect(canAccessModel(TIER_ORDER[i], modelId as string)).toBe(true);
          } else {
            expect(canAccessModel(TIER_ORDER[i], modelId as string)).toBe(false);
          }
        }
      }
    );
  });
});

describe("per-model quotas", () => {
  const TIERS: ApiTier[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

  it("every tier has studioQueriesByModel and postDraftsByModel", () => {
    for (const tier of TIERS) {
      expect(TIER_QUOTAS[tier]).toHaveProperty("studioQueriesByModel");
      expect(TIER_QUOTAS[tier]).toHaveProperty("postDraftsByModel");
      expect(typeof TIER_QUOTAS[tier].studioQueriesByModel).toBe("object");
      expect(typeof TIER_QUOTAS[tier].postDraftsByModel).toBe("object");
    }
  });

  it("STARTER studioQueries global cap is 15", () => {
    expect(TIER_QUOTAS.STARTER.studioQueries).toBe(15);
  });

  it("per-model query limits do not exceed global cap", () => {
    for (const tier of TIERS) {
      const globalCap = TIER_QUOTAS[tier].studioQueries;
      for (const [, limit] of Object.entries(TIER_QUOTAS[tier].studioQueriesByModel)) {
        expect(limit).toBeLessThanOrEqual(globalCap);
      }
    }
  });

  it("per-model draft limits do not exceed global cap", () => {
    for (const tier of TIERS) {
      const globalCap = TIER_QUOTAS[tier].postDrafts;
      for (const [, limit] of Object.entries(TIER_QUOTAS[tier].postDraftsByModel)) {
        expect(limit).toBeLessThanOrEqual(globalCap);
      }
    }
  });

  it("getModelQuota returns 0 for inaccessible models", () => {
    expect(getModelQuota("FREE", "gpt-5-mini", "studioQueriesByModel")).toBe(0);
    expect(getModelQuota("FREE", "claude-opus-4-6", "postDraftsByModel")).toBe(0);
    expect(getModelQuota("STARTER", "claude-opus-4-6", "studioQueriesByModel")).toBe(0);
  });

  it("getModelQuota returns correct values for accessible models", () => {
    expect(getModelQuota("FREE", "grok-4-1-fast-reasoning", "studioQueriesByModel")).toBe(3);
    expect(getModelQuota("STARTER", "claude-sonnet-4-6", "studioQueriesByModel")).toBe(5);
    expect(getModelQuota("PRO", "claude-opus-4-6", "studioQueriesByModel")).toBe(10);
    expect(getModelQuota("PRO", "claude-opus-4-6", "postDraftsByModel")).toBe(5);
    expect(getModelQuota("ENTERPRISE", "claude-opus-4-6", "studioQueriesByModel")).toBe(Infinity);
  });
});
