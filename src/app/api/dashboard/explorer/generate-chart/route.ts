import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { rateLimitDaily } from "@/lib/ratelimit";
import { normalizeTier, tierLimit } from "@/lib/api/tier";

export const maxDuration = 60;

// Condensed schema definition for the LLM
const DB_SCHEMA = `
Table: juice_ev_metrics (EVMetric)
- id, period, value, unit, source, createdAt
- Metric types: "nev_penetration", "weekly_insured_units", "battery_price_lfp"

Table: juice_vehicle_specs (VehicleSpec)
- id, brand, model, version, priceRange, batteryType, range, acceleration, topSpeed, chargingTime, releaseDate

Table: juice_cpca_nev_retail (CpcaNevRetail)
- id, month, brand, model, volume, yoyChange, momChange
- Retail sales data for NEVs in China

Table: juice_cpca_nev_production (CpcaNevProduction)
- id, month, brand, model, volume, yoyChange, momChange
- Production data for NEVs in China

Table: juice_battery_maker_monthly (BatteryMakerMonthly)
- id, month, maker, installedCapacity, share, yoyChange
- Battery installation data by manufacturer

Table: juice_weekly_insured (WeeklyInsuredUnits) - *Hypothetical, mapped to a real table if exists or generic metric*
`;

const ChartConfigSchema = z.object({
    sql: z.string().describe("The PostgreSQL query to execute. MUST be a SELECT statement. Limit to 100 rows."),
    chartType: z.enum(["area", "bar", "line", "composed", "pie", "scatter", "radar", "radialBar", "treemap", "funnel"]).describe("The best Recharts chart type for this data."),
    config: z.object({
        xAxisKey: z.string().describe("Key for X axis (e.g., 'month', 'brand')."),
        series: z.array(z.object({
            key: z.string().describe("Key for data series (e.g., 'volume', 'value')."),
            color: z.string().describe("Color hex code for the series."),
            name: z.string().nullable().describe("Human readable name for the legend."),
            type: z.enum(["bar", "line", "area"]).nullable().describe("For composed charts, the type of this specific series."),
        })),
    }),
    title: z.string().describe("A concise title for the chart."),
    description: z.string().describe("A brief explanation of what the data shows."),
});

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate Limiting
        const subscription = await prisma.apiSubscription.findUnique({
            where: { userId: user.id },
            select: { tier: true, status: true },
        });

        const tier = (subscription?.status === 'active' || subscription?.status === 'trialing')
            ? normalizeTier(subscription.tier)
            : "FREE";

        const limit = tierLimit(tier);
        const { success } = await rateLimitDaily(user.id, limit, new Date());

        if (!success) {
            return NextResponse.json({
                error: "Rate limit exceeded",
                message: `You have reached your daily limit of ${limit} queries. Upgrade to PRO for more.`
            }, { status: 429 });
        }

        const { prompt } = await req.json();
        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const { object } = await generateObject({
            model: openai("gpt-4o"),
            schema: ChartConfigSchema,
            system: `You are a data analyst helper. Your goal is to generate valid PostgreSQL queries based on the user's natural language request and the provided database schema.
      
      Schema Context:
      ${DB_SCHEMA}

      Rules:
      1. ONLY generate SELECT statements. No INSERT, UPDATE, DELETE, DROP, etc.
      2. Always limit results to 100 rows unless specifically asked for more (but max 500).
      3. Use appropriate aggregations (SUM, AVG, COUNT) when needed.
      4. Format dates appropriately for charts (e.g., TO_CHAR(date, 'YYYY-MM')).
      5. Choose a visually distinct color palette for the chart series (e.g. #6ada1b for primary).
      
      Return a JSON object with the SQL query and the chart configuration.
      `,
            prompt: prompt,
        });

        // Security check: simple validation to prevent obvious mutations
        const normalizeSql = object.sql.trim().toUpperCase();
        if (!normalizeSql.startsWith("SELECT") && !normalizeSql.startsWith("WITH")) {
            return NextResponse.json({ error: "Invalid query type. Only SELECT allowed." }, { status: 400 });
        }
        if (normalizeSql.includes("DROP ") || normalizeSql.includes("DELETE ") || normalizeSql.includes("UPDATE ") || normalizeSql.includes("INSERT ")) {
            return NextResponse.json({ error: "Unsafe query detected." }, { status: 400 });
        }

        // Execute query
        // const result = await prisma.$queryRawUnsafe(object.sql);

        // MOCK DATA GENERATION (until DB has real data)
        // Create an array of data points based on the config.
        const mockDataLength = 12; // e.g. 12 months
        const mockData = Array.from({ length: mockDataLength }, (_, i) => {
            const point: any = {};
            // Handle x-axis (assume time-series for now if key contains date/month/year)
            if (object.config.xAxisKey.toLowerCase().includes('month')) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                point[object.config.xAxisKey] = months[i % 12];
            } else if (object.config.xAxisKey.toLowerCase().includes('year')) {
                point[object.config.xAxisKey] = (2020 + i).toString();
            } else {
                point[object.config.xAxisKey] = `Category ${i + 1}`;
            }

            // Populate series data
            object.config.series.forEach(s => {
                point[s.key] = Math.floor(Math.random() * 1000) + 100;
            });

            return point;
        });

        return NextResponse.json({
            data: mockData,
            config: object.config,
            title: object.title,
            description: object.description,
            sql: object.sql,
            mock: true
        });

    } catch (error) {
        console.error("Error generating chart:", error);
        return NextResponse.json({ error: "Failed to generate chart" }, { status: 500 });
    }
}
