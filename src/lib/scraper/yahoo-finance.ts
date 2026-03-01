const YAHOO_API = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";

export interface YahooQuoteData {
  price: number | null;
  marketCap: number | null;
  volume: number | null;
  peRatio: number | null;
  earningsDate: Date | null;
  earningsDateRaw: string | null;
}

/**
 * Parses a raw Yahoo Finance quoteSummary API response into typed fields.
 * Returns null if the response is missing, malformed, or contains an API error.
 * Separated from fetchYahooQuote so it can be unit-tested without HTTP.
 */
export function parseYahooQuote(raw: unknown): YahooQuoteData | null {
  try {
    const qs = (raw as any)?.quoteSummary;
    if (!qs || qs.error || !Array.isArray(qs.result) || qs.result.length === 0) return null;

    const r = qs.result[0];
    const price: number | null = r?.price?.regularMarketPrice?.raw ?? null;
    const marketCap: number | null = r?.price?.marketCap?.raw ?? null;
    const volume: number | null = r?.price?.regularMarketVolume?.raw ?? null;
    const peRatio: number | null = r?.summaryDetail?.trailingPE?.raw ?? null;

    const earningsArr: Array<{ raw: number; fmt: string }> =
      r?.calendarEvents?.earnings?.earningsDate ?? [];
    const firstEarnings = earningsArr[0] ?? null;
    const earningsDateRaw = firstEarnings?.fmt ?? null;
    const earningsDate = earningsDateRaw ? new Date(earningsDateRaw) : null;

    return { price, marketCap, volume, peRatio, earningsDate, earningsDateRaw };
  } catch {
    return null;
  }
}

/**
 * Fetches and parses a Yahoo Finance quote for a single ticker.
 * Returns null on HTTP errors or parse failures so callers can skip bad tickers
 * without aborting a full cron run.
 */
export async function fetchYahooQuote(ticker: string): Promise<YahooQuoteData | null> {
  const url =
    `${YAHOO_API}/${encodeURIComponent(ticker)}` +
    `?modules=price%2CcalendarEvents%2CsummaryDetail&corsDomain=finance.yahoo.com`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[yahoo] ${ticker}: HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    return parseYahooQuote(json);
  } catch (err) {
    console.warn(`[yahoo] ${ticker}: fetch error`, err);
    return null;
  }
}
