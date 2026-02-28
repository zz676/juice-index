-- NioPowerDailyDelta view
-- Converts the cumulative NioPowerSnapshot data into per-day delta values.
-- Run this once against your database after schema changes:
--   psql $DATABASE_URL -f prisma/views.sql

CREATE OR REPLACE VIEW "NioPowerDailyDelta" AS
WITH daily AS (
  SELECT
    DATE_TRUNC('day', "asOfTime")::date          AS "fullDate",
    MAX("cumulativeSwaps")                        AS "cumulativeSwaps",
    MAX("cumulativeCharges")                      AS "cumulativeCharges",
    MAX("swapStations")                           AS "swapStations",
    MAX("chargingStations")                       AS "chargingStations",
    MAX("chargingPiles")                          AS "chargingPiles",
    MAX("totalStations")                          AS "totalStations",
    MAX("highwaySwapStations")                    AS "highwaySwapStations",
    MAX("thirdPartyPiles")                        AS "thirdPartyPiles"
  FROM "NioPowerSnapshot"
  GROUP BY DATE_TRUNC('day', "asOfTime")::date
)
SELECT
  "fullDate",
  EXTRACT(YEAR  FROM "fullDate")::int             AS "year",
  EXTRACT(MONTH FROM "fullDate")::int             AS "month",
  TO_CHAR("fullDate", 'MM-DD')                    AS "date",
  "swapStations",
  "chargingStations",
  "chargingPiles",
  "totalStations",
  "highwaySwapStations",
  "thirdPartyPiles",
  "cumulativeSwaps",
  "cumulativeCharges",
  "cumulativeSwaps"   - LAG("cumulativeSwaps")   OVER (ORDER BY "fullDate") AS "dailySwaps",
  "cumulativeCharges" - LAG("cumulativeCharges") OVER (ORDER BY "fullDate") AS "dailyCharges"
FROM daily;
