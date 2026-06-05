import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ClaimList } from "@/components/ClaimList";

export default function DashboardPage() {
  return (
    <AppShell title="Claims dashboard" eyebrow="Employee workspace">

      {/* ── Metric tiles — 2 cols on mobile, 3 on sm+ ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Metric label="Open claims"           value="4" />
        <Metric label="Approved this month"   value="AED 2,169" />
        <Metric label="Pending finance" value="2" className="col-span-2 sm:col-span-1" />
      </div>

      {/* ── Section heading + New Claim CTA ── */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink sm:text-lg">My claims</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Status across submitted and paid expenses.
          </p>
        </div>
        {/* h-11 = 44px minimum touch target */}
        <Link
          href="/claims/new"
          className="focus-ring inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition active:opacity-80"
          style={{ background: "#CC0000" }}
        >
          + New claim
        </Link>
      </div>

      <div className="mt-3">
        <ClaimList />
      </div>

    </AppShell>
  );
}

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-line bg-white p-4 shadow-soft ${className}`}>
      <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">{value}</p>
    </div>
  );
}
