# Stock Daily Snapshot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scrape real earnings dates and market metrics (price, market cap, volume, PE ratio) from Yahoo Finance once per day after all global markets close, and serve upcoming earnings as live catalysts on the dashboard.

**Architecture:** A shared scraper lib fetches Yahoo Finance's unofficial JSON API and parses the response into a typed struct. A hardcoded company config lists all 33 EV companies with ticker, country, and isEV flag. One cron route runs at 10 PM UTC (after all markets close) and upserts rows into `StockDailySnapshot`. The feed route replaces its hardcoded array with a DB query.

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL), native `fetch`, Vitest, `verifyCronAuth` (existing), Vercel Cron

---

### Task 1: Add StockDailySnapshot to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the model**

Open `prisma/schema.prisma` and append this model at the bottom:

```prisma
/// Daily snapshot of market data and upcoming earnings for a globally tracked company.
/// One row is inserted per ticker per cron run. The most recent row per ticker
/// is treated as the current view. Older rows are retained for historical trend use.
/// Non-public companies will have null market data fields.
model StockDailySnapshot {
  /// Unique identifier for this snapshot row.
  id              String    @id @default(cuid())
  /// Yahoo Finance ticker symbol used to fetch this data (e.g. "TSLA", "9863.HK", "002594.SZ").
  ticker          String
  /// Human-readable company name displayed in the UI (e.g. "Tesla", "BYD", "Leapmotor").
  companyName     String
  /// Country of the company's primary operations or headquarters (e.g. "USA", "China", "India").
  country         String?
  /// True if the company is primarily an EV or EV-adjacent business.
  isEV            Boolean   @default(false)
  /// Exchange market code. "US" = NYSE/NASDAQ/OTC, "HK" = HKEX, "CN" = Shanghai/Shenzhen,
  /// "IN" = NSE India, "EU" = European exchanges.
  market          String
  /// Latest closing or delayed price in the ticker's local currency. Null for private companies.
  price           Float?
  /// Market capitalisation in local currency as a raw numeric value. Null for private companies.
  marketCap       Float?
  /// Number of shares traded in the most recent session. Null for private companies.
  volume          BigInt?
  /// Trailing twelve-month price-to-earnings ratio. Null if company has negative earnings or is private.
  peRatio         Float?
  /// Next estimated earnings announcement date parsed from Yahoo Finance. Null if unavailable.
  earningsDate    DateTime?
  /// Raw earnings date label as displayed on Yahoo Finance (e.g. "Mar 17, 2026 - Mar 21, 2026").
  earningsDateRaw String?
  /// UTC timestamp of when this scrape was performed by the cron job.
  scrapedAt       DateTime  @default(now())

  @@index([ticker])
  @@index([scrapedAt])
  @@map("juice_stock_daily_snapshots")
}
```

**Step 2: Run migration**

```bash
npx prisma migrate dev --name add_stock_daily_snapshot
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add StockDailySnapshot model to schema"
```

---

### Task 2: Yahoo Finance scraper lib

**Files:**
- Create: `src/lib/scraper/yahoo-finance.ts`
- Create: `src/lib/scraper/__tests__/yahoo-finance.test.ts`

**Background:** Yahoo Finance exposes an unofficial JSON API at:
```
GET https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}
    ?modules=price,calendarEvents,summaryDetail
    &corsDomain=finance.yahoo.com
```
We split fetch from parse so the parser can be unit-tested without HTTP.

**Step 1: Write the failing test**

