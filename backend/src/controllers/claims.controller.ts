import { Request, Response, NextFunction } from "express";
import { claimStore, nextReference } from "../data/store";
import { convertToAed } from "../services/currency.service";

// ─── Helper ───────────────────────────────────────────────────────────────────

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

async function priceLines(raw: IncomingLine[]) {
  return Promise.all(
    (raw ?? []).map(async (l) => {
      const { aedAmount, rate } = await convertToAed(Number(l.amount), l.currency);
      return {
        category:    l.category    ?? "Other",
        eventName:   l.eventName   ?? "",
        description: l.description ?? "",
        date:        l.date ?? new Date().toISOString(),
        country:     l.country     ?? "",
        currency:    l.currency.toUpperCase(),
        amount:      Number(l.amount),
        aedAmount,
        fxRate:      rate,
        receiptNo:   l.receiptNo   ?? "",
      };
    })
  );
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/** GET /api/claims */
export function listClaims(req: Request, res: Response): void {
  const claims = claimStore.findByEmployee(req.user!.id);
  res.json({ data: claims });
}

/** GET /api/claims/:id */
export function getClaim(req: Request, res: Response): void {
  const claim = claimStore.findById(req.params.id);
  if (!claim)                          { res.status(404).json({ error: "Claim not found" }); return; }
  if (claim.employeeId !== req.user!.id){ res.status(403).json({ error: "Not your claim"  }); return; }
  res.json({ data: claim });
}

/** POST /api/claims */
export async function createClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lines, notes } = req.body ?? {};
    const priced   = await priceLines(lines ?? []);
    const totalAed = priced.reduce((s, l) => s + l.aedAmount, 0);
    const claim    = claimStore.create({ employeeId: req.user!.id, assignedFinanceId: req.body?.assignedFinanceId ?? null, totalAed, notes, lines: priced });
    res.status(201).json({ data: claim });
  } catch (err) { next(err); }
}

/** PUT /api/claims/:id */
export async function updateClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claim = claimStore.findById(req.params.id);
    if (!claim)                          { res.status(404).json({ error: "Claim not found" }); return; }
    if (claim.employeeId !== req.user!.id){ res.status(403).json({ error: "Not your claim"  }); return; }
    if (claim.status !== "DRAFT")        { res.status(409).json({ error: "Only DRAFT claims can be edited" }); return; }

    const { lines, notes } = req.body ?? {};
    const priced   = await priceLines(lines ?? []);
    const totalAed = priced.reduce((s, l) => s + l.aedAmount, 0);
    const updated  = claimStore.update(claim.id, { totalAed, notes, lines: priced });
    res.json({ data: updated });
  } catch (err) { next(err); }
}

/** POST /api/claims/:id/submit */
export async function submitClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claim = claimStore.findById(req.params.id);
    if (!claim)                          { res.status(404).json({ error: "Claim not found" }); return; }
    if (claim.employeeId !== req.user!.id){ res.status(403).json({ error: "Not your claim"  }); return; }
    if (claim.status !== "DRAFT")        { res.status(409).json({ error: "Only DRAFT claims can be submitted" }); return; }

    const rawLines  = req.body?.lines ?? claim.lines.map((l) => ({ ...l }));
    const priced    = await priceLines(rawLines);
    const totalAed  = priced.reduce((s, l) => s + l.aedAmount, 0);
    const reference = nextReference();

    const submitted = claimStore.update(claim.id, {
      reference,
      status:      "SUBMITTED",
      totalAed,
      notes:       req.body?.notes ?? claim.notes,
      submittedAt: new Date().toISOString(),
      lines:       priced,
    });

    // PRODUCTION: generate Finance PDF + email finance@wurth.ae
    res.json({ data: submitted });
  } catch (err) { next(err); }
}

/** DELETE /api/claims/:id */
export function deleteClaim(req: Request, res: Response): void {
  const claim = claimStore.findById(req.params.id);
  if (!claim)                          { res.status(404).json({ error: "Claim not found" }); return; }
  if (claim.employeeId !== req.user!.id){ res.status(403).json({ error: "Not your claim"  }); return; }
  if (claim.status !== "DRAFT")        { res.status(409).json({ error: "Only DRAFT claims can be deleted" }); return; }
  claimStore.delete(claim.id);
  res.json({ data: { deleted: true } });
}
