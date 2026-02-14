"use client";

import { useState } from "react";
import Link from "next/link";

interface PlanActionsCardProps {
  isPaidUser: boolean;
  tier: string;
}

export default function PlanActionsCard({
  isPaidUser,
}: PlanActionsCardProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || json?.error || "Portal failed");
      window.location.href = json.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to open billing portal"
      );
      setPortalLoading(false);
    }
  }

  return (
    <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">tune</span>
        <h3 className="text-base font-semibold text-slate-custom-900">
          Plan Actions
        </h3>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Change Plan
          </Link>
          {isPaidUser && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-slate-custom-200 text-slate-custom-700 hover:bg-slate-custom-50 disabled:opacity-50 transition-colors"
            >
              {portalLoading ? (
                <>
                  <span className="material-icons-round text-[16px] animate-spin mr-2">
                    progress_activity
                  </span>
                  Opening...
                </>
              ) : (
                "Manage Billing"
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
            <span className="material-icons-round text-[18px]">error</span>
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
