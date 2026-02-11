import { nextUtcMidnightEpochSeconds } from "@/lib/api/delay";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // unix seconds
};

type UpstashResponse<T> = {
  result?: T;
  error?: string;
};

function getUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function upstashIncr(key: string): Promise<number> {
  const { url, token } = getUpstash();
  const res = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const json = (await res.json()) as UpstashResponse<number>;
  if (!res.ok || json.error) {
    throw new Error(json.error || `Upstash INCR failed (${res.status})`);
  }
  return Number(json.result ?? 0);
}

async function upstashExpire(key: string, seconds: number): Promise<void> {
  const { url, token } = getUpstash();
  const res = await fetch(`${url}/expire/${encodeURIComponent(key)}/${seconds}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const json = (await res.json()) as UpstashResponse<number>;
  if (!res.ok || json.error) {
    throw new Error(json.error || `Upstash EXPIRE failed (${res.status})`);
  }
}

export async function rateLimitDaily(identifier: string, limit: number, now: Date): Promise<RateLimitResult> {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const dateKey = `${y}${m}${d}`;

  const reset = nextUtcMidnightEpochSeconds(now);
  const secondsUntilReset = Math.max(1, reset - Math.floor(now.getTime() / 1000));

  const key = `rl:${identifier}:${dateKey}`;
  const count = await upstashIncr(key);
  if (count === 1) {
    await upstashExpire(key, secondsUntilReset);
  }

  const remaining = Math.max(0, limit - count);
  return {
    success: count <= limit,
    limit,
    remaining,
    reset,
  };
}
