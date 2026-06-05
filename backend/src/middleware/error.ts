import { Request, Response, NextFunction } from "express";

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error("[error]", err);

  // Prisma / DB connection errors → 503 (clear message for demo)
  const message = err instanceof Error ? err.message : "Internal server error";
  if (message.includes("DATABASE_URL") || message.includes("connect ECONNREFUSED") || message.includes("prisma")) {
    res.status(503).json({ error: "Database unavailable. Set DATABASE_URL in backend/.env and run: npm run db:push && npm run seed" });
    return;
  }

  res.status(500).json({ error: message });
}
