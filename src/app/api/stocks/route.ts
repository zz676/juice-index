import { NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const STOCKS: { symbol: string; brand: string }[] = [
  { symbol: "TSLA",       brand: "Tesla"     },
  { symbol: "NIO",        brand: "NIO"       },
  { symbol: "XPEV",       brand: "Xpeng"     },
  { symbol: "LI",         brand: "Li Auto"   },
  { symbol: "1810.HK",    brand: "Xiaomi"    },
  { symbol: "LCID",       brand: "Lucid"     },
  { symbol: "RIVN",       brand: "Rivian"    },
  { symbol: "BYDDY",      brand: "BYD"       },
  { symbol: "TM",         brand: "Toyota"    },
  { symbol: "005380.KS",  brand: "Hyundai"   },
  { symbol: "GM",         brand: "GM"        },
  { symbol: "BMW.DE",     brand: "BMW"       },
  { symbol: "MBG.DE",     brand: "Mercedes"  },
  { symbol: "VOW3.DE",    brand: "VW"        },
  { symbol: "F",          brand: "Ford"      },
  { symbol: "000270.KS",  brand: "Kia"       },
  { symbol: "HMC",        brand: "Honda"     },
  { symbol: "P911.DE",    brand: "Porsche"   },
  { symbol: "7261.T",     brand: "Mazda"     },
  { symbol: "9863.HK",    brand: "Leapmotor" },
  { symbol: "7201.T",     brand: "Nissan"    },
];

export interface StockQuote {
  symbol: string;
  brand: string;
  price: number | null;
  change: number;   // percent
  currency: string;
}

// ─── In-memory stores (survive warm Lambda instances) ───────────────────────
let dataCache: { data: StockQuote[]; expiry: number } | null = null;
let crumbStore: { crumb: string; cookies: string; expiry: number } | null = null;

const DATA_TTL   = 5  * 60 * 1000; // 5 min
const CRUMB_TTL  = 50 * 60 * 1000; // 50 min (Yahoo crumbs last ~1 h)

// ─── Step 1: get a valid crumb + session cookies from Yahoo Finance ──────────
async function getCrumb(): Promise<{ crumb: string; cookies: string } | null> {
  if (crumbStore && Date.now() < crumbStore.expiry) {
    return { crumb: crumbStore.crumb, cookies: crumbStore.cookies };
  }

  try {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 10_000);

    // Visit Yahoo Finance to receive session cookies
    const homeRes = await fetch("https://finance.yahoo.com/", {
      signal: ac.signal,
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    // Collect all Set-Cookie headers (Node 18+ Headers.getSetCookie())
    const rawCookies: string[] =
      (homeRes.headers as any).getSetCookie?.() ??
      (homeRes.headers.get("set-cookie") ? [homeRes.headers.get("set-cookie")!] : []);

    const cookies = rawCookies.map((c) => c.split(";")[0]).join("; ");

    // Exchange cookies for a crumb
    const ac2 = new AbortController();
    setTimeout(() => ac2.abort(), 8_000);

    const crumbRes = await fetch(
      "https://query2.finance.yahoo.com/v1/test/getcrumb",
      {
        signal: ac2.signal,
        headers: {
          "User-Agent": UA,
          "Cookie": cookies,
          "Referer": "https://finance.yahoo.com/",
          "Accept": "*/*",
        },
      },
    );

    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.startsWith("<") || crumb === "null") return null;

    crumbStore = { crumb, cookies, expiry: Date.now() + CRUMB_TTL };
    return { crumb, cookies };
  } catch (err) {
    console.warn("[stocks] getCrumb failed:", err);
    return null;
  }
}

// ─── Step 2: single batch request for all 21 symbols ────────────────────────
async function fetchBatch(auth: { crumb: string; cookies: string }): Promise<StockQuote[] | null> {
  const symbolList = STOCKS.map((s) => s.symbol).join(",");
  const url =
    `https://query2.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(symbolList)}` +
    `&crumb=${encodeURIComponent(auth.crumb)}` +
    `&lang=en-US&region=US&corsDomain=finance.yahoo.com`;

  const ac = new AbortController();
  setTimeout(() => ac.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        "User-Agent": UA,
        "Cookie": auth.cookies,
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com/",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[stocks] batch HTTP ${res.status}`);
      // Stale crumb — force refresh next time
      if (res.status === 401 || res.status === 403) crumbStore = null;
      return null;
    }

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = json?.quoteResponse?.result ?? [];

    return STOCKS.map((stock) => {
      const q = results.find((r) => r.symbol === stock.symbol);
      if (!q) return { symbol: stock.symbol, brand: stock.brand, price: null, change: 0, currency: "USD" };
      return {
        symbol: stock.symbol,
        brand: stock.brand,
        price: (q.regularMarketPrice as number) ?? null,
        change: (q.regularMarketChangePercent as number) ?? 0,
        currency: (q.currency as string) ?? "USD",
      };
    });
  } catch (err) {
    console.warn("[stocks] batch fetch error:", err);
    return null;
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────
export async function GET() {
  // Serve fresh cache immediately
  if (dataCache && Date.now() < dataCache.expiry) {
    return NextResponse.json(dataCache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  try {
    const auth = await getCrumb();
    const quotes = auth ? await fetchBatch(auth) : null;

    if (quotes && quotes.length > 0) {
      dataCache = { data: quotes, expiry: Date.now() + DATA_TTL };
      return NextResponse.json(quotes, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    // Fall back to stale cache rather than empty response
    if (dataCache) {
      return NextResponse.json(dataCache.data, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    return NextResponse.json({ error: "Failed to fetch stocks" }, { status: 500 });
  } catch (error) {
    console.error("[stocks] unhandled error:", error);
    if (dataCache) {
      return NextResponse.json(dataCache.data, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }
    return NextResponse.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}
