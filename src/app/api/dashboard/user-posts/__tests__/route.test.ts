import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  default: {
    apiSubscription: { findUnique: vi.fn() },
    userPost: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    xAccount: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  weeklyPublishLimit: vi.fn(),
  getWeeklyPublishUsage: vi.fn(),
}));

vi.mock("@/lib/x/refresh-token", () => ({
  refreshTokenIfNeeded: vi.fn(),
  XTokenExpiredError: class XTokenExpiredError extends Error {},
}));

vi.mock("@/lib/x/post-tweet", () => ({
  postTweet: vi.fn(),
}));

vi.mock("@/lib/x/upload-media", () => ({
  uploadMedia: vi.fn(),
  stripBase64Prefix: vi.fn((s: string) => s),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { POST } from "../route";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { weeklyPublishLimit } from "@/lib/ratelimit";
import { refreshTokenIfNeeded } from "@/lib/x/refresh-token";
import { postTweet } from "@/lib/x/post-tweet";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  apiSubscription: { findUnique: ReturnType<typeof vi.fn> };
  userPost: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  xAccount: { findUnique: ReturnType<typeof vi.fn> };
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
    mockPrisma.xAccount.findUnique.mockResolvedValue(null);
    (weeklyPublishLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 9999999999,
    });
    (refreshTokenIfNeeded as ReturnType<typeof vi.fn>).mockResolvedValue(
      "mock-access-token"
    );
    (postTweet as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tweet-123",
      text: "hello",
    });
  });

  // ── FREE tier ───────────────────────────────────────────────────────────

  describe("FREE tier", () => {
    beforeEach(() => setTier(null));

    it("rejects publish with 403", async () => {
      const res = await POST(makeRequest({ content: "hello", action: "publish" }));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toMatch(/requires.*Starter/i);
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
      expect(json.message).toMatch(/requires.*Starter/i);
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
    beforeEach(() => {
      setTier("PRO");
      mockPrisma.xAccount.findUnique.mockResolvedValue({
        id: "xacct-1",
        userId: "test-user-id",
        isXPremium: false,
        accessToken: "tok",
        refreshToken: "ref",
        expiresAt: new Date(Date.now() + 3600000),
      });
    });

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
    beforeEach(() => {
      setTier("ENTERPRISE");
      mockPrisma.xAccount.findUnique.mockResolvedValue({
        id: "xacct-2",
        userId: "test-user-id",
        isXPremium: true,
        accessToken: "tok",
        refreshToken: "ref",
        expiresAt: new Date(Date.now() + 3600000),
      });
    });

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