Create `src/lib/scraper/__tests__/yahoo-finance.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseYahooQuote } from "../yahoo-finance";

const makeFixture = (overrides: Record<string, unknown> = {}) => ({
  quoteSummary: {
    result: [
      {
        price: {
          regularMarketPrice: { raw: 34.9 },
          marketCap: { raw: 905_000_000_000 },
          regularMarketVolume: { raw: 12_000_000 },
        },
        summaryDetail: {
          trailingPE: { raw: 28.5 },
        },
        calendarEvents: {
          earnings: {
            earningsDate: [{ raw: 1742169600, fmt: "Mar 17, 2026" }],
          },
        },
      },
    ],
    error: null,
    ...overrides,
  },
});

describe("parseYahooQuote", () => {
  it("extracts all five fields from a complete response", () => {
    const result = parseYahooQuote(makeFixture());
    expect(result).not.toBeNull();
    expect(result!.price).toBe(34.9);
    expect(result!.marketCap).toBe(905_000_000_000);
    expect(result!.volume).toBe(12_000_000);
    expect(result!.peRatio).toBe(28.5);
    expect(result!.earningsDateRaw).toBe("Mar 17, 2026");
    expect(result!.earningsDate).toBeInstanceOf(Date);
    expect(result!.earningsDate!.getFullYear()).toBe(2026);
  });

  it("returns null when result array is empty", () => {
    expect(parseYahooQuote({ quoteSummary: { result: [], error: null } })).toBeNull();
  });

  it("returns null on API-level error", () => {
    expect(parseYahooQuote({ quoteSummary: { result: null, error: { code: "Not Found" } } })).toBeNull();
  });

  it("returns null for completely unexpected shape", () => {
    expect(parseYahooQuote(null)).toBeNull();
    expect(parseYahooQuote("garbage")).toBeNull();
    expect(parseYahooQuote({})).toBeNull();
  });

  it("tolerates missing peRatio (negative-earnings company)", () => {
    const fixture = makeFixture();
    delete (fixture.quoteSummary.result[0] as any).summaryDetail.trailingPE;
    const result = parseYahooQuote(fixture);
    expect(result).not.toBeNull();
    expect(result!.peRatio).toBeNull();
  });

  it("tolerates missing earningsDate", () => {
    const fixture = makeFixture();
    (fixture.quoteSummary.result[0] as any).calendarEvents.earnings.earningsDate = [];
    const result = parseYahooQuote(fixture);
    expect(result).not.toBeNull();
    expect(result!.earningsDate).toBeNull();
    expect(result!.earningsDateRaw).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/scraper/__tests__/yahoo-finance.test.ts
```

Expected: FAIL — `parseYahooQuote` not found.

**Step 3: Implement the scraper**

Create `src/lib/scraper/yahoo-finance.ts`:

```typescript
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
    const earningsDate = firstEarnings ? new Date(firstEarnings.raw * 1000) : null;
    const earningsDateRaw = firstEarnings?.fmt ?? null;

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
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/scraper/__tests__/yahoo-finance.test.ts
```

Expected: all 6 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/scraper/yahoo-finance.ts src/lib/scraper/__tests__/yahoo-finance.test.ts
git commit -m "feat: add Yahoo Finance scraper with parseYahooQuote and fetchYahooQuote"
```

---

### Task 3: Company config list

**Files:**
- Create: `src/lib/scraper/companies.ts`

**Step 1: Create the config**

Create `src/lib/scraper/companies.ts`:

```typescript
/** A tracked company entry used by the stock scraper cron job. */
export interface CompanyConfig {
  ticker: string;
  companyName: string;
  country: string;
  isEV: boolean;
  /** Exchange market code: "US" | "HK" | "CN" | "IN" | "EU" */
  market: string;
}

/**
 * All tracked EV companies. Tickers are Yahoo Finance symbols.
 * Non-public or delisted companies are included — the scraper returns null
 * for them gracefully and their market data fields will be null in the DB.
 */
