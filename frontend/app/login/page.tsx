"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/mockUser";

const ALLOWED_DOMAIN = "wurth.ae";
const FINANCE_DOMAIN = "wuerth-professional.com"; // Zeeshan's domain

export default function LoginPage() {
  const router  = useRouter();
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function handleContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter your corporate email."); return; }

    const domain = trimmed.split("@")[1] ?? "";
    if (domain !== ALLOWED_DOMAIN && domain !== FINANCE_DOMAIN) {
      setError(`Access restricted to @${ALLOWED_DOMAIN} accounts.`);
      return;
    }

    setError("");
    setLoading(true);
    signIn(trimmed);

    // Finance users go to Finance dashboard; employees go to Dashboard
    const isFinance = trimmed.endsWith("@" + FINANCE_DOMAIN) ||
      ["k.rashidi","s.mohammed","o.farooq","n.alzaabi"].some(u => trimmed.startsWith(u + "@"));

    setTimeout(() => router.push(isFinance ? "/finance" : "/dashboard"), 800);
  }

  function handleDemo() {
    signIn("a.rehman@wurth.ae"); // Demo as Abdul Rehman (Employee)
    router.push("/dashboard");
  }

  function handleFinanceDemo() {
    signIn("zk@wuerth-professional.com"); // Demo as Zeeshan (Finance Super)
    router.push("/finance");
  }

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left brand panel — desktop only ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between border-r border-gray-100 bg-white px-12 py-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 33.3 36.4" width="32" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#CC0000" d="M33.3,14.3H0V0h13.9v5.6h5.6V0h13.9V14.3L33.3,14.3z M19.4,30.9v5.6c8-1.5,13.9-8.4,13.9-16.2v-0.3H0v0.3C0,28,5.9,34.9,13.9,36.4v-5.6H19.4L19.4,30.9z"/>
          </svg>
          <div className="leading-none">
            <p className="text-[18px] font-black uppercase tracking-tight text-gray-900">WÜRTH</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color: "#CC0000" }}>
              Professional Solutions
            </p>
          </div>
        </div>

        {/* Headline */}
        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.18em] mb-4"
            style={{ color: "#CC0000" }}>
            Corporate expense management
          </p>
          <h1 className="text-[2.4rem] font-extrabold leading-tight text-gray-900">
            Submit expense claims with currency conversion to AED — from any device.
          </h1>
          <ul className="mt-8 space-y-3">
            {[
              "USD, EUR, TRY, CNY → AED — converted automatically per line",
              "Receipt capture from mobile camera or file upload",
              "Finance-ready PDF on every submission",
              "Full audit trail — rate, amount, who, when",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-gray-500">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "#CC0000" }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[["3 min","avg. submission"],["24 h","Finance SLA"],["100%","audit trail"]].map(([v,l]) => (
            <div key={l} className="rounded-lg border border-gray-100 p-4">
              <p className="text-2xl font-extrabold text-gray-900">{v}</p>
              <p className="mt-0.5 text-xs text-gray-500">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right sign-in panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <svg viewBox="0 0 33.3 36.4" width="26" height="28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#CC0000" d="M33.3,14.3H0V0h13.9v5.6h5.6V0h13.9V14.3L33.3,14.3z M19.4,30.9v5.6c8-1.5,13.9-8.4,13.9-16.2v-0.3H0v0.3C0,28,5.9,34.9,13.9,36.4v-5.6H19.4L19.4,30.9z"/>
            </svg>
            <div className="leading-none">
              <p className="text-[15px] font-black uppercase tracking-tight text-gray-900">WÜRTH</p>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color: "#CC0000" }}>
                Professional Solutions
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-[0.18em] mb-2"
              style={{ color: "#CC0000" }}>
              Secure sign in
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900">Corporate email</h2>
            <p className="mt-1 text-sm text-gray-500">
              Use your @{ALLOWED_DOMAIN} account to continue.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5"
                  htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder={`name@${ALLOWED_DOMAIN}`}
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

              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
                style={{ background: loading ? "#A30000" : "#CC0000" }}
              >
                {loading ? "Signing in…" : "Continue →"}
              </button>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs text-gray-400 mb-2">Quick demo access:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDemo}
                  className="rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  👤 Employee demo
                </button>
                <button
                  type="button"
                  onClick={handleFinanceDemo}
                  className="rounded-lg border px-3 py-2.5 text-xs font-semibold transition hover:opacity-90"
                  style={{ borderColor: "#CC0000", color: "#CC0000", background: "#fff0f0" }}
                >
                  💼 Finance demo
                </button>
              </div>
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
