"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTierDisplayName } from "./tier-display";

interface CurrentPlanCardProps {
  tier: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}

function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd: boolean }) {
  if (cancelAtPeriodEnd) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        Canceling
      </span>
    );
  }
  if (status === "past_due") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Past Due
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      {status === "active" ? "Active" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function CurrentPlanCard({
  tier,
  status,
  cancelAtPeriodEnd,
  currentPeriodStart,
  currentPeriodEnd,
}: CurrentPlanCardProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

  async function handleDowngrade() {
    setSwitching(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "starter", interval: "month" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to switch plan");
      setShowConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch plan");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">workspace_premium</span>
        <h3 className="text-base font-semibold text-slate-custom-900">Current Plan</h3>
        <div className="ml-auto flex items-center gap-2">
          {tier === "FREE" && (
            <Link
              href="/#pricing"
              className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Upgrade
            </Link>
          )}
          {tier === "STARTER" && (
            <Link
              href="/dashboard/billing?plan=pro"
              className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Upgrade to Pro
            </Link>
          )}
          {tier === "PRO" && (
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-custom-200 text-slate-custom-600 hover:bg-slate-custom-50 transition-colors"
            >
              Downgrade to Starter
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-slate-custom-900">
            {getTierDisplayName(tier)}
          </p>
          <StatusBadge status={status} cancelAtPeriodEnd={cancelAtPeriodEnd} />
        </div>

        {(currentPeriodStart || currentPeriodEnd) && (
          <p className="mt-2 text-sm text-slate-custom-500">
            Billing period: {fmt(currentPeriodStart) ?? "—"} – {fmt(currentPeriodEnd) ?? "—"}
          </p>
        )}

        {cancelAtPeriodEnd && (
          <div className="mt-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
            <span className="material-icons-round text-[18px] text-yellow-600 mt-0.5">info</span>
            <p className="text-sm text-yellow-700">
              Your subscription will be canceled at the end of the current period.
              You&apos;ll retain access until then.
            </p>
          </div>
        )}

        {/* Downgrade confirmation */}
        {showConfirm && (
          <div className="mt-4 bg-slate-custom-50 border border-slate-custom-200 rounded-lg px-4 py-3">
            <p className="text-sm text-slate-custom-700 mb-3">
              Switch from Pro ($49.99/mo) to Starter ($19.99/mo)? You&apos;ll receive a prorated credit for the remaining time on your current plan.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDowngrade}
                disabled={switching}
                className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-lg bg-slate-custom-900 text-white hover:bg-slate-custom-800 disabled:opacity-50 transition-colors"
              >
                {switching ? "Switching..." : "Confirm Downgrade"}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setError(null); }}
                className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-custom-200 text-slate-custom-600 hover:bg-slate-custom-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <span className="material-icons-round text-[16px]">error</span>
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
