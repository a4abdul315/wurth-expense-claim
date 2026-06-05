"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser, isFinanceRole, type AppUser } from "@/lib/mockUser";

// ─── Navigation config ────────────────────────────────────────────────────────

const EMPLOYEE_NAV = [
  {
    href: "/dashboard", label: "Dashboard",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    href: "/claims/new", label: "New Claim",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  },
  {
    href: "/claims", label: "My Claims",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
];

const FINANCE_NAV = [
  {
    href: "/finance", label: "Review Queue",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
];

// ─── Würth logo ───────────────────────────────────────────────────────────────

function WurthMark() {
  return (
    <div className="flex flex-col gap-1 select-none">
      {/* Full Würth logo — shield + WÜRTH wordmark in one SVG */}
      <img
        src="/wurth-logo.svg"
        alt="WÜRTH"
        style={{ maxWidth: 130 }}
      />
      <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: "#CC0000" }}>
        Professional Solutions
      </p>
    </div>
  );
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-red-50 text-red-700 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-gray-900"
      }`}>
      <span className={active ? "text-red-600" : "text-slate-400"}>{icon}</span>
      {label}
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-600" />}
    </Link>
  );
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();

  // Read user from localStorage — always starts with default to avoid SSR mismatch
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]); // re-read on every route change (handles login redirect)

  // While hydrating, show neutral state
  if (!user) {
    return (
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-r border-gray-100 bg-white min-h-screen sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-gray-100">
          <Link href="/dashboard"><WurthMark /></Link>
        </div>
      </aside>
    );
  }

  const isFinance = isFinanceRole(user.role);
  const navItems  = isFinance ? FINANCE_NAV : EMPLOYEE_NAV;
  const avatarBg  = isFinance ? "#7c3aed" : "#CC0000";

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-r border-gray-100 bg-white min-h-screen sticky top-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href={isFinance ? "/finance" : "/dashboard"}><WurthMark /></Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          {isFinance ? "Finance" : "Expense Claims"}
        </p>
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: avatarBg }}>
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">
              {user.department}
              {isFinance && <span className="ml-1" style={{ color: avatarBg }}>· {user.role === "FINANCE_SUPER" ? "Super User" : "Finance"}</span>}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => { setUser(getCurrentUser()); }, [pathname]);

  if (!user) return null;

  const isFinance = isFinanceRole(user.role);
  const tabs = isFinance ? FINANCE_NAV : EMPLOYEE_NAV;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                active ? "text-red-700" : "text-slate-500"
              }`}>
              <span className={active ? "text-red-600" : "text-slate-400"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
