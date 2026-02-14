import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  default: {
    apiSubscription: { findUnique: vi.fn() },
    userPost: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { POST } from "../route";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  apiSubscription: { findUnique: ReturnType<typeof vi.fn> };
  userPost: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/dashboard/user-posts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function setTier(tier: string | null) {
  mockPrisma.apiSubscription.findUnique.mockResolvedValue(
    tier ? { tier } : null
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/dashboard/user-posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "test-user-id" },
      error: null,
    });
    mockPrisma.userPost.count.mockResolvedValue(0);
    mockPrisma.userPost.create.mockResolvedValue({
      id: "post-1",
      content: "test",
      status: "DRAFT",
    });
  });

  // ── FREE tier ───────────────────────────────────────────────────────────

  describe("FREE tier", () => {
    beforeEach(() => setTier(null));

    it("rejects publish with 403", async () => {
      const res = await POST(makeRequest({ content: "hello", action: "publish" }));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toMatch(/requires.*Pro/i);
    });

    it("rejects schedule with 403", async () => {
      const res = await POST(
        makeRequest({
          content: "hello",
          action: "schedule",
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        })
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toMatch(/requires.*Pro/i);
    });

    it("rejects draft when at max drafts (5)", async () => {
      mockPrisma.userPost.count.mockResolvedValue(5);
      const res = await POST(makeRequest({ content: "hello", action: "draft" }));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("QUOTA_EXCEEDED");
      expect(json.message).toMatch(/5 drafts/);
    });

    it("allows draft when under max drafts", async () => {
      mockPrisma.userPost.count.mockResolvedValue(4);
      const res = await POST(makeRequest({ content: "hello", action: "draft" }));
      expect(res.status).toBe(201);
    });
  });

  // ── PRO tier ──────────────────────────────────────────────────────────

  describe("PRO tier", () => {
    beforeEach(() => setTier("PRO"));

    it("allows publish", async () => {
      const res = await POST(makeRequest({ content: "hello", action: "publish" }));
      expect(res.status).toBe(201);
    });

    it("allows schedule when under limit", async () => {
      mockPrisma.userPost.count.mockResolvedValue(0);
      const res = await POST(
        makeRequest({
          content: "hello",
          action: "schedule",
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        })
      );
      expect(res.status).toBe(201);
    });

    it("rejects schedule when at max scheduled (10)", async () => {
      mockPrisma.userPost.count.mockResolvedValue(10);
      const res = await POST(
        makeRequest({
          content: "hello",
          action: "schedule",
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        })
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("QUOTA_EXCEEDED");
      expect(json.message).toMatch(/10 pending scheduled/);
    });

    it("allows draft (unlimited for PRO)", async () => {
      // PRO has maxDrafts = Infinity — count doesn't matter
      mockPrisma.userPost.count.mockResolvedValue(999);
      const res = await POST(makeRequest({ content: "hello", action: "draft" }));
      expect(res.status).toBe(201);
    });
  });

  // ── ENTERPRISE tier ───────────────────────────────────────────────────

  describe("ENTERPRISE tier", () => {
    beforeEach(() => setTier("ENTERPRISE"));

    it("allows schedule (Infinity max)", async () => {
      mockPrisma.userPost.count.mockResolvedValue(100);
      const res = await POST(
        makeRequest({
          content: "hello",
          action: "schedule",
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        })
      );
      expect(res.status).toBe(201);
    });

    it("allows publish", async () => {
      const res = await POST(makeRequest({ content: "hello", action: "publish" }));
      expect(res.status).toBe(201);
    });
  });
});
