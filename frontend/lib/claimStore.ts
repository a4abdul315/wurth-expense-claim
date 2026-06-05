/**
 * Client-side claim store — persists submitted claims in localStorage so the
 * Finance dashboard can read them in real-time (same tab via polling, cross-tab
 * via the native `storage` event).
 *
 * PRODUCTION: replace with a server-sent event (SSE) or WebSocket stream from
 * the backend so Finance sees updates pushed from the database in real-time:
 *   const es = new EventSource("/api/finance/stream");
 *   es.onmessage = (e) => setQueue(prev => [JSON.parse(e.data), ...prev]);
 */

export const CLAIM_STORE_KEY = "wps_submitted_claims";

export type LiveClaim = {
  id: string;
  reference: string;
  employee: string;
  department: string;
  email: string;
  amountAed: number;
  submittedAt: number; // Unix ms — used for sorting + "NEW" badge
  status: "Submitted" | "Approved" | "Rejected" | "Paid";
};

/** Separate key for Finance status overrides (approve / reject / paid). */
export const STATUS_STORE_KEY = "wps_claim_statuses";

export type ClaimStatus = "Submitted" | "Review" | "Approved" | "Rejected" | "Paid";

export type StatusRecord = {
  status: ClaimStatus;
  reason?: string;      // for rejections
  updatedAt: number;    // Unix ms
};

export function updateClaimStatus(
  reference: string,
  status: ClaimStatus,
  reason?: string
): void {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(STATUS_STORE_KEY);
  const map: Record<string, StatusRecord> = raw ? JSON.parse(raw) : {};
  map[reference] = { status, reason, updatedAt: Date.now() };
  window.localStorage.setItem(STATUS_STORE_KEY, JSON.stringify(map));
}

export function readStatusMap(): Record<string, StatusRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STATUS_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLiveClaim(claim: LiveClaim): void {
  if (typeof window === "undefined") return;
  const existing = readLiveClaims();
  // Avoid duplicates by reference
  const deduped = existing.filter((c) => c.reference !== claim.reference);
  window.localStorage.setItem(
    CLAIM_STORE_KEY,
    JSON.stringify([claim, ...deduped])
  );
}

export function readLiveClaims(): LiveClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAIM_STORE_KEY);
    return raw ? (JSON.parse(raw) as LiveClaim[]) : [];
  } catch {
    return [];
  }
}