export const EV_COMPANIES: CompanyConfig[] = [
  { ticker: "TSLA",          companyName: "Tesla",                   country: "USA",         isEV: true, market: "US" },
  { ticker: "002594.SZ",     companyName: "BYD",                     country: "China",       isEV: true, market: "CN" },
  { ticker: "XIACF",         companyName: "Xiaomi",                  country: "China",       isEV: true, market: "US" },
  { ticker: "RIVN",          companyName: "Rivian",                  country: "USA",         isEV: true, market: "US" },
  { ticker: "LI",            companyName: "Li Auto",                 country: "China",       isEV: true, market: "US" },
  { ticker: "XPEV",          companyName: "XPeng",                   country: "China",       isEV: true, market: "US" },
  { ticker: "NIO",           companyName: "NIO",                     country: "China",       isEV: true, market: "US" },
  { ticker: "VFS",           companyName: "VinFast Auto",            country: "Vietnam",     isEV: true, market: "US" },
  { ticker: "9863.HK",       companyName: "Leapmotor",               country: "China",       isEV: true, market: "HK" },
  { ticker: "1585.HK",       companyName: "Yadea Group",             country: "China",       isEV: true, market: "HK" },
  { ticker: "LCID",          companyName: "Lucid Motors",            country: "USA",         isEV: true, market: "US" },
  { ticker: "ATHERENERG.NS", companyName: "Ather Energy",            country: "India",       isEV: true, market: "IN" },
  { ticker: "PSNY",          companyName: "Polestar",                country: "Sweden",      isEV: true, market: "US" },
  { ticker: "OLAELEC.NS",    companyName: "Ola Electric Mobility",   country: "India",       isEV: true, market: "IN" },
  { ticker: "OLECTRA.NS",    companyName: "Olectra Greentech",       country: "India",       isEV: true, market: "IN" },
  { ticker: "LOT",           companyName: "Lotus Technology",        country: "China",       isEV: true, market: "US" },
  { ticker: "HYLN",          companyName: "Hyliion",                 country: "USA",         isEV: true, market: "US" },
  { ticker: "LVWR",          companyName: "LiveWire Group",          country: "USA",         isEV: true, market: "US" },
  { ticker: "NIU",           companyName: "NIU",                     country: "China",       isEV: true, market: "US" },
  { ticker: "FFAI",          companyName: "Faraday Future",          country: "USA",         isEV: true, market: "US" },
  { ticker: "KNDI",          companyName: "Kandi Technologies",      country: "China",       isEV: true, market: "US" },
  { ticker: "SEV",           companyName: "Aptera Motors",           country: "USA",         isEV: true, market: "US" },
  { ticker: "GGR",           companyName: "Gogoro",                  country: "Taiwan",      isEV: true, market: "US" },
  { ticker: "EBUS.AS",       companyName: "Ebusco Holding",          country: "Netherlands", isEV: true, market: "EU" },
  { ticker: "EZGO",          companyName: "EZGO Technologies",       country: "China",       isEV: true, market: "US" },
  { ticker: "WKHS",          companyName: "Workhorse Group",         country: "USA",         isEV: true, market: "US" },
  { ticker: "XOS",           companyName: "XOS",                     country: "USA",         isEV: true, market: "US" },
  { ticker: "REE",           companyName: "REE Automotive",          country: "Israel",      isEV: true, market: "US" },
  { ticker: "PEV",           companyName: "Phoenix Motor",           country: "USA",         isEV: true, market: "US" },
  { ticker: "CENN",          companyName: "Cenntro Electric Group",  country: "USA",         isEV: true, market: "US" },
  { ticker: "UCAR",          companyName: "U Power",                 country: "China",       isEV: true, market: "US" },
  { ticker: "GP",            companyName: "GreenPower Motor",        country: "Canada",      isEV: true, market: "US" },
  { ticker: "ZEVY",          companyName: "Lightning eMotors",       country: "USA",         isEV: true, market: "US" },
];

