"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ThreadPanel } from "@/components/ThreadPanel";
import { getCurrentUser, type AppUser } from "@/lib/mockUser";
import {
  readLiveClaims, readStatusMap, updateClaimStatus,
  type LiveClaim, type ClaimStatus,
} from "@/lib/claimStore";
import { readLocalNotifs } from "@/lib/claimStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type QueueItem = {
  id: string; reference: string; employee: string; department: string;
  amountAed: number; submitted: string; status: ClaimStatus;
  submittedAt: number; isLive?: boolean; rejectReason?: string;
  assignedToMe?: boolean;
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: Omit<QueueItem, "status">[] = [
  { id: "clm_001", reference: "WPS-2026-1048", employee: "Aisha Khan",    department: "Sales",       amountAed: 1842.50, submitted: "04 Jun 2026", submittedAt: Date.now() - 86400000 },
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
    ["Reference","Employee","Department","Amount (AED)","Submitted","Status"],
    ...queue.map((c) => [c.reference, c.employee, c.department, c.amountAed.toFixed(2), c.submitted, c.status]),
  ];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `wps-claims-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(url);
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({ claim, onConfirm, onClose }: {
  claim: QueueItem; onConfirm: (r: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" style={{ animation: "fadeIn .2s ease" }}>
        <h3 className="text-lg font-bold text-gray-900">Reject claim</h3>
        <p className="mt-1 text-sm text-gray-500">{claim.reference} · {claim.employee}</p>
        <textarea rows={3} autoFocus placeholder="Reason for rejection (optional)…"
          value={reason} onChange={(e) => setReason(e.target.value)}
          className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => onConfirm(reason.trim())}
            className="h-11 flex-1 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Confirm Reject</button>
        </div>
      </div>
    </div>
  );
}

// ─── Claim detail panel (slide-in from right) ─────────────────────────────────

function ClaimDetailPanel({ claim, onClose, onApprove, onReject, onPaid }: {
  claim: QueueItem; onClose: () => void;
  onApprove: () => void; onReject: () => void; onPaid: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex" onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="ml-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl overflow-y-auto"
        style={{ animation: "slideLeft .2s ease" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#CC0000" }}>Claim detail</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">{claim.reference}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 text-xl">✕</button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Employee + Status */}
          <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <p className="font-bold text-gray-900">{claim.employee}</p>
              <p className="text-sm text-gray-500">{claim.department} · Submitted {claim.submitted}</p>
            </div>
            <StatusBadge status={claim.status} />
          </div>

          {/* Amount */}
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total Claimed</p>
            <p className="mt-1 text-3xl font-extrabold text-gray-900 tabular-nums">{fmtAed(claim.amountAed)}</p>
          </div>

          {/* Reject reason */}
          {claim.rejectReason && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Rejection reason</p>
              <p className="mt-1 text-sm text-gray-700">{claim.rejectReason}</p>
            </div>
          )}

          {/* Actions */}
          {(claim.status === "Submitted" || claim.status === "Review") && (
            <div className="flex gap-3">
              <button onClick={onReject}
                className="h-12 flex-1 rounded-xl border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50">
                Reject
              </button>
              <button onClick={onApprove}
                className="h-12 flex-1 rounded-xl text-sm font-bold text-white"
                style={{ background: "#16a34a" }}>
                Approve
              </button>
            </div>
          )}
          {claim.status === "Approved" && (
            <button onClick={onPaid}
              className="h-12 w-full rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700">
              Mark as Paid
            </button>
          )}

          {/* Thread */}
          <div>
            <p className="mb-3 text-sm font-bold text-gray-900">Discussion</p>
            <ThreadPanel claimId={claim.id} claimReference={claim.reference} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [user, setUser] = useState<AppUser>(getCurrentUser());
  useEffect(() => { setUser(getCurrentUser()); }, []);
  const [queue,        setQueue]        = useState<QueueItem[]>([]);
  const [filter,       setFilter]       = useState("All");
  const [notification, setNotification] = useState<{ msg: string; color: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<QueueItem | null>(null);
  const [viewClaim,    setViewClaim]    = useState<QueueItem | null>(null);
  const [ticker,       setTicker]       = useState(0);
  const prevCountRef = useRef(0);
  const notifTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildQueue(): QueueItem[] {
    const sm   = readStatusMap();
    const me   = getCurrentUser();
    const live = readLiveClaims().map((c: LiveClaim): QueueItem => ({
      id: c.id, reference: c.reference, employee: c.employee, department: c.department,
      amountAed: c.amountAed, submitted: timeAgo(c.submittedAt),
      status: (sm[c.reference]?.status ?? c.status) as ClaimStatus,
      rejectReason: sm[c.reference]?.reason, submittedAt: c.submittedAt, isLive: true,
      // Mark if this claim was assigned to the current Finance user
      assignedToMe: c.assignedFinanceEmail === me.email,
    }));
    const liveRefs = new Set(live.map((c) => c.reference));
    const seeds = SEED.filter((s) => !liveRefs.has(s.reference)).map((s): QueueItem => ({
      ...s, status: (sm[s.reference]?.status ?? SEED_DEFAULTS[s.reference] ?? "Submitted") as ClaimStatus,
      rejectReason: sm[s.reference]?.reason,
    }));
    return [...live, ...seeds].sort((a, b) => b.submittedAt - a.submittedAt);
  }

  function notify(msg: string, color = "#CC0000") {
    setNotification({ msg, color });
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification(null), 4000);
  }

  function handleApprove(c: QueueItem) {
    updateClaimStatus(c.reference, "Approved");
    const updated = { ...c, status: "Approved" as ClaimStatus };
    setQueue((q) => q.map((x) => x.id === c.id ? updated : x));
    if (viewClaim?.id === c.id) setViewClaim(updated);
    notify(`✓ ${c.reference} approved`, "#16a34a");
  }
  function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    updateClaimStatus(rejectTarget.reference, "Rejected", reason);
    const updated = { ...rejectTarget, status: "Rejected" as ClaimStatus, rejectReason: reason };
    setQueue((q) => q.map((x) => x.id === rejectTarget.id ? updated : x));
    if (viewClaim?.id === rejectTarget.id) setViewClaim(updated);
    notify(`✕ ${rejectTarget.reference} rejected`, "#dc2626");
    setRejectTarget(null);
  }
  function handlePaid(c: QueueItem) {
    updateClaimStatus(c.reference, "Paid");
    const updated = { ...c, status: "Paid" as ClaimStatus };
    setQueue((q) => q.map((x) => x.id === c.id ? updated : x));
    if (viewClaim?.id === c.id) setViewClaim(updated);
    notify(`💳 ${c.reference} marked as paid`, "#2563eb");
  }

  useEffect(() => {
    const q = buildQueue(); setQueue(q);
    prevCountRef.current = q.filter((c) => c.isLive).length;
    const poll = setInterval(() => {
      const next = buildQueue();
      const lc = next.filter((c) => c.isLive).length;
      if (lc > prevCountRef.current) {
        const n = next.find((c) => c.isLive);
        if (n) notify(`🔔 New — ${n.employee} · ${fmtAed(n.amountAed)}`);
        prevCountRef.current = lc;
      }
      setQueue(next); setTicker((t) => t + 1);
    }, 2000);
    return () => { clearInterval(poll); if (notifTimer.current) clearTimeout(notifTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "wps_submitted_claims") return;
      const next = buildQueue();
      const n = next.find((c) => c.isLive && isNew(c.submittedAt));
      if (n) notify(`🔔 New — ${n.employee} · ${fmtAed(n.amountAed)}`);
      setQueue(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void ticker;

  const filtered  = filter === "All" ? queue : queue.filter((c) => c.status === filter);
  const toReview  = queue.filter((c) => c.status === "Submitted" || c.status === "Review").length;
  const approved  = queue.filter((c) => c.status === "Approved").length;
  const paid      = queue.filter((c) => c.status === "Paid").length;
  const totalAed  = queue.reduce((s, c) => s + c.amountAed, 0);
  const liveCount = queue.filter((c) => c.isLive).length;

  return (
    <AppShell title="Finance review" eyebrow="Claims control">
      {/* Modals */}
      {rejectTarget && <RejectModal claim={rejectTarget} onConfirm={handleRejectConfirm} onClose={() => setRejectTarget(null)} />}
      {viewClaim && (
        <ClaimDetailPanel claim={viewClaim} onClose={() => setViewClaim(null)}
          onApprove={() => handleApprove(viewClaim)}
          onReject={() => { setRejectTarget(viewClaim); setViewClaim(null); }}
          onPaid={() => handlePaid(viewClaim)} />
      )}

      {/* Notification */}
      {notification && (
        <div className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: notification.color, animation: "fadeIn .25s ease" }}>
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          {notification.msg}
          <button onClick={() => setNotification(null)} className="ml-auto text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Reviewer info banner */}
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
          {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-bold text-purple-900">{user.name}</p>
          <p className="text-xs text-purple-600">{user.role === "FINANCE_SUPER" ? "Finance Super User — full visibility" : "Finance Reviewer"}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="To review"  value={String(toReview)}        color="amber" />
        <StatCard label="Approved"   value={String(approved)}        color="green" />
        <StatCard label="Paid"       value={String(paid)}            color="blue" />
        <StatCard label="Total (AED)" value={fmtAed(totalAed)}       color="red" />
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900">Review queue</h2>
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
            className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 sm:flex-none">
            {["All","Submitted","Approved","Rejected","Paid"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => downloadCsv(filtered)}
            className="h-10 flex-1 rounded-lg px-4 text-sm font-bold text-white sm:flex-none"
            style={{ background: "#CC0000" }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Header */}
        <div className="hidden border-b border-gray-100 bg-gray-50 px-5 py-3 sm:grid"
          style={{ gridTemplateColumns: "200px 1fr 140px 120px 240px", minWidth: 820 }}>
          {["Employee","Reference","Amount (AED)","Submitted","Status / Action"].map((h) => (
            <span key={h} className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-gray-50" style={{ minWidth: 820 }}>
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">No claims match this filter.</p>
          ) : filtered.map((c) => {
            const _new = isNew(c.submittedAt);
            return (
              <div key={c.id} className={`transition-colors ${_new ? "bg-red-50/40" : "hover:bg-gray-50/60"}`}
                style={_new ? { animation: "slideDown .35s ease" } : {}}>

                {/* Mobile */}
                <div className="p-4 sm:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{c.employee}</p>
                        {_new && <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase text-white" style={{ background: "#CC0000" }}>NEW</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">{c.reference} · {c.department}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-2 text-lg font-bold text-gray-900 tabular-nums">{fmtAed(c.amountAed)}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setViewClaim(c)}
                      className="h-11 flex-1 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700">View</button>
                    {(c.status === "Submitted" || c.status === "Review") && (
                      <>
                        <button onClick={() => setRejectTarget(c)} className="h-11 flex-1 rounded-lg border border-red-200 text-sm font-semibold text-red-600">Reject</button>
                        <button onClick={() => handleApprove(c)} className="h-11 flex-1 rounded-lg text-sm font-bold text-white" style={{ background: "#16a34a" }}>Approve</button>
                      </>
                    )}
                    {c.status === "Approved" && (
                      <button onClick={() => handlePaid(c)} className="h-11 flex-1 rounded-lg text-sm font-bold text-white bg-blue-600">Mark Paid</button>
                    )}
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden items-center gap-4 px-5 py-4 sm:grid"
                  style={{ gridTemplateColumns: "200px 1fr 140px 120px 240px" }}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{c.employee}</span>
                      {_new && <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase text-white" style={{ background: "#CC0000" }}>NEW</span>}
                      {c.assignedToMe && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-700">Assigned to you</span>}
                    </div>
                    <span className="text-xs text-gray-400">{c.department}</span>
                  </div>
                  <span className="text-sm text-gray-500">{c.reference}</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmtAed(c.amountAed)}</span>
                  <span className="text-sm text-gray-400">{c.submitted}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewClaim(c)}
                      className="h-8 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                      View
                    </button>
                    <StatusBadge status={c.status} />
                    {(c.status === "Submitted" || c.status === "Review") && (
                      <>
                        <button onClick={() => setRejectTarget(c)}
                          className="h-8 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50">
                          Reject
                        </button>
                        <button onClick={() => handleApprove(c)}
                          className="h-8 rounded-lg px-3 text-xs font-bold text-white"
                          style={{ background: "#16a34a" }}>
                          Approve
                        </button>
                      </>
                    )}
                    {c.status === "Approved" && (
                      <button onClick={() => handlePaid(c)}
                        className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700">
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {filtered.length} claim{filtered.length !== 1 ? "s" : ""} · {fmtAed(totalAed)} · live every 2 s
      </p>

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
      `}</style>
    </AppShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: "amber"|"green"|"blue"|"red" }) {
  const styles = {
    amber: { bg: "bg-amber-50",  border: "border-amber-100", text: "text-amber-700" },
    green: { bg: "bg-green-50",  border: "border-green-100", text: "text-green-700" },
    blue:  { bg: "bg-blue-50",   border: "border-blue-100",  text: "text-blue-700"  },
    red:   { bg: "bg-red-50",    border: "border-red-100",   text: "text-red-700"   },
  }[color];
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${styles.bg} ${styles.border}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold tabular-nums ${styles.text}`}>{value}</p>
    </div>
  );
}
