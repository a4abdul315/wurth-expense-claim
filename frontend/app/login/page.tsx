"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_DOMAIN = "wurth.ae";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your corporate email address.");
      return;
    }
    const domain = trimmed.split("@")[1];
    if (domain !== ALLOWED_DOMAIN) {
      setError(`Access restricted to @${ALLOWED_DOMAIN} accounts.`);
      return;
    }
    setError("");
    setLoading(true);
    // PRODUCTION: Azure AD MSAL loginRedirect — never store session in localStorage.
    localStorage.setItem("wps_session", "1");
    setTimeout(() => router.push("/dashboard"), 800);
  }

  function handleDemoAccess() {
    localStorage.setItem("wps_session", "1");
    router.push("/dashboard");
  }

  return (
    <main
      className="flex min-h-screen flex-col bg-white lg:flex-row"
      style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}
    >
      {/* ── Left brand panel — desktop only ── */}
      <section className="hidden flex-col justify-between border-r border-line bg-white px-10 py-12 lg:flex lg:w-[55%]">
        {/* Logo */}
        <div className="flex flex-col gap-1.5">
          <img src="/wurth-logo.svg" alt="Würth" style={{ height: 32, width: "auto", maxWidth: 200 }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700">
            Professional Solutions
          </span>
        </div>

        {/* Headline */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Corporate expense management
          </p>
          <h1 className="mt-4 max-w-lg text-[2.6rem] font-semibold leading-tight text-ink">
            Submit expense claims with currency conversion to AED — from any device.
          </h1>
          <ul className="mt-8 space-y-3">
            {[
              "USD, EUR, TRY, CNY → AED converted automatically per line",
              "Receipt capture from mobile camera or file upload",
              "Finance-ready PDF on every submission",
              "Full audit trail — rate, amount, who, when",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#CC0000" }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[["3 min", "avg. submission"], ["24 h", "finance SLA"], ["100%", "audit trail"]].map(
            ([v, l]) => (
              <div key={l} className="rounded border border-line p-4">
                <p className="text-2xl font-bold text-ink">{v}</p>
                <p className="mt-0.5 text-sm text-slate-500">{l}</p>
              </div>
            )
          )}
        </div>
      </section>

      {/* ── Right sign-in section ── */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 lg:w-[45%]">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 flex flex-col gap-1">
            <img src="/wurth-logo.svg" alt="Würth" style={{ height: 26, width: "auto", maxWidth: 160 }} />
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Professional Solutions
            </span>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-line bg-white p-6 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
              Secure sign in
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Corporate email
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Use your @{ALLOWED_DOMAIN} account to continue.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                  Email address
                </label>
                {/* h-14 = 56px — comfortable touch target on iOS/Android */}
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
                  className="focus-ring mt-2 h-14 w-full rounded-lg border border-line bg-white px-4 text-base text-ink placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              )}

              {/* h-14 = 56px for good tap area */}
              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="focus-ring h-14 w-full rounded-lg text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-70"
                style={{ background: loading ? "#A30000" : "#CC0000" }}
              >
                {loading ? "Signing in…" : "Continue →"}
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-slate-400">@{ALLOWED_DOMAIN} only</span>
              {/* Generous touch target for "Demo access" */}
              <button
                type="button"
                onClick={handleDemoAccess}
                className="rounded px-3 py-2 text-sm font-semibold text-brand-700 active:bg-brand-50"
              >
                Demo access →
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © Würth Professional Solutions LLC · Dubai, UAE
          </p>
        </div>
      </section>
    </main>
  );
}
