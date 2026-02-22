import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getRevenueMetrics,
  getMRR,
  getUserMetrics,
  getAIUsageMetrics,
  getAPIActivityMetrics,
  getWebhookHealthMetrics,
} from "@/app/dashboard/admin/data";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [revenue, mrr, users, aiUsage, apiActivity, webhookHealth] = await Promise.all([
    getRevenueMetrics(),
    getMRR(),
    getUserMetrics(),
    getAIUsageMetrics(),
    getAPIActivityMetrics(),
    getWebhookHealthMetrics(),
  ]);

  return NextResponse.json(
    { revenue, mrr, users, aiUsage, apiActivity, webhookHealth },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    }
  );
}
