import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    userChartStyle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

import { GET, POST } from "../route";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

const mockPrisma = prisma as unknown as {
  userChartStyle: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const MOCK_CONFIG = { chartType: "bar", backgroundColor: "#ffffff" };

beforeEach(() => {
  vi.clearAllMocks();
  (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "user-1" },
    error: null,
  });
});

describe("GET /api/dashboard/studio/chart-styles", () => {
  it("returns styles for the current user", async () => {
    const styles = [{ id: "s1", name: "Dark", config: MOCK_CONFIG }];
    mockPrisma.userChartStyle.findMany.mockResolvedValue(styles);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.styles).toEqual(styles);
    expect(mockPrisma.userChartStyle.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns 401 when not authenticated", async () => {
    (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: null,
      error: new Response(null, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/dashboard/studio/chart-styles", () => {
  it("creates a new style", async () => {
    mockPrisma.userChartStyle.findUnique.mockResolvedValue(null);
    const created = { id: "s2", name: "My Style", config: MOCK_CONFIG };
    mockPrisma.userChartStyle.create.mockResolvedValue(created);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "My Style", config: MOCK_CONFIG }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.style).toEqual(created);
  });

  it("returns 409 when name already exists", async () => {
    mockPrisma.userChartStyle.findUnique.mockResolvedValue({ id: "existing" });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Dark", config: MOCK_CONFIG }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(409);
  });

  it("returns 400 when name is missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ config: MOCK_CONFIG }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when config is missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Dark" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
