"use client";

import { useState } from "react";
import Link from "next/link";

interface SubscriptionSectionProps {
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    usageCount: number;
    tierLimit: number;
}

export default function SubscriptionSection({
    tier,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    usageCount,
    tierLimit,
}: SubscriptionSectionProps) {
    const [portalLoading, setPortalLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const usagePercent = tierLimit === Infinity ? 0 : Math.min((usageCount / tierLimit) * 100, 100);
    const usageLimitDisplay = tierLimit === Infinity ? "Unlimited" : tierLimit.toLocaleString();

    function getBarColor(pct: number) {
        if (pct >= 90) return "bg-red-500";
        if (pct >= 70) return "bg-yellow-500";
        return "bg-primary";
    }

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
        <div className="space-y-5">
            {/* Plan + Status */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-2xl font-bold text-slate-custom-900">{tier}</p>
                    <p className="text-sm text-slate-custom-500">Current plan</p>
                </div>
                <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        status === "active" && !cancelAtPeriodEnd
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                    }`}
                >
                    {cancelAtPeriodEnd ? "Canceling" : status === "active" ? "Active" : status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </div>

            {/* Usage bar */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-slate-custom-700">API Usage</p>
                    <p className="text-sm text-slate-custom-500">
                        {usageCount.toLocaleString()} / {usageLimitDisplay}
                    </p>
                </div>
                <div className="w-full h-2 bg-slate-custom-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${getBarColor(usagePercent)}`}
                        style={{ width: `${usagePercent}%` }}
                    />
                </div>
            </div>

            {/* Period end */}
            {currentPeriodEnd && (
                <p className="text-sm text-slate-custom-500">
                    Current period ends {new Date(currentPeriodEnd).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                </p>
            )}

            {/* Cancel warning */}
            {cancelAtPeriodEnd && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                    <span className="material-icons-round text-[18px] text-yellow-600 mt-0.5">info</span>
                    <p className="text-sm text-yellow-700">
                        Your subscription will be canceled at the end of the current period. You&apos;ll retain access until then.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
                <Link
                    href="/pricing"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                    Change Plan
                </Link>
                {tier !== "FREE" && (
                    <button
                        onClick={openPortal}
                        disabled={portalLoading}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-slate-custom-200 text-slate-custom-700 hover:bg-slate-custom-50 disabled:opacity-50 transition-colors"
                    >
                        {portalLoading ? (
                            <>
                                <span className="material-icons-round text-[16px] animate-spin mr-2">progress_activity</span>
                                Opening...
                            </>
                        ) : (
                            "Manage Billing"
                        )}
                    </button>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
                    <span className="material-icons-round text-[18px]">error</span>
                    {error}
                </div>
            )}
        </div>
    );
}
