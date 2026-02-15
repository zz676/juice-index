import fs from "fs";
import path from "path";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ChartConfiguration, Plugin, ChartType as JsChartType } from "chart.js";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { createCanvas, loadImage, type Image as NapiImage } from "@napi-rs/canvas";
import { Brand, MetricType, PeriodType, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { studioQueryLimit, studioChartLimit } from "@/lib/ratelimit";
import { normalizeTier, type ApiTier } from "@/lib/api/tier";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import { executeQuery, getAllowedTables } from "@/lib/query-executor";
import { prismaFindManyToSql } from "@/lib/studio/sql-preview";
import { getModelById, canAccessModel, DEFAULT_MODEL_ID } from "@/lib/studio/models";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExplorerChartType = "bar" | "line" | "horizontalBar";
type DataRow = Record<string, unknown>;
type PreviewPoint = { label: string; value: number };

type ChartStyleOptions = {
  backgroundColor?: string;
  barColor?: string;
  fontColor?: string;
  titleColor?: string;
  titleSize?: number;
  titleFont?: string;
  xAxisFontSize?: number;
  yAxisFontSize?: number;
  xAxisFontColor?: string;
  yAxisFontColor?: string;
  axisFont?: string;
  sourceText?: string;
  sourceColor?: string;
  sourceFontSize?: number;
  sourceFont?: string;
  barWidth?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  showValues?: boolean;
  showGrid?: boolean;
  xAxisLineColor?: string;
  yAxisLineColor?: string;
  xAxisLineWidth?: number;
  yAxisLineWidth?: number;
};

const DEFAULT_SOURCE_TEXT = "Powered by evjuice.net";
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const QUERY_RESPONSE_SCHEMA = z.object({
  unsupported: z.boolean(),
  reason: z.string(),
  table: z.string(),
  query: z.string(),
  chartType: z.enum(["bar", "line", "horizontalBar"]),
  chartTitle: z.string(),
  explanation: z.string(),
}).strict();

const EV_KEYWORDS = [
  "ev",
  "nev",
  "battery",
  "delivery",
  "deliveries",
  "sales",
  "production",
  "export",
  "imports",
  "inventory",
  "via index",
  "dealer",
  "passenger",
  "cpca",
  "caam",
  "tesla",
  "byd",
  "nio",
  "xpeng",
  "li auto",
  "zeekr",
  "xiaomi",
  "calt",
  "catl",
  "vehicle",
  "automaker",
  "maker",
  "gwh",
  "market share",
  "ranking",
  "brand",
];

// Register Chart.js components once at module level
Chart.register(...registerables, ChartDataLabels);

async function renderChartToBuffer(config: ChartConfiguration): Promise<Buffer> {
  const width = 1200;
  const height = 675;
  const radius = 24;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Disable animation for synchronous server-side rendering
  config.options = config.options || {};
  config.options.animation = false;
  config.options.responsive = false;

  // Chart.js accepts canvas-compatible objects
  new Chart(ctx as unknown as CanvasRenderingContext2D, config);

  // Apply rounded corners by compositing onto a new canvas with a clip mask
  const out = createCanvas(width, height);
  const outCtx = out.getContext("2d");

  outCtx.beginPath();
  outCtx.moveTo(radius, 0);
  outCtx.lineTo(width - radius, 0);
  outCtx.quadraticCurveTo(width, 0, width, radius);
  outCtx.lineTo(width, height - radius);
  outCtx.quadraticCurveTo(width, height, width - radius, height);
  outCtx.lineTo(radius, height);
  outCtx.quadraticCurveTo(0, height, 0, height - radius);
  outCtx.lineTo(0, radius);
  outCtx.quadraticCurveTo(0, 0, radius, 0);
  outCtx.closePath();
  outCtx.clip();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outCtx.drawImage(canvas as any, 0, 0);

  return out.toBuffer("image/png");
}

const backgroundColorPlugin: Plugin = {
  id: "backgroundColorFill",
  beforeDraw: (chart, _args, options) => {
    const pluginOptions = options as { color?: string } | undefined;
    const color = pluginOptions?.color || "#ffffff";
    const ctx = chart.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};

const sourceAttributionPlugin: Plugin = {
  id: "sourceAttribution",
  afterDraw: (chart, _args, options) => {
    const pluginOptions = options as
      | { text?: string; color?: string; fontSize?: number; fontFamily?: string }
      | undefined;
    const rawText = pluginOptions?.text ?? DEFAULT_SOURCE_TEXT;
    if (!rawText?.trim()) return;

    const ctx = chart.ctx;
    const fontSize = pluginOptions?.fontSize ?? 12;
    const fontFamily = pluginOptions?.fontFamily || "Inter, Arial, sans-serif";

    ctx.save();
    ctx.font = `italic ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = pluginOptions?.color || "#65a30d";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(rawText, chart.width - 24, chart.height - 16);
    ctx.restore();
  },
};

let logoImageCache: NapiImage | null = null;

async function getLogoImage(): Promise<NapiImage | null> {
  if (logoImageCache) return logoImageCache;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const logoBuffer = fs.readFileSync(logoPath);
    const img = await loadImage(logoBuffer);
    logoImageCache = img;
    return img;
  } catch {
    return null;
  }
}

// Pre-loaded logo image, set before chart rendering
let preloadedLogo: NapiImage | null = null;

const watermarkPlugin: Plugin = {
  id: "watermark",
  afterDraw: (chart, _args, options) => {
    const pluginOptions = options as { enabled?: boolean } | undefined;
    if (!pluginOptions?.enabled) return;

    const ctx = chart.ctx;
    const w = chart.width;
    const h = chart.height;

    // Tile diagonal watermark text across the entire image
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const angle = -Math.PI / 6;
    // Spacing between watermark tiles
    const spacingX = 420;
    const spacingY = 200;
    // Expand bounds to cover corners after rotation
    const diag = Math.sqrt(w * w + h * h);

    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle);

    for (let y = -diag; y < diag; y += spacingY) {
      for (let x = -diag; x < diag; x += spacingX) {
        ctx.font = "bold 32px Inter, Arial, sans-serif";
        ctx.fillText("juiceindex.io", x, y);
        ctx.font = "14px Inter, Arial, sans-serif";
        ctx.fillText("Upgrade to Pro", x, y + 28);
      }
    }
    ctx.restore();

    // Draw logo + url in bottom-left corner
    ctx.save();
    ctx.globalAlpha = 0.35;
    const logo = preloadedLogo;
    const logoSize = 20;
    const padding = 16;
    const logoY = h - padding - logoSize / 2;
    if (logo) {
      ctx.drawImage(logo as unknown as CanvasImageSource, padding, logoY - logoSize / 2, logoSize, logoSize);
    }
    ctx.font = "bold 13px Inter, Arial, sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("juiceindex.io", padding + (logo ? logoSize + 6 : 0), logoY);
    ctx.restore();
  },
};

function detectXField(sample: DataRow): string | null {
  if (sample.month !== undefined && sample.year !== undefined) return "month";
  if (sample.brand !== undefined) return "brand";
  if (sample.maker !== undefined) return "maker";
  if (sample.automaker !== undefined) return "automaker";

  const keys = Object.keys(sample);
  const firstText = keys.find((key) => typeof sample[key] === "string");
  if (firstText) return firstText;

  return keys[0] || null;
}

function detectYField(sample: DataRow): string | null {
  if (typeof sample.value === "number") return "value";
  if (typeof sample.installation === "number") return "installation";
  if (typeof sample.retailSales === "number") return "retailSales";

  const excluded = new Set(["year", "month", "period", "ranking"]);
  const keys = Object.keys(sample);
  const firstNumeric = keys.find(
    (key) => typeof sample[key] === "number" && !excluded.has(key)
  );
  return firstNumeric || null;
}

function toLabel(row: DataRow, xField: string): string {
  if (
    xField === "month" &&
    row.month !== undefined &&
    row.year !== undefined
  ) {
    const monthIndex = Number(row.month) - 1;
    return `${MONTH_NAMES[monthIndex] || row.month} ${row.year}`;
  }
  return String(row[xField]);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPreviewData(rows: DataRow[]): {
  points: PreviewPoint[];
  xField: string;
  yField: string;
} {
  if (!rows.length) {
    return { points: [], xField: "label", yField: "value" };
  }

  const sample = rows[0];
  const xField = detectXField(sample) || "label";
  const yField = detectYField(sample) || "value";

  const points: PreviewPoint[] = rows.slice(0, 120).map((row) => ({
    label: toLabel(row, xField),
    value: toNumber(row[yField]),
  }));

  return { points, xField, yField };
}

function looksLikeEvQuery(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return EV_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function normalizeStyleOptions(raw: unknown): ChartStyleOptions {
  if (!raw || typeof raw !== "object") return {};

  const obj = raw as Record<string, unknown>;
  const asNumber = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    backgroundColor:
      typeof obj.backgroundColor === "string" ? obj.backgroundColor : undefined,
    barColor: typeof obj.barColor === "string" ? obj.barColor : undefined,
    fontColor: typeof obj.fontColor === "string" ? obj.fontColor : undefined,
    titleColor: typeof obj.titleColor === "string" ? obj.titleColor : undefined,
    titleSize: asNumber(obj.titleSize),
    titleFont: typeof obj.titleFont === "string" ? obj.titleFont : undefined,
    xAxisFontSize: asNumber(obj.xAxisFontSize),
    yAxisFontSize: asNumber(obj.yAxisFontSize),
    xAxisFontColor:
      typeof obj.xAxisFontColor === "string" ? obj.xAxisFontColor : undefined,
    yAxisFontColor:
      typeof obj.yAxisFontColor === "string" ? obj.yAxisFontColor : undefined,
    axisFont: typeof obj.axisFont === "string" ? obj.axisFont : undefined,
    sourceText: typeof obj.sourceText === "string" ? obj.sourceText : undefined,
    sourceColor:
      typeof obj.sourceColor === "string" ? obj.sourceColor : undefined,
    sourceFontSize: asNumber(obj.sourceFontSize),
    sourceFont: typeof obj.sourceFont === "string" ? obj.sourceFont : undefined,
    barWidth: asNumber(obj.barWidth),
    paddingTop: asNumber(obj.paddingTop),
    paddingBottom: asNumber(obj.paddingBottom),
    paddingLeft: asNumber(obj.paddingLeft),
    paddingRight: asNumber(obj.paddingRight),
    showValues:
      typeof obj.showValues === "boolean" ? obj.showValues : undefined,
    showGrid: typeof obj.showGrid === "boolean" ? obj.showGrid : undefined,
    xAxisLineColor:
      typeof obj.xAxisLineColor === "string" ? obj.xAxisLineColor : undefined,
    yAxisLineColor:
      typeof obj.yAxisLineColor === "string" ? obj.yAxisLineColor : undefined,
    xAxisLineWidth: asNumber(obj.xAxisLineWidth),
    yAxisLineWidth: asNumber(obj.yAxisLineWidth),
  };
}

function renderChartConfig(params: {
  chartType: ExplorerChartType;
  title: string;
  points: PreviewPoint[];
  style: ChartStyleOptions;
  watermark?: boolean;
}): ChartConfiguration {
  const { chartType, title, points, style, watermark = false } = params;
  const labels = points.map((point) => point.label);
  const values = points.map((point) => point.value);
  const isHorizontal = chartType === "horizontalBar";
  const jsType: JsChartType = chartType === "line" ? "line" : "bar";

  const textColor = style.fontColor || "#0f172a";
  const titleColor = style.titleColor || textColor;
  const xTickColor = style.xAxisFontColor || textColor;
  const yTickColor = style.yAxisFontColor || textColor;
  const barColor = style.barColor || "#6ada1b";
  const showValues = style.showValues ?? true;
  const showGrid = style.showGrid ?? true;

  return {
    type: jsType,
    data: {
      labels,
      datasets: [
        {
          label: "Value",
          data: values,
          borderColor: barColor,
          backgroundColor: barColor,
          borderWidth: chartType === "line" ? 3 : 1,
          borderRadius: chartType === "line" ? 0 : 6,
          pointRadius: chartType === "line" ? 4 : 0,
          pointHoverRadius: chartType === "line" ? 6 : 0,
          tension: chartType === "line" ? 0.22 : undefined,
          barThickness: style.barWidth && style.barWidth > 0 ? style.barWidth : 28,
        },
      ],
    },
    options: {
      indexAxis: isHorizontal ? "y" : "x",
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          color: titleColor,
          font: {
            family: style.titleFont || "Inter",
            size: style.titleSize && style.titleSize > 0 ? style.titleSize : 24,
            weight: "bold",
          },
          padding: { top: 18, bottom: 18 },
        },
        legend: { display: false },
        datalabels: {
          display: showValues && chartType !== "line",
          anchor: isHorizontal ? "end" : "end",
          align: isHorizontal ? "right" : "top",
          color: textColor,
          font: { size: 11, weight: "bold" },
          formatter: (value: unknown) => {
            const numberValue = Number(value);
            return Number.isFinite(numberValue)
              ? numberValue.toLocaleString("en-US")
              : "";
          },
        },
        backgroundColorFill: {
          color: style.backgroundColor || "#ffffff",
        },
        sourceAttribution: {
          text: style.sourceText || DEFAULT_SOURCE_TEXT,
          color: style.sourceColor || "#65a30d",
          fontSize:
            style.sourceFontSize && style.sourceFontSize > 0
              ? style.sourceFontSize
              : 12,
          fontFamily: style.sourceFont || "Inter, Arial, sans-serif",
        },
        watermark: {
          enabled: watermark,
        },
      } as unknown as NonNullable<ChartConfiguration["options"]>["plugins"],
      scales: {
        x: {
          beginAtZero: isHorizontal,
          border: {
            color: style.xAxisLineColor || "#e5e7eb",
            width: style.xAxisLineWidth ?? 1,
          },
          grid: { color: "#e5e7eb", display: showGrid },
          ticks: {
            color: xTickColor,
            font: {
              family: style.axisFont || "Inter",
              size:
                style.xAxisFontSize && style.xAxisFontSize > 0
                  ? style.xAxisFontSize
                  : 12,
            },
            maxRotation: isHorizontal ? undefined : 0,
            minRotation: isHorizontal ? undefined : 0,
            autoSkip: isHorizontal ? undefined : false,
          },
        },
        y: {
          beginAtZero: !isHorizontal,
          border: {
            color: style.yAxisLineColor || "#e5e7eb",
            width: style.yAxisLineWidth ?? 1,
          },
          grid: { color: "#e5e7eb", display: showGrid },
          ticks: {
            color: yTickColor,
            font: {
              family: style.axisFont || "Inter",
              size:
                style.yAxisFontSize && style.yAxisFontSize > 0
                  ? style.yAxisFontSize
                  : 12,
            },
            callback: (value) => {
              const n = Number(value);
              return Number.isFinite(n) ? n.toLocaleString("en-US") : String(value);
            },
          },
        },
      },
      layout: {
        padding: {
          top: style.paddingTop ?? 20,
          right: style.paddingRight ?? 28,
          bottom: style.paddingBottom ?? 44,
          left: style.paddingLeft ?? (isHorizontal ? 36 : 24),
        },
      },
    },
    plugins: [backgroundColorPlugin, sourceAttributionPlugin, watermarkPlugin],
  };
}

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

async function resolveUserTier(userId: string): Promise<ApiTier> {
  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });

  return subscription &&
    (subscription.status.toLowerCase() === "active" ||
      subscription.status.toLowerCase() === "trialing")
    ? normalizeTier(subscription.tier)
    : "FREE";
}

async function enforceStudioQueryLimit(userId: string, tier: ApiTier): Promise<NextResponse | null> {
  const rl = await studioQueryLimit(userId, tier, new Date());
  if (!rl.success) {
    const quota = TIER_QUOTAS[tier].studioQueries;
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: `You've used ${quota}/${quota} AI queries today. ${tier === "FREE" ? "Upgrade to Pro for 50/day." : "Limit resets at midnight UTC."}`,
      },
      { status: 429 }
    );
  }
  return null;
}

