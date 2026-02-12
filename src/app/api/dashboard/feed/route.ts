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
            }
        });

        const news = posts.map(post => ({
            id: post.id,
            title: post.translatedTitle || post.originalTitle || "Untitled",
            desc: post.translatedSummary || "",
            time: new Date(post.createdAt).toLocaleDateString(), // simplified
            tag: post.categories[0] || "General",
            tagColor: "bg-slate-100 text-slate-600", // logic to determine color based on tag
        }));

        // Mock catalysts for now (no Catalyst model yet)
        const catalysts = [
            { month: "Oct", day: "24", title: "Xiaomi Earnings Call", desc: "Expected to reveal EV margin data.", tags: ["Earnings", "1810.HK"] },
            { month: "Nov", day: "01", title: "Monthly Deliveries", desc: "Major OEMs release Oct figures.", tags: ["Macro"], highlight: "High Impact" },
            { month: "Nov", day: "17", title: "Guangzhou Auto Show", desc: "Li Auto MPV launch event.", tags: ["Event"] },
        ];

        // If no posts found (db empty), mock some news
        if (news.length === 0) {
            news.push(
                { id: "1", tag: "Policy", tagColor: "bg-primary/10 text-green-700", time: "2 hours ago", title: "Shenzhen announces new subsidies for EV trade-ins, boosting Q4 outlook", desc: "The municipal government revealed a tiered subsidy plan..." },
                { id: "2", tag: "Tech", tagColor: "bg-blue-50 text-blue-600", time: "5 hours ago", title: "XPeng rolls out XNGP ADAS to 20 more cities", desc: "Beta testing shows 30% reduction..." },
                { id: "3", tag: "Supply Chain", tagColor: "bg-orange-50 text-orange-600", time: "Yesterday", title: "CATL to launch new condensed matter battery in Q3", desc: "Higher energy density promises..." },
            );
        }

        return NextResponse.json({ news, catalysts });
    } catch (error) {
        console.error("Error fetching dashboard feed:", error);
        return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
    }
}
