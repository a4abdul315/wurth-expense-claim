"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClaimList } from "@/components/ClaimList";
import { readLiveClaims, readStatusMap } from "@/lib/claimStore";
import { getCurrentUser } from "@/lib/mockUser";

const fmtAed = (n: number) =>
  `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function isThisMonth(ms: number) {
  const d = new Date(ms);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function useStats() {
  const [stats, setStats] = useState({ open: 0, approvedAed: 0, pending: 0, total: 0 });

  function calc() {
    const statusMap = readStatusMap();
    const mine = readLiveClaims()
      .filter((c) => c.email === getCurrentUser().email)
      .map((c) => ({
        ...c,
        currentStatus: statusMap[c.reference]?.status ?? c.status,
      }));

    const open      = mine.filter((c) => c.currentStatus === "Submitted" || c.currentStatus === "Review").length;
    const pending   = mine.filter((c) => c.currentStatus === "Submitted").length;
    const total     = mine.length;

    // Only count approved/paid claims FROM THIS MONTH
    const approvedAed = mine
      .filter((c) =>
        (c.currentStatus === "Approved" || c.currentStatus === "Paid") &&
        isThisMonth(c.submittedAt)
      )
      .reduce((s, c) => s + c.amountAed, 0);

    setStats({ open, approvedAed, pending, total });
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
  const [isFinance, setIsFinance] = useState(false); // false on server — no mismatch
  const [clearing,  setClearing]  = useState(false);

  useEffect(() => {
    setIsFinance(["FINANCE","FINANCE_SUPER","ADMIN"].includes(getCurrentUser().role));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearTestData() {
    setClearing(true);
    localStorage.removeItem("wps_submitted_claims");
    localStorage.removeItem("wps_claim_statuses");
    setTimeout(() => {
      setClearing(false);
      window.location.reload();
    }, 500);
  }

  return (
    <AppShell title="Dashboard" eyebrow="Employee workspace">

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Open claims"
          value={String(stats.open)}
          hint="Submitted, awaiting Finance"
          color="amber"
        />
        <StatCard
          label="Approved this month"
          value={fmtAed(stats.approvedAed)}
          hint="Approved + Paid in June 2026"
          color="green"
        />
        <StatCard
          label="Total claims"
          value={String(stats.total)}
          hint="All time"
          color="default"
        />
      </div>

      {/* Section heading */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 sm:text-lg">My claims</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Your submitted expense claims and their status.
          </p>
        </div>
        {!isFinance && (
          <Link
            href="/claims/new"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-bold text-white transition active:opacity-80"
            style={{ background: "#CC0000" }}
          >
            + New claim
          </Link>
        )}
        {isFinance && (
          <Link
            href="/finance"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-bold text-white transition active:opacity-80 bg-purple-600"
          >
            Finance queue →
          </Link>
        )}
      </div>

      <div className="mt-3">
        <ClaimList limit={5} />
      </div>

      {/* Dev helper — clear test data */}
      {stats.total > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={clearTestData}
            disabled={clearing}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 disabled:opacity-50"
          >
            {clearing ? "Clearing…" : "Clear test data"}
          </button>
        </div>
      )}

    </AppShell>
  );
}

function StatCard({
  label, value, hint, color,
}: {
  label: string; value: string; hint: string;
  color: "amber" | "green" | "default";
}) {
  const bg = color === "amber"  ? "bg-amber-50  border-amber-100"
           : color === "green"  ? "bg-green-50  border-green-100"
           : "bg-white border-gray-100";
  const valColor = color === "amber"  ? "text-amber-700"
                 : color === "green"  ? "text-green-700"
                 : "text-gray-900";

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${bg}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold tabular-nums ${valColor}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}
