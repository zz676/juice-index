import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  default: {
    monitoredAccount: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
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
  monitoredAccount: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockRequireUser = requireUser as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/dashboard/engagement/accounts/bulk",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

function setUser(id = "user-1") {
  mockRequireUser.mockResolvedValue({ user: { id }, error: null });
}

function setAccounts(accounts: { id: string; username: string }[]) {
  mockPrisma.monitoredAccount.findMany.mockResolvedValue(accounts);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/dashboard/engagement/accounts/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.monitoredAccount.update.mockResolvedValue({});
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      user: null,
      error: new Response(null, { status: 401 }),
    });

    const res = await POST(makeRequest({ accounts: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    setUser();
    const req = new NextRequest(
      "http://localhost:3000/api/dashboard/engagement/accounts/bulk",
      { method: "POST", body: "not-json", headers: { "Content-Type": "application/json" } }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("BAD_REQUEST");
  });

  it("returns 400 when accounts field is missing", async () => {
    setUser();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("BAD_REQUEST");
  });

  it("returns 400 when accounts is not an array", async () => {
    setUser();
    const res = await POST(makeRequest({ accounts: "not-array" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("BAD_REQUEST");
  });

  it("updates pollInterval for matching accounts", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }, { id: "acc-2", username: "bob" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", pollInterval: 60 }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledOnce();
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { pollInterval: 60 },
    });
  });

  it("updates temperature for matching accounts", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", temperature: 0.5 }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { temperature: 0.5 },
    });
  });

  it("updates toneWeights for matching accounts", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);
    const weights = { "tone-id-1": 70, "tone-id-2": 30 };

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", toneWeights: weights }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { toneWeights: weights },
    });
  });

  it("updates imageFrequency for matching accounts", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", imageFrequency: 25 }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { imageFrequency: 25 },
    });
  });

  it("updates autoPost flag", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", autoPost: true }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { autoPost: true },
    });
  });

  it("updates ignorePauseSchedule flag", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", ignorePauseSchedule: false }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { ignorePauseSchedule: false },
    });
  });

  it("updates enabled flag", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", enabled: false }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { enabled: false },
    });
  });

  it("updates accountContext string", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", accountContext: "Tech blogger covering AI" }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { accountContext: "Tech blogger covering AI" },
    });
  });

  it("allows clearing accountContext by passing null", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", accountContext: null }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { accountContext: null },
    });
  });

  it("updates multiple fields at once", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({
        accounts: [{ username: "alice", pollInterval: 30, temperature: 0.9, imageFrequency: 10 }],
      })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { pollInterval: 30, temperature: 0.9, imageFrequency: 10 },
    });
  });

  it("updates all fields together", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({
        accounts: [{
          username: "alice",
          pollInterval: 60,
          temperature: 0.7,
          toneWeights: { "t1": 100 },
          imageFrequency: 20,
          autoPost: true,
          ignorePauseSchedule: true,
          enabled: false,
          accountContext: "Some context",
        }],
      })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: {
        pollInterval: 60,
        temperature: 0.7,
        toneWeights: { "t1": 100 },
        imageFrequency: 20,
        autoPost: true,
        ignorePauseSchedule: true,
        enabled: false,
        accountContext: "Some context",
      },
    });
  });

  it("skips accounts not found and reports them", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({
        accounts: [
          { username: "alice", pollInterval: 60 },
          { username: "ghost", pollInterval: 60 },
        ],
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updated).toBe(1);
    expect(data.skipped).toEqual(["ghost"]);
  });

  it("returns updated count for all matched accounts", async () => {
    setUser();
    setAccounts([
      { id: "acc-1", username: "alice" },
      { id: "acc-2", username: "bob" },
    ]);

    const res = await POST(
      makeRequest({
        accounts: [
          { username: "alice", pollInterval: 60 },
          { username: "bob", temperature: 0.3 },
        ],
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updated).toBe(2);
    expect(data.skipped).toEqual([]);
  });

  it("ignores invalid pollInterval values", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", pollInterval: 7 }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: {},
    });
  });

  it("ignores temperature out of range", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", temperature: 2.5 }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: {},
    });
  });

  it("ignores imageFrequency out of 0-100 range", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", imageFrequency: 150 }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: {},
    });
  });

  it("handles empty accounts array without error", async () => {
    setUser();
    setAccounts([]);

    const res = await POST(makeRequest({ accounts: [] }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updated).toBe(0);
    expect(data.skipped).toEqual([]);
    expect(mockPrisma.monitoredAccount.update).not.toHaveBeenCalled();
  });

  it("only queries accounts belonging to the authenticated user", async () => {
    setUser("user-42");
    setAccounts([]);

    await POST(makeRequest({ accounts: [{ username: "alice", pollInterval: 60 }] }));

    expect(mockPrisma.monitoredAccount.findMany).toHaveBeenCalledWith({
      where: { userId: "user-42" },
      select: { id: true, username: true },
    });
  });

  it("allows clearing toneWeights by passing null", async () => {
    setUser();
    setAccounts([{ id: "acc-1", username: "alice" }]);

    const res = await POST(
      makeRequest({ accounts: [{ username: "alice", toneWeights: null }] })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.monitoredAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { toneWeights: null },
    });
  });
});
