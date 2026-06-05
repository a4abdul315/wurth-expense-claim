/**
 * In-memory data store — no database required for the prototype.
 * PRODUCTION: replace every exported function with the equivalent Prisma/MySQL query.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role   = "EMPLOYEE" | "FINANCE" | "FINANCE_SUPER" | "ADMIN";
export type Status = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID";

export interface User {
  id:             string;
  email:          string;
  name:           string;
  department:     string;
  role:           Role;
  // Bank details — Finance-managed only, employees cannot edit
  bankDetailsSet: boolean;
  iban:           string;
  swift:          string;
  bankName:       string;
}

export interface LineItem {
  id:          string;
  claimId:     string;
  category:    string;
  eventName:   string;
  description: string;
  date:        string;
  country:     string;
  currency:    string;
  amount:      number;
  aedAmount:   number;
  fxRate:      number;
  receiptNo:   string;
}

export interface Claim {
  id:                 string;
  reference:          string | null;
  employeeId:         string;
  assignedFinanceId:  string | null;   // finance person the employee chose on submit
  status:             Status;
  totalAed:           number;
  notes:              string | null;
  rejectReason:       string | null;
  submittedAt:        string | null;
  createdAt:          string;
  updatedAt:          string;
  lines:              LineItem[];
  employee?:          User;
}

/** One discussion thread per claim */
export interface Thread {
  id:           string;
  claimId:      string;
  createdAt:    string;
  messages:     ThreadMessage[];
  participants: ThreadParticipant[];
}

export interface ThreadMessage {
  id:         string;
  threadId:   string;
  authorId:   string;
  authorName: string;
  authorRole: string;
  content:    string;
  createdAt:  string;
}

export interface ThreadParticipant {
  userId:    string;
  name:      string;
  email:     string;
  role:      string;
  invitedBy: string | null;   // null = original assignee
  joinedAt:  string;
}

export interface Notification {
  id:        string;
  userId:    string;
  type:      "CLAIM_ASSIGNED" | "THREAD_MESSAGE" | "THREAD_INVITE" | "CLAIM_APPROVED" | "CLAIM_REJECTED" | "CLAIM_PAID";
  title:     string;
  body:      string;
  claimId:   string | null;
  threadId:  string | null;
  read:      boolean;
  createdAt: string;
}

// ─── Seed users ───────────────────────────────────────────────────────────────

const USERS: User[] = [
  { id: "usr_001", email: "a.rehman@wurth.ae",           name: "Abdul Rehman",    department: "IT",          role: "EMPLOYEE",      bankDetailsSet: true,  iban: "AE07 0331 2345 6789 0123 456", swift: "EBILAEAD", bankName: "Emirates NBD" },
  { id: "usr_002", email: "a.khan@wurth.ae",             name: "Aisha Khan",      department: "Sales",       role: "EMPLOYEE",      bankDetailsSet: true,  iban: "AE07 0331 9876 5432 1098 765", swift: "EBILAEAD", bankName: "Emirates NBD" },
  { id: "usr_003", email: "d.reed@wurth.ae",             name: "Daniel Reed",     department: "Operations",  role: "EMPLOYEE",      bankDetailsSet: false, iban: "", swift: "", bankName: "" },
  { id: "fin_001", email: "k.rashidi@wurth.ae",          name: "Khalid Al Rashidi", department: "Finance",   role: "FINANCE",       bankDetailsSet: false, iban: "", swift: "", bankName: "" },
  { id: "fin_002", email: "s.mohammed@wurth.ae",         name: "Sara Mohammed",   department: "Finance",     role: "FINANCE",       bankDetailsSet: false, iban: "", swift: "", bankName: "" },
  { id: "fin_003", email: "o.farooq@wurth.ae",           name: "Omar Farooq",     department: "Finance",     role: "FINANCE",       bankDetailsSet: false, iban: "", swift: "", bankName: "" },
  { id: "fin_004", email: "n.alzaabi@wurth.ae",          name: "Nadia Al Zaabi",  department: "Finance",     role: "FINANCE",       bankDetailsSet: false, iban: "", swift: "", bankName: "" },
  { id: "fin_005", email: "zk@wuerth-professional.com",  name: "Zeeshan Khan",    department: "Finance",     role: "FINANCE_SUPER", bankDetailsSet: false, iban: "", swift: "", bankName: "" },
];

