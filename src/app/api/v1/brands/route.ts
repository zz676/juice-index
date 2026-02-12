import { NextResponse, type NextRequest } from "next/server";
import { Brand } from "@prisma/client";
import { authenticatePublicApi } from "@/lib/api/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const BRAND_LABELS: Record<Brand, string> = {
  BYD: "BYD",
  NIO: "NIO",
  XPENG: "XPeng",
  LI_AUTO: "Li Auto",
  ZEEKR: "Zeekr",
  XIAOMI: "Xiaomi",
  TESLA_CHINA: "Tesla China",
  LEAPMOTOR: "Leapmotor",
  GEELY: "Geely",
  OTHER_BRAND: "Other",
  INDUSTRY: "Industry",
};

export async function GET(request: NextRequest) {
  const start = Date.now();
  const auth = await authenticatePublicApi(request, { endpoint: "/api/v1/brands", minTier: "FREE" });
  if (!auth.ok) return auth.res;

  const { ctx, headers } = auth;

  try {
    const brands = Object.values(Brand).map((code) => ({ code, name: BRAND_LABELS[code] || code }));
    const res = NextResponse.json({ data: brands, data_as_of: ctx.dataAsOf.toISOString(), tier: ctx.tier });
    headers.forEach((v, k) => res.headers.set(k, v));

    await prisma.apiRequestLog.create({
      data: {
        apiKeyId: ctx.apiKeyId,
        userId: ctx.userId,
        endpoint: "/api/v1/brands",
        method: request.method,
        statusCode: 200,
        durationMs: Date.now() - start,
        requestId: ctx.requestId,
        tierAtRequest: ctx.tier,
      },
    }).catch(() => {});

    return res;
  } catch (e) {
    await prisma.apiRequestLog.create({
      data: {
        apiKeyId: ctx.apiKeyId,
        userId: ctx.userId,
        endpoint: "/api/v1/brands",
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
