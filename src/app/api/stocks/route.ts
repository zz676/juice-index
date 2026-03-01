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

// ─── In-memory stores ────────────────────────────────────────────────────────
let dataCache: { data: StockQuote[]; expiry: number } | null = null;
let crumbStore: { crumb: string; cookies: string; expiry: number } | null = null;

const DATA_TTL  = 5  * 60 * 1000; // 5 min
const CRUMB_TTL = 50 * 60 * 1000; // 50 min
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Strategy 1: single no-auth batch (fastest; works on many server IPs) ───
async function tryNoCrumbBatch(): Promise<StockQuote[] | null> {
  const symbolList = STOCKS.map((s) => s.symbol).join(",");
  const url =
    `https://query2.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(symbolList)}&lang=en-US&region=US&corsDomain=finance.yahoo.com`;

  const ac = new AbortController();
  setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": UA, "Accept": "application/json", "Referer": "https://finance.yahoo.com/" },
      next: { revalidate: 0 },
    });
    if (!res.ok) { console.warn(`[stocks] no-auth batch HTTP ${res.status}`); return null; }
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = json?.quoteResponse?.result ?? [];
    if (results.length === 0) return null;
    return mapResults(results);
  } catch (e) {
    console.warn("[stocks] no-auth batch error:", e);
    return null;
  }
}

// ─── Strategy 2: crumb-authenticated batch ───────────────────────────────────
async function getCrumb(): Promise<{ crumb: string; cookies: string } | null> {
  if (crumbStore && Date.now() < crumbStore.expiry) return crumbStore;

  // 2a. Try getcrumb directly — works on some server IPs without homepage cookie
  try {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 6_000);
    const r = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      signal: ac.signal,
      headers: { "User-Agent": UA, "Accept": "*/*", "Referer": "https://finance.yahoo.com/" },
    });
    if (r.ok) {
      const crumb = (await r.text()).trim();
      if (crumb && !crumb.startsWith("<") && crumb !== "null") {
        crumbStore = { crumb, cookies: "", expiry: Date.now() + CRUMB_TTL };
        return crumbStore;
      }
    }
  } catch { /* fall through */ }

  // 2b. Full flow: homepage → cookies → crumb
  try {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 10_000);
    const homeRes = await fetch("https://finance.yahoo.com/", {
      signal: ac.signal,
      headers: { "User-Agent": UA, "Accept": "text/html,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" },
    });
    const rawCookies: string[] =
      (homeRes.headers as any).getSetCookie?.() ??
      (homeRes.headers.get("set-cookie") ? [homeRes.headers.get("set-cookie")!] : []);
    const cookies = rawCookies.map((c) => c.split(";")[0]).join("; ");

    const ac2 = new AbortController();
    setTimeout(() => ac2.abort(), 6_000);
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      signal: ac2.signal,
      headers: { "User-Agent": UA, "Cookie": cookies, "Referer": "https://finance.yahoo.com/", "Accept": "*/*" },
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.startsWith("<") || crumb === "null") return null;

    crumbStore = { crumb, cookies, expiry: Date.now() + CRUMB_TTL };
    return crumbStore;
  } catch (e) {
    console.warn("[stocks] getCrumb full flow failed:", e);
    return null;
  }
}

async function tryCrumbBatch(): Promise<StockQuote[] | null> {
  const auth = await getCrumb();
  if (!auth) return null;

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
      headers: { "User-Agent": UA, ...(auth.cookies ? { "Cookie": auth.cookies } : {}), "Accept": "application/json", "Referer": "https://finance.yahoo.com/" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.warn(`[stocks] crumb batch HTTP ${res.status}`);
      if (res.status === 401 || res.status === 403) crumbStore = null;
      return null;
    }
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = json?.quoteResponse?.result ?? [];
    if (results.length === 0) return null;
    return mapResults(results);
  } catch (e) {
    console.warn("[stocks] crumb batch error:", e);
    return null;
  }
}

// ─── Strategy 3: individual v8/chart with 300 ms gaps (last resort) ──────────
async function tryIndividual(): Promise<StockQuote[]> {
  const quotes: StockQuote[] = [];
  for (let i = 0; i < STOCKS.length; i++) {
    if (i > 0) await sleep(300);
    const { symbol, brand } = STOCKS[i];
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=1d&interval=1d&includePrePost=false`;
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 8_000);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: { "User-Agent": UA, "Accept": "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) { quotes.push({ symbol, brand, price: null, change: 0, currency: "USD" }); continue; }
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta) { quotes.push({ symbol, brand, price: null, change: 0, currency: "USD" }); continue; }
      const price: number | null = meta.regularMarketPrice ?? null;
      const prev: number | null  = meta.chartPreviousClose ?? meta.previousClose ?? null;
      const change = price !== null && prev !== null && prev !== 0 ? ((price - prev) / prev) * 100 : 0;
      quotes.push({ symbol, brand, price, change, currency: meta.currency ?? "USD" });
    } catch {
      quotes.push({ symbol, brand, price: null, change: 0, currency: "USD" });
    }
  }
  return quotes;
}

// ─── Shared result mapper ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResults(results: any[]): StockQuote[] {
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
}

// ─── Route handler ───────────────────────────────────────────────────────────
export async function GET() {
  if (dataCache && Date.now() < dataCache.expiry) {
    return NextResponse.json(dataCache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // Try strategies in order; never 500 — fall back to stale cache or []
  let quotes: StockQuote[] | null =
    await tryNoCrumbBatch() ??
    await tryCrumbBatch() ??
    await tryIndividual();

  // tryIndividual always returns an array (may have nulls); treat all-null prices as failure
  const hasData = quotes.some((q) => q.price !== null);

  if (hasData) {
    dataCache = { data: quotes, expiry: Date.now() + DATA_TTL };
  } else if (dataCache) {
    quotes = dataCache.data;
  }

  // Always return 200 with whatever data we have (ticker hides itself if empty)
  return NextResponse.json(quotes, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
