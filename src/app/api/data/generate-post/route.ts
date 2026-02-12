import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You are a social media manager for 'Juice Index', an EV market data platform.
Your job is to draft a specialized post for X (Twitter) based on the user's data analysis.

Guidelines:
- Keep it under 280 characters if possible, or thread it if necessary (but prefer single tweet).
- Use engaging, professional, yet punchy tone.
- Highlight the key insight from the data.
- Use relevant hashtags like #EV #ElectricVehicles #ChinaEV #JuiceIndex.
- If the user provides specific instructions, follow them.
`;

export async function POST(req: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2. Check Quota
        // @ts-ignore
        const { checkQuota } = await import("@/lib/quota");
        const quota = await checkQuota(user.id, "post");
        if (!quota.success) {
            return NextResponse.json({ error: quota.error }, { status: 429 });
        }

        // 3. Parse body
        const { dataSummary, userInstruction } = await req.json();

        if (!dataSummary) {
            return NextResponse.json({ error: "Missing data summary" }, { status: 400 });
        }

        // 3. Generate Post
        const result = await generateText({
            model: openai("gpt-4o-mini"),
            system: SYSTEM_PROMPT,
            prompt: `
      Data Summary:
      ${JSON.stringify(dataSummary)}

      User Instruction:
      ${userInstruction || "Draft an engaging post about this data."}
      `,
        });

        return NextResponse.json({ content: result.text });
    } catch (error) {
        console.error("Post generation error:", error);
        return NextResponse.json({ error: "Failed to generate post" }, { status: 500 });
    }
}
