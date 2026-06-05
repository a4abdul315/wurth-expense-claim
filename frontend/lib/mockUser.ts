/**
 * User store — single source of truth for all users and roles.
 * PRODUCTION: Replace with Azure AD token claims + HR system API.
 */

export type UserRole = "EMPLOYEE" | "FINANCE" | "FINANCE_SUPER" | "ADMIN";

export interface AppUser {
  name:           string;
  firstName:      string;
  lastName:       string;
  email:          string;
  department:     string;
  accountNo:      string;
  role:           UserRole;
  bankDetailsSet: boolean;
  holder:         string;
  iban:           string;
  swift:          string;
  bank:           string;
}

// ─── All known users ──────────────────────────────────────────────────────────

const USERS: AppUser[] = [
  // ── Employees ──
  {
    name: "Abdul Rehman", firstName: "Abdul", lastName: "Rehman",
    email: "a.rehman@wurth.ae", department: "IT", accountNo: "ACC-2024-001",
    role: "EMPLOYEE", bankDetailsSet: true,
    holder: "Abdul Rehman", iban: "AE07 0331 2345 6789 0123 456", swift: "EBILAEAD", bank: "Emirates NBD",
  },
  {
    name: "Aisha Khan", firstName: "Aisha", lastName: "Khan",
    email: "a.khan@wurth.ae", department: "Sales", accountNo: "ACC-2024-002",
    role: "EMPLOYEE", bankDetailsSet: true,
    holder: "Aisha Khan", iban: "AE07 0331 9876 5432 1098 765", swift: "EBILAEAD", bank: "Emirates NBD",
  },
  {
    name: "Daniel Reed", firstName: "Daniel", lastName: "Reed",
    email: "d.reed@wurth.ae", department: "Operations", accountNo: "ACC-2024-003",
    role: "EMPLOYEE", bankDetailsSet: false,
    holder: "", iban: "", swift: "", bank: "",
  },

  // ── Finance team ──
  {
    name: "Khalid Al Rashidi", firstName: "Khalid", lastName: "Al Rashidi",
    email: "k.rashidi@wurth.ae", department: "Finance", accountNo: "FIN-001",
    role: "FINANCE", bankDetailsSet: false, holder: "", iban: "", swift: "", bank: "",
  },
  {
    name: "Sara Mohammed", firstName: "Sara", lastName: "Mohammed",
    email: "s.mohammed@wurth.ae", department: "Finance", accountNo: "FIN-002",
    role: "FINANCE", bankDetailsSet: false, holder: "", iban: "", swift: "", bank: "",
  },
  {
    name: "Omar Farooq", firstName: "Omar", lastName: "Farooq",
    email: "o.farooq@wurth.ae", department: "Finance", accountNo: "FIN-003",
    role: "FINANCE", bankDetailsSet: false, holder: "", iban: "", swift: "", bank: "",
  },
  {
    name: "Nadia Al Zaabi", firstName: "Nadia", lastName: "Al Zaabi",
    email: "n.alzaabi@wurth.ae", department: "Finance", accountNo: "FIN-004",
    role: "FINANCE", bankDetailsSet: false, holder: "", iban: "", swift: "", bank: "",
  },
  // ── Finance Super User ──
  {
    name: "Zeeshan Khan", firstName: "Zeeshan", lastName: "Khan",
    email: "zk@wuerth-professional.com", department: "Finance", accountNo: "FIN-005",
    role: "FINANCE_SUPER", bankDetailsSet: false, holder: "", iban: "", swift: "", bank: "",
  },
];

const DEFAULT_USER = USERS[0]; // Abdul Rehman — safe fallback
const SESSION_KEY  = "wps_user_email";

// ─── Role helpers ─────────────────────────────────────────────────────────────

export function isFinanceRole(role: UserRole): boolean {
  return role === "FINANCE" || role === "FINANCE_SUPER" || role === "ADMIN";
}

/** Checks if an email belongs to any Finance team member */
export function isFinanceEmail(email: string): boolean {
  const u = USERS.find((u) => u.email === email.toLowerCase().trim());
  return u ? isFinanceRole(u.role) : false;
}

// ─── Session ──────────────────────────────────────────────────────────────────

/** Sign in — store the email in localStorage */
export function signIn(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("wps_session", "1");
  window.localStorage.setItem(SESSION_KEY, email.toLowerCase().trim());
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("wps_session");
  window.localStorage.removeItem(SESSION_KEY);
}

/** Get the currently logged-in user (client-side only) */
export function getCurrentUser(): AppUser {
  if (typeof window === "undefined") return DEFAULT_USER;
  const email = window.localStorage.getItem(SESSION_KEY) ?? "";
  return USERS.find((u) => u.email === email) ?? DEFAULT_USER;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/** All Finance team members (employees can assign claims to these) */
export const FINANCE_TEAM = USERS
  .filter((u) => isFinanceRole(u.role))
  .map((u) => ({ id: `fin_${u.email.split("@")[0].replace(/\./g, "_")}`, name: u.name, email: u.email, role: u.role }));

/** Finance members employees can directly assign (excludes Super User) */
export const ASSIGNABLE_FINANCE = FINANCE_TEAM.filter((f) => f.role !== "FINANCE_SUPER");

/** @deprecated Use getCurrentUser() in components */
export const MOCK_USER = DEFAULT_USER;
export type MockUser = AppUser;
