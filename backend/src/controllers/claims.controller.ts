import { Request, Response, NextFunction } from "express";
import { query, run } from "../db/connection";
import { convertToAed } from "../services/currency.service";
import { nextReference } from "../utils/reference";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomingLine {
  category:    string;
  eventName?:  string;
  description: string;
  date:        string;
  country?:    string;
  currency:    string;
  amount:      number;
  receiptNo?:  string;
}

interface IncomingReceipt {
  name:        string;
  size:        number;
  type:        string;
  previewUrl?: string | null;
}

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

async function priceLines(raw: IncomingLine[]) {
  return Promise.all((raw ?? []).map(async (l) => {
    const { aedAmount, rate } = await convertToAed(Number(l.amount), l.currency);
    return {
      id:          uid(),
      category:    l.category    ?? "Other",
      eventName:   l.eventName   ?? "",
      description: l.description ?? "",
      date:        l.date ?? new Date().toISOString().slice(0, 10),
      country:     l.country     ?? "",
      currency:    l.currency.toUpperCase(),
      amount:      Number(l.amount),
      aedAmount,
      fxRate:      rate,
      receiptNo:   l.receiptNo   ?? "",
    };
  }));
}

// ─── Helpers to build full claim object ───────────────────────────────────────

async function buildClaim(claimId: string) {
  const [claim] = await query<Record<string,unknown>>(
    `SELECT ec.*,
            u.name       AS employee_name,
            u.email      AS employee_email,
            u.department AS employee_department,
            u.iban, u.swift, u.bank_name
     FROM   expense_claims ec
     JOIN   users u ON u.id = ec.employee_id
     WHERE  ec.id = ?`,
    [claimId]
  );
  if (!claim) return null;
  claim.lines     = await query(`SELECT * FROM expense_line_items WHERE claim_id = ? ORDER BY created_at ASC`, [claimId]);
  claim.receipts  = await query(`SELECT * FROM claim_receipts       WHERE claim_id = ? ORDER BY created_at ASC`, [claimId]);
  return claim;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/** GET /api/claims */
export async function listClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claims = await query<Record<string,unknown>>(
      `SELECT ec.*, u.name AS employee_name, u.department AS employee_department
       FROM expense_claims ec JOIN users u ON u.id = ec.employee_id
       WHERE ec.employee_id = ?
       ORDER BY ec.created_at DESC`,
      [req.user!.id]
    );
    res.json({ data: claims });
  } catch (err) { next(err); }
}

/** GET /api/claims/:id */
export async function getClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claim = await buildClaim(req.params.id);
    if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }
    if (claim.employee_id !== req.user!.id) { res.status(403).json({ error: "Not your claim" }); return; }
    res.json({ data: claim });
  } catch (err) { next(err); }
}

/** POST /api/claims — create draft */
export async function createClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lines, notes, assignedFinanceId, receipts } = req.body ?? {};
    const priced   = await priceLines(lines ?? []);
    const totalAed = priced.reduce((s, l) => s + l.aedAmount, 0);
    const claimId  = uid();

    await run(
      `INSERT INTO expense_claims (id, employee_id, assigned_finance_id, status, total_aed, notes)
       VALUES (?, ?, ?, 'DRAFT', ?, ?)`,
      [claimId, req.user!.id, assignedFinanceId ?? null, totalAed, notes ?? null]
    );

    for (const l of priced) {
      await run(
        `INSERT INTO expense_line_items
           (id, claim_id, category, event_name, description, expense_date, country, currency, amount, aed_amount, fx_rate, receipt_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [l.id, claimId, l.category, l.eventName, l.description, l.date, l.country, l.currency, l.amount, l.aedAmount, l.fxRate, l.receiptNo]
      );
    }

    // Store receipt metadata
    for (const r of (receipts ?? []) as IncomingReceipt[]) {
      await run(
        `INSERT INTO claim_receipts (id, claim_id, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?)`,
        [uid(), claimId, r.name, r.size, r.type]
      );
    }

    const claim = await buildClaim(claimId);
    res.status(201).json({ data: claim });
  } catch (err) { next(err); }
}

/** POST /api/claims/:id/submit */
export async function submitClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [existing] = await query<Record<string,unknown>>(
      `SELECT * FROM expense_claims WHERE id = ?`, [req.params.id]
    );
    if (!existing)                              { res.status(404).json({ error: "Claim not found" }); return; }
    if (existing.employee_id !== req.user!.id)  { res.status(403).json({ error: "Not your claim" }); return; }
    if (existing.status !== "DRAFT")            { res.status(409).json({ error: "Only DRAFT claims can be submitted" }); return; }

    // Re-price lines server-side (never trust client totals)
    const rawLines = await query<Record<string,unknown>>(
      `SELECT * FROM expense_line_items WHERE claim_id = ?`, [req.params.id]
    );
    const repriced = await priceLines(rawLines.map((l) => ({
      category: l.category as string, eventName: l.event_name as string,
      description: l.description as string, date: String(l.expense_date).slice(0, 10),
      country: l.country as string, currency: l.currency as string,
      amount: Number(l.amount), receiptNo: l.receipt_no as string,
    })));
    const totalAed  = repriced.reduce((s, l) => s + l.aedAmount, 0);
    const reference = await nextReference();
    const now       = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Update line items with server-computed AED
    for (let i = 0; i < repriced.length; i++) {
      await run(
        `UPDATE expense_line_items SET aed_amount = ?, fx_rate = ? WHERE id = ?`,
        [repriced[i].aedAmount, repriced[i].fxRate, rawLines[i].id]
      );
    }

    await run(
      `UPDATE expense_claims SET status='SUBMITTED', reference=?, total_aed=?, submitted_at=? WHERE id=?`,
      [reference, totalAed, now, req.params.id]
    );

    // Create notification for assigned Finance person
    const assignedId = existing.assigned_finance_id as string;
    if (assignedId) {
      await run(
        `INSERT INTO notifications (id, user_id, type, title, body, claim_id, is_read)
         VALUES (?, ?, 'CLAIM_ASSIGNED', ?, ?, ?, 0)`,
        [uid(), assignedId,
         `New claim from ${req.user!.name}`,
         `${reference} · AED ${totalAed.toFixed(2)} — assigned to you for review.`,
         req.params.id]
      );
    }

    const claim = await buildClaim(req.params.id);
    res.json({ data: claim });
  } catch (err) { next(err); }
}

/** DELETE /api/claims/:id */
export async function deleteClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [claim] = await query<Record<string,unknown>>(`SELECT * FROM expense_claims WHERE id = ?`, [req.params.id]);
    if (!claim)                             { res.status(404).json({ error: "Claim not found" }); return; }
    if (claim.employee_id !== req.user!.id) { res.status(403).json({ error: "Not your claim" }); return; }
    if (claim.status !== "DRAFT")           { res.status(409).json({ error: "Only DRAFT claims can be deleted" }); return; }
    await run(`DELETE FROM expense_claims WHERE id = ?`, [req.params.id]);
    res.json({ data: { deleted: true } });
  } catch (err) { next(err); }
}
