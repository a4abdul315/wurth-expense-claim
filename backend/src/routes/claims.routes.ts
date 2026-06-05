import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listClaims, getClaim, createClaim, submitClaim, deleteClaim } from "../controllers/claims.controller";

const router = Router();

router.use(requireAuth); // all claims routes require authentication

router.get("/",           listClaims);   // GET    /api/claims
router.post("/",          createClaim);  // POST   /api/claims
router.get("/:id",        getClaim);     // GET    /api/claims/:id
router.post("/:id/submit", submitClaim); // POST   /api/claims/:id/submit
router.delete("/:id",     deleteClaim);  // DELETE /api/claims/:id

export default router;
