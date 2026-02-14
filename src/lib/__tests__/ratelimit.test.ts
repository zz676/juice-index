import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the delay module before importing ratelimit
vi.mock("@/lib/api/delay", () => ({
  nextUtcMidnightEpochSeconds: vi.fn(() => 1700000000),
}));

import {
  studioQueryLimit,
  studioChartLimit,
  studioPostDraftLimit,
  csvExportMonthlyLimit,
} from "../ratelimit";
import { TIER_QUOTAS } from "@/lib/api/quotas";

const USER_ID = "test-user-123";
const NOW = new Date("2024-06-15T12:00:00Z");

function mockFetchSuccess(count: number) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ result: count }),
  });
}

describe("rate limit helpers", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("missing env vars", () => {
    it("throws when UPSTASH_REDIS_REST_URL is missing", async () => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
      await expect(studioQueryLimit(USER_ID, "FREE", NOW)).rejects.toThrow(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN"
      );
    });

    it("throws when UPSTASH_REDIS_REST_TOKEN is missing", async () => {
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
      await expect(studioQueryLimit(USER_ID, "FREE", NOW)).rejects.toThrow(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN"
      );
    });
  });

  describe("studioQueryLimit", () => {
    it("succeeds when under limit", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(1));
      const result = await studioQueryLimit(USER_ID, "FREE", NOW);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(TIER_QUOTAS.FREE.studioQueries);
    });

    it("fails when over limit", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(4));
      const result = await studioQueryLimit(USER_ID, "FREE", NOW);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("studioChartLimit", () => {
    it("succeeds when under limit", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(1));
      const result = await studioChartLimit(USER_ID, "PRO", NOW);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(TIER_QUOTAS.PRO.chartGen);
    });
  });

  describe("studioPostDraftLimit", () => {
    it("succeeds when under limit", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(1));
      const result = await studioPostDraftLimit(USER_ID, "PRO", NOW);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(TIER_QUOTAS.PRO.postDrafts);
    });
  });

  describe("Infinity limits (ENTERPRISE) skip Redis", () => {
    it("studioQueryLimit succeeds without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const result = await studioQueryLimit(USER_ID, "ENTERPRISE", NOW);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(Infinity);
      expect(result.remaining).toBe(Infinity);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("studioChartLimit succeeds without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const result = await studioChartLimit(USER_ID, "ENTERPRISE", NOW);
      expect(result.success).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("studioPostDraftLimit succeeds without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const result = await studioPostDraftLimit(USER_ID, "ENTERPRISE", NOW);
      expect(result.success).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("csvExportMonthlyLimit", () => {
    it("FREE always fails (limit=0) without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const result = await csvExportMonthlyLimit(USER_ID, "FREE", NOW);
      expect(result.success).toBe(false);
      expect(result.limit).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("PRO succeeds when under limit", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(1));
      const result = await csvExportMonthlyLimit(USER_ID, "PRO", NOW);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(TIER_QUOTAS.PRO.csvExports);
    });

    it("PRO fails when over limit", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(51));
      const result = await csvExportMonthlyLimit(USER_ID, "PRO", NOW);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("ENTERPRISE always succeeds without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const result = await csvExportMonthlyLimit(USER_ID, "ENTERPRISE", NOW);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(Infinity);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
