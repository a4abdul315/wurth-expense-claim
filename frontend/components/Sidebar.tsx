"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOCK_USER } from "@/lib/mockUser";

// ─── Nav config ───────────────────────────────────────────────────────────────

const employeeNav = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: "/claims/new",
    label: "New Claim",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    href: "/claims",
    label: "My Claims",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
];

const financeNav = [
  {
    href: "/finance",
    label: "Review Queue",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

// ─── Würth logo ───────────────────────────────────────────────────────────────

function WurthLogo({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    // Only show the shield mark when collapsed — first 34px of the SVG viewBox
    return (
      <div className="select-none">
        <svg viewBox="0 0 34 36.4" width="28" height="30" xmlns="http://www.w3.org/2000/svg">
          <path fill="#CC0000" d="M33.3,14.3H0V0h13.9v5.6h5.6V0h13.9V14.3L33.3,14.3z M19.4,30.9v5.6c8-1.5,13.9-8.4,13.9-16.2v-0.3H0v0.3C0,28,5.9,34.9,13.9,36.4v-5.6H19.4L19.4,30.9z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="select-none flex flex-col gap-1">
      {/* Full Würth logo SVG — constrained to sidebar width */}
      <img
        src="/wurth-logo.svg"
        alt="Würth"
        style={{ height: 28, width: "auto", maxWidth: 160 }}
      />
      {/* Professional Solutions subtitle */}
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-700 leading-none pl-px">
        Professional Solutions
      </p>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const isFinance = MOCK_USER.role === "FINANCE" || MOCK_USER.role === "ADMIN";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-r border-line bg-white min-h-screen sticky top-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-line">
        <Link href="/dashboard">
          <WurthLogo />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          Expense Claims
        </p>

        {employeeNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-brand-50 text-brand-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-ink"
            }`}
          >
            <span className={isActive(item.href) ? "text-brand-600" : "text-slate-400"}>
              {item.icon}
            </span>
            {item.label}
            {isActive(item.href) && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600" />
            )}
          </Link>
        ))}

        {isFinance && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Finance
              </p>
            </div>
            {financeNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <span className={isActive(item.href) ? "text-brand-600" : "text-slate-400"}>
                  {item.icon}
                </span>
                {item.label}
                {isActive(item.href) && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600" />
                )}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User profile at bottom */}
      <div className="border-t border-line px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "#CC0000" }}
          >
            {MOCK_USER.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{MOCK_USER.name}</p>
            <p className="truncate text-xs text-slate-500">{MOCK_USER.department}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile bottom tab bar ─────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const isFinance = MOCK_USER.role === "FINANCE" || MOCK_USER.role === "ADMIN";

  const tabs = [
    ...employeeNav,
    ...(isFinance ? financeNav : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-white md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className={`grid grid-cols-${tabs.length}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                active ? "text-brand-700" : "text-slate-500"
              }`}
            >
              <span className={active ? "text-brand-600" : "text-slate-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
