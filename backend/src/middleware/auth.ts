import { Request, Response, NextFunction } from "express";
import { query, run } from "../db/connection";
import { env } from "../config/env";

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

/**
 * Mock auth middleware — reads a Bearer token from the Authorization header.
 * Token format: "mock:<email>"
 *
 * PRODUCTION: verify a real Azure AD JWT (MSAL / azure-ad-verify-token).
 * Check iss, aud, exp claims. Derive email + role from the validated token.
 * Never trust client-supplied identity claims.
 */

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string; department: string; role: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }

  const email = token.startsWith("mock:") ? token.slice(5).toLowerCase() : null;
  if (!email) { res.status(401).json({ error: "Invalid token" }); return; }

  const domain = email.split("@")[1] ?? "";
  if (domain !== env.ALLOWED_DOMAIN && domain !== "wuerth-professional.com") {
    res.status(403).json({ error: `Access restricted to @${env.ALLOWED_DOMAIN} accounts` });
    return;
  }

  try {
    let [user] = await query<Record<string,unknown>>(`SELECT * FROM users WHERE email = ?`, [email]);

    if (!user) {
      // Auto-create user on first login
      // Determine role from email domain/pattern
      // PRODUCTION: role comes from Azure AD group membership, not email
      const id   = uid();
      const name = email.split("@")[0].replace(/\./g, " ");
      const financeEmails = ["k.rashidi","s.mohammed","o.farooq","n.alzaabi","finance"];
      const role = domain === "wuerth-professional.com"                         ? "FINANCE_SUPER"
                 : financeEmails.some((u) => email.startsWith(u + "@"))         ? "FINANCE"
                 : "EMPLOYEE";
      await run(`INSERT INTO users (id, email, name, department, role) VALUES (?, ?, ?, 'General', ?)`, [id, email, name, role]);
      [user] = await query<Record<string,unknown>>(`SELECT * FROM users WHERE id = ?`, [id]);
    }

    req.user = {
      id:         String(user.id),
      email:      String(user.email),
      name:       String(user.name),
      department: String(user.department),
      role:       String(user.role),
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireFinance(req: Request, res: Response, next: NextFunction): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (req.user?.role !== "FINANCE" && req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Finance or Admin role required" });
    return;
  }
  next();
}
