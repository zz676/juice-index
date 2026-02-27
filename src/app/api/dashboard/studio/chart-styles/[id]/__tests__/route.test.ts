import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    userChartStyle: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

import { PUT, DELETE } from "../route";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

const mockPrisma = prisma as unknown as {
  userChartStyle: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const MOCK_STYLE = { id: "s1", userId: "user-1", name: "Dark", config: {} };
const MOCK_CONFIG = { chartType: "bar", backgroundColor: "#000000" };

beforeEach(() => {
  vi.clearAllMocks();
  (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "user-1" },
    error: null,
  });
});

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PUT /api/dashboard/studio/chart-styles/[id]", () => {
  it("updates name and config", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(MOCK_STYLE);
    mockPrisma.userChartStyle.findUnique.mockResolvedValue(null);
    const updated = { ...MOCK_STYLE, name: "New Name", config: MOCK_CONFIG };
    mockPrisma.userChartStyle.update.mockResolvedValue(updated);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name", config: MOCK_CONFIG }),
    });

    const res = await PUT(req as any, makeParams("s1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.style).toEqual(updated);
  });

  it("returns 404 if style not found or not owned", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });

    const res = await PUT(req as any, makeParams("bad-id"));
    expect(res.status).toBe(404);
  });

  it("returns 409 on name conflict", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(MOCK_STYLE);
    mockPrisma.userChartStyle.findUnique.mockResolvedValue({ id: "other" });

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ name: "Taken Name" }),
    });

    const res = await PUT(req as any, makeParams("s1"));
    expect(res.status).toBe(409);
  });

  it("returns 400 when nothing to update", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(MOCK_STYLE);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({}),
    });

    const res = await PUT(req as any, makeParams("s1"));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/dashboard/studio/chart-styles/[id]", () => {
  it("deletes the style and returns 204", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(MOCK_STYLE);
    mockPrisma.userChartStyle.delete.mockResolvedValue(MOCK_STYLE);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req as any, makeParams("s1"));

    expect(res.status).toBe(204);
  });

  it("returns 404 if not found", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req as any, makeParams("bad-id"));

    expect(res.status).toBe(404);
  });
});
