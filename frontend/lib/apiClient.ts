/**
 * API client — all calls go to the Express backend (MySQL-backed).
 * Auth header: Bearer mock:<email>
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function authHeader(email: string) {
  return { Authorization: `Bearer mock:${email}`, "Content-Type": "application/json" };
}

// ─── Claims ───────────────────────────────────────────────────────────────────

export async function apiSubmitClaim(payload: {
  email:              string;
  lines:              unknown[];
  notes:              string;
  assignedFinanceId:  string;
  receipts:           { name: string; size: number; type: string }[];
}) {
  // Step 1: create draft
  const createRes = await fetch(`${BASE}/claims`, {
    method: "POST",
    headers: authHeader(payload.email),
    body: JSON.stringify({
      lines:             payload.lines,
      notes:             payload.notes,
      assignedFinanceId: payload.assignedFinanceId,
      receipts:          payload.receipts,
    }),
  });
  if (!createRes.ok) throw new Error((await createRes.json()).error ?? "Failed to create claim");
  const { data: draft } = await createRes.json();

  // Step 2: submit
  const submitRes = await fetch(`${BASE}/claims/${draft.id}/submit`, {
    method: "POST",
    headers: authHeader(payload.email),
  });
  if (!submitRes.ok) throw new Error((await submitRes.json()).error ?? "Failed to submit claim");
  const { data: submitted } = await submitRes.json();
  return submitted;
}

export async function apiListMyClaims(email: string) {
  const res = await fetch(`${BASE}/claims`, { headers: authHeader(email) });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data ?? [];
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export async function apiListAllClaims(email: string) {
  const res = await fetch(`${BASE}/finance/claims`, { headers: authHeader(email) });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data ?? [];
}

export async function apiUpdateClaimStatus(email: string, claimId: string, status: string, rejectReason?: string) {
  const res = await fetch(`${BASE}/finance/claims/${claimId}`, {
    method: "PATCH",
    headers: authHeader(email),
    body: JSON.stringify({ status, rejectReason }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update status");
  return (await res.json()).data;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function apiGetNotifications(email: string) {
  try {
    const res = await fetch(`${BASE}/notifications`, { headers: authHeader(email) });
    if (!res.ok) return { data: [], meta: { unread: 0 } };
    return res.json();
  } catch { return { data: [], meta: { unread: 0 } }; }
}

export async function apiMarkAllRead(email: string) {
  await fetch(`${BASE}/notifications/read-all`, { method: "POST", headers: authHeader(email) });
}

export async function apiMarkOneRead(email: string, id: string) {
  await fetch(`${BASE}/notifications/${id}/read`, { method: "PATCH", headers: authHeader(email) });
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export async function apiGetThread(email: string, claimId: string) {
  try {
    const res = await fetch(`${BASE}/threads/claim/${claimId}`, { headers: authHeader(email) });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch { return null; }
}

export async function apiPostMessage(email: string, claimId: string, content: string) {
  const res = await fetch(`${BASE}/threads/claim/${claimId}/messages`, {
    method: "POST",
    headers: authHeader(email),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to send");
  return (await res.json()).data;
}

export async function apiInviteToThread(email: string, claimId: string, inviteeEmail: string) {
  const res = await fetch(`${BASE}/threads/claim/${claimId}/invite`, {
    method: "POST",
    headers: authHeader(email),
    body: JSON.stringify({ inviteeEmail }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to invite");
  return (await res.json()).data;
}
