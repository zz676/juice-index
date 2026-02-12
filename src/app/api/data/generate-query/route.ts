import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const runtime = "nodejs";

// Schema for the LLM output
const QuerySchema = z.object({
    query: z.any().describe("The Prisma findMany query object"),
    explanation: z.string().describe("Explanation of what this query does"),
    chartType: z.enum(["bar", "line", "pie"]).describe("Recommended chart type"),
    chartTitle: z.string().describe("Title for the chart"),
    xAxis: z.string().describe("Column name for X-axis"),
    yAxis: z.object({
        column: z.string(),
        label: z.string(),
    }).describe("Y-axis configuration"),
});

const SYSTEM_PROMPT = `
You are a data analyst for 'Juice Index', an EV market data platform.
Your job is to translate natural language questions into a valid Prisma 'findMany' JSON query object.

Available Tables (Schema):
- eVMetric (brand delivery, sales, market share)
  - Columns: id, brand (enum), metric (DELIVERY, PRODUCTION, SALES), periodType (MONTHLY, WEEKLY), year (int), period (int), value (float), unit, date (DateTime)
- apiUsage (billing logs) - DO NOT query this unless asked about API usage specifically.

Rules:
1. Return ONLY the 'findMany' object. Do not include 'prisma.eVMetric.findMany'.
2. Use implicit AND for where clauses.
3. Always include 'orderBy' (usually year desc, period desc).
4. Limit 'take' to 100 maximum.
5. Do NOT use 'select', fetch all columns unless specific columns are requested.
6. For 'latest', use year=2025 or 2024.
`;

export async function POST(req: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2. Check Quota
        // @ts-ignore
        const { checkQuota } = await import("@/lib/quota");
        const quota = await checkQuota(user.id, "query");
        if (!quota.success) {
            return NextResponse.json({ error: quota.error }, { status: 429 });
        }

        // 3. Parse body
        const { prompt } = await req.json();
        if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

        // 4. Generate query with LLM
        const result = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: QuerySchema,
            system: SYSTEM_PROMPT,
            prompt: `Question: ${prompt}`,
        });

        return NextResponse.json(result.object);
    } catch (error) {
        console.error("Query generation error:", error);
        return NextResponse.json({ error: "Failed to generate query" }, { status: 500 });
    }
}
