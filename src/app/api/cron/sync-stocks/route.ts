import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fetchStockExtras } from "@/lib/scraper/finnhub";
import { fetchMarketCapData } from "@/lib/scraper/companiesmarketcap";
import { ALL_COMPANIES } from "@/lib/scraper/companies";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const BATCH_SIZE = 3;          // per batch: up to 3 tickers × 2 Finnhub calls = 6 req max
const BATCH_DELAY_MS = 15_000; // 15 seconds between batches → ~24 req/min (free tier limit: 60)

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startedAt = new Date();
  console.log(`[cron] sync-stocks started at ${startedAt.toISOString()} — ${ALL_COMPANIES.length} companies`);

  // Step 1: fetch price + market cap for all companies in one request
  const marketCapData = await fetchMarketCapData();

  const allResults: Array<{ ticker: string; status: string; reason?: string }> = [];

  for (let i = 0; i < ALL_COMPANIES.length; i += BATCH_SIZE) {
    const batch = ALL_COMPANIES.slice(i, i + BATCH_SIZE);
    console.log(`[cron] sync-stocks batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.map((c) => c.ticker).join(", ")}`);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ ticker, companyName, country, isEV, market }) => {
        const cmc = marketCapData.get(ticker);

        // Only call Finnhub for US-listed stocks — non-US exchanges return 403 on free tier
        const extras = market === "US" ? await fetchStockExtras(ticker) : null;

        await prisma.stockDailySnapshot.create({
          data: {
            ticker,
            companyName,
            country,
            isEV,
            market,
            price:           cmc?.price             ?? null,
            marketCap:       cmc?.marketCap          ?? null,
            volume:          null,
            peRatio:         extras?.peRatio         ?? null,
            earningsDate:    extras?.earningsDate    ?? null,
            earningsDateRaw: extras?.earningsDateRaw ?? null,
          },
        });

        const status = cmc ? "ok" : "no_data";
        console.log(`[cron] sync-stocks: ${ticker} → ${status}`);
        return { ticker, status };
      }),
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

  const ok      = allResults.filter((r) => r.status === "ok").length;
  const no_data = allResults.filter((r) => r.status === "no_data").length;
  const errors  = allResults.filter((r) => r.status === "error").length;

  console.log(`[cron] sync-stocks done — ok=${ok}, no_data=${no_data}, errors=${errors}`);
  return NextResponse.json({ ok, no_data, errors, results: allResults });
}
