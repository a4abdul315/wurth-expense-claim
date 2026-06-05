import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import authRoutes         from "./routes/auth.routes";
import claimsRoutes       from "./routes/claims.routes";
import financeRoutes      from "./routes/finance.routes";
import currencyRoutes     from "./routes/currency.routes";
import threadRoutes       from "./routes/thread.routes";
import notificationRoutes from "./routes/notification.routes";
import { notFound, errorHandler } from "./middleware/error";

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS — allow the frontend origin.
// In development we also allow any localhost port so Next.js hot-reload
// ports (3001, 3002 etc.) never cause a CORS block.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow the configured frontend URL
    if (origin === env.FRONTEND_URL) return callback(null, true);
    // Allow any localhost / 127.0.0.1 port in development
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// JSON body parser (10mb limit for receipt metadata payloads)
app.use(express.json({ limit: "10mb" }));

// Request logging
app.use(morgan("dev"));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ data: { status: "ok", time: new Date().toISOString() } });
});

app.use("/api/auth",          authRoutes);
app.use("/api/claims",        claimsRoutes);
app.use("/api/finance",       financeRoutes);
app.use("/api/currency",      currencyRoutes);
app.use("/api/threads",       threadRoutes);
app.use("/api/notifications", notificationRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
