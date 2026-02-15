import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  getRevenueMetrics,
  getMRR,
  getUserMetrics,
  getAIUsageMetrics,
  getAPIActivityMetrics,
  getWebhookHealthMetrics,
} from "./data";
import AdminDashboard from "./admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [revenue, mrr, users, aiUsage, apiActivity, webhookHealth] = await Promise.all([
    getRevenueMetrics(),
    getMRR(),
    getUserMetrics(),
    getAIUsageMetrics(),
    getAPIActivityMetrics(),
    getWebhookHealthMetrics(),
  ]);

  return (
    <AdminDashboard
      metrics={{ revenue, mrr, users, aiUsage, apiActivity, webhookHealth }}
    />
  );
}
