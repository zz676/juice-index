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
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`${style} text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize`}>
      {status.toLowerCase()}
    </span>
  );
}
