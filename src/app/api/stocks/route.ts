import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import type { Quote } from "yahoo-finance2/modules/quote";

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

let cache: { data: StockQuote[]; expiry: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function GET() {
  try {
    if (cache && Date.now() < cache.expiry) {
      return NextResponse.json(cache.data, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }

    const symbols = STOCKS.map((s) => s.symbol);
    const results = (await yahooFinance.quote(symbols, {
      fields: ["regularMarketPrice", "regularMarketChangePercent", "currency"],
    })) as Quote[];

    const quotes: StockQuote[] = STOCKS.map((stock) => {
      const r = results.find((q) => q.symbol === stock.symbol);
      return {
        symbol: stock.symbol,
        brand: stock.brand,
        price: r?.regularMarketPrice ?? null,
        change: r?.regularMarketChangePercent ?? 0,
        currency: r?.currency ?? "USD",
      };
    });

    cache = { data: quotes, expiry: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(quotes, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Stock fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}
