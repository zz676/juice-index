import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { sha256Hex } from "@/lib/api/keys";
import { type ApiTier, hasTier, normalizeTier } from "@/lib/api/tier";
import { freeCutoff, freeMaxMonthly, type YearMonth, compareYearMonth } from "@/lib/api/delay";
import { rateLimitDaily } from "@/lib/ratelimit";

export type ApiAuthContext = {
  requestId: string;
  apiKeyId: string;
  userId: string;
  tier: ApiTier;
  rateLimit: { limit: number; remaining: number; reset: number };
  now: Date;
  dataAsOf: Date;
  freeMaxMonth?: YearMonth;
};

export type ApiAuthOptions = {
  endpoint: string;
  minTier: ApiTier;
};

function jsonError(status: number, code: string, message: string, headers?: HeadersInit) {
  return NextResponse.json(
    { error: code, code, message },
    { status, headers }
  );
}

function parseBearer(request: NextRequest): string | null {
  const v = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!v) return null;
  const m = /^Bearer\s+(.+)$/.exec(v);
  return m ? m[1].trim() : null;
}

function tierLimit(tier: ApiTier): number {
  switch (tier) {
    case "STARTER":
      return 1000;
    case "PRO":
      return 10000;
    case "ENTERPRISE":
      return 100000;
    case "FREE":
    default:
      return 100;
  }
}

export async function authenticatePublicApi(request: NextRequest, opts: ApiAuthOptions): Promise<
  | { ok: true; ctx: ApiAuthContext; headers: Headers }
  | { ok: false; res: NextResponse }
> {
  const now = new Date();
  const requestId = globalThis.crypto?.randomUUID?.() || `${now.getTime()}-${Math.random()}`;

  const token = parseBearer(request);
  if (!token) {
    return { ok: false, res: jsonError(401, "UNAUTHORIZED", "Missing Authorization: Bearer <key>") };
  }

  const keyHash = sha256Hex(token);
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      userId: true,
      rateLimitOverride: true,
      tierOverride: true,
    },
  });

  if (!apiKey) {
    return { ok: false, res: jsonError(401, "UNAUTHORIZED", "Invalid API key") };
  }

  let tier: ApiTier = "FREE";
  if (apiKey.tierOverride) {
    tier = normalizeTier(apiKey.tierOverride);
  } else {
    const sub = await prisma.apiSubscription.findUnique({
      where: { userId: apiKey.userId },
      select: { tier: true, status: true },
    });
    const status = sub?.status?.toLowerCase();
    if (sub && (status === "active" || status === "trialing")) {
      tier = normalizeTier(sub.tier);
    }
  }

  if (!hasTier(tier, opts.minTier)) {
    return { ok: false, res: jsonError(403, "FORBIDDEN", "Insufficient tier") };
  }

  const limit = apiKey.rateLimitOverride ?? tierLimit(tier);
  const rl = await rateLimitDaily(apiKey.userId, limit, now);
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(rl.limit));
  headers.set("X-RateLimit-Remaining", String(rl.remaining));
  headers.set("X-RateLimit-Reset", String(rl.reset));

  if (!rl.success) {
    // Log 429 as authenticated usage.
    try {
      await prisma.apiUsage.create({
        data: {
          apiKeyId: apiKey.id,
          userId: apiKey.userId,
          endpoint: opts.endpoint,
          method: request.method,
          statusCode: 429,
          durationMs: 0,
          requestId,
          tierAtRequest: tier,
        },
      });
    } catch {
      // fail-open
    }

    return {
      ok: false,
      res: jsonError(429, "RATE_LIMITED", "Rate limit exceeded", headers),
    };
  }

  const cutoff = freeCutoff(now);
  const dataAsOf = tier === "FREE" ? cutoff : now;
  const freeMaxMonth = tier === "FREE" ? freeMaxMonthly(cutoff) : undefined;

  const ctx: ApiAuthContext = {
    requestId,
    apiKeyId: apiKey.id,
    userId: apiKey.userId,
    tier,
    rateLimit: { limit: rl.limit, remaining: rl.remaining, reset: rl.reset },
    now,
    dataAsOf,
    freeMaxMonth,
  };

  return { ok: true, ctx, headers };
}

export function clampMonthlyRangeOrThrow(params: {
  tier: ApiTier;
  freeMax: YearMonth | undefined;
  from: YearMonth | null;
  to: YearMonth | null;
}): { from: YearMonth | null; to: YearMonth | null } | { error: { status: number; code: string; message: string } } {
  const { tier, freeMax, from, to } = params;
  if (tier !== "FREE") return { from, to };
  if (!freeMax) return { from, to };

  if (from && compareYearMonth(from, freeMax) > 0) {
    return { error: { status: 403, code: "DATA_DELAY", message: "Requested range is within the free-tier delay window" } };
  }
  if (to && compareYearMonth(to, freeMax) > 0) {
    return { from, to: freeMax };
  }
  return { from, to };
}
