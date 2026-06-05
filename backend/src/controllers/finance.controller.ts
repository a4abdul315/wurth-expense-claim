import { Request, Response, NextFunction } from "express";
import { query, run } from "../db/connection";
import { generateClaimPdf } from "../services/pdf.service";

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

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
  claim.lines    = await query(`SELECT * FROM expense_line_items WHERE claim_id = ? ORDER BY created_at ASC`, [claimId]);
  claim.receipts = await query(`SELECT * FROM claim_receipts       WHERE claim_id = ? ORDER BY created_at ASC`, [claimId]);
  return claim;
}

/** GET /api/finance/claims — all claims */
export async function listAllClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query;
    const where = status ? `AND ec.status = ?` : "";
    const params = status ? [String(status).toUpperCase()] : [];

    const claims = await query<Record<string,unknown>>(
      `SELECT ec.*,
              u.name       AS employee_name,
              u.email      AS employee_email,
              u.department AS employee_department
       FROM   expense_claims ec
       JOIN   users u ON u.id = ec.employee_id
       WHERE  ec.status != 'DRAFT' ${where}
       ORDER  BY ec.created_at DESC`,
      params
    );

    // Attach lines + receipts
    for (const c of claims) {
      c.lines    = await query(`SELECT * FROM expense_line_items WHERE claim_id = ? ORDER BY created_at ASC`, [c.id]);
      c.receipts = await query(`SELECT * FROM claim_receipts       WHERE claim_id = ? ORDER BY created_at ASC`, [c.id]);
    }

    res.json({ data: claims });
  } catch (err) { next(err); }
}

/** GET /api/finance/claims/:id */
export async function getAnyClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claim = await buildClaim(req.params.id);
    if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }
    res.json({ data: claim });
  } catch (err) { next(err); }
}

/** PATCH /api/finance/claims/:id — approve / reject / paid */
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, rejectReason } = req.body ?? {};
    const allowed = ["APPROVED","REJECTED","PAID"];
    if (!allowed.includes(String(status).toUpperCase())) {
      res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
      return;
    }

    const [claim] = await query<Record<string,unknown>>(`SELECT * FROM expense_claims WHERE id = ?`, [req.params.id]);
    if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }
    if (claim.status === "DRAFT") { res.status(409).json({ error: "Cannot action a DRAFT claim" }); return; }

    const s = status.toUpperCase();
    await run(
      `UPDATE expense_claims SET status = ?, reject_reason = ? WHERE id = ?`,
      [s, s === "REJECTED" ? (rejectReason ?? "") : null, req.params.id]
    );

    // Notify employee (employee_id is always a real user id)
    await run(
      `INSERT INTO notifications (id, user_id, type, title, body, claim_id, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [uid(), claim.employee_id,
       `CLAIM_${s}`,
       `Your claim ${claim.reference} has been ${s.toLowerCase()}`,
       s === "REJECTED" ? `Reason: ${rejectReason ?? "No reason provided"}` : `Reviewed by Finance team.`,
       req.params.id]
    );

    const updated = await buildClaim(req.params.id);
    res.json({ data: updated });
  } catch (err) { next(err); }
}

/** GET /api/finance/export — CSV */
export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claims = await query<Record<string,unknown>>(
      `SELECT ec.*, u.name AS employee_name, u.department AS employee_department, u.email AS employee_email
       FROM expense_claims ec JOIN users u ON u.id = ec.employee_id
       WHERE ec.status != 'DRAFT' ORDER BY ec.created_at DESC`
    );
    const header = ["Reference","Employee","Department","Email","Total AED","Status","Submitted"];
    const esc    = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows   = claims.map((c) => [
      c.reference ?? "DRAFT", c.employee_name, c.employee_department, c.employee_email,
      Number(c.total_aed).toFixed(2), c.status, c.submitted_at ?? "",
    ]);
    const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="wps-claims-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
}

/** GET /api/finance/claims/:id/pdf */
export async function downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claim = await buildClaim(req.params.id);
    if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }

    const pdfBytes = await generateClaimPdf({
      reference:   String(claim.reference ?? "DRAFT"),
      generatedAt: new Date().toLocaleString("en-GB"),
      status:      String(claim.status),
      employee: {
        name: String(claim.employee_name), email: String(claim.employee_email),
        department: String(claim.employee_department),
        iban: String(claim.iban ?? ""), swift: String(claim.swift ?? ""),
        bankName: String(claim.bank_name ?? ""),
      },
      totalAed: `AED ${Number(claim.total_aed).toLocaleString("en-AE", { minimumFractionDigits: 2 })}`,
      lines: (claim.lines as Record<string,unknown>[]).map((l) => ({
        category: String(l.category), eventName: String(l.event_name ?? ""),
        description: String(l.description), date: String(l.expense_date).slice(0, 10),
        country: String(l.country ?? ""), currency: String(l.currency),
        amount: Number(l.amount).toFixed(2),
        aedAmount: `AED ${Number(l.aed_amount).toFixed(2)}`,
        fxRate: Number(l.fx_rate).toFixed(4), receiptNo: String(l.receipt_no ?? ""),
      })),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${claim.reference ?? claim.id}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(pdfBytes));
  } catch (err) { next(err); }
}
