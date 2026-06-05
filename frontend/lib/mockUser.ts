/**
 * User store — determines the logged-in user based on the email they signed in with.
 * PRODUCTION: Replace with Azure AD token claims + HR system API call.
 */

export type UserRole = "EMPLOYEE" | "FINANCE" | "FINANCE_SUPER" | "ADMIN";

export interface AppUser {
  name:          string;
  firstName:     string;
  lastName:      string;
  email:         string;
  department:    string;
  accountNo:     string;
  role:          UserRole;
  bankDetailsSet: boolean;
  holder:        string;
  iban:          string;
  swift:         string;
  bank:          string;
}

// ─── All known users ──────────────────────────────────────────────────────────

const USERS: AppUser[] = [
  // Employees
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
  // Finance team — can see all claims, approve/reject/pay
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
  // Finance Super User — sees everything, can join any thread
  {
    name: "Zeeshan Khan", firstName: "Zeeshan", lastName: "Khan",
    email: "zk@wuerth-professional.com", department: "Finance", accountNo: "FIN-005",
    role: "FINANCE_SUPER", bankDetailsSet: false, holder: "", iban: "", swift: "", bank: "",
  },
];

const DEFAULT_USER = USERS[0]; // Abdul Rehman — fallback

// ─── Session helpers ──────────────────────────────────────────────────────────

const SESSION_KEY = "wps_user_email";

/** Get the currently logged-in user. Falls back to the default employee. */
export function getCurrentUser(): AppUser {
  if (typeof window === "undefined") return DEFAULT_USER;
  const email = window.localStorage.getItem(SESSION_KEY) ?? "";
  return USERS.find((u) => u.email === email) ?? DEFAULT_USER;
}

/** Sign in — store the email so getCurrentUser() picks it up. */
export function signIn(email: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("wps_session", "1");
    window.localStorage.setItem(SESSION_KEY, email.toLowerCase().trim());
  }
}

/** Sign out — clear session. */
export function signOut(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("wps_session");
    window.localStorage.removeItem(SESSION_KEY);
  }
}

// ─── Convenience export (static fallback — use getCurrentUser() in components) ─

/** @deprecated Use getCurrentUser() in client components instead */
export const MOCK_USER = DEFAULT_USER;
export type MockUser = AppUser;

/** The 5 Finance team members an employee can assign a claim to (no Super User) */
export const FINANCE_TEAM = USERS.filter(
  (u) => u.role === "FINANCE" || u.role === "FINANCE_SUPER"
).map((u) => ({ id: `fin_${u.email.split("@")[0].replace(/\./g, "_")}`, name: u.name, email: u.email, role: u.role }));
