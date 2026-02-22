import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  default: {
    apiSubscription: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  csvExportMonthlyLimit: vi.fn(),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { POST } from "../route";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { csvExportMonthlyLimit } from "@/lib/ratelimit";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  apiSubscription: { findUnique: ReturnType<typeof vi.fn> };
};

const mockCsvLimit = csvExportMonthlyLimit as ReturnType<typeof vi.fn>;

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/dashboard/csv-export", {
    method: "POST",
  });
}

function setTier(tier: string | null) {
  mockPrisma.apiSubscription.findUnique.mockResolvedValue(
    tier ? { tier, status: "active" } : null
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/dashboard/csv-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "test-user-id" },
      error: null,
    });
  });

  it("FREE → 403 (not available)", async () => {
    setTier(null);
    mockCsvLimit.mockResolvedValue({
      success: false,
      limit: 0,
      remaining: 0,
      reset: 0,
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("QUOTA_EXCEEDED");
    expect(json.message).toMatch(/not available on the Free plan/i);
  });

  it("PRO within limit → 200 allowed", async () => {
    setTier("PRO");
    mockCsvLimit.mockResolvedValue({
      success: true,
      limit: 50,
      remaining: 49,
      reset: 0,
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.allowed).toBe(true);
    expect(json.remaining).toBe(49);
  });

  it("PRO over monthly limit → 403", async () => {
    setTier("PRO");
    mockCsvLimit.mockResolvedValue({
      success: false,
      limit: 50,
      remaining: 0,
      reset: 0,
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("QUOTA_EXCEEDED");
    expect(json.message).toMatch(/monthly.*limit/i);
  });

  it("ENTERPRISE within limit → 200 allowed", async () => {
    setTier("ENTERPRISE");
    mockCsvLimit.mockResolvedValue({
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.allowed).toBe(true);
  });
});
