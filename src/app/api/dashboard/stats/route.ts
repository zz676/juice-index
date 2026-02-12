import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // In a real implementation, we would fetch these from the DB
        // const penetration = await prisma.nEVSalesSummary.findFirst({ ... });

        // Mock data for now until we have data ingestion set up
        const stats = {
            cards: [
                { icon: "electric_car", label: "NEV Penetration Rate", value: "38.4%", change: "+2.1%", up: true },
                { icon: "local_shipping", label: "Weekly Insured Units", value: "116k", change: "-0.8%", up: false }, // Updated for recent data
                { icon: "leaderboard", label: "Leading OEM", value: "BYD", badge: "Top 1" },
                { icon: "battery_charging_full", label: "Battery Price (LFP)", value: "$72", suffix: "/kWh", badge: "Index" },
            ],
            chart: {
                labels: ["W36", "W37", "W38", "W39", "W40", "W41", "W42", "W43", "W44"],
                currentYear: [120, 132, 145, 138, 142, 150, 132, 140, 145], // k units
                previousYear: [90, 95, 100, 98, 105, 110, 115, 112, 118]
            }
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
