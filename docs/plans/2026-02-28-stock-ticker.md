# Stock Ticker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a live, horizontally scrolling stock ticker to the Dashboard overview page showing real-time prices and % changes for 21 EV-related companies, linking each to its Yahoo Finance page.

**Architecture:** A Next.js API route at `/api/stocks` uses `yahoo-finance2` to batch-fetch quotes server-side with a 60-second in-memory cache. A client component `StockTicker` polls that route every 60 s and renders a CSS marquee animation. The ticker is placed at the top of `dashboard/page.tsx` above existing content.

**Tech Stack:** `yahoo-finance2` (no API key), Next.js App Router API route, CSS `@keyframes` marquee in `globals.css`, Tailwind v4 (`@theme` in globals.css — no `tailwind.config.ts`).

---

### Task 1: Install `yahoo-finance2`

**Files:**
- Modify: `package.json` (via npm)

**Step 1: Install the package**

```bash
cd /Users/zhizhou/Downloads/agent/juice-index/copy3/juice-index
npm install yahoo-finance2
```

Expected: package added to `package.json` dependencies.

**Step 2: Verify it resolves**

```bash
node -e "const yf = require('yahoo-finance2'); console.log(typeof yf.quote)"
```

Expected: prints `function`.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install yahoo-finance2 for stock ticker"
```

---

### Task 2: Create the `/api/stocks` route

**Files:**
- Create: `src/app/api/stocks/route.ts`

**Step 1: Create the file with this exact content**

```typescript
import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

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
  price: number;
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
    const results = await yahooFinance.quote(symbols, {
      fields: ["regularMarketPrice", "regularMarketChangePercent", "currency"],
    });

    const quotes: StockQuote[] = STOCKS.map((stock) => {
      const r = Array.isArray(results)
        ? results.find((q) => q.symbol === stock.symbol)
        : results;
      return {
        symbol: stock.symbol,
        brand: stock.brand,
        price: r?.regularMarketPrice ?? 0,
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
```

**Step 2: Smoke-test the route**

Start the dev server (`npm run dev`), then in another terminal:

```bash
curl http://localhost:3000/api/stocks | head -c 500
```

Expected: JSON array starting with `[{"symbol":"TSLA","brand":"Tesla","price":...}]`.

**Step 3: Commit**

```bash
git add src/app/api/stocks/route.ts
git commit -m "feat: add /api/stocks route with yahoo-finance2 and 60s cache"
```

---

### Task 3: Add marquee CSS animation to globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Append the marquee keyframe after the existing `@keyframes` blocks**

Add this block at the end of `globals.css`:

```css
/* ─── Stock Ticker Marquee ─── */
@keyframes ticker-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.ticker-track {
  animation: ticker-scroll 40s linear infinite;
}

.ticker-track:hover {
  animation-play-state: paused;
}
```

**Step 2: Verify the CSS is valid (no build errors)**

```bash
npm run build 2>&1 | tail -5
```

Expected: build succeeds (or only pre-existing warnings).

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add ticker-scroll CSS animation for stock ticker"
```

---

### Task 4: Create the `StockTicker` component

**Files:**
- Create: `src/components/dashboard/StockTicker.tsx`

**Step 1: Create the file with this exact content**

```tsx
"use client";

import { useEffect, useState } from "react";

interface StockQuote {
  symbol: string;
  brand: string;
  price: number;
  change: number;
  currency: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  HKD: "HK$",
  EUR: "€",
  KRW: "₩",
  JPY: "¥",
};

function formatPrice(price: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  // JPY and KRW don't use decimals
  const decimals = currency === "JPY" || currency === "KRW" ? 0 : 2;
  return `${sym}${price.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function TickerItem({ quote }: { quote: StockQuote }) {
  const positive = quote.change >= 0;
  const arrow = positive ? "▲" : "▼";
  const changeColor = positive ? "text-primary" : "text-red-400";
  const yahooUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(quote.symbol)}`;

  return (
    <a
      href={yahooUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-4 hover:bg-white/10 transition-colors rounded cursor-pointer shrink-0 h-full"
    >
      <span className="font-semibold text-white text-[11px] tracking-wide">{quote.brand}</span>
      <span className="text-slate-custom-400 text-[10px]">{quote.symbol}</span>
      <span className="text-white text-[11px] tabular-nums">{formatPrice(quote.price, quote.currency)}</span>
      <span className={`${changeColor} text-[11px] tabular-nums font-medium`}>
        {arrow} {Math.abs(quote.change).toFixed(2)}%
      </span>
      <span className="text-slate-custom-600 text-[11px] ml-2 select-none">|</span>
    </a>
  );
}

export default function StockTicker() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [error, setError] = useState(false);

  async function fetchQuotes() {
    try {
      const res = await fetch("/api/stocks");
      if (!res.ok) throw new Error("non-ok");
      const data: StockQuote[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setQuotes(data);
        setError(false);
      }
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    fetchQuotes();
    const id = setInterval(fetchQuotes, 60_000);
    return () => clearInterval(id);
  }, []);

  // Hide if no data or error
  if (error || quotes.length === 0) return null;

  // Duplicate items for seamless loop
  const items = [...quotes, ...quotes];

  return (
    <div className="w-full bg-slate-custom-900 border-b border-slate-custom-800 overflow-hidden flex items-center h-9 mb-4 rounded-lg">
      {/* LIVE label */}
      <div className="flex items-center gap-1.5 px-3 border-r border-slate-custom-700 h-full shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-custom-400">Live</span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden relative">
        <div className="ticker-track flex items-center h-9 w-max">
          {items.map((q, i) => (
            <TickerItem key={`${q.symbol}-${i}`} quote={q} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep -i "StockTicker\|stocks"
```

Expected: no output (no errors for these files).

**Step 3: Commit**

```bash
git add src/components/dashboard/StockTicker.tsx
git commit -m "feat: add StockTicker client component with marquee animation"
```

---

### Task 5: Integrate the ticker into the Dashboard overview page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Add the import at the top of the file**

After the existing imports, add:

```typescript
import StockTicker from "@/components/dashboard/StockTicker";
```

**Step 2: Add `<StockTicker />` as the first element inside the returned fragment**

The current JSX starts with:

```tsx
return (
  <>
    {/* Data delay banner for Free tier */}
    {tier === "FREE" && (
```

Change it to:

```tsx
return (
  <>
    <StockTicker />
    {/* Data delay banner for Free tier */}
    {tier === "FREE" && (
```

**Step 3: Verify in browser**

With `npm run dev` running, navigate to `http://localhost:3000/dashboard`. You should see a dark ticker bar at the top of the overview content area, scrolling EV stock prices. Hovering the ticker should pause it.

**Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: integrate StockTicker into dashboard overview page"
```

---

### Task 6: Final build validation & PR

**Step 1: Full build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no new errors.

**Step 2: Create PR**

```bash
git push origin HEAD
gh pr create \
  --title "feat: add live EV stock ticker to dashboard overview" \
  --body "$(cat <<'EOF'
## What
Adds a horizontally scrolling live stock ticker to the top of the Dashboard overview page. Shows real-time price and % change for 21 EV-related companies (Tesla, NIO, BYD, BMW, VW, etc.). Clicking any item opens the Yahoo Finance quote page in a new tab. See [docs/plans/2026-02-28-stock-ticker-design.md](docs/plans/2026-02-28-stock-ticker-design.md).

## Why
Gives investors and analysts immediate market context when they open the dashboard — tying EV market data to public equity prices.

## Changes
- `package.json` — added `yahoo-finance2` dependency
- `src/app/api/stocks/route.ts` — new API route; batch-fetches 21 quotes with 60 s in-memory cache
- `src/app/globals.css` — added `ticker-scroll` keyframe + `.ticker-track` utility class
- `src/components/dashboard/StockTicker.tsx` — new client component; CSS marquee, pulsing LIVE dot, Yahoo Finance links, pauses on hover
- `src/app/dashboard/page.tsx` — mounts `<StockTicker />` above the stat cards

## Testing
- `npm run build` passes with no new errors
- `curl http://localhost:3000/api/stocks` returns valid JSON array with price data
- Ticker renders and scrolls on `/dashboard`; hovering pauses animation
- Clicking a ticker item opens correct Yahoo Finance URL in new tab
EOF
)"
```
