"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { readLiveClaims, readStatusMap, type LiveClaim, type ClaimStatus } from "@/lib/claimStore";
import { MOCK_USER } from "@/lib/mockUser";

type Row = LiveClaim & { currentStatus: ClaimStatus };

const fmtAed = (n: number) =>
  `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_FILTERS = ["All", "Submitted", "Approved", "Rejected", "Paid"] as const;

export default function MyClaimsPage() {
  const [claims,    setClaims]    = useState<Row[]>([]);
  const [filter,    setFilter]    = useState<string>("All");
  const [expanded,  setExpanded]  = useState<string | null>(null);

  function load() {
    const statusMap = readStatusMap();
    const all = readLiveClaims()
      .filter((c) => c.email === MOCK_USER.email)
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .map((c): Row => ({
        ...c,
        currentStatus: (statusMap[c.reference]?.status ?? c.status) as ClaimStatus,
      }));
    setClaims(all);
  }

  useEffect(() => {
    load();
    window.addEventListener("storage", load);
    const poll = setInterval(load, 3000);
    return () => { window.removeEventListener("storage", load); clearInterval(poll); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = filter === "All"
    ? claims
    : claims.filter((c) => c.currentStatus === filter);

  const totalAed = claims.reduce((s, c) => s + c.amountAed, 0);

  return (
    <AppShell
      title="My Claims"
      eyebrow="Expense history"
      actions={
        <Link
          href="/claims/new"
          className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white"
          style={{ background: "#CC0000" }}
        >
          + New claim
        </Link>
      }
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Total claims"    value={String(claims.length)} />
        <Stat label="Submitted"       value={String(claims.filter((c) => c.currentStatus === "Submitted").length)} />
        <Stat label="Approved / Paid" value={String(claims.filter((c) => c.currentStatus === "Approved" || c.currentStatus === "Paid").length)} />
        <Stat label="Total claimed"   value={fmtAed(totalAed)} highlight />
      </div>

      {/* Filter chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? "text-white shadow-sm"
                : "border border-line bg-white text-slate-600 hover:border-slate-300"
            }`}
            style={filter === f ? { background: "#CC0000" } : {}}
          >
            {f}
            {f !== "All" && (
              <span className="ml-1 opacity-70">
                ({claims.filter((c) => c.currentStatus === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Claims list */}
      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
            <p className="text-sm text-slate-400">
              {filter === "All" ? "No claims yet." : `No ${filter.toLowerCase()} claims.`}
            </p>
            {filter === "All" && (
              <Link
                href="/claims/new"
                className="mt-3 inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white"
                style={{ background: "#CC0000" }}
              >
                Submit your first claim →
              </Link>
            )}
          </div>
        ) : (
          filtered.map((claim) => (
            <div key={claim.id} className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
              {/* Main row */}
              <button
                type="button"
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50 active:bg-slate-100"
                onClick={() => setExpanded(expanded === claim.id ? null : claim.id)}
              >
                {/* Reference + date */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{claim.reference}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{fmtDate(claim.submittedAt)}</p>
                </div>

                {/* Amount */}
                <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                  {fmtAed(claim.amountAed)}
                </span>

                {/* Status */}
                <div className="shrink-0">
                  <StatusBadge status={claim.currentStatus} />
                </div>

                {/* Expand chevron */}
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-slate-400 transition-transform ${expanded === claim.id ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded detail */}
              {expanded === claim.id && (
                <div className="border-t border-line bg-slate-50 px-4 py-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Detail label="Employee"   value={claim.employee} />
                    <Detail label="Department" value={claim.department} />
                    <Detail label="Email"      value={claim.email} />
                    <Detail label="Amount"     value={fmtAed(claim.amountAed)} />
                    <Detail label="Status"     value={claim.currentStatus} />
                    <Detail label="Submitted"  value={fmtDate(claim.submittedAt)} />
                  </div>

                  {/* Status-specific messages */}
                  {claim.currentStatus === "Submitted" && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Awaiting Finance review.
                    </div>
                  )}
                  {claim.currentStatus === "Approved" && (
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                      ✓ Approved by Finance. Payment will be processed soon.
                    </div>
                  )}
                  {claim.currentStatus === "Rejected" && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger">
                      ✕ Rejected by Finance. Contact your Finance reviewer for more details.
                    </div>
                  )}
                  {claim.currentStatus === "Paid" && (
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                      💳 Paid. Check your bank account.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-soft ${highlight ? "border-brand-100 bg-brand-50" : "border-line bg-white"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1.5 text-lg font-bold tabular-nums ${highlight ? "text-brand-700" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink break-all">{value}</p>
    </div>
  );
}
