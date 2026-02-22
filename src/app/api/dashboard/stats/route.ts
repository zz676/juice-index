import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

let cachedResponse: { data: unknown; expiry: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Serve from in-memory cache if fresh
    if (cachedResponse && Date.now() < cachedResponse.expiry) {
      return NextResponse.json(cachedResponse.data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // Fetch latest weekly sales summaries (most recent 9 weeks)
    const recentSummaries = await prisma.nevSalesSummary.findMany({
      orderBy: [{ year: "desc" }, { endDate: "desc" }],
      take: 9,
    });

    // Fetch latest CPCA retail data for YoY comparison
    const latestRetail = await prisma.cpcaNevRetail.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Fetch #1 ranked automaker from most recent month
    const topAutomaker = await prisma.automakerRankings.findFirst({
      where: { ranking: 1 },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Fetch latest NEV production data
    const latestProduction = await prisma.cpcaNevProduction.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Fetch latest battery installation data
    const latestBattery = await prisma.chinaBatteryInstallation.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Fetch latest NEV exports (aggregate all plants for most recent month)
    const latestExportRecord = await prisma.plantExports.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    let exportTotal = 0;
    let exportYear = 0;
    let exportMonth = 0;
    if (latestExportRecord) {
      exportYear = latestExportRecord.year;
      exportMonth = latestExportRecord.month;
      const allExports = await prisma.plantExports.findMany({
        where: { year: exportYear, month: exportMonth },
      });
      exportTotal = allExports.reduce((sum, e) => sum + e.value, 0);
    }

    // If no data exists, return an empty-but-structured response
    if (!recentSummaries.length && !latestRetail && !topAutomaker && !latestProduction && !latestBattery && !latestExportRecord) {
      return NextResponse.json({
        cards: [],
        chart: { labels: [], currentYear: [], previousYear: [] },
        empty: true,
      });
    }

    // Build summary cards
    const latestSummary = recentSummaries[0] ?? null;
    const retailUnits = latestSummary
      ? `${Math.round(latestSummary.retailSales / 1000)}k`
      : "—";
    const retailYoyStr = latestSummary?.retailYoy != null
      ? `${latestSummary.retailYoy >= 0 ? "+" : ""}${latestSummary.retailYoy.toFixed(1)}%`
      : "";

    const penetrationCard = latestRetail
      ? {
          icon: "electric_car",
          label: "NEV Monthly Retail",
          value: `${(latestRetail.value / 10000).toFixed(1)}万`,
          change: latestRetail.yoyChange != null
            ? `${latestRetail.yoyChange >= 0 ? "+" : ""}${latestRetail.yoyChange.toFixed(1)}% YoY`
            : "",
          up: (latestRetail.yoyChange ?? 0) >= 0,
        }
      : { icon: "electric_car", label: "NEV Monthly Retail", value: "—" };

    const weeklyCard = {
      icon: "local_shipping",
      label: "Weekly Retail Sales",
      value: retailUnits,
      change: retailYoyStr,
      up: (latestSummary?.retailYoy ?? 0) >= 0,
    };

    const oemCard = topAutomaker
      ? {
          icon: "leaderboard",
          label: "Leading OEM",
          value: topAutomaker.automaker,
          badge: `#1 — ${topAutomaker.year}/${String(topAutomaker.month).padStart(2, "0")}`,
        }
      : { icon: "leaderboard", label: "Leading OEM", value: "—" };

    const productionCard = latestProduction
      ? {
          icon: "precision_manufacturing",
          label: "NEV Monthly Production",
          value: `${(latestProduction.value / 10000).toFixed(1)}万`,
          change: latestProduction.yoyChange != null
            ? `${latestProduction.yoyChange >= 0 ? "+" : ""}${latestProduction.yoyChange.toFixed(1)}% YoY`
            : "",
          up: (latestProduction.yoyChange ?? 0) >= 0,
        }
      : { icon: "precision_manufacturing", label: "NEV Monthly Production", value: "—" };

    const batteryCard = latestBattery
      ? {
          icon: "battery_charging_full",
          label: "Battery Installation",
          value: `${latestBattery.installation.toFixed(1)} GWh`,
          change: latestBattery.production != null
            ? `Prod: ${latestBattery.production.toFixed(1)} GWh`
            : "",
          up: true,
        }
      : { icon: "battery_charging_full", label: "Battery Installation", value: "—" };

    const exportsCard = latestExportRecord
      ? {
          icon: "public",
          label: "Total NEV Exports",
          value: `${(exportTotal / 10000).toFixed(1)}万`,
          badge: `${exportYear}/${String(exportMonth).padStart(2, "0")}`,
        }
      : { icon: "public", label: "Total NEV Exports", value: "—" };

    const cards = [penetrationCard, weeklyCard, oemCard, productionCard, batteryCard, exportsCard];

    // Build chart data from recent summaries (reverse to chronological order)
    const chronological = [...recentSummaries].reverse();
    const labels = chronological.map((s) => {
      const parts = s.endDate.split("-");
      return parts.length >= 3
        ? `${parseInt(parts[1])}/${parseInt(parts[2])}`
        : s.endDate;
    });
    const currentYear = chronological.map((s) =>
      Math.round(s.retailSales / 1000)
    );
    const previousYear = chronological.map((s) =>
      s.wholesaleSales != null ? Math.round(s.wholesaleSales / 1000) : 0
    );

    const chart = { labels, currentYear, previousYear };

    const result = { cards, chart };
    cachedResponse = { data: result, expiry: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
