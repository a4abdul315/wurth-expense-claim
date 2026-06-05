export const CLAIM_STORE_KEY    = "wps_submitted_claims";
export const STATUS_STORE_KEY   = "wps_claim_statuses";
export const NOTIF_STORE_KEY    = "wps_notifications";

export type ClaimStatus = "Submitted" | "Review" | "Approved" | "Rejected" | "Paid";

export type ReceiptMeta = { name: string; size: number; type: string; previewUrl: string | null; };

export type LiveClaim = {
  id:                   string;
  reference:            string;
  employee:             string;
  department:           string;
  email:                string;
  amountAed:            number;
  submittedAt:          number;
  status:               "Submitted" | "Approved" | "Rejected" | "Paid";
  assignedFinanceId:    string;
  assignedFinanceName:  string;
  assignedFinanceEmail: string;
  receipts:             ReceiptMeta[];
  notes:                string;
};

export type StatusRecord = {
  status:    ClaimStatus;
  reason?:   string;
  updatedAt: number;
};

export type LocalNotif = {
  id:         string;
  forEmail:   string;   // which user this notification is for
  title:      string;
  body:       string;
  claimRef:   string;
  read:       boolean;
  createdAt:  number;
};

// ─── Claims ───────────────────────────────────────────────────────────────────

export function saveLiveClaim(claim: LiveClaim): void {
  if (typeof window === "undefined") return;
  const deduped = readLiveClaims().filter((c) => c.reference !== claim.reference);
  window.localStorage.setItem(CLAIM_STORE_KEY, JSON.stringify([claim, ...deduped]));
}

export function readLiveClaims(): LiveClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAIM_STORE_KEY);
    return raw ? (JSON.parse(raw) as LiveClaim[]) : [];
  } catch { return []; }
}

// ─── Status overrides (Finance actions) ──────────────────────────────────────

export function updateClaimStatus(reference: string, status: ClaimStatus, reason?: string): void {
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
  } catch { return {}; }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function pushLocalNotif(notif: Omit<LocalNotif, "id" | "createdAt">): void {
  if (typeof window === "undefined") return;
  const existing = readLocalNotifs();
  const newNotif: LocalNotif = {
    ...notif, id: `n_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    createdAt: Date.now(),
  };
  window.localStorage.setItem(NOTIF_STORE_KEY, JSON.stringify([newNotif, ...existing]));
}

export function readLocalNotifs(): LocalNotif[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIF_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function markNotifRead(id: string): void {
  if (typeof window === "undefined") return;
  const notifs = readLocalNotifs().map((n) => n.id === id ? { ...n, read: true } : n);
  window.localStorage.setItem(NOTIF_STORE_KEY, JSON.stringify(notifs));
}

export function markAllNotifsRead(email: string): void {
  if (typeof window === "undefined") return;
  const notifs = readLocalNotifs().map((n) => n.forEmail === email ? { ...n, read: true } : n);
  window.localStorage.setItem(NOTIF_STORE_KEY, JSON.stringify(notifs));
}

export function getUnreadCount(email: string): number {
  return readLocalNotifs().filter((n) => n.forEmail === email && !n.read).length;
}
