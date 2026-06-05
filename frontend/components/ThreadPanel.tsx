"use client";

import { useEffect, useRef, useState } from "react";
import { FINANCE_TEAM, MOCK_USER } from "@/lib/mockUser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreadMessage {
  id:         string;
  authorId:   string;
  authorName: string;
  authorRole: string;
  content:    string;
  createdAt:  string;
}

interface ThreadParticipant {
  userId:    string;
  name:      string;
  email:     string;
  role:      string;
  invitedBy: string | null;
}

interface Thread {
  id:           string;
  claimId:      string;
  messages:     ThreadMessage[];
  participants: ThreadParticipant[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const AUTH = `Bearer mock:${MOCK_USER.email}`;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function roleLabel(role: string) {
  if (role === "FINANCE_SUPER") return "Finance Super";
  if (role === "FINANCE")       return "Finance";
  return "Employee";
}

function roleBadgeColor(role: string) {
  if (role === "FINANCE_SUPER") return "bg-purple-100 text-purple-700";
  if (role === "FINANCE")       return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

// ─── ThreadPanel ──────────────────────────────────────────────────────────────

export function ThreadPanel({ claimId, claimReference }: { claimId: string; claimReference: string }) {
  const [thread,       setThread]       = useState<Thread | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [message,      setMessage]      = useState("");
  const [sending,      setSending]      = useState(false);
  const [showInvite,   setShowInvite]   = useState(false);
  const [inviteTarget, setInviteTarget] = useState("");
  const [inviting,     setInviting]     = useState(false);
  const [error,        setError]        = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isFinance = MOCK_USER.role === "FINANCE" || MOCK_USER.role === "FINANCE_SUPER";

  // ── Load thread ──
  async function loadThread() {
    try {
      const res = await fetch(`${API}/threads/claim/${claimId}`, {
        headers: { Authorization: AUTH },
      });
      if (res.ok) {
        const body = await res.json();
        setThread(body.data);
      } else {
        setThread(null); // no thread yet
      }
    } catch {
      setThread(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThread();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadThread, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  // ── Send message ──
  async function handleSend() {
    if (!message.trim() || !thread) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API}/threads/claim/${claimId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: AUTH },
        body: JSON.stringify({ content: message.trim() }),
      });
      if (res.ok) {
        setMessage("");
        await loadThread();
      } else {
        const body = await res.json();
        setError(body.error ?? "Could not send message");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  // ── Invite participant ──
  async function handleInvite() {
    if (!inviteTarget || !thread) return;
    setInviting(true);
    setError("");
    try {
      const res = await fetch(`${API}/threads/claim/${claimId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: AUTH },
        body: JSON.stringify({ inviteeId: inviteTarget }),
      });
      const body = await res.json();
      if (res.ok) {
        setShowInvite(false);
        setInviteTarget("");
        await loadThread();
      } else {
        setError(body.error ?? "Could not invite user");
      }
    } catch {
      setError("Network error");
    } finally {
      setInviting(false);
    }
  }

  // ── Finance team members not already in the thread ──
  const availableToInvite = FINANCE_TEAM.filter(
    (f) => !thread?.participants.some((p) => p.userId === f.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400">
        Loading thread…
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm text-slate-500">No discussion thread yet for this claim.</p>
        <p className="mt-1 text-xs text-slate-400">Thread is created when the claim is submitted.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-line bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-ink">Discussion Thread</p>
          <p className="text-xs text-slate-500">{claimReference} · {thread.participants.length} participant{thread.participants.length !== 1 ? "s" : ""}</p>
        </div>
        {/* Participant avatars */}
        <div className="flex -space-x-1.5">
          {thread.participants.slice(0, 4).map((p) => (
            <div
              key={p.userId}
              title={`${p.name} (${roleLabel(p.role)})`}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
              style={{ background: p.role === "FINANCE_SUPER" ? "#7c3aed" : p.role === "FINANCE" ? "#2563eb" : "#CC0000" }}
            >
              {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex max-h-72 flex-col gap-3 overflow-y-auto p-4">
        {thread.messages.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-4">No messages yet. Start the discussion.</p>
        ) : (
          thread.messages.map((msg) => {
            const isMe = msg.authorId === MOCK_USER.email || msg.authorName === MOCK_USER.name;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: msg.authorRole === "FINANCE_SUPER" ? "#7c3aed" : msg.authorRole === "FINANCE" ? "#2563eb" : "#CC0000" }}
                >
                  {msg.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                {/* Bubble */}
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-ink">{msg.authorName}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${roleBadgeColor(msg.authorRole)}`}>
                      {roleLabel(msg.authorRole)}
                    </span>
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-sm ${isMe ? "bg-brand-600 text-white" : "bg-slate-100 text-ink"}`}>
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
        <p className="mx-4 rounded bg-red-50 px-3 py-1.5 text-xs text-danger">{error}</p>
      )}

      {/* Invite panel — Finance only */}
      {isFinance && showInvite && (
        <div className="border-t border-line bg-blue-50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-blue-700">Invite a Finance team member</p>
          <div className="flex gap-2">
            <select
              value={inviteTarget}
              onChange={(e) => setInviteTarget(e.target.value)}
              className="h-9 flex-1 rounded border border-line bg-white px-2 text-sm"
            >
              <option value="">Select person…</option>
              {availableToInvite.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.role === "FINANCE_SUPER" ? "★" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleInvite}
              disabled={!inviteTarget || inviting}
              className="h-9 rounded bg-blue-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {inviting ? "Inviting…" : "Invite"}
            </button>
            <button
              type="button"
              onClick={() => { setShowInvite(false); setInviteTarget(""); setError(""); }}
              className="h-9 rounded border border-line bg-white px-3 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-blue-600">
            Only Finance members can be invited. Employees cannot be added to this thread.
          </p>
        </div>
      )}

      {/* Message input */}
      <div className="border-t border-line p-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="h-10 flex-1 rounded-lg border border-line bg-slate-50 px-3 text-sm focus:bg-white focus:border-brand-600 focus:outline-none"
          />
          {/* Invite button — Finance only */}
          {isFinance && (
            <button
              type="button"
              onClick={() => { setShowInvite(!showInvite); setError(""); }}
              title="Invite Finance member"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40"
            style={{ background: "#CC0000" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        {MOCK_USER.role === "EMPLOYEE" && (
          <p className="mt-1 text-[10px] text-slate-400">
            You can message the Finance reviewer. Only Finance members can invite others.
          </p>
        )}
      </div>
    </div>
  );
}