async function enforceChartGenLimit(userId: string, tier: ApiTier): Promise<NextResponse | null> {
  const rl = await studioChartLimit(userId, tier, new Date());
  if (!rl.success) {
    const quota = TIER_QUOTAS[tier].chartGen;
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: `You've used ${quota}/${quota} chart generations today. ${tier === "FREE" ? "Upgrade to Pro for 20/day." : "Limit resets at midnight UTC."}`,
      },
      { status: 429 }
    );
  }
  return null;
}

async function getLiveHints() {
  try {
    const yearsRows = await prisma.$queryRaw<Array<{ year: number }>>(
      Prisma.sql`
        SELECT DISTINCT "year"
        FROM "public"."EVMetric"
        WHERE "year" IS NOT NULL
        ORDER BY "year" DESC
        LIMIT 6
      `
    );

    const years = yearsRows
      .map((row) => Number(row.year))
      .filter((year) => Number.isFinite(year));
    const latestYear = years[0] ?? new Date().getFullYear();

    const brandsRows = await prisma.$queryRaw<Array<{ brand: string }>>(
      Prisma.sql`
        SELECT DISTINCT ("brand"::text) AS "brand"
        FROM "public"."EVMetric"
        WHERE "metric" = CAST(${MetricType.DELIVERY} AS "public"."MetricType")
          AND "periodType" = CAST(${PeriodType.MONTHLY} AS "public"."PeriodType")
          AND "year" = ${latestYear}
          AND "brand" <> CAST(${Brand.INDUSTRY} AS "public"."Brand")
        ORDER BY "brand" ASC
        LIMIT 20
      `
    );

    // Fetch distinct values for filterable columns across other tables
    const [plantExportPlants, plantExportBrands, batteryMakers, automakers, batteryScopes] = await Promise.all([
      prisma.$queryRaw<Array<{ plant: string }>>(
        Prisma.sql`SELECT DISTINCT "plant" FROM "public"."PlantExports" ORDER BY "plant" ASC LIMIT 30`
      ).catch(() => [] as Array<{ plant: string }>),
      prisma.$queryRaw<Array<{ brand: string }>>(
        Prisma.sql`SELECT DISTINCT "brand" FROM "public"."PlantExports" ORDER BY "brand" ASC LIMIT 30`
      ).catch(() => [] as Array<{ brand: string }>),
      prisma.$queryRaw<Array<{ maker: string }>>(
        Prisma.sql`SELECT DISTINCT "maker" FROM "public"."BatteryMakerMonthly" ORDER BY "maker" ASC LIMIT 30`
      ).catch(() => [] as Array<{ maker: string }>),
      prisma.$queryRaw<Array<{ automaker: string }>>(
        Prisma.sql`SELECT DISTINCT "automaker" FROM "public"."AutomakerRankings" ORDER BY "automaker" ASC LIMIT 30`
      ).catch(() => [] as Array<{ automaker: string }>),
      prisma.$queryRaw<Array<{ scope: string }>>(
        Prisma.sql`SELECT DISTINCT "scope" FROM "public"."BatteryMakerRankings" ORDER BY "scope" ASC LIMIT 10`
      ).catch(() => [] as Array<{ scope: string }>),
    ]);

    return {
      latestYear,
      years,
      brands: brandsRows.map((row) => row.brand),
      tableValues: {
        plantExports: {
          plants: plantExportPlants.map((r) => r.plant),
          brands: plantExportBrands.map((r) => r.brand),
        },
        batteryMakerMonthly: {
          makers: batteryMakers.map((r) => r.maker),
        },
        automakerRankings: {
          automakers: automakers.map((r) => r.automaker),
        },
        batteryMakerRankings: {
          scopes: batteryScopes.map((r) => r.scope),
        },
      },
    };
  } catch {
    return {
      latestYear: new Date().getFullYear(),
      years: [] as number[],
      brands: [] as string[],
      tableValues: {} as Record<string, Record<string, string[]>>,
    };
  }
}

