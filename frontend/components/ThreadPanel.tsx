"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentUser, FINANCE_TEAM } from "@/lib/mockUser";
import { pushLocalNotif } from "@/lib/claimStore";
import { apiInviteToThread } from "@/lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id:         string;
  authorName: string;
  authorRole: string;
  content:    string;
  createdAt:  number;
}

interface Participant {
  name:      string;
  email:     string;
  role:      string;
  invitedBy: string | null;
}

interface Thread {
  claimId:      string;
  messages:     Message[];
  participants: Participant[];
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function threadKey(claimId: string) { return `wps_thread_${claimId}`; }

function loadThread(claimId: string): Thread {
  if (typeof window === "undefined") return { claimId, messages: [], participants: [] };
  try {
    const raw = window.localStorage.getItem(threadKey(claimId));
    if (raw) return JSON.parse(raw) as Thread;
  } catch { /* ignore */ }
  return { claimId, messages: [], participants: [] };
}

function saveThread(thread: Thread): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(threadKey(thread.claimId), JSON.stringify(thread));
  // Trigger storage event so other tabs update
  window.dispatchEvent(new StorageEvent("storage", { key: threadKey(thread.claimId) }));
}

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function roleColor(role: string) {
  if (role === "FINANCE_SUPER") return "#7c3aed";
  if (role === "FINANCE")       return "#2563eb";
  return "#CC0000";
}

function roleBadge(role: string) {
  if (role === "FINANCE_SUPER") return { bg: "bg-purple-100", text: "text-purple-700", label: "Finance Super" };
  if (role === "FINANCE")       return { bg: "bg-blue-100",   text: "text-blue-700",   label: "Finance" };
  return { bg: "bg-slate-100", text: "text-slate-600", label: "Employee" };
}

// ─── ThreadPanel ──────────────────────────────────────────────────────────────

