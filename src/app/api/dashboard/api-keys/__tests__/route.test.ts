import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  default: {
    apiSubscription: { findUnique: vi.fn() },
    apiKey: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/api/keys", () => ({
  generateApiKeySecret: vi.fn(() => "ji_live_testabc123"),
  sha256Hex: vi.fn(() => "fakehash"),
  keyPrefix: vi.fn(() => "ji_live_test"),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { POST } from "../route";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  apiSubscription: { findUnique: ReturnType<typeof vi.fn> };
  apiKey: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

function setTier(tier: string | null) {
  mockPrisma.apiSubscription.findUnique.mockResolvedValue(
    tier ? { tier, status: "active" } : null
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/dashboard/api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "test-user-id" },
      error: null,
    });
    mockPrisma.apiKey.count.mockResolvedValue(0);
    mockPrisma.apiKey.create.mockResolvedValue({
      id: "key-1",
      keyPrefix: "ji_live_test",
      createdAt: new Date(),
    });
  });

  it("FREE → 403 (not available)", async () => {
    setTier(null);
    const res = await POST();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("FORBIDDEN");
    expect(json.message).toMatch(/not available on the Free plan/i);
  });

  it("PRO with 0 keys → 201 success", async () => {
    setTier("PRO");
    mockPrisma.apiKey.count.mockResolvedValue(0);
    const res = await POST();
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.key).toBeDefined();
    expect(json.key.secret).toBe("ji_live_testabc123");
  });

  it("PRO with 2 existing keys → 403 (max 2)", async () => {
    setTier("PRO");
    mockPrisma.apiKey.count.mockResolvedValue(2);
    const res = await POST();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("QUOTA_EXCEEDED");
    expect(json.message).toMatch(/at most 2/);
  });

  it("ENTERPRISE with 9 keys → 201 success", async () => {
    setTier("ENTERPRISE");
    mockPrisma.apiKey.count.mockResolvedValue(9);
    const res = await POST();
    expect(res.status).toBe(201);
  });

  it("ENTERPRISE with 10 keys → 403 (max 10)", async () => {
    setTier("ENTERPRISE");
    mockPrisma.apiKey.count.mockResolvedValue(10);
    const res = await POST();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("QUOTA_EXCEEDED");
    expect(json.message).toMatch(/at most 10/);
  });

  it("STARTER with 0 keys → 201 success", async () => {
    setTier("STARTER");
    mockPrisma.apiKey.count.mockResolvedValue(0);
    const res = await POST();
    expect(res.status).toBe(201);
  });

  it("STARTER with 1 key → 403 (max 1)", async () => {
    setTier("STARTER");
    mockPrisma.apiKey.count.mockResolvedValue(1);
    const res = await POST();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("QUOTA_EXCEEDED");
    expect(json.message).toMatch(/at most 1/);
  });
});
