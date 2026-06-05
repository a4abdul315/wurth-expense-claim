import { Request, Response, NextFunction } from "express";
import { userStore } from "../data/store";
import { env } from "../config/env";

/**
 * POST /api/auth/login
 * PRODUCTION: Validate an Azure AD access token (MSAL) — never a password.
 * The user's email + role come from the verified token, not the request body.
 */
export function login(req: Request, res: Response, next: NextFunction): void {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();

    if (!email) { res.status(400).json({ error: "email is required" }); return; }

    if (!email.endsWith(`@${env.ALLOWED_DOMAIN}`)) {
      res.status(403).json({ error: `Access restricted to @${env.ALLOWED_DOMAIN} accounts` });
      return;
    }

    const user = userStore.upsert({ email, name: req.body?.name, department: req.body?.department });

    // Mock token — PRODUCTION: Azure AD issues this, not us
    const token = `mock:${email}`;

    res.json({ data: { user, token } });
  } catch (err) { next(err); }
}

/** GET /api/auth/me */
export function getMe(req: Request, res: Response): void {
  const user = userStore.findByEmail(req.user!.email);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ data: user });
}
