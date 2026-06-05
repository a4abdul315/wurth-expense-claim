import { Request, Response, NextFunction } from "express";
import { getLiveRates, convertToAed } from "../services/currency.service";

/** GET /api/currency/rates — live AED exchange rates (cached 1 h) */
export async function getRates(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rates = await getLiveRates();
    res.json({ data: { reportingCurrency: "AED", rates } });
  } catch (err) { next(err); }
}

/** POST /api/currency/convert — convert a single amount to AED */
export async function convert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { amount, currency } = req.body ?? {};

    if (!amount || !currency) {
      res.status(400).json({ error: "amount and currency are required" });
      return;
    }

    const result = await convertToAed(Number(amount), String(currency));
    res.json({
      data: {
        originalAmount:   Number(amount),
        originalCurrency: String(currency).toUpperCase(),
        aedAmount:        result.aedAmount,
        rate:             result.rate,
        source:           result.source,
      },
    });
  } catch (err) { next(err); }
}
