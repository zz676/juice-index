import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { ChartConfiguration } from "chart.js";

export const runtime = "nodejs";

const width = 1200; // Standard social media image width
const height = 630; // Standard social media image height
const backgroundColour = "white";

const chartCallback = (ChartJS: any) => {
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = false;
};

export async function POST(req: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2. Check Quota
        // @ts-ignore
        const { checkQuota } = await import("@/lib/quota");
        const quota = await checkQuota(user.id, "chart");
        if (!quota.success) {
            return NextResponse.json({ error: quota.error }, { status: 429 });
        }

        // 3. Parse body
        const body = await req.json();
        const { type, data, options, title, caption } = body;

        if (!type || !data) {
            return NextResponse.json({ error: "Missing chart configuration" }, { status: 400 });
        }

        // 4. Configure Chart
        const configuration: ChartConfiguration = {
            type,
            data,
            options: {
                ...options,
                plugins: {
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 32, weight: "bold" },
                        padding: 20
                    },
                    subtitle: {
                        display: !!caption,
                        text: caption,
                        font: { size: 20 },
                        padding: { bottom: 20 }
                    },
                    legend: {
                        labels: { font: { size: 18 } }
                    }
                },
                layout: {
                    padding: 40
                },
                // Watermark for FREE tier
                watermark: quota.tier === "FREE" ? {
                    text: "Created with Juice Index (evjuice.net)",
                    color: "rgba(0, 0, 0, 0.1)",
                    font: "30px Arial",
                    x: width / 2,
                    y: height / 2
                } : undefined
            },
            plugins: [
                {
                    id: 'custom_canvas_background_color',
                    beforeDraw: (chart: any) => {
                        const ctx = chart.canvas.getContext('2d');
                        ctx.save();
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.fillStyle = backgroundColour;
                        ctx.fillRect(0, 0, chart.width, chart.height);
                        ctx.restore();

                        // Draw watermark if configured
                        if (chart.config.options.watermark) {
                            const wm = chart.config.options.watermark;
                            ctx.save();
                            ctx.translate(wm.x, wm.y);
                            ctx.rotate(-Math.PI / 4);
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = wm.color;
                            ctx.font = wm.font;
                            ctx.fillText(wm.text, 0, 0);
                            ctx.restore();
                        }
                    }
                }
            ]
        };

        // 5. Render to Buffer
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour, chartCallback });
        const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);

        // 6. Return Image
        return new NextResponse(buffer as any, {
            headers: {
                "Content-Type": "image/png",
                "Content-Length": buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error("Chart generation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate chart" },
            { status: 500 }
        );
    }
}
