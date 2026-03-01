const CMC_URL =
  "https://companiesmarketcap.com/automakers/largest-automakers-by-market-cap/";

export interface CmcEntry {
  price: number;
  marketCap: number;
}

/**
 * Parses companiesmarketcap.com automakers HTML into a ticker → {price, marketCap} map.
 * HTML structure per row:
 *   - Ticker: text in `.company-code` div after the empty rank span
 *   - Market cap: first `data-sort` on a `.td-right` cell (raw dollars)
 *   - Price: second `data-sort` on a `.td-right` cell (× 100, e.g. 40251 = $402.51)
 * Separated for unit testing.
 */
export function parseMarketCapHtml(html: string): Map<string, CmcEntry> {
  const result = new Map<string, CmcEntry>();

  for (const row of html.split("<tr>").slice(1)) {
    const tickerMatch = row.match(/company-code"><span[^>]*><\/span>([^<]+)<\/div>/);
    if (!tickerMatch) continue;
    const ticker = tickerMatch[1].trim();

    const sortMatches = Array.from(row.matchAll(/class="td-right" data-sort="(\d+)"/g));
    if (sortMatches.length < 2) continue;

    const marketCap = parseInt(sortMatches[0][1], 10);
    const price = parseInt(sortMatches[1][1], 10) / 100;

    result.set(ticker, { price, marketCap });
  }

  return result;
}

/**
 * Fetches price and market cap for all tracked companies from companiesmarketcap.com.
 * Returns an empty map on failure so callers can fall back gracefully.
 */
export async function fetchMarketCapData(): Promise<Map<string, CmcEntry>> {
  try {
    const res = await fetch(CMC_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[cmc] fetch failed: HTTP ${res.status}`);
      return new Map();
    }

    const html = await res.text();
    const data = parseMarketCapHtml(html);
    console.log(`[cmc] fetched market cap data for ${data.size} companies`);
    return data;
  } catch (err) {
    console.warn(`[cmc] fetch error`, err);
    return new Map();
  }
}
