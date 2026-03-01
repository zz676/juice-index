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
          volume:          data?.volume           ?? null,
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

  const summary = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { ticker: ALL_COMPANIES[i].ticker, status: "error", reason: String((r as PromiseRejectedResult).reason) }
  );

  const ok      = summary.filter((r) => r.status === "ok").length;
  const no_data = summary.filter((r) => r.status === "no_data").length;
  const errors  = summary.filter((r) => r.status === "error").length;

  console.log(`[cron] sync-stocks done — ok=${ok}, no_data=${no_data}, errors=${errors}`);
  return NextResponse.json({ ok, no_data, errors, results: summary });
}
