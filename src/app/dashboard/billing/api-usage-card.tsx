interface ApiUsageCardProps {
  usageCount: number;
  tierLimit: number;
  tier: string;
}

function getBarColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-primary";
}

export default function ApiUsageCard({
  usageCount,
  tierLimit,
}: ApiUsageCardProps) {
  const usagePercent =
    tierLimit === Infinity ? 0 : Math.min((usageCount / tierLimit) * 100, 100);
  const usageLimitDisplay =
    tierLimit === Infinity ? "Unlimited" : tierLimit.toLocaleString();

  return (
    <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">data_usage</span>
        <h3 className="text-base font-semibold text-slate-custom-900">API Usage</h3>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-slate-custom-700">This month</p>
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
    </section>
  );
}
