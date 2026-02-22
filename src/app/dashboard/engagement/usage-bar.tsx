"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface UsageData {
  replyUsed: number;
  replyLimit: number;
  imageUsed: number;
  imageLimit: number;
  accountCount: number;
  accountLimit: number;
}

function ProgressBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = !Number.isFinite(limit);
  const pct = limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-custom-600">{label}</span>
        <span className="text-xs text-slate-custom-500">
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-1.5 bg-slate-custom-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: isUnlimited ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsageBar() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/engagement/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, []);

  if (!usage) return null;

  const isFreeTier = usage.replyLimit === 0 && usage.imageLimit === 0 && usage.accountLimit === 0;

  return (
    <div className="bg-white rounded-xl border border-slate-custom-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-custom-900">Daily Usage</h3>
        {isFreeTier && (
          <Link
            href="/dashboard/billing"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Upgrade
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ProgressBar label="Auto-replies" used={usage.replyUsed} limit={usage.replyLimit} />
        <ProgressBar label="AI images" used={usage.imageUsed} limit={usage.imageLimit} />
        <ProgressBar
          label="Monitored accounts"
          used={usage.accountCount}
          limit={usage.accountLimit}
        />
      </div>
    </div>
  );
}
