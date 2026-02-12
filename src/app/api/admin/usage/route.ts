import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// Admin-only metrics endpoint
export async function GET(req: NextRequest) {
    try {
        // 1. Auth check - MUST be ADMIN
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Check if user is admin in DB
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        if (dbUser?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
        }

        // 2. Fetch Stats
        // Total API calls
        const totalRequests = await prisma.apiUsage.count();

        // Usage by endpoint (simple aggregation)
        const usageByEndpoint = await prisma.apiUsage.groupBy({
            by: ['endpoint'],
            _count: {
                endpoint: true
            }
        });

        // Recent activity
        const recentActivity = await prisma.apiUsage.findMany({
            take: 50,
            orderBy: { timestamp: 'desc' },
            include: {
                User: {
                    select: { email: true }
                }
            }
        });

        return NextResponse.json({
            totalRequests,
            usageByEndpoint,
            recentActivity
        });

    } catch (error) {
        console.error("Admin usage error:", error);
        return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 });
    }
}
