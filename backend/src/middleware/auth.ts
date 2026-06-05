import { Request, Response, NextFunction } from "express";
import { userStore } from "../data/store";
import { env } from "../config/env";

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

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Not authenticated — send: Authorization: Bearer mock:<email>" });
    return;
  }

  const email = token.startsWith("mock:") ? token.slice(5).toLowerCase() : null;

  if (!email || !email.endsWith(`@${env.ALLOWED_DOMAIN}`)) {
    res.status(403).json({ error: `Access restricted to @${env.ALLOWED_DOMAIN} accounts` });
    return;
  }

  // Upsert user in the in-memory store
  const user = userStore.upsert({ email });
  req.user   = { id: user.id, email: user.email, name: user.name, department: user.department, role: user.role };
  next();
}

export function requireFinance(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "FINANCE" && req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Finance or Admin role required" });
    return;
  }
  next();
}
