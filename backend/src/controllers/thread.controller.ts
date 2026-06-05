import { Request, Response, NextFunction } from "express";
import { threadStore, notificationStore, claimStore, userStore } from "../data/store";

const FINANCE_NOTIFY_EMAIL = "zk@wuerth-professional.com"; // Finance super user

/** GET /api/threads/claim/:claimId */
export function getThread(req: Request, res: Response): void {
  const thread = threadStore.findByClaim(req.params.claimId);
  if (!thread) { res.status(404).json({ error: "No thread for this claim yet" }); return; }
  res.json({ data: thread });
}

/** POST /api/threads/claim/:claimId/messages */
export function postMessage(req: Request, res: Response): void {
  const { content } = req.body ?? {};
  if (!content?.trim()) { res.status(400).json({ error: "Message content is required" }); return; }

  const thread = threadStore.findByClaim(req.params.claimId);
  if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }

  // Check the user is a participant (or Finance_Super who can see all)
  const user = userStore.findById(req.user!.id);
  const isParticipant = thread.participants.some((p) => p.userId === req.user!.id);
  const isSuperUser   = user?.role === "FINANCE_SUPER";

  if (!isParticipant && !isSuperUser) {
    res.status(403).json({ error: "You are not a participant in this thread" });
    return;
  }

  const msg = threadStore.addMessage(thread.id, req.user!.id, content.trim());
  if (!msg) { res.status(500).json({ error: "Could not add message" }); return; }

  // Notify all other participants
  thread.participants
    .filter((p) => p.userId !== req.user!.id)
    .forEach((p) => {
      notificationStore.create({
        userId: p.userId, type: "THREAD_MESSAGE",
        title:  `New message in claim ${thread.claimId}`,
        body:   `${msg.authorName}: "${content.slice(0, 60)}..."`,
        claimId: thread.claimId, threadId: thread.id, read: false,
      });
    });

  // PRODUCTION: also send email to participants via SendGrid
  // sendEmail({ to: participantEmails, subject: `Thread update — ${claim.reference}`, ... })
  console.log(`[thread] New message in ${thread.claimId} — would email ${FINANCE_NOTIFY_EMAIL}`);

  res.status(201).json({ data: msg });
}

/** POST /api/threads/claim/:claimId/invite */
export function inviteParticipant(req: Request, res: Response, next: NextFunction): void {
  const { inviteeId } = req.body ?? {};
  if (!inviteeId) { res.status(400).json({ error: "inviteeId is required" }); return; }

  const thread = threadStore.findByClaim(req.params.claimId);
  if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }

  const result = threadStore.inviteParticipant(thread.id, req.user!.id, inviteeId);

  if (!result.success) {
    res.status(403).json({ error: result.error });
    return;
  }

  // Notify the invited person
  const invitee = userStore.findById(inviteeId);
  if (invitee) {
    notificationStore.create({
      userId: inviteeId, type: "THREAD_INVITE",
      title:  "You've been invited to a claim thread",
      body:   `${req.user!.name} invited you to discuss claim ${req.params.claimId}`,
      claimId: req.params.claimId, threadId: thread.id, read: false,
    });

    // PRODUCTION: send email notification
    console.log(`[thread] Invited ${invitee.email} to thread ${thread.id} — would send email`);
  }

  res.status(201).json({ data: result.participant });
}

/** GET /api/threads/claim/:claimId/participants */
export function getParticipants(req: Request, res: Response): void {
  const thread = threadStore.findByClaim(req.params.claimId);
  if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
  res.json({ data: thread.participants });
}
