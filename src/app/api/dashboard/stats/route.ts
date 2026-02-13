import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    // If no data exists, return an empty-but-structured response
    if (!recentSummaries.length && !latestRetail && !topAutomaker) {
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

    const cards = [penetrationCard, weeklyCard, oemCard];

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

    return NextResponse.json({ cards, chart });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
