import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fetchStockQuote } from "@/lib/scraper/finnhub";
import { ALL_COMPANIES } from "@/lib/scraper/companies";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// Process one ticker: fetch quote and write snapshot to DB.
async function processTicker(ticker: string, companyName: string, country: string, isEV: boolean, market: string) {
  const data = await fetchStockQuote(ticker);

  await prisma.stockDailySnapshot.create({
    data: {
      ticker,
      companyName,
      country,
      isEV,
      market,
      price:           data?.price           ?? null,
      marketCap:       data?.marketCap        ?? null,
      volume:          data?.volume           ?? null,
      peRatio:         data?.peRatio          ?? null,
      earningsDate:    data?.earningsDate     ?? null,
      earningsDateRaw: data?.earningsDateRaw  ?? null,
    },
  });

  const status = data ? "ok" : "no_data";
  console.log(`[cron] sync-stocks: ${ticker} → ${status}`);
  return { ticker, status };
}

const BATCH_SIZE = 2;          // 2 tickers × 3 Finnhub calls = 6 req per batch
const BATCH_DELAY_MS = 15_000; // 15 seconds between batches → ~24 req/min (well under free tier limit: 60)

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startedAt = new Date();
  console.log(`[cron] sync-stocks started at ${startedAt.toISOString()} — ${ALL_COMPANIES.length} companies`);

  const allResults: Array<{ ticker: string; status: string; reason?: string }> = [];

  for (let i = 0; i < ALL_COMPANIES.length; i += BATCH_SIZE) {
    const batch = ALL_COMPANIES.slice(i, i + BATCH_SIZE);
    console.log(`[cron] sync-stocks batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.map((c) => c.ticker).join(", ")}`);

    const batchResults = await Promise.allSettled(
      batch.map(({ ticker, companyName, country, isEV, market }) =>
        processTicker(ticker, companyName, country, isEV, market)
      ),
    );

    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      allResults.push(
        r.status === "fulfilled"
          ? r.value
          : { ticker: batch[j].ticker, status: "error", reason: String((r as PromiseRejectedResult).reason) }
      );
    }

    // Delay before next batch (skip after the last batch)
    if (i + BATCH_SIZE < ALL_COMPANIES.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const results = allResults;

  const ok      = results.filter((r) => r.status === "ok").length;
  const no_data = results.filter((r) => r.status === "no_data").length;
  const errors  = results.filter((r) => r.status === "error").length;

  console.log(`[cron] sync-stocks done — ok=${ok}, no_data=${no_data}, errors=${errors}`);
  return NextResponse.json({ ok, no_data, errors, results });
}
