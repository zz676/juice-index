import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import prisma from "@/lib/prisma";
import { studioPostDraftLimit } from "@/lib/ratelimit";
import { normalizeTier, type ApiTier } from "@/lib/api/tier";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import {
  getModelById,
  canAccessModel,
  DEFAULT_MODEL_ID,
  DEFAULT_TEMPERATURE,
} from "@/lib/studio/models";

export const runtime = "nodejs";
export const maxDuration = 60;

type DataRow = Record<string, unknown>;

async function getAuthedSupabaseUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // noop
          }
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

function resolveUserTier(subscription: { tier: string; status: string } | null): ApiTier {
  if (
    subscription &&
    (subscription.status.toLowerCase() === "active" ||
      subscription.status.toLowerCase() === "trialing")
  ) {
    return normalizeTier(subscription.tier);
  }
  return "FREE";
}

async function enforceRateLimit(
  userId: string
): Promise<{ error: NextResponse } | { tier: ApiTier }> {
  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });

  const tier = resolveUserTier(subscription);
  const rl = await studioPostDraftLimit(userId, tier, new Date());

  if (!rl.success) {
    const quota = TIER_QUOTAS[tier].postDrafts;
    return {
      error: NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: `You've used ${quota}/${quota} AI post drafts today. ${tier === "FREE" ? "Upgrade to Pro for 20/day." : "Limit resets at midnight UTC."}`,
        },
        { status: 429 }
      ),
    };
  }

  return { tier };
}

function resolveModel(provider: string, providerModelId: string) {
  if (provider === "anthropic") return anthropic(providerModelId);
  return openai(providerModelId);
}

function summarizeResults(data: DataRow[]): string {
  if (!data.length) return "No rows returned.";

  const columns = Object.keys(data[0]).slice(0, 12);
  const rows = data.slice(0, 8).map((row) => {
    const parts = columns.map((column) => `${column}=${String(row[column])}`);
    return `- ${parts.join(", ")}`;
  });

  return [
    `Row count: ${data.length}`,
    `Columns: ${columns.join(", ")}`,
    "Sample rows:",
    ...rows,
  ].join("\n");
}

function buildPrompt(input: {
  question?: string;
  sql?: string;
  chartTitle?: string;
  chartType?: string;
  data?: DataRow[];
}): string {
  const question = input.question?.trim() || "(not provided)";
  const sql = input.sql?.trim() || "(not provided)";
  const chartTitle = input.chartTitle?.trim() || "Data Results";
  const chartType = input.chartType?.trim() || "bar";
  const dataSummary = summarizeResults(Array.isArray(input.data) ? input.data : []);

  return `You are an EV market analyst writing a concise social post.

Question:
${question}

Chart:
- title: ${chartTitle}
- type: ${chartType}

SQL preview:
${sql}

Data summary:
${dataSummary}

Write one short post (2-4 sentences) with:
1. the key takeaway,
2. one concrete number or trend,
3. one implication for the EV market.

Keep tone factual and publish-ready. No hashtags. No markdown.`;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthedSupabaseUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const rateLimitRes = await enforceRateLimit(userId);
    if ("error" in rateLimitRes) return rateLimitRes.error;
    const { tier } = rateLimitRes;

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid request body" },
        { status: 400 }
      );
    }

    // Parse model and temperature from request
    const requestedModelId =
      typeof body.model === "string" ? body.model : DEFAULT_MODEL_ID;
    const temperature =
      typeof body.temperature === "number" &&
      body.temperature >= 0 &&
      body.temperature <= 1
        ? body.temperature
        : DEFAULT_TEMPERATURE;

    // Validate model exists
    const modelDef = getModelById(requestedModelId);
    if (!modelDef) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: `Unknown model: ${requestedModelId}` },
        { status: 400 }
      );
    }

    // Validate tier access
    if (!canAccessModel(tier, requestedModelId)) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: `Upgrade to ${modelDef.minTier} to unlock ${modelDef.displayName}.`,
        },
        { status: 403 }
      );
    }

    const prompt =
      typeof body.prompt === "string" && body.prompt.trim().length > 0
        ? body.prompt.trim()
        : buildPrompt({
            question:
              typeof body.question === "string" ? body.question : undefined,
            sql: typeof body.sql === "string" ? body.sql : undefined,
            chartTitle:
              typeof body.chartTitle === "string" ? body.chartTitle : undefined,
            chartType:
              typeof body.chartType === "string" ? body.chartType : undefined,
            data: Array.isArray(body.data)
              ? (body.data as DataRow[])
              : undefined,
          });

    if (prompt.length < 20) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Prompt is too short" },
        { status: 400 }
      );
    }

    const result = await generateText({
      model: resolveModel(modelDef.provider, modelDef.providerModelId),
      prompt,
      temperature,
      maxOutputTokens: modelDef.defaultMaxTokens,
    });

    const content = result.text.trim();
    if (!content) {
      return NextResponse.json(
        { error: "GENERATION_FAILED", message: "No draft content generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Explorer generate-post route error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate post";
    return NextResponse.json(
      { error: "INTERNAL", message },
      { status: 500 }
    );
  }
}
