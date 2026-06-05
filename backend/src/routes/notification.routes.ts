import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getNotifications, markRead, markAllRead } from "../controllers/notification.controller";

const router = Router();
router.use(requireAuth);

router.get( "/",                getNotifications);  // GET   /api/notifications
router.patch("/:id/read",       markRead);           // PATCH /api/notifications/:id/read
router.post("/read-all",        markAllRead);         // POST  /api/notifications/read-all

export default router;
