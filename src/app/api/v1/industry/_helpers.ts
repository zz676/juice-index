import { NextRequest } from "next/server";

export function parseIntParam(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function parseYearMonth(value: string | null): { year: number; month: number } | null {
  if (!value) return null;
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function buildMonthlyRangeWhere(from: { year: number; month: number } | null, to: { year: number; month: number } | null) {
  const and: any[] = [];
  if (from) {
    and.push({ OR: [{ year: { gt: from.year } }, { year: from.year, month: { gte: from.month } }] });
  }
  if (to) {
    and.push({ OR: [{ year: { lt: to.year } }, { year: to.year, month: { lte: to.month } }] });
  }
  return and.length ? { AND: and } : {};
}

export function getPagination(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, Math.max(1, parseIntParam(searchParams.get("limit")) ?? 50));
  const page = Math.max(1, parseIntParam(searchParams.get("page")) ?? 1);
  const skip = (page - 1) * limit;
  const sortOrder = (searchParams.get("sortOrder") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  return { limit, page, skip, sortOrder };
}
