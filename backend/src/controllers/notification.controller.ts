import { Request, Response, NextFunction } from "express";
import { query, run } from "../db/connection";

/** GET /api/notifications */
export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifs = await query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    const [{ unread }] = await query<{unread:number}>(
      `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user!.id]
    );
    res.json({ data: notifs, meta: { unread } });
  } catch (err) { next(err); }
}

/** PATCH /api/notifications/:id/read */
export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user!.id]);
    res.json({ data: { read: true } });
  } catch (err) { next(err); }
}

/** POST /api/notifications/read-all */
export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user!.id]);
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
}
