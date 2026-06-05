"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ThreadPanel } from "@/components/ThreadPanel";
import { readLiveClaims, readStatusMap, updateClaimStatus, type LiveClaim, type ClaimStatus } from "@/lib/claimStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type QueueItem = {
  id: string; reference: string; employee: string; department: string;
  amountAed: number; submitted: string; status: ClaimStatus;
  submittedAt: number; isLive?: boolean; rejectReason?: string;
};

// ─── Seed claims ──────────────────────────────────────────────────────────────

const SEED: Omit<QueueItem, "status">[] = [
  { id: "clm_001", reference: "WPS-2026-1048", employee: "Aisha Khan",    department: "Sales",       amountAed: 1842.50, submitted: "04 Jun 2026", submittedAt: Date.now() - 86400000 * 1 },
  { id: "clm_002", reference: "WPS-2026-1046", employee: "Daniel Reed",   department: "Operations",  amountAed: 1168.94, submitted: "03 Jun 2026", submittedAt: Date.now() - 86400000 * 2 },
  { id: "clm_003", reference: "WPS-2026-1043", employee: "Abdul Rehman",  department: "IT",          amountAed: 3376.40, submitted: "26 May 2026", submittedAt: Date.now() - 86400000 * 9 },
  { id: "clm_004", reference: "WPS-2026-1040", employee: "Mehmet Yilmaz", department: "Procurement", amountAed: 654.00,  submitted: "20 May 2026", submittedAt: Date.now() - 86400000 * 15 },
];
const SEED_DEFAULTS: Record<string, ClaimStatus> = {
  "WPS-2026-1048": "Submitted", "WPS-2026-1046": "Submitted",
  "WPS-2026-1043": "Approved",  "WPS-2026-1040": "Paid",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAed = (n: number) =>
  `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const timeAgo = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const isNew = (ms: number) => Date.now() - ms < 60_000;

function downloadCsv(queue: QueueItem[]) {
  const rows = [
    ["Reference","Employee","Department","Amount (AED)","Submitted","Status","Currency Original","FX Rate Applied","Notes"],
    ...queue.map((c) => [
      c.reference, c.employee, c.department,
      c.amountAed.toFixed(2), c.submitted, c.status,
      "AED", "1.00000", "",
    ]),
  ];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a   = document.createElement("a");
  a.href     = url;
  a.download = `wps-claims-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({ claim, onConfirm, onClose }: {
  claim: QueueItem; onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" style={{ animation: "fadeIn 0.2s ease" }}>
        <h3 className="text-lg font-bold text-ink">Reject claim</h3>
        <p className="mt-1 text-sm text-slate-500">{claim.reference} · {claim.employee}</p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">Reason <span className="text-slate-400">(optional)</span></label>
          <textarea rows={3} autoFocus placeholder="e.g. Missing receipts, exceeds policy limit…"
            value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-danger focus:outline-none" />
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose}
            className="h-11 flex-1 rounded-lg border border-line bg-white text-sm font-semibold text-ink hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(reason.trim())}
            className="h-11 flex-1 rounded-lg text-sm font-semibold text-white"
            style={{ background: "#c2413a" }}>
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Claim detail modal ───────────────────────────────────────────────────────

function ClaimDetailModal({ claim, onClose, onApprove, onReject, onPaid }: {
  claim: QueueItem;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPaid: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end" style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl overflow-y-auto"
        style={{ animation: "slideLeft 0.2s ease" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Claim detail</p>
            <p className="mt-0.5 text-lg font-bold text-ink">{claim.reference}</p>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-ink text-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {/* Employee + status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{claim.employee}</p>
              <p className="text-xs text-slate-500">{claim.department} · {claim.submitted}</p>
            </div>
            <StatusBadge status={claim.status} />
          </div>

          {/* Amount */}
          <div className="rounded-xl border border-line bg-slate-50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Claimed</p>
            <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{fmtAed(claim.amountAed)}</p>
          </div>

          {/* Reject reason if any */}
          {claim.rejectReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-danger">Rejection reason</p>
              <p className="mt-0.5 text-sm text-slate-700">{claim.rejectReason}</p>
            </div>
          )}

          {/* Actions */}
          {(claim.status === "Submitted" || claim.status === "Review") && (
            <div className="flex gap-2">
              <button type="button" onClick={onReject}
                className="h-11 flex-1 rounded-lg border border-line bg-white text-sm font-semibold text-danger hover:bg-red-50">
                Reject
              </button>
              <button type="button" onClick={onApprove}
                className="h-11 flex-1 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#168a53" }}>
                Approve
              </button>
            </div>
          )}
          {claim.status === "Approved" && (
            <button type="button" onClick={onPaid}
              className="h-11 w-full rounded-lg text-sm font-semibold text-white"
              style={{ background: "#0369a1" }}>
              Mark as Paid
            </button>
          )}

          {/* Thread panel */}
          <div>
            <p className="mb-2 text-sm font-bold text-ink">Discussion thread</p>
            <ThreadPanel claimId={claim.id} claimReference={claim.reference} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Finance page ─────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [liveQueue, setLiveQueue]       = useState<QueueItem[]>([]);
  const [filter,    setFilter]          = useState("All statuses");
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<QueueItem | null>(null);
  const [viewClaim,    setViewClaim]    = useState<QueueItem | null>(null);
  const [ticker,    setTicker]          = useState(0);
  const prevCountRef  = useRef(0);
  const notifTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildQueue(): QueueItem[] {
    const statusMap = readStatusMap();
    const live = readLiveClaims().map((c: LiveClaim): QueueItem => ({
      id: c.id, reference: c.reference, employee: c.employee, department: c.department,
      amountAed: c.amountAed, submitted: timeAgo(c.submittedAt),
      status: (statusMap[c.reference]?.status ?? c.status) as ClaimStatus,
      rejectReason: statusMap[c.reference]?.reason,
      submittedAt: c.submittedAt, isLive: true,
    }));
    const liveRefs = new Set(live.map((c) => c.reference));
    const seeds = SEED.filter((s) => !liveRefs.has(s.reference)).map((s): QueueItem => ({
      ...s,
      status: (statusMap[s.reference]?.status ?? SEED_DEFAULTS[s.reference] ?? "Submitted") as ClaimStatus,
      rejectReason: statusMap[s.reference]?.reason,
    }));
    return [...live, ...seeds].sort((a, b) => b.submittedAt - a.submittedAt);
  }

  function refresh() { setLiveQueue(buildQueue()); }

  function notify(msg: string, type = "info") {
    setNotification({ msg, type });
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification(null), 4000);
  }

  function handleApprove(claim: QueueItem) {
    updateClaimStatus(claim.reference, "Approved");
    refresh();
    if (viewClaim?.reference === claim.reference) setViewClaim({ ...claim, status: "Approved" });
    notify(`✓ ${claim.reference} approved`, "success");
  }

  function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    updateClaimStatus(rejectTarget.reference, "Rejected", reason);
    refresh();
    if (viewClaim?.reference === rejectTarget.reference) setViewClaim({ ...rejectTarget, status: "Rejected", rejectReason: reason });
    notify(`✕ ${rejectTarget.reference} rejected`, "reject");
    setRejectTarget(null);
  }

  function handlePaid(claim: QueueItem) {
    updateClaimStatus(claim.reference, "Paid");
    refresh();
    if (viewClaim?.reference === claim.reference) setViewClaim({ ...claim, status: "Paid" });
    notify(`💳 ${claim.reference} marked as paid`, "success");
  }

  useEffect(() => {
    const q = buildQueue();
    setLiveQueue(q);
    prevCountRef.current = q.filter((c) => c.isLive).length;

    const poll = setInterval(() => {
      const next = buildQueue();
      const liveCount = next.filter((c) => c.isLive).length;
      if (liveCount > prevCountRef.current) {
        const newest = next.find((c) => c.isLive);
        if (newest) notify(`🔔 New claim from ${newest.employee} — ${fmtAed(newest.amountAed)}`);
        prevCountRef.current = liveCount;
      }
      setLiveQueue(next);
      setTicker((t) => t + 1);
    }, 2000);

    return () => { clearInterval(poll); if (notifTimer.current) clearTimeout(notifTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "wps_submitted_claims") return;
      const next = buildQueue();
      const newest = next.find((c) => c.isLive && isNew(c.submittedAt));
      if (newest) notify(`🔔 New claim from ${newest.employee} — ${fmtAed(newest.amountAed)}`);
      setLiveQueue(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void ticker;

  const filtered  = filter === "All statuses" ? liveQueue : liveQueue.filter((c) => c.status === filter);
  const totalAed  = filtered.reduce((s, c) => s + c.amountAed, 0);
  const toReview  = liveQueue.filter((c) => c.status === "Submitted" || c.status === "Review").length;
  const approved  = liveQueue.filter((c) => c.status === "Approved").length;
  const paid      = liveQueue.filter((c) => c.status === "Paid").length;
  const liveCount = liveQueue.filter((c) => c.isLive).length;
  const notifBg   = notification?.type === "success" ? "#168a53" : notification?.type === "reject" ? "#c2413a" : "#CC0000";

  return (
    <AppShell title="Finance review" eyebrow="Claims control">
      {rejectTarget && <RejectModal claim={rejectTarget} onConfirm={handleRejectConfirm} onClose={() => setRejectTarget(null)} />}
      {viewClaim && (
        <ClaimDetailModal
          claim={viewClaim}
          onClose={() => setViewClaim(null)}
          onApprove={() => handleApprove(viewClaim)}
          onReject={() => { setRejectTarget(viewClaim); setViewClaim(null); }}
          onPaid={() => handlePaid(viewClaim)}
        />
      )}

      {/* Notification banner */}
      {notification && (
        <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-soft"
          style={{ background: notifBg, animation: "fadeIn 0.25s ease" }}>
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
          {notification.msg}
          <button type="button" onClick={() => setNotification(null)} className="ml-auto text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Metric label="To review" value={String(toReview)} />
        <Metric label="Approved"  value={String(approved)} />
        <Metric label="Paid"      value={String(paid)} />
        <Metric label="Total (AED)" value={fmtAed(liveQueue.reduce((s, c) => s + c.amountAed, 0))} highlight />
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-ink">Review queue</h2>
          <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live{liveCount > 0 ? ` · ${liveCount} new` : ""}
          </span>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="h-11 flex-1 rounded-lg border border-line bg-white px-3 text-sm text-slate-700 sm:flex-none sm:h-10">
            {["All statuses","Submitted","Approved","Rejected","Paid"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button type="button" onClick={() => downloadCsv(filtered)}
            className="h-11 flex-1 rounded-lg px-4 text-sm font-semibold text-white sm:flex-none sm:h-10"
            style={{ background: "#CC0000" }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white shadow-soft">
        {/* Desktop header */}
        <div className="hidden border-b border-line bg-slate-50 px-5 py-2.5 sm:grid"
          style={{ gridTemplateColumns: "1fr 1fr 130px 110px 220px", minWidth: 800 }}>
          {["Employee","Reference","Amount (AED)","Submitted","Status / Action"].map((h) => (
            <span key={h} className="text-xs font-bold uppercase tracking-wide text-slate-500">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-line" style={{ minWidth: 800 }}>
          {filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No claims match this filter.</p>
          ) : filtered.map((claim) => {
            const _new = isNew(claim.submittedAt);
            return (
              <div key={claim.id} className={`transition-colors ${_new ? "bg-red-50/50" : ""}`}
                style={_new ? { animation: "slideDown 0.35s ease" } : {}}>
                {/* Mobile */}
                <div className="p-4 sm:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{claim.employee}</p>
                        {_new && <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: "#CC0000" }}>NEW</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{claim.reference} · {claim.department}</p>
                    </div>
                    <StatusBadge status={claim.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-base font-bold text-ink tabular-nums">{fmtAed(claim.amountAed)}</span>
                    <span className="text-xs text-slate-500">{claim.submitted}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setViewClaim(claim)}
                      className="h-11 rounded-lg border border-line bg-white text-sm font-semibold text-ink">
                      View
                    </button>
                    {(claim.status === "Submitted" || claim.status === "Review") && (
                      <>
                        <button type="button" onClick={() => setRejectTarget(claim)}
                          className="h-11 rounded-lg border border-line bg-white text-sm font-semibold text-danger">Reject</button>
                        <button type="button" onClick={() => handleApprove(claim)}
                          className="h-11 rounded-lg text-sm font-semibold text-white" style={{ background: "#168a53" }}>Approve</button>
                      </>
                    )}
                    {claim.status === "Approved" && (
                      <button type="button" onClick={() => handlePaid(claim)}
                        className="col-span-2 h-11 rounded-lg text-sm font-semibold text-white" style={{ background: "#0369a1" }}>Mark Paid</button>
                    )}
                  </div>
                </div>
                {/* Desktop */}
                <div className="hidden items-center gap-3 px-5 py-4 sm:grid"
                  style={{ gridTemplateColumns: "1fr 1fr 130px 110px 220px" }}>
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{claim.employee}</span>
                      {_new && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: "#CC0000" }}>NEW</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{claim.department}</span>
                  </span>
                  <span className="text-sm text-slate-600">{claim.reference}</span>
                  <span className="text-sm font-semibold text-ink tabular-nums">{fmtAed(claim.amountAed)}</span>
                  <span className="text-xs text-slate-500">{claim.submitted}</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setViewClaim(claim)}
                      className="h-8 rounded border border-line bg-white px-2.5 text-xs font-semibold text-ink hover:bg-slate-50">
                      View
                    </button>
                    <StatusBadge status={claim.status} />
                    {(claim.status === "Submitted" || claim.status === "Review") && (
                      <>
                        <button type="button" onClick={() => setRejectTarget(claim)}
                          className="h-8 rounded border border-line bg-white px-2.5 text-xs font-semibold text-danger hover:bg-red-50">Reject</button>
                        <button type="button" onClick={() => handleApprove(claim)}
                          className="h-8 rounded px-2.5 text-xs font-semibold text-white" style={{ background: "#168a53" }}>Approve</button>
                      </>
                    )}
                    {claim.status === "Approved" && (
                      <button type="button" onClick={() => handlePaid(claim)}
                        className="h-8 rounded px-2.5 text-xs font-semibold text-white" style={{ background: "#0369a1" }}>Mark Paid</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {filtered.length} claim{filtered.length !== 1 ? "s" : ""} · {fmtAed(totalAed)} · live updates every 2 s
      </p>

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
      `}</style>
    </AppShell>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-soft ${highlight ? "border-brand-100 bg-brand-50" : "border-line bg-white"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1.5 text-lg font-bold tabular-nums sm:text-xl ${highlight ? "text-brand-700" : "text-ink"}`}>{value}</p>
    </div>
  );
}
