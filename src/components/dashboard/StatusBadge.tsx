const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PUBLISHED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-purple-100 text-purple-800",
  PUBLISHING: "bg-blue-100 text-blue-800",
  FAILED: "bg-red-100 text-red-800",
  GENERATING: "bg-blue-100 text-blue-800",
  POSTING: "bg-blue-100 text-blue-800",
  POSTED: "bg-green-100 text-green-800",
  SKIPPED: "bg-slate-100 text-slate-600",
  SENT_TO_TELEGRAM: "bg-purple-100 text-purple-800",
  POSTED_T: "bg-teal-100 text-teal-800",
  DISCARDED: "bg-slate-100 text-slate-500",
};

interface StatusBadgeProps {
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  SENT_TO_TELEGRAM: "Telegram",
  POSTED_T: "Posted (T)",
  DISCARDED: "Discarded",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600";
  const label = STATUS_LABELS[status] ?? status.toLowerCase().replace(/_/g, " ");
  return (
    <span className={`${style} text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize`}>
      {label}
    </span>
  );
}
