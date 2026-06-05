const statusStyles: Record<string, string> = {
  Draft: "border-slate-300 bg-white text-slate-700",
  Submitted: "border-brand-100 bg-brand-50 text-brand-700",
  Approved: "border-emerald-200 bg-emerald-50 text-success",
  Rejected: "border-red-200 bg-red-50 text-danger",
  Paid: "border-slate-300 bg-slate-100 text-slate-800",
  Review: "border-amber-200 bg-amber-50 text-warning"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded border px-2 text-xs font-semibold ${
        statusStyles[status] ?? statusStyles.Draft
      }`}
    >
      {status}
    </span>
  );
}

