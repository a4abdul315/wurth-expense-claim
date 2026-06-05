/**
 * Seed demo data into MySQL.
 * Run: npm run db:seed
 */

import { pool, run, query } from "./connection";
import "dotenv/config";

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function daysAgo(n: number) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

async function seed() {
  console.log("🌱  Seeding MySQL...");

  // ── Users ──
  const users = [
    { id: "usr_001", email: "a.rehman@wurth.ae",          name: "Abdul Rehman",    department: "IT",          role: "EMPLOYEE",      iban: "AE07 0331 2345 6789 0123 456", swift: "EBILAEAD", bankName: "Emirates NBD" },
    { id: "usr_002", email: "a.khan@wurth.ae",            name: "Aisha Khan",      department: "Sales",       role: "EMPLOYEE",      iban: "AE07 0331 9876 5432 1098 765", swift: "EBILAEAD", bankName: "Emirates NBD" },
    { id: "usr_003", email: "d.reed@wurth.ae",            name: "Daniel Reed",     department: "Operations",  role: "EMPLOYEE",      iban: "", swift: "", bankName: "" },
    { id: "fin_001", email: "k.rashidi@wurth.ae",         name: "Khalid Al Rashidi", department: "Finance",   role: "FINANCE",       iban: "", swift: "", bankName: "" },
    { id: "fin_002", email: "s.mohammed@wurth.ae",        name: "Sara Mohammed",   department: "Finance",     role: "FINANCE",       iban: "", swift: "", bankName: "" },
    { id: "fin_003", email: "o.farooq@wurth.ae",          name: "Omar Farooq",     department: "Finance",     role: "FINANCE",       iban: "", swift: "", bankName: "" },
    { id: "fin_004", email: "n.alzaabi@wurth.ae",         name: "Nadia Al Zaabi",  department: "Finance",     role: "FINANCE",       iban: "", swift: "", bankName: "" },
    { id: "fin_005", email: "zk@wuerth-professional.com", name: "Zeeshan Khan",    department: "Finance",     role: "FINANCE_SUPER", iban: "", swift: "", bankName: "" },
  ];

  for (const u of users) {
    await run(
      `INSERT IGNORE INTO users (id, email, name, department, role, bank_details_set, iban, swift, bank_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.email, u.name, u.department, u.role, u.iban ? 1 : 0, u.iban, u.swift, u.bankName]
    );
  }
  console.log(`   ✓  ${users.length} users`);

  // ── Claims ──
  const claims = [
    { id: "clm_001", ref: "WPS-2026-1048", empId: "usr_002", finId: "fin_001", status: "SUBMITTED", total: 1842.50, days: 1 },
    { id: "clm_002", ref: "WPS-2026-1046", empId: "usr_003", finId: "fin_002", status: "SUBMITTED", total: 1168.94, days: 2 },
    { id: "clm_003", ref: "WPS-2026-1043", empId: "usr_001", finId: "fin_001", status: "APPROVED",  total: 3376.40, days: 9 },
    { id: "clm_004", ref: "WPS-2026-1040", empId: "usr_001", finId: "fin_003", status: "PAID",      total: 654.00,  days: 15 },
  ];

  for (const c of claims) {
    await run(
      `INSERT IGNORE INTO expense_claims
         (id, reference, employee_id, assigned_finance_id, status, total_aed, submitted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.ref, c.empId, c.finId, c.status, c.total, daysAgo(c.days), daysAgo(c.days), daysAgo(c.days)]
    );
  }

  // Line items
  const lines = [
    { claimId: "clm_001", cat: "A: Travel Expenses",       desc: "Flights Dubai–Riyadh", date: daysAgo(2), cur: "AED", amt: 1200,  aed: 1200,    rate: 1 },
    { claimId: "clm_001", cat: "C: Meals & Entertainment", desc: "Team dinner",           date: daysAgo(1), cur: "USD", amt: 174.4, aed: 640.05,  rate: 3.67 },
    { claimId: "clm_002", cat: "A: Travel Expenses",       desc: "Hotel 2 nights",        date: daysAgo(3), cur: "EUR", amt: 285,   aed: 1168.94, rate: 4.10 },
    { claimId: "clm_003", cat: "A: Travel Expenses",       desc: "Flights + hotel",       date: daysAgo(10),cur: "USD", amt: 920,   aed: 3376.40, rate: 3.67 },
    { claimId: "clm_004", cat: "D: Telecommunication",     desc: "International SIM",     date: daysAgo(16),cur: "TRY", amt: 6000,  aed: 654.00,  rate: 0.109 },
  ];

  for (const l of lines) {
    await run(
      `INSERT IGNORE INTO expense_line_items
         (id, claim_id, category, description, expense_date, currency, amount, aed_amount, fx_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid(), l.claimId, l.cat, l.desc, l.date.slice(0, 10), l.cur, l.amt, l.aed, l.rate]
    );
  }
  console.log(`   ✓  ${claims.length} claims, ${lines.length} line items`);

  // Seed thread for clm_001
  const threadId = "thr_001";
  await run(`INSERT IGNORE INTO claim_threads (id, claim_id) VALUES (?, ?)`, [threadId, "clm_001"]);
  await run(
    `INSERT IGNORE INTO thread_participants (id, thread_id, user_id) VALUES (?, ?, ?)`,
    ["tp_001", threadId, "fin_001"]
  );
  await run(
    `INSERT IGNORE INTO thread_messages (id, thread_id, author_id, author_name, author_role, content)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ["msg_001", threadId, "usr_002", "Aisha Khan", "EMPLOYEE", "Please review my travel claim for the Riyadh visit."]
  );
  console.log("   ✓  1 thread with 1 message");

  console.log("✅  Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
