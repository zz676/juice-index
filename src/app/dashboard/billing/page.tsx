import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { syncUserToPrisma } from "@/lib/auth/sync-user";
import { BillingButtons } from "@/components/BillingButtons";
import Link from "next/link";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }

  await syncUserToPrisma(data.user);

  const sub = await prisma.apiSubscription.findUnique({
    where: { userId: data.user.id },
    select: {
      tier: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  return (
    <main style={{ padding: "48px 24px", minHeight: "calc(100vh - 160px)" }}>
      <div className="container">
        <div style={{ marginBottom: 8 }}>
          <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ marginLeft: -16 }}>
            ← Back to Dashboard
          </Link>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 28 }}>
          Billing
        </h1>

        {/* Current Plan */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Current Plan</h2>
            <span className={`badge ${sub ? "badge-green" : "badge-gray"}`}>
              {sub ? sub.status : "FREE"}
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 4 }}>
            {sub ? sub.tier : "Free"}
          </div>
          {sub ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Period: {new Date(sub.currentPeriodStart).toLocaleDateString("en-US")} –{" "}
              {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US")}
              {sub.cancelAtPeriodEnd ? (
                <span className="badge badge-red" style={{ marginLeft: 8 }}>
                  Cancels at period end
                </span>
              ) : null}
            </p>
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              You&apos;re on the free plan. Upgrade to unlock more features.
            </p>
          )}
        </div>

        {/* Upgrade / Manage */}
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 16 }}>
            {sub ? "Manage Subscription" : "Upgrade Your Plan"}
          </h2>
          <BillingButtons />
        </div>
      </div>
    </main>
  );
}