async function generateStructuredQuery(prompt: string, modelId?: string) {
  const tables = getAllowedTables();
  const hints = await getLiveHints();

  const tableDoc = tables
    .map(
      (table, index) =>
        `${index + 1}. ${table.name}: ${table.description}\n   fields: ${table.fields.join(
          ", "
        )}`
    )
    .join("\n\n");

  const modelDef = getModelById(modelId ?? DEFAULT_MODEL_ID) ?? getModelById(DEFAULT_MODEL_ID)!;
  const aiModel = modelDef.provider === "anthropic"
    ? anthropic(modelDef.providerModelId)
    : openai(modelDef.providerModelId);

  const { object } = await generateObject({
    model: aiModel,
    schema: QUERY_RESPONSE_SCHEMA,
    system: `You convert natural language EV market questions into safe Prisma findMany queries.

Allowed tables (Prisma client keys):
${tableDoc}

Live DB hints:
- latest eVMetric year: ${hints.latestYear}
- recent eVMetric years: ${hints.years.join(", ") || "unknown"}
- delivery brands in latest year: ${hints.brands.join(", ") || "unknown"}
${hints.tableValues?.plantExports?.plants?.length ? `- plantExports plants: ${hints.tableValues.plantExports.plants.join(", ")}` : ""}
${hints.tableValues?.plantExports?.brands?.length ? `- plantExports brands: ${hints.tableValues.plantExports.brands.join(", ")}` : ""}
${hints.tableValues?.batteryMakerMonthly?.makers?.length ? `- batteryMakerMonthly makers: ${hints.tableValues.batteryMakerMonthly.makers.join(", ")}` : ""}
${hints.tableValues?.automakerRankings?.automakers?.length ? `- automakerRankings automakers: ${hints.tableValues.automakerRankings.automakers.join(", ")}` : ""}
${hints.tableValues?.batteryMakerRankings?.scopes?.length ? `- batteryMakerRankings scopes: ${hints.tableValues.batteryMakerRankings.scopes.join(", ")}` : ""}

Rules:
1. If question is not about EV/NEV market data, set unsupported=true and include reason.
2. Use ONLY allowlisted table names above.
3. Return query as a valid JSON string representing Prisma findMany args object.
   Allowed top-level keys: where, orderBy, take, skip, select, distinct.
   Example:
   {"where":{"brand":"Tesla","year":2024},"orderBy":[{"month":"asc"}],"take":12}
4a. IMPORTANT: Always use exact column values from the "Live DB hints" above. Never guess or transform values (e.g. use "Tesla Shanghai" not "Shanghai", use "Tesla" not "TESLA").
4. Never generate raw SQL, mutations, or unsafe operations.
5. Default to latest year when user omits year.
6. Keep take <= 120.
7. Prefer bar for ranked comparisons, line for trends over time.
8. explanation should be short, plain English, and mention any assumptions.
9. Always return ALL keys in schema: unsupported, reason, table, query, chartType, chartTitle, explanation.
10. If unsupported=false, set reason to an empty string.
`,
    prompt,
  });

  return object;
}

