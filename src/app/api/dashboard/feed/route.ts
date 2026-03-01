import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Fetch latest news
        const posts = await prisma.post.findMany({
            where: { status: "PUBLISHED" },
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                translatedTitle: true,
                originalTitle: true,
                translatedSummary: true,
                createdAt: true,
                categories: true,
                source: true,
                sourceUrl: true,
            }
        });

        const news = posts.map(post => ({
            id: post.id,
            title: post.translatedTitle || post.originalTitle || "Untitled",
            desc: post.translatedSummary || "",
            time: new Date(post.createdAt).toLocaleDateString(), // simplified
            tag: post.categories[0] || "General",
            tagColor: "bg-slate-100 text-slate-600", // logic to determine color based on tag
            url: post.sourceUrl,
        }));

        // Pinned companies always shown first regardless of earnings date
        const PINNED_TICKERS = new Set(["TSLA", "NIO", "XPEV", "LI", "RIVN", "LCID", "BYD", "BYDDF", "002594", "1810", "XIACF"]);
        const PINNED_NAME_KEYWORDS = ["tesla", "nio", "xpeng", "li auto", "rivian", "lucid", "byd", "xiaomi", "xiao"];
        function isPinned(ticker: string, companyName: string): boolean {
            const tickerUpper = ticker.toUpperCase().split(".")[0];
            if (PINNED_TICKERS.has(tickerUpper)) return true;
            const lower = companyName.toLowerCase();
            return PINNED_NAME_KEYWORDS.some((k) => lower.includes(k));
        }

        // Fetch upcoming earnings (earningsDate present and in the future), sorted earliest first
        const rawSnapshots = await prisma.stockDailySnapshot.findMany({
            where: { earningsDate: { gte: new Date() } },
            orderBy: { earningsDate: "asc" },
            take: 500,
        });

        // Keep only the earliest upcoming earningsDate per ticker (DB order is already asc)
        const seen = new Set<string>();
        const upcomingSnapshots = rawSnapshots.filter((s) => {
            if (!s.earningsDate) return false;
            if (seen.has(s.ticker)) return false;
            seen.add(s.ticker);
            return true;
        });

        // Split into pinned (fixed companies) and the rest, both already sorted by date
        const pinned = upcomingSnapshots.filter((s) => isPinned(s.ticker, s.companyName));
        const rest = upcomingSnapshots.filter((s) => !isPinned(s.ticker, s.companyName));
        const sorted = [...pinned, ...rest];

        const catalysts = sorted.slice(0, 10).flatMap((s) => {
            const date = s.earningsDate!;
            const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
            const day = String(date.getUTCDate()).padStart(2, "0");
            return [{
                month,
                day,
                title: `${s.companyName} Earnings`,
                desc: s.earningsDateRaw ? `Est. ${s.earningsDateRaw}` : "Earnings date from Yahoo Finance.",
                tags: ["Earnings", s.ticker],
            }];
        });

        // If no posts found (db empty), mock some news
        if (news.length === 0) {
            news.push(
                { id: "1", tag: "Policy", tagColor: "bg-primary/10 text-green-700", time: "2 hours ago", title: "Shenzhen announces new subsidies for EV trade-ins, boosting Q4 outlook", desc: "The municipal government revealed a tiered subsidy plan...", url: "#" },
                { id: "2", tag: "Tech", tagColor: "bg-blue-50 text-blue-600", time: "5 hours ago", title: "XPeng rolls out XNGP ADAS to 20 more cities", desc: "Beta testing shows 30% reduction...", url: "#" },
                { id: "3", tag: "Supply Chain", tagColor: "bg-orange-50 text-orange-600", time: "Yesterday", title: "CATL to launch new condensed matter battery in Q3", desc: "Higher energy density promises...", url: "#" },
            );
        }

        return NextResponse.json({ news, catalysts });
    } catch (error) {
        console.error("Error fetching dashboard feed:", error);
        return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
    }
}
