import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfLineItem {
  category:    string;
  eventName:   string;
  description: string;
  date:        string; // formatted date string
  country:     string;
  currency:    string;
  amount:      string;  // formatted original amount
  aedAmount:   string;  // formatted AED amount
  fxRate:      string;  // e.g. "3.67"
  receiptNo:   string;
}

export interface PdfReport {
  reference:   string;
  generatedAt: string;
  employee: {
    name:       string;
    email:      string;
    department: string;
    iban:       string;
    swift:      string;
    bankName:   string;
  };
  lines:       PdfLineItem[];
  totalAed:    string;
  status:      string;
  notes?:      string;
}

// ─── PDF dimensions ───────────────────────────────────────────────────────────

const W      = 595.28; // A4 width  (pt)
const H      = 841.89; // A4 height (pt)
const MARGIN = 40;
const FOOTER = 28;

type Ctx = { pdf: PDFDocument; page: PDFPage; reg: PDFFont; bold: PDFFont; y: number };

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generateClaimPdf(report: PdfReport): Promise<Uint8Array> {
  const pdf  = await PDFDocument.create();
  const reg  = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = { pdf, page: pdf.addPage([W, H]), reg, bold, y: H - MARGIN };

  drawHeader(ctx, report);
  drawEmployeeSection(ctx, report);
  drawLineItems(ctx, report.lines);
  drawTotals(ctx, report);
  drawBankDetails(ctx, report);
  drawFooters(ctx, report);

  return pdf.save();
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function drawHeader(ctx: Ctx, r: PdfReport) {
  // Würth red banner
  ctx.page.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: rgb(0.8, 0, 0) });

  ctx.page.drawText("WÜRTH PROFESSIONAL SOLUTIONS", {
    x: MARGIN, y: H - 38, size: 16, font: ctx.bold, color: rgb(1, 1, 1),
  });
  ctx.page.drawText("Expense Claim Report", {
    x: MARGIN, y: H - 58, size: 10, font: ctx.reg, color: rgb(0.9, 0.8, 0.8),
  });
  ctx.page.drawText(r.reference, {
    x: W - MARGIN - 110, y: H - 44, size: 14, font: ctx.bold, color: rgb(1, 1, 1),
  });
  ctx.page.drawText(`Status: ${r.status}`, {
    x: W - MARGIN - 110, y: H - 62, size: 9, font: ctx.reg, color: rgb(0.9, 0.8, 0.8),
  });

  ctx.y = H - 100;
}

function drawEmployeeSection(ctx: Ctx, r: PdfReport) {
  sectionTitle(ctx, "Claimant Details");
  twoCol(ctx, [
    ["Name",       r.employee.name],
    ["Email",      r.employee.email],
    ["Department", r.employee.department],
    ["Generated",  r.generatedAt],
  ]);
}

function drawLineItems(ctx: Ctx, lines: PdfLineItem[]) {
  sectionTitle(ctx, "Expense Line Items");

  const cols = [
    { label: "Category",    x: MARGIN,       w: 90  },
    { label: "Description", x: MARGIN + 94,  w: 130 },
    { label: "Date",        x: MARGIN + 228, w: 62  },
    { label: "Country",     x: MARGIN + 294, w: 62  },
    { label: "Original",    x: MARGIN + 360, w: 80  },
    { label: "AED",         x: MARGIN + 444, w: 70  },
  ];

  // Table header bar
  ensureSpace(ctx, 40);
  ctx.page.drawRectangle({
    x: MARGIN, y: ctx.y - 8, width: W - MARGIN * 2, height: 22,
    color: rgb(0.94, 0.95, 0.97),
  });
  for (const col of cols) {
    ctx.page.drawText(col.label, {
      x: col.x, y: ctx.y, size: 7, font: ctx.bold, color: rgb(0.35, 0.4, 0.48),
    });
  }
  ctx.y -= 26;

  for (const line of lines) {
    ensureSpace(ctx, 38);
    const ry = ctx.y;

    ctx.page.drawLine({
      start: { x: MARGIN, y: ry + 10 }, end: { x: W - MARGIN, y: ry + 10 },
      thickness: 0.4, color: rgb(0.88, 0.9, 0.93),
    });

    drawCell(ctx, `${line.category}\n${line.eventName}`, cols[0].x, ry, cols[0].w);
    drawCell(ctx, line.description, cols[1].x, ry, cols[1].w);
    drawCell(ctx, line.date,        cols[2].x, ry, cols[2].w);
    drawCell(ctx, line.country,     cols[3].x, ry, cols[3].w);
    drawCell(ctx, `${line.currency} ${line.amount}`, cols[4].x, ry, cols[4].w);
    drawCell(ctx, line.aedAmount,   cols[5].x, ry, cols[5].w);

    if (line.fxRate && line.currency !== "AED") {
      ctx.page.drawText(`Rate: ${line.fxRate}`, {
        x: cols[4].x, y: ry - 12, size: 6.5, font: ctx.reg, color: rgb(0.55, 0.6, 0.68),
      });
    }

    ctx.y -= 36;
  }
}

