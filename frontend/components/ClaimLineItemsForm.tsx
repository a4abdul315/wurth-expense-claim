"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Currency = "AED" | "USD" | "EUR" | "TRY" | "CNY";

export type LineItem = {
  id: string;
  eventName: string;
  date: string;
  description: string;
  country: string;
  currency: Currency;
  amount: string;
  aedAmount: number;
  receiptNo: string;
};

export type ExpenseCategory = {
  id: string;
  label: string;
  items: LineItem[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES: Currency[] = ["AED", "USD", "EUR", "TRY", "CNY"];

const FALLBACK_RATES: Record<Currency, number> = {
  AED: 1, USD: 3.67, EUR: 4.10, TRY: 0.109, CNY: 0.51,
};

const CATEGORY_DEFS = [
  { id: "A", label: "A: Travel Expenses" },
  { id: "B", label: "B: Office Supplies" },
  { id: "C", label: "C: Meals & Entertainment – Clients" },
  { id: "D", label: "D: Telecommunication" },
  { id: "E", label: "E: Marketing" },
  { id: "F", label: "F: Logistics" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(p: string) {
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
function blank(catId: string): LineItem {
  return {
    id: uid(catId), eventName: "", date: "", description: "",
    country: "", currency: "AED", amount: "", aedAmount: 0, receiptNo: "",
  };
}
function initCategories(): ExpenseCategory[] {
  return CATEGORY_DEFS.map((c) => ({ ...c, items: [blank(c.id)] }));
}
function calcAed(amount: string, cur: Currency, rates: Record<Currency, number>) {
  const n = parseFloat(amount);
  return isFinite(n) && n > 0 ? Math.round(n * (rates[cur] ?? 1) * 100) / 100 : 0;
}
function fmtAed(n: number) {
  return n > 0
    ? `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "–";
}
function fmtEur(n: number, eurRate: number) {
  const v = n > 0 ? Math.round((n / eurRate) * 100) / 100 : 0;
  return v > 0
    ? `EUR ${v.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "–";
}

// ─── Live rates hook ──────────────────────────────────────────────────────────

// Reads from the Express backend. Falls back to static rates if backend is offline.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

function useRates() {
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/currency/rates`)
      .then((r) => r.json())
      .then((body: { data?: { rates: { fromCurrency: string; rate: string }[] } }) => {
        const list = body?.data?.rates;
        if (!Array.isArray(list)) return;
        const map: Record<string, number> = { AED: 1 };
        for (const e of list) {
          const n = parseFloat(e.rate);
          if (e.fromCurrency && isFinite(n) && n > 0) map[e.fromCurrency] = n;
        }
        setRates(map as Record<Currency, number>);
        setIsLive(true);
      })
      .catch(() => {/* keep fallback */});
  }, []);

  return { rates, isLive };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onTotalsChange?: (v: { totalAed: number; totalEur: number; categories: ExpenseCategory[] }) => void;
}

export function ClaimLineItemsForm({ onTotalsChange }: Props) {
  const { rates, isLive } = useRates();
  const [categories, setCategories] = useState<ExpenseCategory[]>(initCategories);
  const cbRef = useRef(onTotalsChange);
  cbRef.current = onTotalsChange;

  function updateLine(catId: string, lineId: string, patch: Partial<LineItem>) {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id !== catId ? cat : {
          ...cat,
          items: cat.items.map((line) => {
            if (line.id !== lineId) return line;
            const next = { ...line, ...patch };
            if ("amount" in patch || "currency" in patch) {
              next.aedAmount = calcAed(next.amount, next.currency, rates);
            }
            return next;
          }),
        }
      )
    );
  }

  function addLine(catId: string) {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id !== catId ? cat : { ...cat, items: [...cat.items, blank(catId)] }
      )
    );
  }

  function removeLine(catId: string, lineId: string) {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const f = cat.items.filter((l) => l.id !== lineId);
        return { ...cat, items: f.length > 0 ? f : [blank(catId)] };
      })
    );
  }

  const totals = useMemo(() => {
    const repriced = categories.map((cat) => ({
      ...cat,
      items: cat.items.map((l) => ({ ...l, aedAmount: calcAed(l.amount, l.currency, rates) })),
    }));
    const totalAed =
      Math.round(repriced.flatMap((c) => c.items).reduce((s, l) => s + l.aedAmount, 0) * 100) / 100;
    const totalEur = Math.round((totalAed / (rates.EUR ?? 4.1)) * 100) / 100;
    return { totalAed, totalEur, repriced };
  }, [categories, rates]);

  useEffect(() => {
    cbRef.current?.({ totalAed: totals.totalAed, totalEur: totals.totalEur, categories: totals.repriced });
  }, [totals]);

  const eurRate = rates.EUR ?? 4.1;

  return (
    <div className="space-y-1">
      {/* Rate badge */}
      <div className="flex items-center gap-2 pb-1 text-xs text-slate-500">
        <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-green-500" : "bg-amber-400"}`} />
        {isLive
          ? `Live rates — USD ${rates.USD} · EUR ${rates.EUR} · TRY ${rates.TRY} · CNY ${rates.CNY}`
          : `Fallback rates — USD ${rates.USD} · EUR ${rates.EUR} · TRY ${rates.TRY} · CNY ${rates.CNY}`}
      </div>

      {/* Desktop column headers */}
      <div className="hidden rounded-t border border-b-0 border-line bg-slate-50 px-3 py-2 lg:block">
        <div
          className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
          style={{ gridTemplateColumns: "150px 96px 1fr 72px 72px 92px 82px 72px 20px" }}
        >
          {["Event / Purpose","Date","Description","Country","Currency","Amount","AED","Rcpt No.",""].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories.map((cat) => {
        const subAed = Math.round(cat.items.reduce((s, l) => s + calcAed(l.amount, l.currency, rates), 0) * 100) / 100;
        return (
          <div key={cat.id} className="overflow-hidden rounded border border-line bg-white">
            {/* Category header */}
            <div className="flex items-center justify-between border-b border-line bg-paper px-3 py-2.5">
              <span className="text-sm font-semibold text-ink">{cat.label}</span>
              {/* 44px touch target */}
              <button
                type="button"
                onClick={() => addLine(cat.id)}
                className="flex h-8 items-center rounded px-3 text-xs font-semibold text-brand-700 active:bg-brand-50 sm:h-7"
              >
                + Add row
              </button>
            </div>

            {/* Line items */}
            <div className="divide-y divide-line">
              {cat.items.map((line, idx) => (
                <MobileLine
                  key={line.id}
                  line={line}
                  index={idx}
                  rates={rates}
                  canRemove={cat.items.length > 1}
                  onChange={(p) => updateLine(cat.id, line.id, p)}
                  onRemove={() => removeLine(cat.id, line.id)}
                />
              ))}
            </div>

            {/* Sub-total */}
            <div className="border-t border-line bg-slate-50 px-4 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs">
                <span className="text-slate-500 uppercase tracking-wide">
                  AED Sub Total {cat.id}
                </span>
                <span className="font-bold text-ink tabular-nums">{fmtAed(subAed)}</span>
                <span className="text-slate-500 uppercase tracking-wide">
                  EUR Sub Total {cat.id}
                </span>
                <span className="font-bold text-ink tabular-nums">{fmtEur(subAed, eurRate)}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Grand totals */}
      <div className="rounded border px-4 py-4" style={{ background: "#fff0f0", borderColor: "#CC0000" }}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">Grand Total</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-10">
          <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-0.5">
            <span className="text-xs uppercase tracking-wide text-slate-500">AED Total</span>
            <span className="text-xl font-bold text-ink tabular-nums sm:text-2xl">{fmtAed(totals.totalAed)}</span>
          </div>
          <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-0.5">
            <span className="text-xs uppercase tracking-wide text-slate-500">EUR Total</span>
            <span className="text-lg font-bold text-ink tabular-nums">{fmtEur(totals.totalAed, eurRate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Line row — mobile card + desktop row ─────────────────────────────────────

interface LineProps {
  line: LineItem;
  index: number;
  rates: Record<Currency, number>;
  canRemove: boolean;
  onChange: (p: Partial<LineItem>) => void;
  onRemove: () => void;
}

function MobileLine({ line, index, rates, canRemove, onChange, onRemove }: LineProps) {
  const aed = calcAed(line.amount, line.currency, rates);

  // Shared input style — h-12 (48px) for comfortable mobile touch targets
  const inp = [
    "h-12 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink",
    "placeholder:text-slate-400 focus:border-brand-600 focus:outline-none",
    "sm:h-10",
  ].join(" ");

  // Desktop inline cell (no border, transparent bg)
  const cell = [
    "h-8 w-full rounded border border-transparent bg-transparent px-1.5 text-xs text-ink",
    "placeholder:text-slate-300 hover:border-line focus:border-brand-600 focus:bg-white focus:outline-none",
  ].join(" ");

  return (
    <>
      {/* ── Mobile card ── */}
      <div className="space-y-3 p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Row {index + 1}</span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded px-3 py-1.5 text-xs font-semibold text-danger active:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Event / Purpose — full width */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600">Event / Purpose</label>
            <input className={`${inp} mt-1`} placeholder="e.g. Client meeting Dubai"
              value={line.eventName} onChange={(e) => onChange({ eventName: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Date</label>
            <input type="date" className={`${inp} mt-1`}
              value={line.date} onChange={(e) => onChange({ date: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Country</label>
            <input className={`${inp} mt-1`} placeholder="UAE"
              value={line.country} onChange={(e) => onChange({ country: e.target.value })} />
          </div>

          {/* Description — full width */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600">Description</label>
            <input className={`${inp} mt-1`} placeholder="What was this expense for?"
              value={line.description} onChange={(e) => onChange({ description: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Currency</label>
            <select className={`${inp} mt-1 cursor-pointer`}
              value={line.currency}
              onChange={(e) => onChange({ currency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Amount</label>
            <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
              className={`${inp} mt-1`}
              value={line.amount} onChange={(e) => onChange({ amount: e.target.value })} />
          </div>

          {/* AED auto-computed — full width, highlighted */}
          <div className="col-span-2 flex items-center justify-between rounded-lg border border-line bg-slate-50 px-4 py-3">
            <span className="text-xs font-medium text-slate-500">AED Amount (auto)</span>
            <span className="text-base font-bold text-ink tabular-nums">
              {aed > 0 ? `AED ${aed.toFixed(2)}` : "–"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Receipt No.</label>
            <input className={`${inp} mt-1`} placeholder="Rcpt #"
              value={line.receiptNo} onChange={(e) => onChange({ receiptNo: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ── Desktop inline row ── */}
      <div
        className="hidden items-center gap-1 px-2 py-1.5 lg:grid"
        style={{ gridTemplateColumns: "150px 96px 1fr 72px 72px 92px 82px 72px 20px" }}
      >
        <input className={cell} placeholder="Event / purpose"
          value={line.eventName} onChange={(e) => onChange({ eventName: e.target.value })} />
        <input type="date" className={cell}
          value={line.date} onChange={(e) => onChange({ date: e.target.value })} />
        <input className={cell} placeholder="Description"
          value={line.description} onChange={(e) => onChange({ description: e.target.value })} />
        <input className={cell} placeholder="Country"
          value={line.country} onChange={(e) => onChange({ country: e.target.value })} />
        <select className={`${cell} cursor-pointer`}
          value={line.currency} onChange={(e) => onChange({ currency: e.target.value as Currency })}>
          {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
          className={cell}
          value={line.amount} onChange={(e) => onChange({ amount: e.target.value })} />
        <span className="flex h-8 items-center px-1.5 text-xs font-semibold tabular-nums text-ink">
          {aed > 0 ? aed.toFixed(2) : "–"}
        </span>
        <input className={cell} placeholder="Rcpt #"
          value={line.receiptNo} onChange={(e) => onChange({ receiptNo: e.target.value })} />
        <button type="button" onClick={onRemove} disabled={!canRemove}
          className="flex h-8 w-5 items-center justify-center text-sm text-slate-300 hover:text-danger disabled:pointer-events-none disabled:opacity-0">
          ×
        </button>
      </div>
    </>
  );
}
