import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Brand, MetricType, PeriodType } from "@prisma/client";
import { authenticatePublicApi, clampMonthlyRangeOrThrow } from "@/lib/api/auth";
import { parseYearMonth, compareYearMonth } from "@/lib/api/delay";

export const runtime = "nodejs";

function parseIntParam(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function ymToWhereGte(ym: { year: number; month: number }) {
  return {
    OR: [{ year: { gt: ym.year } }, { year: ym.year, period: { gte: ym.month } }],
  };
}

function ymToWhereLte(ym: { year: number; month: number }) {
  return {
    OR: [{ year: { lt: ym.year } }, { year: ym.year, period: { lte: ym.month } }],
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ brand: string }> }) {
  const start = Date.now();
  const endpoint = "/api/v1/brands/{brand}/metrics";

  const auth = await authenticatePublicApi(request, { endpoint, minTier: "FREE" });
  if (!auth.ok) return auth.res;

  const { ctx, headers } = auth;

  const { brand: brandParam } = await params;
  const brand = brandParam as Brand;
  if (!Object.values(Brand).includes(brand)) {
    const res = NextResponse.json({ error: "BAD_REQUEST", code: "BAD_REQUEST", message: "Invalid brand" }, { status: 400 });
    headers.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  const { searchParams } = new URL(request.url);

  const metric = (searchParams.get("metric") as MetricType | null) || null;
  const periodType = (searchParams.get("periodType") as PeriodType | null) || null;

  // Free tier is restricted to delivery + monthly only.
  if (ctx.tier === "FREE") {
    const m = metric ?? "DELIVERY";
    if (m !== "DELIVERY") {
      const res = NextResponse.json({ error: "FORBIDDEN", code: "FORBIDDEN", message: "Free tier only supports DELIVERY" }, { status: 403 });
      headers.forEach((v, k) => res.headers.set(k, v));
      return res;
    }
    const p = periodType ?? "MONTHLY";
    if (p !== "MONTHLY") {
      const res = NextResponse.json({ error: "FORBIDDEN", code: "FORBIDDEN", message: "Free tier only supports MONTHLY" }, { status: 403 });
      headers.forEach((v, k) => res.headers.set(k, v));
      return res;
    }
  }

  const year = parseIntParam(searchParams.get("year"));
  const period = parseIntParam(searchParams.get("period"));

  const from = searchParams.get("from") ? parseYearMonth(searchParams.get("from")!) : null;
  const to = searchParams.get("to") ? parseYearMonth(searchParams.get("to")!) : null;

  // Enforce free-tier delay on MONTHLY by clamping `to`.
  const clamp = clampMonthlyRangeOrThrow({
    tier: ctx.tier,
    freeMax: ctx.freeMaxMonth,
    from,
    to,
  });

  if ("error" in clamp) {
    const res = NextResponse.json({ error: clamp.error.code, code: clamp.error.code, message: clamp.error.message }, { status: clamp.error.status });
    headers.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  const effectiveFrom = clamp.from;
  let effectiveTo = clamp.to;

  if (ctx.tier === "FREE" && ctx.freeMaxMonth && !effectiveTo && !year) {
    // Default clamp to the latest available allowed month if no explicit year/month or to.
    effectiveTo = ctx.freeMaxMonth;
  }

  // If exact year/period is requested and it's newer than allowed, deny.
  if (ctx.tier === "FREE" && ctx.freeMaxMonth && year && period) {
    const reqYm = { year, month: period };
    if (compareYearMonth(reqYm, ctx.freeMaxMonth) > 0) {
      const res = NextResponse.json({ error: "DATA_DELAY", code: "DATA_DELAY", message: "Requested period is within the free-tier delay window" }, { status: 403 });
      headers.forEach((v, k) => res.headers.set(k, v));
      return res;
    }
  }

  const limit = Math.min(200, Math.max(1, parseIntParam(searchParams.get("limit")) ?? 50));
  const page = Math.max(1, parseIntParam(searchParams.get("page")) ?? 1);
  const skip = (page - 1) * limit;

  const where: any = {
    brand,
  };
  if (metric) where.metric = metric;
  if (periodType) where.periodType = periodType;
  if (year != null) where.year = year;
  if (period != null) where.period = period;

  const and: any[] = [];
  if (effectiveFrom) and.push(ymToWhereGte(effectiveFrom));
  if (effectiveTo) and.push(ymToWhereLte(effectiveTo));
  if (and.length) where.AND = and;

  try {
    const [metrics, total] = await Promise.all([
      prisma.eVMetric.findMany({
        where,
        orderBy: [{ year: "desc" }, { period: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          brand: true,
          metric: true,
          periodType: true,
          year: true,
          period: true,
          vehicleModel: true,
          region: true,
          category: true,
          dataSource: true,
          value: true,
          unit: true,
          yoyChange: true,
          momChange: true,
          marketShare: true,
          ranking: true,
          sourceUrl: true,
          sourceTitle: true,
          confidence: true,
          createdAt: true,
        },
      }),
      prisma.eVMetric.count({ where }),
    ]);

    const res = NextResponse.json({
      data: metrics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + metrics.length < total,
      },
      data_as_of: ctx.dataAsOf.toISOString(),
      tier: ctx.tier,
    });

    headers.forEach((v, k) => res.headers.set(k, v));

    await prisma.apiRequestLog.create({
      data: {
        apiKeyId: ctx.apiKeyId,
        userId: ctx.userId,
        endpoint,
        method: request.method,
        statusCode: 200,
        durationMs: Date.now() - start,
        requestId: ctx.requestId,
        tierAtRequest: ctx.tier,
      },
    }).catch(() => { });

    return res;
  } catch (e) {
    await prisma.apiRequestLog.create({
      data: {
        apiKeyId: ctx.apiKeyId,
        userId: ctx.userId,
        endpoint,
        method: request.method,
        statusCode: 500,
        durationMs: Date.now() - start,
        requestId: ctx.requestId,
        tierAtRequest: ctx.tier,
      },
    }).catch(() => { });

    const res = NextResponse.json(
      { error: "INTERNAL", code: "INTERNAL", message: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
    headers.forEach((v, k) => res.headers.set(k, v));
    return res;
  }
}
