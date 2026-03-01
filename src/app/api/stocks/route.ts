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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOne(symbol: string): Promise<{ price: number | null; change: number; currency: string }> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=1d&interval=1d&includePrePost=false`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8_000);

  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.warn(`[stocks] ${symbol}: HTTP ${res.status}`);
      return { price: null, change: 0, currency: "USD" };
    }
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return { price: null, change: 0, currency: "USD" };

    const price: number | null = meta.regularMarketPrice ?? null;
    const prev: number | null  = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const change = (price !== null && prev !== null && prev !== 0)
      ? ((price - prev) / prev) * 100
      : 0;

    return {
      price,
      change,
      currency: meta.currency ?? "USD",
    };
  } catch {
    console.warn(`[stocks] ${symbol}: fetch error`);
    return { price: null, change: 0, currency: "USD" };
  } finally {
    clearTimeout(timer);
  }
}

let cache: { data: StockQuote[]; expiry: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    if (cache && Date.now() < cache.expiry) {
      return NextResponse.json(cache.data, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    // Fetch sequentially with 80 ms gaps to stay under Yahoo's rate limit
    const quotes: StockQuote[] = [];
    for (let i = 0; i < STOCKS.length; i++) {
      if (i > 0) await sleep(80);
      const data = await fetchOne(STOCKS[i].symbol);
      quotes.push({ symbol: STOCKS[i].symbol, brand: STOCKS[i].brand, ...data });
    }

    cache = { data: quotes, expiry: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(quotes, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Stock fetch error:", error);
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }
    return NextResponse.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}
