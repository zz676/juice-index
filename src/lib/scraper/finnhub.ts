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
 * Parses raw Finnhub quote + metric JSON into typed fields.
 * Returns null if both responses are missing or indicate no data.
 * Separated from fetchStockQuote so it can be unit-tested without HTTP.
 */
export function parseFinnhubQuote(
  quoteJson: unknown,
  metricJson: unknown,
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

    if (price === null && marketCap === null && peRatio === null) return null;

    return {
      price,
      marketCap,
      volume: null,        // Not available in Finnhub free-tier quote
      peRatio,
      earningsDate: null,  // Would require a separate calendar API call
      earningsDateRaw: null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches quote and basic-financials for a single ticker from Finnhub.
 * Returns null on HTTP errors or parse failures.
 */
export async function fetchStockQuote(ticker: string): Promise<StockQuoteData | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("FINNHUB_API_KEY is not set");

  const headers = { "X-Finnhub-Token": apiKey };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10_000);

  try {
    const [quoteRes, metricRes] = await Promise.all([
      fetch(`${FINNHUB_API}/quote?symbol=${encodeURIComponent(ticker)}`, { headers, signal: ac.signal, next: { revalidate: 0 } }),
      fetch(`${FINNHUB_API}/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`, { headers, signal: ac.signal, next: { revalidate: 0 } }),
    ]);

    if (!quoteRes.ok) {
      console.warn(`[finnhub] ${ticker}: quote HTTP ${quoteRes.status}`);
      return null;
    }
    if (!metricRes.ok) {
      console.warn(`[finnhub] ${ticker}: metric HTTP ${metricRes.status}`);
      return null;
    }

    const quoteJson = await quoteRes.json();
    const metricJson = await metricRes.json();

    return parseFinnhubQuote(quoteJson, metricJson);
  } catch (err) {
    console.warn(`[finnhub] ${ticker}: fetch error`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
