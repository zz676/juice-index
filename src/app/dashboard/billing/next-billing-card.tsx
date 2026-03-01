"use client";

import { useState } from "react";
import type { UpcomingInvoiceInfo } from "./types";

interface NextBillingCardProps {
  upcomingInvoice: UpcomingInvoiceInfo | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isPaidUser: boolean;
  hasStripeSubscription: boolean;
}

export default function NextBillingCard({
  upcomingInvoice,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  isPaidUser,
  hasStripeSubscription,
}: NextBillingCardProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);

  async function openPortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || "Portal failed");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
      setPortalLoading(false);
    }
  }

  return (
    <section className="bg-card rounded-lg border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">event</span>
        <h3 className="text-base font-semibold text-slate-custom-900">Next Billing</h3>
        {hasStripeSubscription && (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="ml-auto inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-lg border border-primary text-slate-custom-700 hover:bg-primary/10 disabled:opacity-50 transition-colors"
          >
            {portalLoading ? (
              <>
                <span className="material-icons-round text-[14px] animate-spin mr-1">progress_activity</span>
                Opening...
              </>
            ) : (
              "Manage Billing"
            )}
          </button>
        )}
      </div>
      <div className="p-6">
        {!isPaidUser ? (
          <p className="text-sm text-slate-custom-500">
            Free plan — no upcoming charges.
          </p>
        ) : cancelAtPeriodEnd ? (
          <p className="text-sm text-slate-custom-500">
            Subscription cancels on{" "}
            <span className="font-medium text-slate-custom-700">
              {fmt(currentPeriodEnd) ?? "—"}
            </span>
            . No further charges.
          </p>
        ) : upcomingInvoice ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-custom-500">
              Next charge on{" "}
              <span className="font-medium text-slate-custom-700">
                {fmt(upcomingInvoice.nextPaymentDate) ?? fmt(currentPeriodEnd) ?? "—"}
              </span>
            </p>
            <p className="text-lg font-semibold text-slate-custom-900">
              {formatAmount(upcomingInvoice.amount, upcomingInvoice.currency)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-custom-500">
            No upcoming invoice information available.
          </p>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <span className="material-icons-round text-[16px]">error</span>
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
