import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticatePublicApi } from "@/lib/api/auth";
import { buildMonthlyRangeWhere, getPagination, parseIntParam, parseYearMonth } from "../_helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const endpoint = "/api/v1/industry/caam-nev-sales";

  const auth = await authenticatePublicApi(request, { endpoint, minTier: "PRO" });
  if (!auth.ok) return auth.res;

  const { ctx, headers } = auth;

  const { searchParams } = new URL(request.url);
  const year = parseIntParam(searchParams.get("year"));
  const month = parseIntParam(searchParams.get("month"));

  const from = parseYearMonth(searchParams.get("from"));
  const to = parseYearMonth(searchParams.get("to"));

  const { limit, page, skip, sortOrder } = getPagination(request);

  const where: any = {};
  if (year != null) where.year = year;
  if (month != null) where.month = month;

  const range = buildMonthlyRangeWhere(from, to);
  if (Object.keys(range).length) where.AND = range.AND;

  try {
    const [data, total] = await Promise.all([
      (prisma as any).caamNevSales.findMany({
        where,
        orderBy: [{ year: sortOrder }, { month: sortOrder }],
        skip,
        take: limit,
      }),
      (prisma as any).caamNevSales.count({ where }),
    ]);

    const res = NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + data.length < total,
      },
      data_as_of: ctx.dataAsOf.toISOString(),
      tier: ctx.tier,
    });

    headers.forEach((v, k) => res.headers.set(k, v));

    await prisma.aIUsage.create({
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
    }).catch(() => {});

    return res;
  } catch (e) {
    await prisma.aIUsage.create({
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
    }).catch(() => {});

    const res = NextResponse.json(
      { error: "INTERNAL", code: "INTERNAL", message: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
    headers.forEach((v, k) => res.headers.set(k, v));
    return res;
  }
}
