import { Router } from "express";
import { requireAuth, requireFinance } from "../middleware/auth";
import {
  listAllClaims, getAnyClaim, updateStatus,
  exportCsv, downloadPdf,
} from "../controllers/finance.controller";

const router = Router();

// All finance routes require authentication + Finance/Admin role
router.use(requireAuth, requireFinance);

router.get("/claims",          listAllClaims); // GET   /api/finance/claims
router.get("/claims/:id",      getAnyClaim);   // GET   /api/finance/claims/:id
router.patch("/claims/:id",    updateStatus);  // PATCH /api/finance/claims/:id  (approve/reject/paid)
router.get("/claims/:id/pdf",  downloadPdf);   // GET   /api/finance/claims/:id/pdf
router.get("/export",          exportCsv);     // GET   /api/finance/export

export default router;
