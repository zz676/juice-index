-- CreateTable
CREATE TABLE "juice_stock_daily_snapshots" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "country" TEXT,
    "isEV" BOOLEAN NOT NULL DEFAULT false,
    "market" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "marketCap" DOUBLE PRECISION,
    "volume" BIGINT,
    "peRatio" DOUBLE PRECISION,
    "earningsDate" TIMESTAMP(3),
    "earningsDateRaw" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "juice_stock_daily_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "juice_stock_daily_snapshots_ticker_idx" ON "juice_stock_daily_snapshots"("ticker");

-- CreateIndex
CREATE INDEX "juice_stock_daily_snapshots_scrapedAt_idx" ON "juice_stock_daily_snapshots"("scrapedAt");
