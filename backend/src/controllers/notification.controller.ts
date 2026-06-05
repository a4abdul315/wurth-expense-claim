import { Request, Response } from "express";
import { notificationStore } from "../data/store";

/** GET /api/notifications — current user's notifications */
export function getNotifications(req: Request, res: Response): void {
  const notifs = notificationStore.findForUser(req.user!.id);
  const unread = notificationStore.unreadCount(req.user!.id);
  res.json({ data: notifs, meta: { unread } });
}

/** PATCH /api/notifications/:id/read */
export function markRead(req: Request, res: Response): void {
  const ok = notificationStore.markRead(req.params.id, req.user!.id);
  if (!ok) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json({ data: { read: true } });
}

/** POST /api/notifications/read-all */
export function markAllRead(req: Request, res: Response): void {
  notificationStore.markAllRead(req.user!.id);
  res.json({ data: { success: true } });
}