export function ThreadPanel({ claimId, claimReference }: { claimId: string; claimReference: string }) {
  const [thread,       setThread]       = useState<Thread>(() => loadThread(claimId));
  const [message,      setMessage]      = useState("");
  const [showInvite,   setShowInvite]   = useState(false);
  const [inviteTarget, setInviteTarget] = useState("");
  const [error,        setError]        = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentUser = getCurrentUser();
  const isFinance   = currentUser.role === "FINANCE" || currentUser.role === "FINANCE_SUPER";

  // Refresh on storage changes (cross-tab / same-tab)
  useEffect(() => {
    function refresh(e?: StorageEvent) {
      if (!e || e.key === threadKey(claimId)) setThread(loadThread(claimId));
    }
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [claimId]);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages.length]);

  // ── Send message ──
  function handleSend() {
    const content = message.trim();
    if (!content) return;

    const updated: Thread = {
      ...thread,
      messages: [
        ...thread.messages,
        {
          id: uid(),
          authorName: currentUser.name,
          authorRole: currentUser.role,
          content,
          createdAt: Date.now(),
        },
      ],
    };
    saveThread(updated);
    setThread(updated);
    setMessage("");
    setError("");
  }

  // ── Invite Finance member ──
  function handleInvite() {
    if (!inviteTarget) return;

    const invitee = FINANCE_TEAM.find((f) => f.id === inviteTarget);
    if (!invitee) return;

    // Enforce all rules
    if (invitee.role === "FINANCE_SUPER") {
      setError("The Finance Super User has automatic visibility — they cannot be invited.");
      return;
    }
    if (invitee.role === "EMPLOYEE") {
      setError("Only Finance team members can be invited to a thread.");
      return;
    }
    if (thread.participants.some((p) => p.email === invitee.email)) {
      setError(`${invitee.name} is already in this thread.`);
      return;
    }
    if (inviteLimitReached) {
      setError("Only one additional Finance member can be invited per thread.");
      return;
    }

    const updated: Thread = {
      ...thread,
      participants: [
        ...thread.participants,
        { name: invitee.name, email: invitee.email, role: invitee.role, invitedBy: currentUser.name },
      ],
      messages: [
        ...thread.messages,
        {
          id: uid(),
          authorName: "System",
          authorRole: "SYSTEM",
          content: `${currentUser.name} invited ${invitee.name} to this thread.`,
          createdAt: Date.now(),
        },
      ],
    };
    saveThread(updated);
    setThread(updated);

    // Push notification — localStorage (same browser) + MySQL backend (cross-session)
    pushLocalNotif({
      forEmail: invitee.email,
      title:    `You've been invited to a claim discussion`,
      body:     `${currentUser.name} invited you to discuss ${claimReference}.`,
      claimRef: claimId,
      read:     false,
    });
    // Also notify via backend so the bell works in any session
    apiInviteToThread(currentUser.email, claimId, invitee.email).catch(() => {
      // Backend unavailable — localStorage notification still works on same device
    });

    setShowInvite(false);
    setInviteTarget("");
    setError("");
  }

  // ── Invite rules ──────────────────────────────────────────────────────────
  // Rule 1: Only regular Finance (not Super User) can use the invite button
  const canUseInvite = isFinance && currentUser.role !== "FINANCE_SUPER";

  // Rule 2: Max 1 additional Finance member per thread (original + 1 invited = 2 total)
  // Count non-super Finance participants already in thread
  const regularInThread = thread.participants.filter(
    (p) => p.role === "FINANCE"
  ).length;
  const inviteLimitReached = regularInThread >= 1; // already 1 invited → locked

  // Rule 3: Eligible to invite = regular Finance, not already in thread, not current user, NOT Super User
  const eligibleToInvite = FINANCE_TEAM.filter(
    (f) =>
      f.role !== "FINANCE_SUPER" &&          // Super User cannot be invited
      f.email !== currentUser.email &&        // Not yourself
      !thread.participants.some((p) => p.email === f.email) // Not already in
  );

  return (
    <div className="flex flex-col rounded-xl border border-line bg-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-line bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-ink">Discussion</p>
          <p className="text-xs text-slate-500">
            {claimReference}
            {thread.participants.length > 0 && ` · ${thread.participants.length + 1} participants`}
          </p>
        </div>
        {/* Participant avatars */}
        <div className="flex -space-x-1.5">
          {/* Current user always shown */}
          <div title={currentUser.name}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
            style={{ background: roleColor(currentUser.role) }}>
            {currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          {thread.participants.slice(0, 3).map((p, i) => (
            <div key={i} title={p.name}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
              style={{ background: roleColor(p.role) }}>
              {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          ))}
          {thread.participants.length > 3 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-[9px] font-bold text-slate-600">
              +{thread.participants.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto p-4">
        {thread.messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            No messages yet. Start the discussion below.
          </p>
        ) : (
          thread.messages.map((msg) => {
            const isMe     = msg.authorName === currentUser.name;
            const isSystem = msg.authorRole === "SYSTEM";

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-500">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const badge = roleBadge(msg.authorRole);
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: roleColor(msg.authorRole) }}>
                  {msg.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-ink">{msg.authorName}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-sm ${isMe ? "text-white" : "bg-slate-100 text-ink"}`}
                    style={isMe ? { background: "#CC0000" } : {}}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-400">{timeAgo(msg.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">{error}</p>
      )}

      {/* Invite panel — regular Finance only (not Super User) */}
      {canUseInvite && showInvite && (
        <div className="border-t border-line bg-blue-50 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-blue-700">Invite a Finance team member</p>
            {inviteLimitReached && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Limit reached (1/1)
              </span>
            )}
          </div>

          {inviteLimitReached ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              One Finance member has already been invited. The limit is one additional member per thread.
            </p>
          ) : eligibleToInvite.length === 0 ? (
            <p className="text-xs text-slate-500">No more Finance members available to invite.</p>
          ) : (
            <div className="flex gap-2">
              <select value={inviteTarget} onChange={(e) => setInviteTarget(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-line bg-white px-2 text-sm">
                <option value="">Select Finance member…</option>
                {eligibleToInvite.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button type="button" onClick={handleInvite} disabled={!inviteTarget}
                className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-50">
                Invite
              </button>
              <button type="button" onClick={() => { setShowInvite(false); setError(""); }}
                className="h-10 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-slate-600">
                Cancel
              </button>
            </div>
          )}

          <p className="mt-1.5 text-[10px] text-blue-400">
            Super User (Zeeshan Khan) sees all threads automatically and cannot be invited.
          </p>
        </div>
      )}

      {/* Message input */}
      <div className="border-t border-line p-3">
        <div className="flex gap-2">
          <input type="text" placeholder="Type a message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="h-12 flex-1 rounded-lg border border-line bg-slate-50 px-3 text-sm focus:bg-white focus:border-brand-600 focus:outline-none"
          />
          {/* Invite button — regular Finance only (not Super User) */}
          {canUseInvite && (
            <button type="button"
              onClick={() => { setShowInvite(!showInvite); setError(""); }}
              title={inviteLimitReached ? "Invite limit reached (1/1)" : "Invite Finance member"}
              className={`relative flex h-12 w-12 items-center justify-center rounded-lg border transition ${
                inviteLimitReached
                  ? "border-amber-200 bg-amber-50 text-amber-400 cursor-not-allowed"
                  : showInvite
                    ? "border-blue-300 bg-blue-100 text-blue-700"
                    : "border-line bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600"
              }`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              {inviteLimitReached && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-white">✓</span>
              )}
            </button>
          )}
          {/* Send button */}
          <button type="button" onClick={handleSend} disabled={!message.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-lg disabled:opacity-40"
            style={{ background: "#CC0000" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        {!isFinance && (
          <p className="mt-1 text-[10px] text-slate-400">
            You can message the Finance reviewer. Only Finance members can invite others.
          </p>
        )}
      </div>
    </div>
  );
}