/**
 * Recursively walk a Prisma `where` object and add `mode: "insensitive"` to
 * every string filter so queries are case-insensitive.
 *
 *   { brand: "Tesla" }                    → { brand: { equals: "Tesla", mode: "insensitive" } }
 *   { brand: { contains: "tesla" } }      → { brand: { contains: "tesla", mode: "insensitive" } }
 *   { brand: { equals: "X", mode: … } }   → left as-is (already has mode)
 */
function addInsensitiveMode(where: unknown): unknown {
  if (!where || typeof where !== "object") return where;
  if (Array.isArray(where)) return where.map(addInsensitiveMode);

  const result: Record<string, unknown> = {};
  const STRING_FILTER_OPS = new Set(["equals", "contains", "startsWith", "endsWith", "not"]);

  for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
    // Recurse into AND / OR arrays and NOT objects
    if (key === "AND" || key === "OR") {
      result[key] = Array.isArray(value)
        ? value.map(addInsensitiveMode)
        : addInsensitiveMode(value);
      continue;
    }
    if (key === "NOT") {
      result[key] = addInsensitiveMode(value);
      continue;
    }

    // Simple string equality  →  wrap with equals + insensitive
    if (typeof value === "string") {
      result[key] = { equals: value, mode: "insensitive" };
      continue;
    }

    // Object filter that already has a string op (equals, contains, …)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const filterObj = value as Record<string, unknown>;
      const hasStringOp = Object.keys(filterObj).some(
        (k) => STRING_FILTER_OPS.has(k) && typeof filterObj[k] === "string"
      );
      if (hasStringOp && !("mode" in filterObj)) {
        result[key] = { ...filterObj, mode: "insensitive" };
        continue;
      }
    }

    // Numbers, booleans, etc. — pass through unchanged
    result[key] = value;
  }

  return result;
}

