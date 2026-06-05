"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/mockUser";
import { apiGetNotifications, apiMarkAllRead, apiMarkOneRead } from "@/lib/apiClient";

interface Notif {
  id:         string;
  type:       string;
  title:      string;
  body:       string;
  claim_id:   string | null;
  is_read:    number;
  created_at: string;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function typeIcon(type: string) {
  if (type === "CLAIM_ASSIGNED") return "📋";
  if (type === "THREAD_MESSAGE") return "💬";
  if (type === "THREAD_INVITE")  return "👤";
  if (type.includes("APPROVED")) return "✅";
  if (type.includes("REJECTED")) return "❌";
  return "🔔";
}

export function NotificationBell() {
  const [notifs,  setNotifs]  = useState<Notif[]>([]);
  const [unread,  setUnread]  = useState(0);
  const [open,    setOpen]    = useState(false);
  const panelRef  = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  async function refresh() {
    const user   = getCurrentUser();
    const result = await apiGetNotifications(user.email);
    const list:  Notif[] = result.data ?? [];
    const count: number  = result.meta?.unread ?? 0;

    // Browser push for new notifications
    if (count > prevCount.current && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        const newest = list.find((n) => !n.is_read);
        if (newest) new Notification("Würth Expense Claims", { body: newest.title, icon: "/icon.svg" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    prevCount.current = count;
    setNotifs(list);
    setUnread(count);
  }

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleMarkAll() {
    await apiMarkAllRead(getCurrentUser().email);
    refresh();
  }

  async function handleMarkOne(id: string) {
    await apiMarkOneRead(getCurrentUser().email, id);
    refresh();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button type="button" onClick={() => setOpen(!open)}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-slate-500 hover:bg-slate-50 transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: "#CC0000" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-line bg-white shadow-xl"
          style={{ animation: "fadeIn .15s ease" }}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={handleMarkAll} className="text-xs font-semibold text-brand-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {notifs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</p>
            ) : notifs.map((n) => (
              <button key={n.id} type="button" onClick={() => handleMarkOne(n.id)}
                className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${n.is_read ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${n.is_read ? "text-slate-500" : "font-semibold text-ink"}`}>{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "#CC0000" }} />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