/** All companies to scrape (union of all lists). Extend here when adding non-EV auto makers. */
export const ALL_COMPANIES: CompanyConfig[] = [...EV_COMPANIES];
```

**Step 2: Commit**

```bash
git add src/lib/scraper/companies.ts
git commit -m "feat: add company config list with 33 EV companies"
```

---

### Task 4: Single global cron route

**Files:**
- Create: `src/app/api/cron/sync-stocks/route.ts`

**Background:** Runs at 10 PM UTC Mon–Fri (`0 22 * * 1-5`), after all global markets have closed (US closes ~9 PM UTC). Scrapes all companies in parallel using `Promise.allSettled` so one failure never aborts the run.

**Step 1: Create the route**

Create `src/app/api/cron/sync-stocks/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fetchYahooQuote } from "@/lib/scraper/yahoo-finance";
import { ALL_COMPANIES } from "@/lib/scraper/companies";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startedAt = new Date();
  console.log(`[cron] sync-stocks started at ${startedAt.toISOString()} — ${ALL_COMPANIES.length} companies`);

  const results = await Promise.allSettled(
    ALL_COMPANIES.map(async ({ ticker, companyName, country, isEV, market }) => {
      const data = await fetchYahooQuote(ticker);

      await prisma.stockDailySnapshot.create({
        data: {
          ticker,
          companyName,
          country,
          isEV,
          market,
          price:           data?.price           ?? null,
          marketCap:       data?.marketCap        ?? null,
          volume:          data?.volume != null ? BigInt(Math.round(data.volume)) : null,
          peRatio:         data?.peRatio          ?? null,
          earningsDate:    data?.earningsDate     ?? null,
          earningsDateRaw: data?.earningsDateRaw  ?? null,
        },
      });

      const status = data ? "ok" : "no_data";
      console.log(`[cron] sync-stocks: ${ticker} → ${status}`);
      return { ticker, status };
    }),
  );

  const summary = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { ticker: "unknown", status: "error", reason: String((r as PromiseRejectedResult).reason) }
  );

  const ok      = summary.filter((r) => r.status === "ok").length;
  const no_data = summary.filter((r) => r.status === "no_data").length;
  const errors  = summary.filter((r) => r.status === "error").length;

  console.log(`[cron] sync-stocks done — ok=${ok}, no_data=${no_data}, errors=${errors}`);
  return NextResponse.json({ ok, no_data, errors, results: summary });
}
```

**Step 2: Run build check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/api/cron/sync-stocks/
git commit -m "feat: add sync-stocks cron route for all global EV companies"
```

---

### Task 5: Update feed route to serve live catalysts

**Files:**
- Modify: `src/app/api/dashboard/feed/route.ts`

**Step 1: Replace hardcoded catalysts**

In `src/app/api/dashboard/feed/route.ts`, replace the block:

```typescript
        // Mock catalysts for now (no Catalyst model yet)
        const catalysts = [
            { month: "Oct", day: "24", title: "Xiaomi Earnings Call", desc: "Expected to reveal EV margin data.", tags: ["Earnings", "1810.HK"] },
            { month: "Nov", day: "01", title: "Monthly Deliveries", desc: "Major OEMs release Oct figures.", tags: ["Macro"], highlight: "High Impact" },
            { month: "Nov", day: "17", title: "Guangzhou Auto Show", desc: "Li Auto MPV launch event.", tags: ["Event"] },
        ];
```

With:

```typescript
        // Fetch upcoming earnings from the latest StockDailySnapshot per ticker
        const upcomingSnapshots = await prisma.stockDailySnapshot.findMany({
            where: { earningsDate: { gte: new Date() } },
            orderBy: { earningsDate: "asc" },
            distinct: ["ticker"],
            take: 5,
        });

        const catalysts = upcomingSnapshots.map((s) => {
            const date = s.earningsDate!;
            const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
            const day = String(date.getUTCDate()).padStart(2, "0");
            return {
                month,
                day,
                title: `${s.companyName} Earnings`,
                desc: s.earningsDateRaw ? `Est. ${s.earningsDateRaw}` : "Earnings date from Yahoo Finance.",
                tags: ["Earnings", s.ticker],
            };
        });
```

**Step 2: Run build check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/api/dashboard/feed/route.ts
git commit -m "feat: replace mock catalysts with live earnings from StockDailySnapshot"
```

---

### Task 6: Add cron schedule to vercel.json

**Files:**
- Modify: `vercel.json`

**Step 1: Update vercel.json**

Replace contents with:

```json
{
  "regions": ["sfo1"],
  "crons": [
    {
      "path": "/api/cron/sync-stocks",
      "schedule": "0 22 * * 1-5"
    }
  ]
}
```

`0 22 * * 1-5` = 10 PM UTC Mon–Fri. By this time all markets have closed: HK (~8 AM UTC), India (~10 AM UTC), Europe (~4:30 PM UTC), US (~9 PM UTC).

**Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron schedule for daily global stock scrape at 10 PM UTC"
```

---

### Task 7: Final validation

**Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

**Step 2: Run full build**

```bash
npm run build
```

Expected: build succeeds with no type errors.

**Step 3: Commit if anything remains**

```bash
git status
# only commit if there are uncommitted changes
```
