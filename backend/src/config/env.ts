import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT:           parseInt(process.env.PORT ?? "5000", 10),
  DATABASE_URL:   process.env.DATABASE_URL ?? "",
  ALLOWED_DOMAIN: process.env.ALLOWED_DOMAIN ?? "wurth.ae",
  FRONTEND_URL:   process.env.FRONTEND_URL  ?? "http://localhost:3000",
  JWT_SECRET:     process.env.JWT_SECRET    ?? "dev-secret-change-in-production",
};