// ─── Seed claims ──────────────────────────────────────────────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const CLAIMS: Claim[] = [
  {
    id: "clm_001", reference: "WPS-2026-1048", employeeId: "usr_002", assignedFinanceId: "fin_001",
    status: "SUBMITTED", totalAed: 1842.50, notes: null, rejectReason: null,
    submittedAt: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1),
    lines: [
      { id: "li_001", claimId: "clm_001", category: "A: Travel Expenses",       eventName: "Client visit",  description: "Flights Dubai–Riyadh", date: daysAgo(2), country: "UAE", currency: "AED", amount: 1200,   aedAmount: 1200,    fxRate: 1,     receiptNo: "R-001" },
      { id: "li_002", claimId: "clm_001", category: "C: Meals & Entertainment", eventName: "Client dinner", description: "Team dinner",          date: daysAgo(1), country: "UAE", currency: "USD", amount: 174.4,  aedAmount: 640.05,  fxRate: 3.67,  receiptNo: "R-002" },
    ],
  },
  {
    id: "clm_002", reference: "WPS-2026-1046", employeeId: "usr_003", assignedFinanceId: "fin_002",
    status: "SUBMITTED", totalAed: 1168.94, notes: "Q2 ops expenses", rejectReason: null,
    submittedAt: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2),
    lines: [
      { id: "li_003", claimId: "clm_002", category: "A: Travel Expenses", eventName: "Site visit", description: "Hotel 2 nights", date: daysAgo(3), country: "EUR", currency: "EUR", amount: 285, aedAmount: 1168.94, fxRate: 4.10, receiptNo: "R-003" },
    ],
  },
  {
    id: "clm_003", reference: "WPS-2026-1043", employeeId: "usr_001", assignedFinanceId: "fin_001",
    status: "APPROVED", totalAed: 3376.40, notes: null, rejectReason: null,
    submittedAt: daysAgo(9), createdAt: daysAgo(9), updatedAt: daysAgo(8),
    lines: [
      { id: "li_004", claimId: "clm_003", category: "A: Travel Expenses", eventName: "Training", description: "Flights + hotel", date: daysAgo(10), country: "USA", currency: "USD", amount: 920, aedAmount: 3376.40, fxRate: 3.67, receiptNo: "R-004" },
    ],
  },
  {
    id: "clm_004", reference: "WPS-2026-1040", employeeId: "usr_001", assignedFinanceId: "fin_003",
    status: "PAID", totalAed: 654.00, notes: null, rejectReason: null,
    submittedAt: daysAgo(15), createdAt: daysAgo(15), updatedAt: daysAgo(12),
    lines: [
      { id: "li_005", claimId: "clm_004", category: "D: Telecommunication", eventName: "", description: "International SIM", date: daysAgo(16), country: "TUR", currency: "TRY", amount: 6000, aedAmount: 654.00, fxRate: 0.109, receiptNo: "R-005" },
    ],
  },
];

// ─── Seed threads ─────────────────────────────────────────────────────────────

const THREADS: Thread[] = [
  {
    id: "thr_001", claimId: "clm_001", createdAt: daysAgo(1),
    participants: [
      { userId: "fin_001", name: "Khalid Al Rashidi", email: "k.rashidi@wurth.ae",         role: "FINANCE",       invitedBy: null,      joinedAt: daysAgo(1) },
    ],
    messages: [
      { id: "msg_001", threadId: "thr_001", authorId: "usr_002", authorName: "Aisha Khan",       authorRole: "EMPLOYEE", content: "Please review my travel claim for the Riyadh client visit.", createdAt: daysAgo(1) },
      { id: "msg_002", threadId: "thr_001", authorId: "fin_001", authorName: "Khalid Al Rashidi", authorRole: "FINANCE",  content: "Noted. Can you attach the hotel receipt as well?",          createdAt: daysAgo(0) },
    ],
  },
];

