import "./config/env";
import { env } from "./config/env";
import app from "./app";
import { testConnection } from "./db/connection";

async function start() {
  // Test MySQL connection
  try {
    await testConnection();
    console.log("✅  MySQL connected");
  } catch (err) {
    console.warn("⚠️  MySQL unavailable — running with in-memory fallback store.");
    console.warn("   To connect MySQL:");
    console.warn("     1. Update DATABASE_URL in backend/.env");
    console.warn("     2. npm run db:setup   (create tables)");
    console.warn("     3. npm run db:seed    (insert demo data)");
    console.warn("   Detail:", (err as Error).message.split("\n")[0]);
  }

  app.listen(env.PORT, () => {
    console.log(`\n🚀  Backend → http://localhost:${env.PORT}`);
    console.log(`    Health   → http://localhost:${env.PORT}/api/health\n`);
  }).on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌  Port ${env.PORT} in use — run: kill $(lsof -ti:${env.PORT})\n`);
    } else {
      console.error("Server error:", err.message);
    }
    process.exit(1);
  });
}

start();
