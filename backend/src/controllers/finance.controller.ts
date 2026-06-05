import { Request, Response, NextFunction } from "express";
import { claimStore, type Status } from "../data/store";
import { generateClaimPdf } from "../services/pdf.service";

/** GET /api/finance/claims */
export function listAllClaims(req: Request, res: Response): void {
  let claims = claimStore.findAll();
  const { status } = req.query;
  if (status) claims = claims.filter((c) => c.status === String(status).toUpperCase());
  res.json({ data: claims });
}

/** GET /api/finance/claims/:id */
export function getAnyClaim(req: Request, res: Response): void {
  const claim = claimStore.findById(req.params.id);
  if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }
  res.json({ data: claim });
}

/** PATCH /api/finance/claims/:id  — approve / reject / paid */
export function updateStatus(req: Request, res: Response): void {
  const { status, rejectReason } = req.body ?? {};
  const allowed: Status[] = ["APPROVED", "REJECTED", "PAID"];

  if (!allowed.includes(String(status).toUpperCase() as Status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    return;
  }

  const claim = claimStore.findById(req.params.id);
  if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }
  if (claim.status === "DRAFT") { res.status(409).json({ error: "Cannot action a DRAFT claim" }); return; }

  const updated = claimStore.update(claim.id, {
    status:       status.toUpperCase() as Status,
    rejectReason: status.toUpperCase() === "REJECTED" ? (rejectReason ?? "") : null,
  });

  res.json({ data: updated });
}

/** GET /api/finance/export — CSV download */
export function exportCsv(_req: Request, res: Response): void {
  const claims = claimStore.findAll();
  const header = ["Reference", "Employee", "Department", "Total AED", "Status", "Submitted", "Created"];
  const esc    = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows   = claims.map((c) => [
    c.reference ?? "DRAFT",
    c.employee?.name ?? "",
    c.employee?.department ?? "",
    c.totalAed.toFixed(2),
    c.status,
    c.submittedAt ?? "",
    c.createdAt,
  ]);

  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="wps-claims-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}

/** GET /api/finance/claims/:id/pdf — Finance PDF download */
export async function downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claim = claimStore.findById(req.params.id);
    if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }

    const emp = claim.employee;
    const pdfBytes = await generateClaimPdf({
      reference:   claim.reference ?? "DRAFT",
      generatedAt: new Date().toLocaleString("en-GB"),
      status:      claim.status,
      notes:       claim.notes ?? undefined,
      employee: {
        name:       emp?.name     ?? "",
        email:      emp?.email    ?? "",
        department: emp?.department ?? "",
        iban:       emp?.iban     ?? "",
        swift:      emp?.swift    ?? "",
        bankName:   emp?.bankName ?? "",
      },
      totalAed: `AED ${claim.totalAed.toLocaleString("en-AE", { minimumFractionDigits: 2 })}`,
      lines: claim.lines.map((l) => ({
        category:    l.category,
        eventName:   l.eventName,
        description: l.description,
        date:        new Date(l.date).toLocaleDateString("en-GB"),
        country:     l.country,
        currency:    l.currency,
        amount:      l.amount.toFixed(2),
        aedAmount:   `AED ${l.aedAmount.toFixed(2)}`,
        fxRate:      l.fxRate.toFixed(4),
        receiptNo:   l.receiptNo,
      })),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${claim.reference ?? claim.id}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(pdfBytes));
  } catch (err) { next(err); }
}
