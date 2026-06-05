"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, isFinanceEmail, FINANCE_TEAM, ASSIGNABLE_FINANCE } from "@/lib/mockUser";

const ALLOWED_DOMAINS = ["wurth.ae", "wuerth-professional.com"];

export default function LoginPage() {
  const router  = useRouter();
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function handleContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter your corporate email."); return; }

    const domain = trimmed.split("@")[1] ?? "";
    if (!ALLOWED_DOMAINS.includes(domain)) {
      setError(`Access restricted to @wurth.ae accounts.`);
      return;
    }

    setError("");
    setLoading(true);
    signIn(trimmed);

    // Route based on role — uses the same FINANCE_TEAM source of truth
    const destination = isFinanceEmail(trimmed) ? "/finance" : "/dashboard";
    setTimeout(() => router.push(destination), 600);
  }

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left brand panel — desktop ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col border-r border-gray-100 bg-white px-14 py-12">

        {/* Logo — top aligned */}
        <div className="flex flex-col gap-1.5 mb-12">
          <img src="/wurth-logo.svg" alt="WÜRTH" style={{ maxWidth: 200 }} />
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "#CC0000" }}>
            Professional Solutions
          </p>
        </div>

        {/* Headline + features — directly below logo */}
        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "#CC0000" }}>
            Corporate expense management
          </p>
          <h1 className="text-[2.2rem] font-extrabold leading-tight text-gray-900">
            Submit expense claims with currency conversion to AED — from any device.
          </h1>
          <ul className="mt-8 space-y-3">
            {[
              "USD, EUR, TRY, CNY → AED converted automatically",
              "Receipt capture from mobile camera or drag & drop",
              "Finance team review, approve, and pay — in one place",
              "Full audit trail — rate, amount, who, when",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-gray-500">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#CC0000" }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Finance team quick-login — pushed to bottom */}
        <div className="mt-auto pt-10">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Finance team — click to fill
            </p>
            <div className="space-y-0.5">
              {ASSIGNABLE_FINANCE.map((f) => (
                <button key={f.email} type="button"
                  onClick={() => setEmail(f.email)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition text-left">
                  <span className="font-semibold">{f.name}</span>
                  <span className="text-gray-400">{f.email}</span>
                </button>
              ))}
              <button type="button"
                onClick={() => setEmail("zk@wuerth-professional.com")}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-purple-50 transition text-left">
                <span className="font-semibold text-purple-700">Zeeshan Khan ★ Super</span>
                <span className="text-purple-400">zk@wuerth-professional.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right sign-in panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 flex flex-col gap-1.5 lg:hidden">
            <img src="/wurth-logo.svg" alt="WÜRTH" style={{ maxWidth: 150 }} />
            <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: "#CC0000" }}>
              Professional Solutions
            </p>
          </div>

          {/* Login card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "#CC0000" }}>
              Secure sign in
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900">Corporate email</h2>
            <p className="mt-1 text-sm text-gray-500">
              Use your @wurth.ae account to continue.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email" type="email" inputMode="email"
                  autoComplete="email" autoCapitalize="none" autoCorrect="off"
                  placeholder="name@wurth.ae"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                  className="w-full h-12 rounded-xl border border-gray-200 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button type="button" onClick={handleContinue} disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
                style={{ background: loading ? "#A30000" : "#CC0000" }}>
                {loading ? "Signing in…" : "Continue →"}
              </button>
            </div>

            {/* Quick demo buttons */}
            <div className="mt-5 border-t border-gray-100 pt-4 grid grid-cols-2 gap-2">
              <button type="button"
                onClick={() => { signIn("a.rehman@wurth.ae"); router.push("/dashboard"); }}
                className="rounded-lg border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                👤 Employee demo
              </button>
              <button type="button"
                onClick={() => { signIn("zk@wuerth-professional.com"); router.push("/finance"); }}
                className="rounded-lg border py-2.5 text-xs font-semibold"
                style={{ borderColor: "#CC0000", color: "#CC0000", background: "#fff0f0" }}>
                💼 Finance demo
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            © Würth Professional Solutions LLC · Dubai, UAE
          </p>
        </div>
      </div>
    </div>
  );
}