// ─── Notifications ────────────────────────────────────────────────────────────

const NOTIFICATIONS: Notification[] = [
  { id: "notif_001", userId: "fin_001", type: "CLAIM_ASSIGNED", title: "New claim assigned to you", body: "Aisha Khan submitted claim WPS-2026-1048 for AED 1,842.50", claimId: "clm_001", threadId: "thr_001", read: false, createdAt: daysAgo(1) },
  { id: "notif_002", userId: "fin_005", type: "CLAIM_ASSIGNED", title: "New claim in Finance queue", body: "WPS-2026-1046 submitted by Daniel Reed — AED 1,168.94", claimId: "clm_002", threadId: null, read: false, createdAt: daysAgo(2) },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ts() { return new Date().toISOString(); }
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function withEmployee(claim: Claim): Claim {
  return { ...claim, employee: USERS.find((u) => u.id === claim.employeeId) };
}

export function nextReference(): string {
  const year = new Date().getFullYear();
  const count = CLAIMS.filter((c) => c.reference?.startsWith(`WPS-${year}-`)).length;
  return `WPS-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ─── User store ───────────────────────────────────────────────────────────────

export const userStore = {
  findByEmail(email: string) { return USERS.find((u) => u.email === email.toLowerCase()); },
  findById(id: string)       { return USERS.find((u) => u.id === id); },
  findFinanceTeam()          { return USERS.filter((u) => u.role === "FINANCE" || u.role === "FINANCE_SUPER"); },

  upsert(data: { email: string; name?: string; department?: string; role?: Role }): User {
    const existing = USERS.find((u) => u.email === data.email);
    if (existing) return existing;
    const user: User = {
      id: `usr_${uid()}`, email: data.email,
      name: data.name ?? data.email.split("@")[0],
      department: data.department ?? "General",
      role: data.role ?? "EMPLOYEE",
      bankDetailsSet: false, iban: "", swift: "", bankName: "",
    };
    USERS.push(user);
    return user;
  },

  /** Finance-only: update employee bank details */
  updateBankDetails(userId: string, details: { iban: string; swift: string; bankName: string }): User | null {
    const idx = USERS.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    USERS[idx] = { ...USERS[idx], ...details, bankDetailsSet: true };
    return USERS[idx];
  },
};

// ─── Claim store ──────────────────────────────────────────────────────────────

export const claimStore = {
  findAll()                         { return [...CLAIMS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withEmployee); },
  findByEmployee(employeeId: string){ return CLAIMS.filter((c) => c.employeeId === employeeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withEmployee); },
  findByFinance(financeId: string)  { return CLAIMS.filter((c) => c.assignedFinanceId === financeId || c.status !== "DRAFT").map(withEmployee); },
  findById(id: string)              { const c = CLAIMS.find((c) => c.id === id); return c ? withEmployee(c) : undefined; },

  create(data: { employeeId: string; assignedFinanceId: string; totalAed: number; notes?: string; lines: Omit<LineItem, "id"|"claimId">[] }): Claim {
    const id    = `clm_${uid()}`;
    const lines = data.lines.map((l) => ({ ...l, id: `li_${uid()}`, claimId: id }));
    const claim: Claim = {
      id, reference: null, employeeId: data.employeeId,
      assignedFinanceId: data.assignedFinanceId,
      status: "DRAFT", totalAed: data.totalAed, notes: data.notes ?? null,
      rejectReason: null, submittedAt: null,
      createdAt: ts(), updatedAt: ts(), lines,
    };
    CLAIMS.push(claim);
    return withEmployee(claim);
  },

  update(id: string, data: Partial<Omit<Claim, "id"|"lines"|"employee">> & { lines?: Omit<LineItem, "id"|"claimId">[] }): Claim | undefined {
    const idx = CLAIMS.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const newLines = data.lines ? data.lines.map((l) => ({ ...l, id: `li_${uid()}`, claimId: id })) : CLAIMS[idx].lines;
    CLAIMS[idx] = { ...CLAIMS[idx], ...data, lines: newLines, updatedAt: ts() };
    return withEmployee(CLAIMS[idx]);
  },

  delete(id: string): boolean {
    const idx = CLAIMS.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    CLAIMS.splice(idx, 1);
    return true;
  },
};

// ─── Thread store ─────────────────────────────────────────────────────────────

export const threadStore = {
  findByClaim(claimId: string): Thread | undefined {
    return THREADS.find((t) => t.claimId === claimId);
  },

  findById(id: string): Thread | undefined {
    return THREADS.find((t) => t.id === id);
  },

  /** Create a thread when a claim is submitted */
  create(claimId: string, assignedFinanceId: string): Thread {
    const finance = USERS.find((u) => u.id === assignedFinanceId);
    const thread: Thread = {
      id:        `thr_${uid()}`,
      claimId,
      createdAt: ts(),
      messages:  [],
      participants: finance ? [{
        userId:    finance.id,
        name:      finance.name,
        email:     finance.email,
        role:      finance.role,
        invitedBy: null,
        joinedAt:  ts(),
      }] : [],
    };
    THREADS.push(thread);
    return thread;
  },

  /** Add a message to the thread */
  addMessage(threadId: string, authorId: string, content: string): ThreadMessage | null {
    const thread = THREADS.find((t) => t.id === threadId);
    if (!thread) return null;
    const author = USERS.find((u) => u.id === authorId);
    if (!author) return null;

    const msg: ThreadMessage = {
      id: `msg_${uid()}`, threadId,
      authorId, authorName: author.name, authorRole: author.role,
      content, createdAt: ts(),
    };
    thread.messages.push(msg);
    return msg;
  },

  /**
   * Invite another Finance member to the thread.
   * Rules:
   *  - Only Finance/Finance_Super can invite
   *  - Cannot invite employees or non-Finance users
   *  - Finance_Super (Zeeshan) can always join any thread
   */
  inviteParticipant(threadId: string, invitedByUserId: string, inviteeId: string): { success: boolean; error?: string; participant?: ThreadParticipant } {
    const thread  = THREADS.find((t) => t.id === threadId);
    const inviter = USERS.find((u) => u.id === invitedByUserId);
    const invitee = USERS.find((u) => u.id === inviteeId);

    if (!thread)  return { success: false, error: "Thread not found" };
    if (!inviter) return { success: false, error: "Inviter not found" };
    if (!invitee) return { success: false, error: "User not found" };

    if (inviter.role === "EMPLOYEE")
      return { success: false, error: "Employees cannot invite others to a thread" };

    if (invitee.role === "EMPLOYEE")
      return { success: false, error: "Cannot invite employees to the Finance thread" };

    const alreadyIn = thread.participants.some((p) => p.userId === inviteeId);
    if (alreadyIn) return { success: false, error: "User is already in this thread" };

    const participant: ThreadParticipant = {
      userId: invitee.id, name: invitee.name, email: invitee.email,
      role: invitee.role, invitedBy: invitedByUserId, joinedAt: ts(),
    };
    thread.participants.push(participant);
    return { success: true, participant };
  },
};

// ─── Notification store ───────────────────────────────────────────────────────

export const notificationStore = {
  findForUser(userId: string): Notification[] {
    return NOTIFICATIONS.filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  unreadCount(userId: string): number {
    return NOTIFICATIONS.filter((n) => n.userId === userId && !n.read).length;
  },

  create(data: Omit<Notification, "id" | "createdAt">): Notification {
    const notif: Notification = { ...data, id: `notif_${uid()}`, createdAt: ts() };
    NOTIFICATIONS.push(notif);
    return notif;
  },

  markRead(notifId: string, userId: string): boolean {
    const notif = NOTIFICATIONS.find((n) => n.id === notifId && n.userId === userId);
    if (!notif) return false;
    notif.read = true;
    return true;
  },

  markAllRead(userId: string): void {
    NOTIFICATIONS.filter((n) => n.userId === userId).forEach((n) => { n.read = true; });
  },
};
