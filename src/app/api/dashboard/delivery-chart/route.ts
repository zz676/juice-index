import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Brand } from "@prisma/client";

let cachedResponse: Map<string, { data: unknown; expiry: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const BRAND_META: Record<string, { label: string; color: string }> = {
  BYD: { label: "BYD", color: "#e60012" },
  NIO: { label: "NIO", color: "#004de6" },
  XPENG: { label: "XPeng", color: "#00b4d8" },
  LI_AUTO: { label: "Li Auto", color: "#00c853" },
  ZEEKR: { label: "Zeekr", color: "#6366f1" },
  XIAOMI: { label: "Xiaomi", color: "#ff6900" },
  TESLA_CHINA: { label: "Tesla China", color: "#cc0000" },
  LEAPMOTOR: { label: "Leapmotor", color: "#0ea5e9" },
  GEELY: { label: "Geely", color: "#1e40af" },
};

const VALID_BRANDS = Object.keys(BRAND_META) as Brand[];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandsParam = searchParams.get("brands");
    const monthsParam = parseInt(searchParams.get("months") || "12", 10);
    const months = Math.min(Math.max(monthsParam, 1), 24);

    // Parse and validate brands
    const requestedBrands: Brand[] = brandsParam
      ? brandsParam
          .split(",")
          .map((b) => b.trim() as Brand)
          .filter((b) => VALID_BRANDS.includes(b))
      : (VALID_BRANDS as Brand[]);

    // Build cache key
    const cacheKey = `${requestedBrands.sort().join(",")}_${months}`;
    const cached = cachedResponse.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const startYear = startDate.getFullYear();
    const startPeriod = startDate.getMonth() + 1; // 1-indexed

    // Query EVMetric for DELIVERY + MONTHLY for the selected brands and date range
    const metrics = await prisma.eVMetric.findMany({
      where: {
        metric: "DELIVERY",
        periodType: "MONTHLY",
        brand: { in: requestedBrands },
        OR: [
          { year: { gt: startYear } },
          { year: startYear, period: { gte: startPeriod } },
        ],
      },
      orderBy: [{ year: "asc" }, { period: "asc" }],
    });

    // Build a map of year-month -> brand -> value
    const dataMap = new Map<string, Record<string, number>>();

    for (const m of metrics) {
      const key = `${m.year}-${String(m.period).padStart(2, "0")}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, {});
      }
      const entry = dataMap.get(key)!;
      // Aggregate: sum values per brand per month (in case of duplicates)
      entry[m.brand] = (entry[m.brand] || 0) + m.value;
    }

    // Build sorted chart data array
    const sortedKeys = Array.from(dataMap.keys()).sort();
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const data = sortedKeys.map((key) => {
      const [yearStr, monthStr] = key.split("-");
      const monthIdx = parseInt(monthStr, 10) - 1;
      const label = `${monthNames[monthIdx]} ${yearStr}`;
      return {
        label,
        yearMonth: key,
        ...dataMap.get(key),
      };
    });

    // Filter brandMeta to only include requested brands that have data
    const brandsWithData = new Set<string>();
    for (const entry of dataMap.values()) {
      for (const brand of Object.keys(entry)) {
        brandsWithData.add(brand);
      }
    }
    const filteredBrandMeta: Record<string, { label: string; color: string }> = {};
    for (const brand of requestedBrands) {
      if (BRAND_META[brand]) {
        filteredBrandMeta[brand] = BRAND_META[brand];
      }
    }

    const result = {
      data,
      brands: requestedBrands,
      brandMeta: filteredBrandMeta,
      range: { months, from: sortedKeys[0] || null, to: sortedKeys[sortedKeys.length - 1] || null },
    };

    // Cache result
    cachedResponse.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });

    // Prune old cache entries (keep max 20)
    if (cachedResponse.size > 20) {
      const firstKey = cachedResponse.keys().next().value;
      if (firstKey) cachedResponse.delete(firstKey);
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching delivery chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery chart data" },
      { status: 500 }
    );
  }
}
