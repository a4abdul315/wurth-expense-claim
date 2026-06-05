/**
 * Creates all MySQL tables from scratch.
 * Run once:  npm run db:setup
 *
 * Safe to re-run — all statements use IF NOT EXISTS.
 */

import { pool } from "./connection";
import "dotenv/config";

const TABLES = [
  // ── Users ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id             VARCHAR(36)  NOT NULL PRIMARY KEY,
    email          VARCHAR(200) NOT NULL UNIQUE,
    name           VARCHAR(200) NOT NULL,
    department     VARCHAR(100) NOT NULL DEFAULT 'General',
    role           ENUM('EMPLOYEE','FINANCE','FINANCE_SUPER','ADMIN') NOT NULL DEFAULT 'EMPLOYEE',
    bank_details_set TINYINT(1) NOT NULL DEFAULT 0,
    iban           VARCHAR(50)  NOT NULL DEFAULT '',
    swift          VARCHAR(20)  NOT NULL DEFAULT '',
    bank_name      VARCHAR(100) NOT NULL DEFAULT '',
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ── Expense claims ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS expense_claims (
    id                   VARCHAR(36)  NOT NULL PRIMARY KEY,
    reference            VARCHAR(30)  UNIQUE,
    employee_id          VARCHAR(36)  NOT NULL,
    assigned_finance_id  VARCHAR(36),
    status               ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED','PAID') NOT NULL DEFAULT 'DRAFT',
    total_aed            DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes                TEXT,
    reject_reason        TEXT,
    submitted_at         DATETIME,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    INDEX idx_employee   (employee_id),
    INDEX idx_status     (status),
    INDEX idx_finance    (assigned_finance_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ── Expense line items ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS expense_line_items (
    id          VARCHAR(36)   NOT NULL PRIMARY KEY,
    claim_id    VARCHAR(36)   NOT NULL,
    category    VARCHAR(100)  NOT NULL,
    event_name  VARCHAR(200)  NOT NULL DEFAULT '',
    description VARCHAR(500)  NOT NULL,
    expense_date DATE         NOT NULL,
    country     VARCHAR(100)  NOT NULL DEFAULT '',
    currency    VARCHAR(10)   NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    aed_amount  DECIMAL(12,2) NOT NULL,
    fx_rate     DECIMAL(12,8) NOT NULL,
    receipt_no  VARCHAR(50)   NOT NULL DEFAULT '',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES expense_claims(id) ON DELETE CASCADE,
    INDEX idx_claim (claim_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ── Claim threads ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS claim_threads (
    id         VARCHAR(36) NOT NULL PRIMARY KEY,
    claim_id   VARCHAR(36) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES expense_claims(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ── Thread messages ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS thread_messages (
    id          VARCHAR(36) NOT NULL PRIMARY KEY,
    thread_id   VARCHAR(36) NOT NULL,
    author_id   VARCHAR(36) NOT NULL,
    author_name VARCHAR(200) NOT NULL,
    author_role VARCHAR(50)  NOT NULL,
    content     TEXT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES claim_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id)  REFERENCES users(id),
    INDEX idx_thread (thread_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ── Thread participants ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS thread_participants (
    id          VARCHAR(36) NOT NULL PRIMARY KEY,
    thread_id   VARCHAR(36) NOT NULL,
    user_id     VARCHAR(36) NOT NULL,
    invited_by  VARCHAR(36),
    joined_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_thread_user (thread_id, user_id),
    FOREIGN KEY (thread_id)  REFERENCES claim_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id),
    INDEX idx_thread (thread_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ── Notifications ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS notifications (
    id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id    VARCHAR(36)  NOT NULL,
    type       VARCHAR(50)  NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       VARCHAR(500) NOT NULL,
    claim_id   VARCHAR(36),
    thread_id  VARCHAR(36),
    is_read    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_read (user_id, is_read)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ── Audit log (append-only) ────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    claim_id   VARCHAR(36),
    user_id    VARCHAR(36),
    action     VARCHAR(100) NOT NULL,
    metadata   JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_claim (claim_id),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function setup() {
  console.log("🔧  Creating MySQL tables...");
  for (const sql of TABLES) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] ?? "?";
    await pool.execute(sql);
    console.log(`   ✓  ${tableName}`);
  }
  console.log("✅  All tables ready.");
  await pool.end();
}

setup().catch((err) => {
  console.error("❌  Setup failed:", err.message);
  process.exit(1);
});
