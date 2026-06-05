import { Request, Response, NextFunction } from "express";
import { query, run } from "../db/connection";
import { env } from "../config/env";

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email) { res.status(400).json({ error: "email is required" }); return; }

    const domain = email.split("@")[1] ?? "";
    if (domain !== env.ALLOWED_DOMAIN && domain !== "wuerth-professional.com") {
      res.status(403).json({ error: `Access restricted to @${env.ALLOWED_DOMAIN} accounts` });
      return;
    }

    // Upsert user in MySQL
    const [existing] = await query<Record<string,unknown>>(`SELECT * FROM users WHERE email = ?`, [email]);
    let user = existing;

    if (!user) {
      const id = uid();
      const name = req.body?.name ?? email.split("@")[0].replace(/\./g, " ");
      const dept = req.body?.department ?? "General";
      const role = domain === "wuerth-professional.com" ? "FINANCE_SUPER"
                 : ["k.rashidi","s.mohammed","o.farooq","n.alzaabi"].some(u => email.startsWith(u + "@")) ? "FINANCE"
                 : "EMPLOYEE";
      await run(
        `INSERT INTO users (id, email, name, department, role) VALUES (?, ?, ?, ?, ?)`,
        [id, email, name, dept, role]
      );
      [user] = await query<Record<string,unknown>>(`SELECT * FROM users WHERE id = ?`, [id]);
    }

    const token = `mock:${email}`;
    res.json({ data: { user, token } });
  } catch (err) { next(err); }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [user] = await query(`SELECT * FROM users WHERE email = ?`, [req.user!.email]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ data: user });
  } catch (err) { next(err); }
}
