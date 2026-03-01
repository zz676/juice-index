import type { InvoiceInfo } from "./types";

interface InvoiceHistoryCardProps {
  invoices: InvoiceInfo[];
  isPaidUser: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    open: "bg-blue-100 text-blue-700",
    draft: "bg-slate-100 text-slate-600",
    void: "bg-slate-100 text-slate-500",
    uncollectible: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function InvoiceHistoryCard({
  invoices,
  isPaidUser,
}: InvoiceHistoryCardProps) {
  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);

  return (
    <section className="bg-card rounded-lg border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)]">
      <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">receipt_long</span>
        <h3 className="text-base font-semibold text-slate-custom-900">Invoice History</h3>
      </div>
      <div className="p-6">
        {!isPaidUser || invoices.length === 0 ? (
          <p className="text-sm text-slate-custom-500">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-custom-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-custom-100">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 text-slate-custom-700">
                      {new Date(inv.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 text-slate-custom-900 font-medium">
                      {formatAmount(inv.amount, inv.currency)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 text-right">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="material-icons-round text-[16px]">
                            download
                          </span>
                          PDF
                        </a>
                      ) : (
                        <span className="text-slate-custom-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
