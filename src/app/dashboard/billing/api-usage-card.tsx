import { TIER_QUOTAS } from "@/lib/api/quotas";
import type { ApiTier } from "@/lib/api/tier";
import { MODEL_REGISTRY } from "@/lib/studio/models";

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

function formatLimit(value: number): string {
  if (!Number.isFinite(value)) return "Unlimited";
  return value.toLocaleString();
}

export default function ApiUsageCard({
  usageCount,
  tierLimit,
  tier,
}: ApiUsageCardProps) {
  const quotas = TIER_QUOTAS[tier as ApiTier] ?? TIER_QUOTAS.FREE;

  const usagePercent =
    tierLimit === Infinity ? 0 : Math.min((usageCount / tierLimit) * 100, 100);
  const usageLimitDisplay = formatLimit(tierLimit);

  const modelQuotaEntries = Object.entries(quotas.studioQueriesByModel);

  return (
    <section className="bg-card rounded-lg border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">data_usage</span>
        <h3 className="text-base font-semibold text-slate-custom-900">Usage &amp; Quotas</h3>
      </div>
      <div className="p-6 space-y-5">
        {/* API Usage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-slate-custom-700">API Requests (this month)</p>
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

        {/* Quota Summary */}
        <div className="grid grid-cols-2 gap-3">
          <QuotaItem label="Juice AI Queries / Day" value={formatLimit(quotas.studioQueries)} />
          <QuotaItem label="Chart Generations / Day" value={formatLimit(quotas.chartGen)} />
          <QuotaItem label="AI Post Drafts / Day" value={formatLimit(quotas.postDrafts)} />
          <QuotaItem label="CSV Exports / Month" value={formatLimit(quotas.csvExports)} />
          <QuotaItem label="API Keys" value={formatLimit(quotas.maxApiKeys)} />
          <QuotaItem label="Data Delay" value={quotas.delayDays === 0 ? "Real-time" : `${quotas.delayDays} days`} />
          <QuotaItem label="History" value={Number.isFinite(quotas.histMonths) ? `${Math.round(quotas.histMonths / 12)} years` : "Unlimited"} />
          <QuotaItem label="Scheduled Posts" value={formatLimit(quotas.maxScheduled)} />
        </div>

        {/* Per-Model Quota Breakdown */}
        {modelQuotaEntries.length > 0 && (
          <div className="pt-4 border-t border-slate-custom-100">
            <h4 className="text-xs font-semibold text-slate-custom-700 mb-2">AI Model Limits (per day)</h4>
            <div className="space-y-1">
              {modelQuotaEntries.map(([modelId, queryLimit]) => {
                const draftLimit = quotas.postDraftsByModel[modelId] ?? 0;
                const modelDef = MODEL_REGISTRY.find((m) => m.id === modelId);
                return (
                  <div key={modelId} className="flex items-center justify-between bg-slate-custom-50 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-slate-custom-500">
                      {modelDef?.displayName ?? modelId}
                    </span>
                    <span className="text-xs font-semibold text-slate-custom-800">
                      {formatLimit(queryLimit)} queries / {formatLimit(draftLimit)} drafts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function QuotaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-custom-50 rounded-lg px-3 py-2">
      <span className="text-xs text-slate-custom-500">{label}</span>
      <span className="text-xs font-semibold text-slate-custom-800">{value}</span>
    </div>
  );
}
