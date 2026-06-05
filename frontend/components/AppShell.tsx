"use client";

import { Sidebar, MobileNav } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";

export function AppShell({
  title,
  eyebrow,
  children,
  actions,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-paper overflow-x-hidden">
      {/* Left sidebar — desktop only */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Page header */}
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">
                {eyebrow}
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-ink truncate sm:text-2xl">
                {title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell />
              {actions}
            </div>
          </div>
        </header>

        {/* Page body — pb-nav-safe makes room for mobile bottom tab */}
        <main className="flex-1 px-4 py-5 pb-nav-safe sm:px-6 sm:py-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileNav />
    </div>
  );
}
