"use client";

import { useState } from "react";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
};

interface UpgradePromptProps {
  plan: string;
  currentTier: string;
}

export default function UpgradePrompt({ plan, currentTier }: UpgradePromptProps) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = PLAN_LABELS[plan];
  if (!label) return null;

  // Don't show if user is already on this plan or higher
  const tierRank: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };
  const targetRank = tierRank[plan.toUpperCase()] ?? 0;
  if (tierRank[currentTier] >= targetRank) return null;

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Checkout failed");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 bg-primary/5 border border-primary/20 rounded-lg px-6 py-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-custom-900">
            Upgrade to {label}
          </h3>
          <p className="mt-1 text-sm text-slate-custom-600">
            Complete your subscription to unlock {label} features.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md bg-white border border-slate-custom-200 p-0.5">
            <button
              onClick={() => setInterval("month")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                interval === "month"
                  ? "bg-primary text-white"
                  : "text-slate-custom-600 hover:text-slate-custom-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("year")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                interval === "year"
                  ? "bg-primary text-white"
                  : "text-slate-custom-600 hover:text-slate-custom-900"
              }`}
            >
              Yearly
            </button>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="inline-flex items-center px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <span className="material-icons-round text-[16px] animate-spin mr-2">
                  progress_activity
                </span>
                Redirecting…
              </>
            ) : (
              "Subscribe Now"
            )}
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
          <span className="material-icons-round text-[18px]">error</span>
          {error}
        </div>
      )}
    </div>
  );
}
