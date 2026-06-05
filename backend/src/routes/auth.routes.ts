import { Router } from "express";
import { login, getMe } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", login);          // POST /api/auth/login
router.get("/me", requireAuth, getMe); // GET  /api/auth/me

export default router;
