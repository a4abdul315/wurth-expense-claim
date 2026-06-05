"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClaimLineItemsForm, type ExpenseCategory } from "@/components/ClaimLineItemsForm";
import { ReceiptUpload } from "@/components/ReceiptUpload";
import { MOCK_USER, FINANCE_TEAM } from "@/lib/mockUser";
import { saveLiveClaim } from "@/lib/claimStore";

function generateRef() {
  return `WPS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;
}

function today() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessCard({ reference, totalAed }: { reference: string; totalAed: number }) {
  return (
    <div className="mx-auto max-w-sm py-12 text-center">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full"
        style={{ background: "#CC0000" }}>
        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-ink">Claim submitted!</h2>
      <p className="mt-2 text-sm text-slate-500">
        Forwarded to the Finance department.
      </p>

      <div className="mt-6 rounded-xl border border-line bg-white p-6 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
          Reference number
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{reference}</p>
        <p className="mt-3 text-sm text-slate-500">
          Total:{" "}
          <span className="font-bold text-ink">
            AED {totalAed.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Confirmation sent to {MOCK_USER.email}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <a href="/dashboard"
          className="focus-ring flex h-12 items-center justify-center rounded-lg border border-line bg-white text-sm font-semibold text-ink active:bg-slate-50">
          Back to dashboard
        </a>
        <a href="/claims/new"
          className="focus-ring flex h-12 items-center justify-center rounded-lg text-sm font-semibold text-white active:opacity-80"
          style={{ background: "#CC0000" }}
          onClick={() => window.location.reload()}>
          Submit another claim
        </a>
      </div>
    </div>
  );
}

// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 break-all text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewClaimPage() {
  const [totals, setTotals] = useState({ totalAed: 0, totalEur: 0 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [notes,            setNotes]            = useState("");
  const [assignedFinanceId, setAssignedFinanceId] = useState<string>(FINANCE_TEAM[0].id);
  const [loading,          setLoading]          = useState(false);
  const [submitted,        setSubmitted]        = useState(false);
  const [reference,        setReference]        = useState("");

  function handleTotalsChange(data: { totalAed: number; totalEur: number; categories: ExpenseCategory[] }) {
    setTotals({ totalAed: data.totalAed, totalEur: data.totalEur });
    setCategories(data.categories);
  }

  function handleSubmit() {
    if (totals.totalAed === 0) return;
    setLoading(true);
    // PRODUCTION: POST /api/claims → POST /api/claims/:id/submit → generate PDF → email Finance
    setTimeout(() => {
      const ref = generateRef();

      // Save to localStorage so Finance dashboard shows it in real-time
      saveLiveClaim({
        id: ref,
        reference: ref,
        employee: MOCK_USER.name,
        department: MOCK_USER.department,
        email: MOCK_USER.email,
        amountAed: totals.totalAed,
        submittedAt: Date.now(),
        status: "Submitted",
      });

      setReference(ref);
      setSubmitted(true);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  }

  if (submitted) {
    return (
      <AppShell title="Claim submitted" eyebrow="Expense submission">
        <SuccessCard reference={reference} totalAed={totals.totalAed} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Expense Claim Form" eyebrow="Würth Professional Solutions">
      <div className="space-y-4">

        {/* ── Form header — mirrors the Excel form ── */}
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
          <div className="px-4 py-3" style={{ background: "#CC0000" }}>
            <span className="text-sm font-extrabold uppercase tracking-wide text-white">
              WÜRTH PROFESSIONAL SOLUTIONS
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Date</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{today()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Employee</p>
              <p className="mt-0.5 text-sm font-medium text-ink">
                {MOCK_USER.lastName}, {MOCK_USER.firstName}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Account No.</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{MOCK_USER.accountNo}</p>
            </div>
          </div>
        </div>

        {/* ── Employee details — read-only ── */}
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <h2 className="text-sm font-bold text-ink">Employee details</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Pre-filled from your corporate account.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ReadField label="Full name"  value={MOCK_USER.name} />
            <ReadField label="Department" value={MOCK_USER.department} />
            <ReadField label="Email"      value={MOCK_USER.email} />
          </div>
        </div>

        {/* ── Expense line items ── */}
        <div className="rounded-xl border border-line bg-white shadow-soft">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-ink">Expense line items</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Select currency per line — AED converted automatically.
            </p>
          </div>
          <div className="p-4">
            <ClaimLineItemsForm onTotalsChange={handleTotalsChange} />
          </div>
        </div>

        <p className="text-center text-xs italic text-slate-400">
          Invoice is not subject to VAT
        </p>

        {/* ── Assign to Finance person ── */}
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <h2 className="text-sm font-bold text-ink">Assign to Finance reviewer</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Select one Finance team member to review this claim. They will be notified immediately.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FINANCE_TEAM.map((member) => (
              <label
                key={member.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  assignedFinanceId === member.id
                    ? "border-brand-600 bg-brand-50"
                    : "border-line hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="assignedFinance"
                  value={member.id}
                  checked={assignedFinanceId === member.id}
                  onChange={() => setAssignedFinanceId(member.id)}
                  className="accent-brand-600"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{member.name}</p>
                  <p className="text-xs text-slate-400 truncate">{member.email}</p>
                  {member.role === "FINANCE_SUPER" && (
                    <span className="mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
                      Super user
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            You can only assign one person. They may invite other Finance members to the discussion thread.
          </p>
        </div>

        {/* ── Receipt upload ── */}
        <div className="rounded-xl border border-line bg-white shadow-soft">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-ink">Receipts</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Camera on mobile · Drag &amp; drop on desktop · JPG, PNG, HEIC, PDF
            </p>
          </div>
          <div className="p-4">
            <ReceiptUpload />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Please attach all receipts you are claiming.
            </p>
          </div>
        </div>

        {/* ── Bank details — read-only ── */}
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <h2 className="text-sm font-bold text-ink">Bank details</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Pre-filled from your employee profile — never manually typed.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <ReadField label="Holder"     value={MOCK_USER.holder} />
            <ReadField label="Bank"       value={MOCK_USER.bank}   />
            <ReadField label="IBAN"       value={MOCK_USER.iban}   />
            <ReadField label="SWIFT / BIC" value={MOCK_USER.swift} />
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <label className="block">
            <span className="text-sm font-bold text-ink">Notes (optional)</span>
            <textarea
              rows={3}
              placeholder="Additional context for the Finance team…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="focus-ring mt-2 w-full rounded-lg border border-line px-3 py-3 text-sm"
            />
          </label>
        </div>

        {/* ── Total + submit ── */}
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total to claim</p>
              <p className="mt-0.5 text-2xl font-bold text-ink tabular-nums">
                AED {totals.totalAed.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Buttons — full-width on mobile, side-by-side on sm */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button"
              className="focus-ring h-14 flex-1 rounded-lg border border-line bg-white text-sm font-semibold text-ink transition active:bg-slate-50 sm:h-12">
              Save draft
            </button>
            <button type="button" onClick={handleSubmit}
              disabled={loading || totals.totalAed === 0}
              className="focus-ring h-14 flex-1 rounded-lg text-sm font-semibold text-white transition active:opacity-80 disabled:opacity-50 sm:h-12"
              style={{ background: "#CC0000" }}>
              {loading ? "Submitting…" : "Submit claim →"}
            </button>
          </div>

          {totals.totalAed === 0 && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Add at least one expense with an amount to submit.
            </p>
          )}
        </div>

        <p className="pb-2 text-center text-xs text-slate-400">
          Expenses reimbursed only with full documentation and original receipts for pre-authorised company expenses. · Thank you for your cooperation.
        </p>

      </div>
    </AppShell>
  );
}
