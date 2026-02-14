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
  const fmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">workspace_premium</span>
        <h3 className="text-base font-semibold text-slate-custom-900">Current Plan</h3>
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
      </div>
    </section>
  );
}
