"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClaimList } from "@/components/ClaimList";
import { readLiveClaims, readStatusMap } from "@/lib/claimStore";
import { MOCK_USER } from "@/lib/mockUser";

function fmtAed(n: number) {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useStats() {
  const [stats, setStats] = useState({ open: 0, approvedAed: 0, pending: 0 });

  function calc() {
    const statusMap = readStatusMap();
    const mine = readLiveClaims()
      .filter((c) => c.email === MOCK_USER.email)
      .map((c) => ({
        ...c,
        currentStatus: statusMap[c.reference]?.status ?? c.status,
      }));

    const open        = mine.filter((c) => c.currentStatus === "Submitted" || c.currentStatus === "Review").length;
    const pending     = mine.filter((c) => c.currentStatus === "Submitted").length;
    const approvedAed = mine
      .filter((c) => c.currentStatus === "Approved" || c.currentStatus === "Paid")
      .reduce((s, c) => s + c.amountAed, 0);

    setStats({ open, approvedAed, pending });
  }

  useEffect(() => {
    calc();
    const poll = setInterval(calc, 3000);
    window.addEventListener("storage", calc);
    return () => { clearInterval(poll); window.removeEventListener("storage", calc); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return stats;
}

export default function DashboardPage() {
  const stats = useStats();

  return (
    <AppShell title="Dashboard" eyebrow="Employee workspace">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Metric label="Open claims"         value={String(stats.open)} />
        <Metric label="Approved this month" value={fmtAed(stats.approvedAed)} />
        <Metric label="Pending Finance"     value={String(stats.pending)} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Section heading + CTA */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink sm:text-lg">My claims</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Status across your submitted expenses.
          </p>
        </div>
        <Link
          href="/claims/new"
          className="focus-ring inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition active:opacity-80"
          style={{ background: "#CC0000" }}
        >
          + New claim
        </Link>
      </div>

      <div className="mt-3">
        <ClaimList limit={5} />
      </div>

    </AppShell>
  );
}

function Metric({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-white p-4 shadow-soft ${className}`}>
      <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">{value}</p>
    </div>
  );
}
