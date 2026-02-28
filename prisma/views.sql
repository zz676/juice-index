-- Drop in reverse dependency order before recreating
DROP VIEW IF EXISTS "NioPowerMonthlyDelta";
DROP VIEW IF EXISTS "NioPowerDailyDelta";

-- NioPowerDailyDelta view
-- Converts the cumulative NioPowerSnapshot data into per-day delta values.
-- All "daily*" fields are deltas (what was added/done that day).
-- Absolute snapshot values (swapStations, cumulativeSwaps, etc.) are also kept for reference.
-- Run this once against your database after schema changes:
--   psql $DATABASE_URL -f prisma/views.sql

CREATE VIEW "NioPowerDailyDelta" AS
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
SELECT * FROM (
  SELECT
    "fullDate",
    EXTRACT(YEAR  FROM "fullDate")::int                                                       AS "year",
    EXTRACT(MONTH FROM "fullDate")::int                                                       AS "month",
    TO_CHAR("fullDate", 'MM-DD')                                                              AS "date",
    -- Absolute snapshot values (end-of-day readings)
    "swapStations",
    "chargingStations",
    "chargingPiles",
    "totalStations",
    "highwaySwapStations",
    "thirdPartyPiles",
    "cumulativeSwaps",
    "cumulativeCharges",
    -- Daily delta values (what was added/done that day)
    "cumulativeSwaps"    - LAG("cumulativeSwaps")    OVER (ORDER BY "fullDate") AS "dailySwaps",
    "cumulativeCharges"  - LAG("cumulativeCharges")  OVER (ORDER BY "fullDate") AS "dailyCharges",
    "swapStations"       - LAG("swapStations")       OVER (ORDER BY "fullDate") AS "dailySwapStations",
    "chargingStations"   - LAG("chargingStations")   OVER (ORDER BY "fullDate") AS "dailyChargingStations",
    "chargingPiles"      - LAG("chargingPiles")      OVER (ORDER BY "fullDate") AS "dailyChargingPiles",
    "totalStations"      - LAG("totalStations")      OVER (ORDER BY "fullDate") AS "dailyTotalStations",
    "highwaySwapStations"- LAG("highwaySwapStations")OVER (ORDER BY "fullDate") AS "dailyHighwaySwapStations",
    "thirdPartyPiles"    - LAG("thirdPartyPiles")    OVER (ORDER BY "fullDate") AS "dailyThirdPartyPiles"
  FROM daily
) sub
WHERE "dailySwaps" IS NOT NULL;

-- NioPowerMonthlyDelta view
-- Aggregates NioPowerDailyDelta into monthly totals.
-- All "monthly*" fields are sums of daily deltas for that month.

CREATE VIEW "NioPowerMonthlyDelta" AS
SELECT
  "year",
  "month",
  TO_CHAR(MAKE_DATE("year", "month", 1), 'YYYY-MM')  AS "yearMonth",
  -- Monthly session totals (sum of daily deltas)
  SUM("dailySwaps")::bigint                           AS "monthlySwaps",
  SUM("dailyCharges")::bigint                         AS "monthlyCharges",
  SUM("dailySwapStations")::bigint                    AS "monthlySwapStations",
  SUM("dailyChargingStations")::bigint                AS "monthlyChargingStations",
  SUM("dailyChargingPiles")::bigint                   AS "monthlyChargingPiles",
  SUM("dailyTotalStations")::bigint                   AS "monthlyTotalStations",
  SUM("dailyHighwaySwapStations")::bigint             AS "monthlyHighwaySwapStations",
  SUM("dailyThirdPartyPiles")::bigint                 AS "monthlyThirdPartyPiles",
  -- Absolute snapshot values at end of month
  MAX("swapStations")                                 AS "swapStations",
  MAX("chargingStations")                             AS "chargingStations",
  MAX("chargingPiles")                                AS "chargingPiles",
  MAX("totalStations")                                AS "totalStations",
  MAX("highwaySwapStations")                          AS "highwaySwapStations",
  MAX("thirdPartyPiles")                              AS "thirdPartyPiles",
  MAX("cumulativeSwaps")                              AS "cumulativeSwaps",
  MAX("cumulativeCharges")                            AS "cumulativeCharges"
FROM "NioPowerDailyDelta"
GROUP BY "year", "month";
