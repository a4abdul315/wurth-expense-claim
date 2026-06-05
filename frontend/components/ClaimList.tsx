import Link from "next/link";
import { StatusBadge } from "./StatusBadge";

const claims = [
  { id: "WPS-2026-1048", title: "Dubai client visit",   date: "28 May", amount: "AED 1,842.50", status: "Submitted" },
  { id: "WPS-2026-1047", title: "Office supplies",      date: "22 May", amount: "AED 326.90",   status: "Approved"  },
  { id: "WPS-2026-1041", title: "Training workshop",    date: "14 May", amount: "AED 1,541.40", status: "Paid"      },
];

export function ClaimList() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">Recent claims</h3>
      </div>

      <div className="divide-y divide-line">
        {claims.map((claim) => (
          <Link
            href="#"
            key={claim.id}
            className="flex items-center gap-3 px-4 py-4 transition active:bg-slate-50"
          >
            {/* Left: title + id + date */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {claim.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {claim.id} · {claim.date}
              </p>
            </div>

            {/* Right: amount + status */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-sm font-semibold text-ink tabular-nums">
                {claim.amount}
              </span>
              <StatusBadge status={claim.status} />
            </div>
          </Link>
        ))}
      </div>

      {/* View all link */}
      <div className="border-t border-line px-4 py-3">
        <Link
          href="#"
          className="text-sm font-semibold text-brand-700 active:opacity-70"
        >
          View all claims →
        </Link>
      </div>
    </div>
  );
}
