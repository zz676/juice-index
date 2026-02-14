import { describe, it, expect } from "vitest";
import {
  MODEL_REGISTRY,
  DEFAULT_MODEL_ID,
  DEFAULT_TEMPERATURE,
  getModelById,
  canAccessModel,
} from "../models";
import type { ApiTier } from "@/lib/api/tier";

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
  it("has exactly 4 models", () => {
    expect(MODEL_REGISTRY).toHaveLength(4);
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
  it("DEFAULT_MODEL_ID is gpt-4o-mini", () => {
    expect(DEFAULT_MODEL_ID).toBe("gpt-4o-mini");
  });

  it("DEFAULT_MODEL_ID exists in the registry", () => {
    expect(getModelById(DEFAULT_MODEL_ID)).toBeDefined();
  });

  it("DEFAULT_TEMPERATURE is 0.4", () => {
    expect(DEFAULT_TEMPERATURE).toBe(0.4);
  });
});

describe("getModelById", () => {
  it("returns GPT-4o Mini for gpt-4o-mini", () => {
    const model = getModelById("gpt-4o-mini");
    expect(model).toBeDefined();
    expect(model!.displayName).toBe("GPT-4o Mini");
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
    it("can access gpt-4o-mini (FREE model)", () => {
      expect(canAccessModel("FREE", "gpt-4o-mini")).toBe(true);
    });

    it("cannot access gpt-4o (PRO model)", () => {
      expect(canAccessModel("FREE", "gpt-4o")).toBe(false);
    });

    it("cannot access claude-3-5-sonnet (PRO model)", () => {
      expect(canAccessModel("FREE", "claude-3-5-sonnet")).toBe(false);
    });

    it("cannot access claude-opus-4 (ENTERPRISE model)", () => {
      expect(canAccessModel("FREE", "claude-opus-4")).toBe(false);
    });

    it("returns false for nonexistent model", () => {
      expect(canAccessModel("FREE", "nonexistent")).toBe(false);
    });
  });

  describe("PRO tier", () => {
    it("can access gpt-4o-mini (FREE model)", () => {
      expect(canAccessModel("PRO", "gpt-4o-mini")).toBe(true);
    });

    it("can access gpt-4o (PRO model)", () => {
      expect(canAccessModel("PRO", "gpt-4o")).toBe(true);
    });

    it("can access claude-3-5-sonnet (PRO model)", () => {
      expect(canAccessModel("PRO", "claude-3-5-sonnet")).toBe(true);
    });

    it("cannot access claude-opus-4 (ENTERPRISE model)", () => {
      expect(canAccessModel("PRO", "claude-opus-4")).toBe(false);
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
