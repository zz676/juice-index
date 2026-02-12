import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import prisma from "@/lib/prisma";

// Initialize Redis (Lazy or Safe)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = (redisUrl && redisToken)
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

type ActionType = "query" | "chart" | "post";

interface QuotaLimit {
    max: number; // -1 for unlimited
    window?: number; // seconds, default 86400 (1 day)
}

const TIER_QUOTAS: Record<string, Record<ActionType, QuotaLimit>> = {
    FREE: {
        query: { max: 5 },
        chart: { max: 2 },
        post: { max: 0 },
    },
    STARTER: {
        query: { max: -1 },
        chart: { max: -1 },
        post: { max: 2 },
    },
    PRO: {
        query: { max: -1 },
        chart: { max: -1 },
        post: { max: 10 },
    },
    // Enterprise or Admin
    ENTERPRISE: {
        query: { max: -1 },
        chart: { max: -1 },
        post: { max: -1 },
    }
};

export async function checkQuota(userId: string, action: ActionType) {
    // 1. Get user's tier
    // In a real app, this might come from the session or a DB lookup.
    // For now, we'll fetch from DB or assume FREE if not found.
    // We can optimize this by passing tier in, but let's be safe.

    // Checking API Key tier or Subscription tier
    const sub = await prisma.apiSubscription.findUnique({
        where: { userId },
        select: { tier: true }
    });

    const tier = sub?.tier || "FREE";

    // Admin override
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ADMIN') return { success: true, tier: 'ENTERPRISE', remaining: 999 };

    const limits = TIER_QUOTAS[tier] || TIER_QUOTAS.FREE;
    const limit = limits[action];

    // Unlimited check
    if (limit.max === -1) {
        return { success: true, tier, remaining: 999 };
    }

    if (limit.max === 0) {
        return { success: false, tier, remaining: 0, error: `Upgrade to ${tier === 'FREE' ? 'Starter' : 'Pro'} to use this feature.` };
    }

    // If Redis is not configured, skip rate limiting (Dev mode fallback)
    if (!redis) {
        console.warn("Redis not configured. Skipping quota check.");
        return { success: true, tier, remaining: 999 };
    }

    // 2. Rate Limit (Quota) Check
    // Key: quota:{userId}:{action}:{date}
    // We use Upstash Ratelimit for convenience
    const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(limit.max, "24 h"),
        prefix: `quota:${action}`,
    });

    const { success, remaining, reset } = await ratelimit.limit(userId);

    if (!success) {
        return {
            success: false,
            tier,
            remaining: 0,
            reset,
            error: `Daily limit reached for ${action} (${limit.max}/day). Upgrade for more.`
        };
    }

    return { success: true, tier, remaining };
}