function drawTotals(ctx: Ctx, r: PdfReport) {
  ensureSpace(ctx, 60);
  ctx.page.drawRectangle({
    x: W - MARGIN - 170, y: ctx.y - 36, width: 170, height: 48,
    borderColor: rgb(0.8, 0.85, 0.9), borderWidth: 1, color: rgb(0.97, 0.98, 0.99),
  });
  ctx.page.drawText("Total Claimed (AED)", {
    x: W - MARGIN - 158, y: ctx.y - 6, size: 8, font: ctx.reg, color: rgb(0.38, 0.43, 0.52),
  });
  ctx.page.drawText(r.totalAed, {
    x: W - MARGIN - 158, y: ctx.y - 26, size: 18, font: ctx.bold, color: rgb(0.1, 0.14, 0.2),
  });
  ctx.y -= 60;

  if (r.notes) {
    ensureSpace(ctx, 32);
    ctx.page.drawText("Notes:", {
      x: MARGIN, y: ctx.y, size: 8, font: ctx.bold, color: rgb(0.3, 0.35, 0.43),
    });
    ctx.page.drawText(r.notes.slice(0, 200), {
      x: MARGIN, y: ctx.y - 14, size: 8, font: ctx.reg, color: rgb(0.25, 0.3, 0.38),
    });
    ctx.y -= 34;
  }
}

function drawBankDetails(ctx: Ctx, r: PdfReport) {
  ensureSpace(ctx, 70);
  sectionTitle(ctx, "Bank Details");
  twoCol(ctx, [
    ["Holder",    r.employee.name],
    ["Bank",      r.employee.bankName],
    ["IBAN",      r.employee.iban],
    ["SWIFT/BIC", r.employee.swift],
  ]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sectionTitle(ctx: Ctx, title: string) {
  ensureSpace(ctx, 30);
  ctx.page.drawText(title, {
    x: MARGIN, y: ctx.y, size: 11, font: ctx.bold, color: rgb(0.1, 0.14, 0.2),
  });
  ctx.y -= 18;
}

function twoCol(ctx: Ctx, rows: [string, string][]) {
  for (let i = 0; i < rows.length; i += 2) {
    ensureSpace(ctx, 28);
    label(ctx, rows[i][0],   rows[i][1],   MARGIN);
    if (rows[i + 1]) label(ctx, rows[i + 1][0], rows[i + 1][1], MARGIN + 250);
    ctx.y -= 26;
  }
}

function label(ctx: Ctx, lbl: string, val: string, x: number) {
  ctx.page.drawText(lbl, { x, y: ctx.y,      size: 7.5, font: ctx.reg,  color: rgb(0.5, 0.55, 0.62) });
  ctx.page.drawText(val, { x, y: ctx.y - 12, size: 8.5, font: ctx.bold, color: rgb(0.1, 0.14, 0.2)  });
}

function drawCell(ctx: Ctx, text: string, x: number, y: number, maxW: number) {
  const lines = wrapText(text, maxW, ctx.reg, 8).slice(0, 2);
  lines.forEach((l, i) => {
    ctx.page.drawText(l, { x, y: y - i * 10, size: 8, font: ctx.reg, color: rgb(0.15, 0.2, 0.28) });
  });
}

function ensureSpace(ctx: Ctx, h: number) {
  if (ctx.y - h > FOOTER + 20) return;
  ctx.page = ctx.pdf.addPage([W, H]);
  ctx.y    = H - MARGIN;
}

function drawFooters(ctx: Ctx, r: PdfReport) {
  const pages = ctx.pdf.getPages();
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: W - MARGIN, y: 42 }, thickness: 0.4, color: rgb(0.8, 0.83, 0.88) });
    pg.drawText(`${r.reference} — ${r.generatedAt}`, { x: MARGIN, y: FOOTER, size: 6.5, font: ctx.reg, color: rgb(0.5, 0.55, 0.62) });
    pg.drawText(`Page ${i + 1} of ${pages.length}`, { x: W - MARGIN - 60, y: FOOTER, size: 6.5, font: ctx.reg, color: rgb(0.5, 0.55, 0.62) });
  });
}

function wrapText(text: string, maxW: number, font: PDFFont, size: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}
