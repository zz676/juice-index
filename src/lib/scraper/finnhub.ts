const FINNHUB_API = "https://finnhub.io/api/v1";

export interface StockExtras {
  peRatio: number | null;
  earningsDate: Date | null;
  earningsDateRaw: string | null;
}

/**
 * Parses raw Finnhub metric + earnings JSON into peRatio and next earnings date.
 * Separated from fetchStockExtras so it can be unit-tested without HTTP.
 */
export function parseStockExtras(metricJson: unknown, earningsJson: unknown): StockExtras {
  const m = (metricJson as any)?.metric ?? null;
  const peRatio: number | null = m?.peBasicExclExtraTTM ?? m?.peTTM ?? null;

  // Sort ascending and pick the nearest upcoming date
  const earningsArr: Array<{ date: string }> =
    (earningsJson as any)?.earningsCalendar ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const next = earningsArr
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const earningsDate = next?.date ? new Date(next.date) : null;
  const earningsDateRaw = next?.date ?? null;

  return { peRatio, earningsDate, earningsDateRaw };
}

/**
 * Fetches P/E ratio and next earnings date for a single US-listed ticker from Finnhub.
 * Only call this for US-listed stocks — non-US exchanges return 403 on the free tier.
 * Returns null on HTTP errors or parse failures.
 */
export async function fetchStockExtras(ticker: string): Promise<StockExtras | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("FINNHUB_API_KEY is not set");

  const headers = { "X-Finnhub-Token": apiKey };
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10_000);

  try {
    const [metricRes, earningsRes] = await Promise.all([
      fetch(`${FINNHUB_API}/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`, { headers, signal: ac.signal, next: { revalidate: 0 } }),
      fetch(`${FINNHUB_API}/calendar/earnings?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}`, { headers, signal: ac.signal, next: { revalidate: 0 } }),
    ]);

    for (const [label, res] of [["metric", metricRes], ["earnings", earningsRes]] as const) {
      if (!res.ok) {
        if (res.status === 403) {
          console.warn(`[finnhub] ${ticker}: ${label} HTTP 403 FORBIDDEN — exchange not supported on free tier`);
        } else if (res.status === 429) {
          console.warn(`[finnhub] ${ticker}: ${label} HTTP 429 RATE_LIMITED — reduce batch size or increase delay`);
        } else {
          console.warn(`[finnhub] ${ticker}: ${label} HTTP ${res.status}`);
        }
        return null;
      }
    }

    const [metricJson, earningsJson] = await Promise.all([
      metricRes.json(),
      earningsRes.json(),
    ]);

    return parseStockExtras(metricJson, earningsJson);
  } catch (err) {
    console.warn(`[finnhub] ${ticker}: fetch error`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
