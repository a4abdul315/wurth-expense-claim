import { Request, Response, NextFunction } from "express";
import { query, run } from "../db/connection";

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

async function getOrCreateThread(claimId: string): Promise<string> {
  const [existing] = await query<{id:string}>(`SELECT id FROM claim_threads WHERE claim_id = ?`, [claimId]);
  if (existing) return existing.id;
  const threadId = uid();
  await run(`INSERT INTO claim_threads (id, claim_id) VALUES (?, ?)`, [threadId, claimId]);
  return threadId;
}

/** GET /api/threads/claim/:claimId */
export async function getThread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const threadId = await getOrCreateThread(req.params.claimId);
    const messages     = await query(`SELECT tm.*, u.name AS author_name, u.role AS author_role FROM thread_messages tm JOIN users u ON u.id = tm.author_id WHERE tm.thread_id = ? ORDER BY tm.created_at ASC`, [threadId]);
    const participants = await query(`SELECT tp.*, u.name, u.email, u.role FROM thread_participants tp JOIN users u ON u.id = tp.user_id WHERE tp.thread_id = ?`, [threadId]);
    res.json({ data: { id: threadId, claimId: req.params.claimId, messages, participants } });
  } catch (err) { next(err); }
}

/** POST /api/threads/claim/:claimId/messages */
export async function postMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { content } = req.body ?? {};
    if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

    const threadId = await getOrCreateThread(req.params.claimId);
    const msgId    = uid();
    await run(
      `INSERT INTO thread_messages (id, thread_id, author_id, content) VALUES (?, ?, ?, ?)`,
      [msgId, threadId, req.user!.id, content.trim()]
    );

    // Notify all participants
    const participants = await query<{user_id:string}>(`SELECT user_id FROM thread_participants WHERE thread_id = ?`, [threadId]);
    for (const p of participants) {
      if (p.user_id === req.user!.id) continue;
      await run(
        `INSERT INTO notifications (id, user_id, type, title, body, claim_id, is_read) VALUES (?, ?, 'THREAD_MESSAGE', ?, ?, ?, 0)`,
        [uid(), p.user_id, `New message from ${req.user!.name}`, content.trim().slice(0, 80), req.params.claimId]
      );
    }

    const [msg] = await query(`SELECT tm.*, u.name AS author_name, u.role AS author_role FROM thread_messages tm JOIN users u ON u.id = tm.author_id WHERE tm.id = ?`, [msgId]);
    res.status(201).json({ data: msg });
  } catch (err) { next(err); }
}

/** POST /api/threads/claim/:claimId/invite */
export async function inviteParticipant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { inviteeEmail } = req.body ?? {};
    if (!inviteeEmail) { res.status(400).json({ error: "inviteeEmail is required" }); return; }

    // Only Finance can invite
    if (req.user!.role === "EMPLOYEE") {
      res.status(403).json({ error: "Employees cannot invite others to a thread" }); return;
    }

    const [invitee] = await query<{id:string; name:string; email:string; role:string}>(`SELECT * FROM users WHERE email = ?`, [inviteeEmail.toLowerCase()]);
    if (!invitee) { res.status(404).json({ error: "User not found" }); return; }
    if (invitee.role === "EMPLOYEE") { res.status(403).json({ error: "Cannot invite employees to Finance threads" }); return; }

    const threadId = await getOrCreateThread(req.params.claimId);

    // Check already in thread
    const [already] = await query(`SELECT id FROM thread_participants WHERE thread_id = ? AND user_id = ?`, [threadId, invitee.id]);
    if (already) { res.status(409).json({ error: `${invitee.name} is already in this thread` }); return; }

    const partId = uid();
    await run(
      `INSERT INTO thread_participants (id, thread_id, user_id, invited_by) VALUES (?, ?, ?, ?)`,
      [partId, threadId, invitee.id, req.user!.id]
    );

    // System message
    await run(
      `INSERT INTO thread_messages (id, thread_id, author_id, content) VALUES (?, ?, ?, ?)`,
      [uid(), threadId, req.user!.id, `${req.user!.name} invited ${invitee.name} to this thread.`]
    );

    // Notify invitee
    await run(
      `INSERT INTO notifications (id, user_id, type, title, body, claim_id, is_read) VALUES (?, ?, 'THREAD_INVITE', ?, ?, ?, 0)`,
      [uid(), invitee.id, `You've been invited to a discussion`, `${req.user!.name} invited you to discuss claim ${req.params.claimId}`, req.params.claimId]
    );

    res.status(201).json({ data: { userId: invitee.id, name: invitee.name, email: invitee.email, role: invitee.role } });
  } catch (err) { next(err); }
}
