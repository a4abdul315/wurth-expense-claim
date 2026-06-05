/**
 * Currency conversion service.
 * Fetches live AED-based rates from open.er-api.com (free, no key needed).
 * Falls back to hardcoded rates if the provider is unavailable.
 *
 * PRODUCTION: use a paid provider (OANDA, XE, UAE Central Bank feed).
 * The FX rate used on each line MUST be persisted at submission time
 * so Finance can reproduce any AED total during an audit.
 */

export type SupportedCurrency = "USD" | "EUR" | "TRY" | "CNY" | "AED";

export interface FxRate {
  fromCurrency: SupportedCurrency;
  toCurrency: "AED";
  rate: number;       // 1 fromCurrency = rate AED
  source: string;
  effectiveDate: string;      // ISO datetime
}

const PROVIDER_URL = "https://open.er-api.com/v6/latest/AED"; 2

/** Rates that are used when the live provider is unavailable */
const FALLBACK: Record<SupportedCurrency, number> = {
  AED: 1,
  USD: 3.67,
  EUR: 4.10,
  TRY: 0.109,
  CNY: 0.51,
};

let cache: { rates: FxRate[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getLiveRates(): Promise<FxRate[]> {
  // Return cached result if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates;
  }

  try {
    const res = await fetch(PROVIDER_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Provider returned ${res.status}`);

    const body = (await res.json()) as {
      result: string;
      base_code: string;
      time_last_update_utc: string;
      rates: Record<string, number>;
    };

    if (body.result !== "success" || body.base_code !== "AED") {
      throw new Error("Unexpected provider response");
    }

    const effectiveDate = new Date(body.time_last_update_utc).toISOString();
    const currencies: SupportedCurrency[] = ["USD", "EUR", "TRY", "CNY"];

    const rates: FxRate[] = currencies.map((cur) => {
      const aedToCur = body.rates[cur];
      if (!aedToCur || aedToCur <= 0) {
        // Fall back per-currency if a rate is missing
        return { fromCurrency: cur, toCurrency: "AED", rate: FALLBACK[cur], source: "FALLBACK", effectiveDate };
      }
      return {
        fromCurrency: cur,
        toCurrency: "AED",
        rate: parseFloat((1 / aedToCur).toFixed(8)),
        source: "OPEN_EXCHANGE_RATES",
        effectiveDate,
      };
    });

    cache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch (err) {
    console.warn("[currency] Live fetch failed, using static fallback:", (err as Error).message);
    const now = new Date().toISOString();
    return (["USD", "EUR", "TRY", "CNY"] as SupportedCurrency[]).map((cur) => ({
      fromCurrency: cur,
      toCurrency: "AED",
      rate: FALLBACK[cur],
      source: "STATIC_FALLBACK",
      effectiveDate: now,
    }));
  }
}

/** Convert an amount to AED. Returns the AED value and the rate used. */
export async function convertToAed(
  amount: number,
  currency: string
): Promise<{ aedAmount: number; rate: number; source: string }> {
  const cur = currency.toUpperCase() as SupportedCurrency;

  if (cur === "AED") {
    return { aedAmount: Math.round(amount * 100) / 100, rate: 1, source: "BASE_CURRENCY" };
  }

  const rates = await getLiveRates();
  const found = rates.find((r) => r.fromCurrency === cur);
  const rate = found?.rate ?? FALLBACK[cur] ?? 1;

  return {
    aedAmount: Math.round(amount * rate * 100) / 100,
    rate,
    source: found?.source ?? "STATIC_FALLBACK",
  };
}
