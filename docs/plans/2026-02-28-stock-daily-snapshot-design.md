# Design: Stock Daily Snapshot & Real Earnings Catalysts

**Date:** 2026-02-28
**Status:** Approved

## Problem

The dashboard's "Upcoming Catalysts" section shows hardcoded mock earnings dates. There is no persistent storage for stock market data (price, market cap, volume, PE ratio) or upcoming earnings dates per tracked company.

## Goal

- Scrape real earnings dates and market metrics from Yahoo Finance once per trading day after all global markets close
- Store results in a new `StockDailySnapshot` DB table
- Replace the hardcoded catalyst array in the feed route with live DB data
- Support any publicly traded company globally, with flags for EV companies and country of origin

## Data Model

### `StockDailySnapshot`

Mapped to table `juice_stock_daily_snapshots`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `ticker` | `String` | Yahoo Finance ticker symbol (e.g. `"TSLA"`, `"9863.HK"`, `"002594.SZ"`) |
| `companyName` | `String` | Human-readable company name (e.g. "Tesla", "BYD") |
| `country` | `String?` | Country of the company's primary operations (e.g. "USA", "China") |
| `isEV` | `Boolean` | True if the company is primarily an EV or EV-adjacent company |
| `market` | `String` | Exchange market code: `"US"`, `"HK"`, `"CN"`, `"IN"`, `"EU"` |
| `price` | `Float?` | Latest closing price in local currency |
| `marketCap` | `Float?` | Market capitalisation in local currency (raw number) |
| `volume` | `BigInt?` | Trading volume for the session |
| `peRatio` | `Float?` | Trailing twelve-month P/E ratio |
| `earningsDate` | `DateTime?` | Next estimated earnings date (parsed from Yahoo) |
| `earningsDateRaw` | `String?` | Raw earnings date label from Yahoo (e.g. `"Mar 17, 2026"`) |
| `scrapedAt` | `DateTime` | UTC timestamp when this row was inserted |

Indexes on `ticker` and `scrapedAt`. The latest row per `ticker` represents current data.

### Schema snippet (Prisma)

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

## Company List (33 EV companies)

| # | Company | Ticker | Country | Market |
|---|---------|--------|---------|--------|
| 1 | Tesla | TSLA | USA | US |
| 2 | BYD | 002594.SZ | China | CN |
| 3 | Xiaomi | XIACF | China | US |
| 4 | Rivian | RIVN | USA | US |
| 5 | Li Auto | LI | China | US |
| 6 | XPeng | XPEV | China | US |
| 7 | NIO | NIO | China | US |
| 8 | VinFast Auto | VFS | Vietnam | US |
| 9 | Leapmotor | 9863.HK | China | HK |
| 10 | Yadea Group | 1585.HK | China | HK |
| 11 | Lucid Motors | LCID | USA | US |
| 12 | Ather Energy | ATHERENERG.NS | India | IN |
| 13 | Polestar | PSNY | Sweden | US |
| 14 | Ola Electric Mobility | OLAELEC.NS | India | IN |
| 15 | Olectra Greentech | OLECTRA.NS | India | IN |
| 16 | Lotus Technology | LOT | China | US |
| 17 | Hyliion | HYLN | USA | US |
| 18 | LiveWire Group | LVWR | USA | US |
| 19 | NIU | NIU | China | US |
| 20 | Faraday Future | FFAI | USA | US |
| 21 | Kandi Technologies | KNDI | China | US |
| 22 | Aptera Motors | SEV | USA | US |
| 23 | Gogoro | GGR | Taiwan | US |
| 24 | Ebusco Holding | EBUS.AS | Netherlands | EU |
| 25 | EZGO Technologies | EZGO | China | US |
| 26 | Workhorse Group | WKHS | USA | US |
| 27 | XOS | XOS | USA | US |
| 28 | REE Automotive | REE | Israel | US |
| 29 | Phoenix Motor | PEV | USA | US |
| 30 | Cenntro Electric Group | CENN | USA | US |
| 31 | U Power | UCAR | China | US |
| 32 | GreenPower Motor | GP | Canada | US |
| 33 | Lightning eMotors | ZEVY | USA | US |

> Notes:
> - Lightning eMotors (ZEVY) appears delisted ($0 market cap). Scraper will return null — that's fine.
> - All companies are marked `isEV: true`.

## Scraping Strategy

Use Yahoo Finance's unofficial JSON API — no HTML parsing, no new npm dependencies:

```
GET https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}
    ?modules=price,calendarEvents,summaryDetail
    &corsDomain=finance.yahoo.com
```

A shared `scrapeYahooQuote(ticker)` function in `src/lib/scraper/yahoo-finance.ts` handles fetch + parsing + error handling. Returns `null` on failure so one bad ticker does not abort the whole run.

## Cron Schedule — Single Global Job

All tickers are scraped by one cron route that runs after all global markets have closed:

| Market | Closes (UTC) |
|--------|-------------|
| HK (HKEX) | ~8 AM UTC |
| China (SZ/SH) | ~7 AM UTC |
| India (NSE) | ~10 AM UTC |
| Europe (AMS) | ~4:30 PM UTC |
| US (NYSE/NASDAQ) | ~9 PM UTC |

**Schedule:** `0 22 * * 1-5` — 10 PM UTC Mon–Fri (after all markets closed)

Single route: `/api/cron/sync-stocks`

## Feed Route Update

Replace hardcoded `catalysts` array with a DB query:

```ts
const snapshots = await prisma.stockDailySnapshot.findMany({
  where: { earningsDate: { gte: new Date() } },
  orderBy: { earningsDate: "asc" },
  distinct: ["ticker"],
  take: 5,
});
```

## vercel.json

```json
{
  "regions": ["sfo1"],
  "crons": [
    { "path": "/api/cron/sync-stocks", "schedule": "0 22 * * 1-5" }
  ]
}
```

## Files Affected

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `StockDailySnapshot` model |
| `src/lib/scraper/yahoo-finance.ts` | New: Yahoo Finance JSON API scraper |
| `src/lib/scraper/companies.ts` | New: hardcoded company/ticker config list |
| `src/app/api/cron/sync-stocks/route.ts` | New: single global cron handler |
| `src/app/api/dashboard/feed/route.ts` | Replace mock catalysts with DB query |
| `vercel.json` | Add cron schedule |
