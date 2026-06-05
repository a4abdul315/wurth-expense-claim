"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { readLiveClaims, readStatusMap, type LiveClaim, type ClaimStatus } from "@/lib/claimStore";
import { MOCK_USER } from "@/lib/mockUser";

function fmtAed(n: number) {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type Row = LiveClaim & { currentStatus: ClaimStatus };

export function ClaimList({ limit = 5 }: { limit?: number }) {
  const [claims, setClaims] = useState<Row[]>([]);

  function load() {
    const statusMap = readStatusMap();
    const all = readLiveClaims()
      .filter((c) => c.email === MOCK_USER.email)   // only this user's claims
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .slice(0, limit)
      .map((c): Row => ({
        ...c,
        currentStatus: (statusMap[c.reference]?.status ?? c.status) as ClaimStatus,
      }));
    setClaims(all);
  }

  useEffect(() => {
    load();
    // Refresh when localStorage changes (Finance updates status in another tab)
    window.addEventListener("storage", load);
    const poll = setInterval(load, 3000);
    return () => {
      window.removeEventListener("storage", load);
      clearInterval(poll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (claims.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">Recent claims</h3>
        </div>
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-slate-400">No claims yet.</p>
          <Link href="/claims/new"
            className="mt-3 inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white"
            style={{ background: "#CC0000" }}>
            Submit your first claim →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">Recent claims</h3>
      </div>

      <div className="divide-y divide-line">
        {claims.map((claim) => (
          <Link
            href="/claims"
            key={claim.id}
            className="flex items-center gap-3 px-4 py-4 transition hover:bg-slate-50 active:bg-slate-100"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{claim.reference}</p>
              <p className="mt-0.5 text-xs text-slate-500">{fmtDate(claim.submittedAt)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-sm font-semibold text-ink tabular-nums">
                {fmtAed(claim.amountAed)}
              </span>
              <StatusBadge status={claim.currentStatus} />
            </div>
          </Link>
        ))}
      </div>

      <div className="border-t border-line px-4 py-3">
        <Link href="/claims" className="text-sm font-semibold text-brand-700 hover:underline">
          View all claims →
        </Link>
      </div>
    </div>
  );
}