function applyCaseInsensitive(query: Record<string, unknown>): Record<string, unknown> {
  if (!query.where) return query;
  return { ...query, where: addInsensitiveMode(query.where) };
}

function parseGeneratedQuery(queryText: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(queryText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Generated query must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Generated query JSON is invalid.");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthedSupabaseUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid request body" },
        { status: 400 }
      );
    }

    const tier = await resolveUserTier(userId);

    // Mode 0: Execute an explicit runnable query (from reviewed/edited query JSON)
    if (
      typeof payload.table === "string" &&
      payload.table.trim().length > 0 &&
      payload.query &&
      typeof payload.query === "object" &&
      !Array.isArray(payload.query)
    ) {
      const queryLimitRes = await enforceStudioQueryLimit(userId, tier);
      if (queryLimitRes) return queryLimitRes;

      const table = payload.table.trim();
      const query = applyCaseInsensitive(payload.query as Record<string, unknown>);

      let execution;
      try {
        execution = await executeQuery({ table, query });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to execute query";
        return NextResponse.json(
          { error: "QUERY_EXECUTION_FAILED", message },
          { status: 400 }
        );
      }

      const preview = buildPreviewData(execution.data);
      const sqlPreview = prismaFindManyToSql({
        table: execution.table,
        query,
      });

      const chartType =
        payload.chartType === "line" ||
        payload.chartType === "bar" ||
        payload.chartType === "horizontalBar"
          ? (payload.chartType as ExplorerChartType)
          : "bar";

      const chartTitle =
        typeof payload.chartTitle === "string" && payload.chartTitle.trim()
          ? payload.chartTitle.trim()
          : "Data Results";

      return NextResponse.json({
        mode: "query",
        table: execution.table,
        data: execution.data,
        rowCount: execution.rowCount,
        executionTimeMs: execution.executionTimeMs,
        previewData: preview.points,
        xField: preview.xField,
        yField: preview.yField,
        chartType,
        chartTitle,
        query,
        queryJson: JSON.stringify(query, null, 2),
        sql: sqlPreview,
      });
    }

    // Mode 1: Prompt -> safe query -> results
    if (typeof payload.prompt === "string") {
      const queryLimitRes = await enforceStudioQueryLimit(userId, tier);
      if (queryLimitRes) return queryLimitRes;

      const prompt = payload.prompt.trim();
      const requestedModelId = typeof payload.modelId === "string" ? payload.modelId : undefined;

      if (requestedModelId && !canAccessModel(tier, requestedModelId)) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Your plan does not include access to this model. Please upgrade." },
          { status: 403 }
        );
      }

      if (prompt.length < 3) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "Prompt is too short" },
          { status: 400 }
        );
      }

      if (!looksLikeEvQuery(prompt)) {
        return NextResponse.json(
          {
            error: "UNSUPPORTED_QUERY",
            message:
              "I can only help with EV market data. Please try a different query.",
          },
          { status: 400 }
        );
      }

      let generated;
      try {
        generated = await generateStructuredQuery(prompt, requestedModelId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "LLM request failed";
        return NextResponse.json(
          { error: "LLM_ERROR", message },
          { status: 503 }
        );
      }

      if (generated.unsupported) {
        return NextResponse.json(
          {
            error: "UNSUPPORTED_QUERY",
            message:
              "I can only help with EV market data. Please try a different query.",
            reason: generated.reason || undefined,
          },
          { status: 400 }
        );
      }

      let query: Record<string, unknown>;
      try {
        query = applyCaseInsensitive(parseGeneratedQuery(generated.query || "{}"));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to parse generated query";
        return NextResponse.json(
          { error: "LLM_ERROR", message },
          { status: 503 }
        );
      }
      const sqlPreview = prismaFindManyToSql({
        table: generated.table,
        query,
      });

      // Generate runnable query payload without executing it yet.
      if (payload.previewOnly === true) {
        return NextResponse.json({
          mode: "query-plan",
          table: generated.table,
          chartType: generated.chartType,
          chartTitle: generated.chartTitle,
          explanation: generated.explanation,
          query,
          queryJson: JSON.stringify(query, null, 2),
          sql: sqlPreview,
        });
      }

      let execution;
      try {
        execution = await executeQuery({ table: generated.table, query });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to execute query";
        return NextResponse.json(
          { error: "QUERY_EXECUTION_FAILED", message },
          { status: 400 }
        );
      }

      const preview = buildPreviewData(execution.data);
      return NextResponse.json({
        mode: "query",
        table: execution.table,
        data: execution.data,
        rowCount: execution.rowCount,
        executionTimeMs: execution.executionTimeMs,
        previewData: preview.points,
        xField: preview.xField,
        yField: preview.yField,
        chartType: generated.chartType,
        chartTitle: generated.chartTitle,
        explanation: generated.explanation,
        query,
        queryJson: JSON.stringify(query, null, 2),
        sql: sqlPreview,
      });
    }

    // Mode 2: Data -> PNG chart image (enforce chart generation limit)
    const chartLimitRes = await enforceChartGenLimit(userId, tier);
    if (chartLimitRes) return chartLimitRes;

    const pointsInput = Array.isArray(payload.previewData)
      ? payload.previewData
      : Array.isArray(payload.data)
      ? payload.data
      : null;

    if (!pointsInput) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message:
            "Request must include either `prompt` or chart `data/previewData`.",
        },
        { status: 400 }
      );
    }

    const points: PreviewPoint[] = pointsInput
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          label: String(row.label ?? ""),
          value: toNumber(row.value),
        };
      })
      .filter((point) => point.label.trim().length > 0);

    if (!points.length) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "No valid data points were provided for chart generation.",
        },
        { status: 400 }
      );
    }

    const chartType =
      payload.chartType === "line" ||
      payload.chartType === "bar" ||
      payload.chartType === "horizontalBar"
        ? (payload.chartType as ExplorerChartType)
        : "bar";

    const title =
      typeof payload.title === "string" && payload.title.trim()
        ? payload.title.trim()
        : "Data Results";

    const style = normalizeStyleOptions(payload.chartOptions);
    const applyWatermark = tier === "FREE";
    const config = renderChartConfig({
      chartType,
      title,
      points,
      style,
      watermark: applyWatermark,
    });

    // Pre-load logo for the watermark plugin (sync hook needs it ready)
    preloadedLogo = await getLogoImage();
    const imageBuffer = await renderChartToBuffer(config);

    return NextResponse.json({
      mode: "chart",
      chartImageBase64: `data:image/png;base64,${imageBuffer.toString("base64")}`,
      chartType,
      title,
      dataPoints: points.length,
      watermarked: applyWatermark,
    });
  } catch (error) {
    console.error("Explorer generate-chart route error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: "INTERNAL", message }, { status: 500 });
  }
}
