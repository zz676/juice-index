import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// Allowed tables for security
const ALLOWED_TABLES = ["eVMetric", "apiUsage", "apiKey"];

export async function POST(req: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2. Parse body
        const { table, query } = await req.json();

        // 3. Validation
        if (!ALLOWED_TABLES.includes(table)) {
            return NextResponse.json({ error: `Table '${table}' is not allowed` }, { status: 403 });
        }

        if (!query || typeof query !== "object") {
            return NextResponse.json({ error: "Invalid query object" }, { status: 400 });
        }

        // Safety: Enforce limit
        const safeQuery = { ...query };
        if (!safeQuery.take || safeQuery.take > 100) {
            safeQuery.take = 100;
        }

        // 4. Execute safely
        // @ts-ignore - dynamic table access is checked above
        const data = await prisma[table].findMany(safeQuery);

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Execution error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to execute query" },
            { status: 500 }
        );
    }
}
