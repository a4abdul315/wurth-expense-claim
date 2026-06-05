/**
 * Mock authenticated user — populated from Azure AD session + HR system.
 *
 * BANK DETAILS POLICY:
 * - Employees CANNOT add, edit, or view their own IBAN/SWIFT.
 * - Only Finance team members can set or update employee bank details.
 * - In production, bank details are fetched securely from the HR system
 *   when the user logs in and are never editable by the employee themselves.
 *
 * PRODUCTION: Replace this object with data from:
 *   - Azure AD token claims → name, email, department
 *   - HR system API call   → iban, swift, bankName, accountNo
 */
export const MOCK_USER = {
  name: "Abdul Rehman",
  firstName: "Abdul",
  lastName: "Rehman",
  email: "a.rehman@wurth.ae",
  department: "IT",
  accountNo: "ACC-2024-001",
  role: "EMPLOYEE" as "EMPLOYEE" | "FINANCE" | "FINANCE_SUPER" | "ADMIN",

  // Bank details — Finance-managed, employee read-only
  bankDetailsSet: true,        // false = Finance hasn't set them yet
  holder: "Abdul Rehman",
  iban: "AE07 0331 2345 6789 0123 456",
  swift: "EBILAEAD",
  bank: "Emirates NBD",
} as const;

export type MockUser = typeof MOCK_USER;

/** Finance demo user — used when logged in as finance@wurth.ae */
export const MOCK_FINANCE_USER = {
  name: "Finance Team",
  email: "finance@wurth.ae",
  department: "Finance",
  role: "FINANCE_SUPER" as const,
};

/** The 5 finance team members employees can assign claims to */
export const FINANCE_TEAM = [
  { id: "fin_001", name: "Khalid Al Rashidi",  email: "k.rashidi@wurth.ae",  role: "FINANCE"       },
  { id: "fin_002", name: "Sara Mohammed",       email: "s.mohammed@wurth.ae", role: "FINANCE"       },
  { id: "fin_003", name: "Omar Farooq",         email: "o.farooq@wurth.ae",   role: "FINANCE"       },
  { id: "fin_004", name: "Nadia Al Zaabi",      email: "n.alzaabi@wurth.ae",  role: "FINANCE"       },
  { id: "fin_005", name: "Zeeshan Khan",        email: "zk@wuerth-professional.com", role: "FINANCE_SUPER" },
] as const;
