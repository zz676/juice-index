const FINNHUB_API = "https://finnhub.io/api/v1";

export interface StockQuoteData {
  price: number | null;
  marketCap: number | null;
  volume: bigint | null;
  peRatio: number | null;
  earningsDate: Date | null;
  earningsDateRaw: string | null;
}

/**
 * Parses raw Finnhub quote + metric + earnings JSON into typed fields.
 * Returns null if all data fields are absent (unsupported ticker).
 * Separated from fetchStockQuote so it can be unit-tested without HTTP.
 */
export function parseFinnhubQuote(
  quoteJson: unknown,
  metricJson: unknown,
  earningsJson: unknown,
): StockQuoteData | null {
  try {
    const q = quoteJson as Record<string, number> | null;
    const m = (metricJson as any)?.metric ?? null;

    // Finnhub returns c=0 when no data is available for the symbol
    const price: number | null = q?.c && q.c !== 0 ? q.c : null;

    // marketCapitalization is in millions
    const mcMillion: number | null = m?.marketCapitalization ?? null;
    const marketCap = mcMillion !== null ? mcMillion * 1_000_000 : null;

    const peRatio: number | null = m?.peBasicExclExtraTTM ?? m?.peTTM ?? null;

    // Earnings calendar: pick the first upcoming entry
    const earningsArr: Array<{ date: string }> =
      (earningsJson as any)?.earningsCalendar ?? [];
    const next = earningsArr[0] ?? null;
    const earningsDate = next?.date ? new Date(next.date) : null;
    const earningsDateRaw = next?.date ?? null;

    if (price === null && marketCap === null && peRatio === null && earningsDate === null) return null;

    return {
      price,
      marketCap,
      volume: null, // Not available in Finnhub free-tier quote
      peRatio,
      earningsDate,
      earningsDateRaw,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches quote, basic-financials, and next earnings date for a single ticker from Finnhub.
 * Returns null on HTTP errors or parse failures.
 */
export async function fetchStockQuote(ticker: string): Promise<StockQuoteData | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("FINNHUB_API_KEY is not set");

  const headers = { "X-Finnhub-Token": apiKey };

  // Fetch earnings for the next 6 months
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10_000);

  try {
    const [quoteRes, metricRes, earningsRes] = await Promise.all([
      fetch(`${FINNHUB_API}/quote?symbol=${encodeURIComponent(ticker)}`, { headers, signal: ac.signal, next: { revalidate: 0 } }),
      fetch(`${FINNHUB_API}/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`, { headers, signal: ac.signal, next: { revalidate: 0 } }),
      fetch(`${FINNHUB_API}/calendar/earnings?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}`, { headers, signal: ac.signal, next: { revalidate: 0 } }),
    ]);

    if (!quoteRes.ok) {
      console.warn(`[finnhub] ${ticker}: quote HTTP ${quoteRes.status}`);
      return null;
    }
    if (!metricRes.ok) {
      console.warn(`[finnhub] ${ticker}: metric HTTP ${metricRes.status}`);
      return null;
    }
    if (!earningsRes.ok) {
      console.warn(`[finnhub] ${ticker}: earnings HTTP ${earningsRes.status}`);
      return null;
    }

    const [quoteJson, metricJson, earningsJson] = await Promise.all([
      quoteRes.json(),
      metricRes.json(),
      earningsRes.json(),
    ]);

    return parseFinnhubQuote(quoteJson, metricJson, earningsJson);
  } catch (err) {
    console.warn(`[finnhub] ${ticker}: fetch error`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
