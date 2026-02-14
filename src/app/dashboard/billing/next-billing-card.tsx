import type { UpcomingInvoiceInfo } from "./types";

interface NextBillingCardProps {
  upcomingInvoice: UpcomingInvoiceInfo | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isPaidUser: boolean;
}

export default function NextBillingCard({
  upcomingInvoice,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  isPaidUser,
}: NextBillingCardProps) {
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

  return (
    <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">event</span>
        <h3 className="text-base font-semibold text-slate-custom-900">Next Billing</h3>
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
      </div>
    </section>
  );
}
