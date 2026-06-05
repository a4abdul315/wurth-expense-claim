import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getThread, postMessage, inviteParticipant } from "../controllers/thread.controller";

const router = Router();
router.use(requireAuth);

router.get( "/claim/:claimId",               getThread);          // GET  /api/threads/claim/:claimId
router.post("/claim/:claimId/messages",      postMessage);        // POST /api/threads/claim/:claimId/messages
router.post("/claim/:claimId/invite",        inviteParticipant);  // POST /api/threads/claim/:claimId/invite

export default router;
