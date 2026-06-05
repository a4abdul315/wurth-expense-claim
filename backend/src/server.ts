import "./config/env";
import { env } from "./config/env";
import app from "./app";

app.listen(env.PORT, () => {
  console.log(`\n🚀  Backend running  → http://localhost:${env.PORT}`);
  console.log(`    Health          → http://localhost:${env.PORT}/api/health`);
  console.log(`    Currency rates  → http://localhost:${env.PORT}/api/currency/rates`);
  console.log(`    Finance claims  → http://localhost:${env.PORT}/api/finance/claims`);
  console.log(`\n    Mode: in-memory store (no database required)`);
  console.log(`    Auth: Authorization: Bearer mock:<email@${env.ALLOWED_DOMAIN}>\n`);
}).on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌  Port ${env.PORT} is already in use.`);
    console.error(`    Free it with:  kill $(lsof -ti:${env.PORT})\n`);
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});
