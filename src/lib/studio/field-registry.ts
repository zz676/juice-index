import { Brand, MetricType, PeriodType, VehicleType } from "@prisma/client";

export type FieldType = "String" | "Enum" | "Int" | "Float" | "BigInt" | "DateTime" | "Boolean";

export interface FieldDef {
  type: FieldType;
  enumName?: string;
  enumValues?: readonly string[];
  description?: string;
}

export interface TableDef {
  name: string;
  description: string;
  fields: Record<string, FieldDef>;
}

const BRAND_VALUES = Object.values(Brand) as readonly string[];
const METRIC_TYPE_VALUES = Object.values(MetricType) as readonly string[];
const PERIOD_TYPE_VALUES = Object.values(PeriodType) as readonly string[];
const VEHICLE_TYPE_VALUES = Object.values(VehicleType) as readonly string[];

const REGISTRY: Record<string, TableDef> = {
  EVMetric: {
    name: "EVMetric",
    description:
      "Per-brand EV delivery/sales metrics (deliveries, wholesale, retail) by model, region, and period. " +
      "Sources vary by brand (CPCA, CAAM, company announcements). Monthly or weekly cadence. " +
      "value = number of vehicles for most metrics; unit field clarifies when different. " +
      "Use this table when you need brand-specific breakdowns; use CaamNevSales/CpcaNevRetail for market totals.",
    fields: {
      brand:        { type: "Enum", enumName: "Brand", enumValues: BRAND_VALUES, description: "EV brand/automaker" },
      metric:       { type: "Enum", enumName: "MetricType", enumValues: METRIC_TYPE_VALUES, description: "Metric type (e.g., DELIVERIES, WHOLESALE, RETAIL)" },
      periodType:   { type: "Enum", enumName: "PeriodType", enumValues: PERIOD_TYPE_VALUES, description: "Period granularity (MONTHLY, WEEKLY, YEARLY, etc.)" },
      year:         { type: "Int", description: "Calendar year" },
      period:       { type: "Int", description: "Period number — for MONTHLY: 1-12 (1=Jan, 12=Dec); for WEEKLY: ISO week number" },
      vehicleModel: { type: "String", description: "Specific vehicle model (null = brand-level aggregate)" },
      region:       { type: "String", description: "Geographic region (null = China total)" },
      category:     { type: "String", description: "Vehicle category filter (null = all NEV)" },
      dataSource:   { type: "String", description: "Data source organization (e.g., CPCA, CAAM, company announcement)" },
      value:        { type: "Float", description: "Metric quantity — typically vehicles delivered/sold; see unit field for exceptions" },
      unit:         { type: "String", description: "Unit of measure (vehicles, percent, etc.)" },
      yoyChange:    { type: "Float", description: "Year-over-year % change as decimal (0.15 = +15% growth)" },
      momChange:    { type: "Float", description: "Month-over-month % change as decimal" },
      marketShare:  { type: "Float", description: "Market share as decimal (0.25 = 25% share)" },
      ranking:      { type: "Int", description: "Sales/delivery rank among tracked brands (#1 = top seller)" },
    },
  },

  AutomakerRankings: {
    name: "AutomakerRankings",
    description:
      "Monthly ranking of top-selling automakers in China by total vehicle sales. " +
      "Sources: CPCA (passenger cars) or CAAM (all vehicles). Monthly cadence. " +
      "value = total vehicles sold by that automaker in that month. " +
      "Use for competitive market share analysis across all automakers, not brand-specific EV metrics.",
    fields: {
      dataSource:  { type: "String", description: "Source organization (CPCA = passenger, CAAM = all vehicles)" },
      year:        { type: "Int", description: "Calendar year" },
      month:       { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      ranking:     { type: "Int", description: "Sales rank (#1 = top-selling automaker)" },
      automaker:   { type: "String", description: "Automaker/manufacturer name (e.g., BYD, Geely, SAIC)" },
      value:       { type: "Float", description: "Total vehicles sold by this automaker (units)" },
      unit:        { type: "String", description: "Unit of measure (default: vehicles)" },
      yoyChange:   { type: "Float", description: "Year-over-year % change as decimal (0.15 = +15%)" },
      momChange:   { type: "Float", description: "Month-over-month % change as decimal" },
      marketShare: { type: "Float", description: "Market share as decimal (0.25 = 25%)" },
    },
  },

  CaamNevSales: {
    name: "CaamNevSales",
    description:
      "Monthly total NEV sales for all of China from CAAM (China Association of Automobile Manufacturers). " +
      "CAAM is the official government-affiliated industry body; data includes domestic sales + exports. " +
      "Monthly cadence. value = total NEV units sold (vehicles). " +
      "Use for total market size; compare with CpcaNevRetail (retail-only, passenger-only) to assess channel dynamics.",
    fields: {
      year:      { type: "Int", description: "Calendar year" },
      month:     { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      value:     { type: "Float", description: "Total NEV units sold nationwide (vehicles) — includes domestic sales and exports" },
      unit:      { type: "String", description: "Unit of measure (default: vehicles)" },
      yoyChange: { type: "Float", description: "Year-over-year % change as decimal (0.15 = +15%)" },
      momChange: { type: "Float", description: "Month-over-month % change as decimal" },
    },
  },

  CpcaNevRetail: {
    name: "CpcaNevRetail",
    description:
      "Monthly NEV retail sales to end consumers from CPCA (China Passenger Car Association). " +
      "Retail = units registered by end buyers; passenger vehicles only, excludes commercial vehicles. " +
      "Monthly cadence. value = NEV units sold to consumers (vehicles). " +
      "Use for consumer demand signals; compare with CpcaNevProduction to assess inventory build/draw.",
    fields: {
      year:      { type: "Int", description: "Calendar year" },
      month:     { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      value:     { type: "Float", description: "NEV units sold to end consumers (retail vehicles) — passenger cars only" },
      unit:      { type: "String", description: "Unit of measure (default: vehicles)" },
      yoyChange: { type: "Float", description: "Year-over-year % change as decimal (0.15 = +15%)" },
      momChange: { type: "Float", description: "Month-over-month % change as decimal" },
    },
  },

  CpcaNevProduction: {
    name: "CpcaNevProduction",
    description:
      "Monthly NEV production (manufacturing output) from CPCA (China Passenger Car Association). " +
      "Production = units manufactured; typically leads sales data by weeks. " +
      "Monthly cadence. value = NEV units manufactured (vehicles), passenger cars only. " +
      "Use to predict future supply or compare production vs retail sales for inventory trend.",
    fields: {
      year:      { type: "Int", description: "Calendar year" },
      month:     { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      value:     { type: "Float", description: "NEV units manufactured during the month (vehicles) — passenger cars only" },
      unit:      { type: "String", description: "Unit of measure (default: vehicles)" },
      yoyChange: { type: "Float", description: "Year-over-year % change as decimal (0.15 = +15%)" },
      momChange: { type: "Float", description: "Month-over-month % change as decimal" },
    },
  },

  ChinaPassengerInventory: {
    name: "ChinaPassengerInventory",
    description:
      "Monthly total passenger vehicle inventory across China (dealer + factory stock combined). " +
      "Monthly cadence. value = total inventory in million units. " +
      "Use alongside ChinaDealerInventoryFactor for a full picture of channel inventory pressure.",
    fields: {
      year:  { type: "Int", description: "Calendar year" },
      month: { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      value: { type: "Float", description: "Total passenger vehicle inventory (million units)" },
      unit:  { type: "String", description: "Unit of measure (default: million_units)" },
    },
  },

  ChinaDealerInventoryFactor: {
    name: "ChinaDealerInventoryFactor",
    description:
      "Monthly dealer inventory coefficient (库存系数) — months of stock at dealerships. Source: CADA (China Automobile Dealers Association). " +
      "Monthly cadence. value = ratio (months of inventory). " +
      "Interpretation: 1.0 = 1 month stock (neutral); >1.5 = oversupply/weak demand; <0.8 = shortage/strong demand. Healthy range: 0.8-1.2.",
    fields: {
      year:  { type: "Int", description: "Calendar year" },
      month: { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      value: { type: "Float", description: "Inventory coefficient (ratio = months of stock); >1.5 oversupply, <0.8 shortage, 0.8-1.2 healthy" },
    },
  },

  ChinaViaIndex: {
    name: "ChinaViaIndex",
    description:
      "Monthly Vehicle Inventory Alert (VIA) Index — dealer sentiment and inventory pressure indicator. Source: CADA. " +
      "Works like inverse PMI: >50% = dealer stress/market contraction; <50% = healthy/optimistic. " +
      "Monthly cadence. value = index level as a percentage. " +
      "Use for dealer confidence signals and market trend prediction.",
    fields: {
      year:  { type: "Int", description: "Calendar year" },
      month: { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      value: { type: "Float", description: "VIA Index level (percent); >50 = dealer stress/contraction; <50 = healthy/optimistic" },
      unit:  { type: "String", description: "Unit of measure (default: percent)" },
    },
  },

  ChinaBatteryInstallation: {
    name: "ChinaBatteryInstallation",
    description:
      "Monthly China power battery installation and production totals for the entire industry. Source: CABIA (China Automotive Battery Innovation Alliance). " +
      "Monthly cadence. installation and production are in GWh. " +
      "Installation = batteries fitted into vehicles; production = total manufactured (may be exported/stockpiled). " +
      "Use for macro EV battery industry trends; use BatteryMakerMonthly for per-company breakdown.",
    fields: {
      year:         { type: "Int", description: "Calendar year" },
      month:        { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      installation: { type: "Float", description: "Battery capacity installed into vehicles during the month (GWh)" },
      production:   { type: "Float", description: "Total battery capacity manufactured during the month (GWh) — may differ from installation due to exports/stockpiling" },
      unit:         { type: "String", description: "Unit of measure (default: GWh)" },
    },
  },

  BatteryMakerMonthly: {
    name: "BatteryMakerMonthly",
    description:
      "Monthly battery installation and production by individual battery manufacturer. Sources: CABIA (China), SNE Research (Global). " +
      "Monthly cadence. installation and production are in GWh. " +
      "Major makers: CATL, BYD, LG Energy Solution, SK On, Panasonic, CALB, Gotion, EVE, Sunwoda. " +
      "Use for per-company performance; use BatteryMakerRankings for ranked market share view.",
    fields: {
      maker:        { type: "String", description: "Battery manufacturer name (e.g., CATL, BYD, LG Energy Solution)" },
      year:         { type: "Int", description: "Calendar year" },
      month:        { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      installation: { type: "Float", description: "Battery capacity this maker installed into vehicles during the month (GWh)" },
      production:   { type: "Float", description: "Battery capacity this maker manufactured during the month (GWh)" },
      unit:         { type: "String", description: "Unit of measure (default: GWh)" },
      yoyChange:    { type: "Float", description: "Year-over-year % change as decimal (0.15 = +15%)" },
      momChange:    { type: "Float", description: "Month-over-month % change as decimal" },
    },
  },

  BatteryMakerRankings: {
    name: "BatteryMakerRankings",
    description:
      "Ranked battery manufacturer market share table — monthly, YTD, or yearly snapshots. " +
      "Sources: CABIA (China domestic market), SNE Research (Global market). " +
      "value = battery capacity shipped/installed (GWh). " +
      "scope distinguishes 'China' vs 'Global' rankings; periodType distinguishes MONTHLY vs YTD vs YEARLY.",
    fields: {
      dataSource:       { type: "String", description: "Source organization (CABIA = China domestic, SNE Research = Global)" },
      scope:            { type: "String", description: "Market scope — 'China' for domestic market, 'Global' for worldwide rankings" },
      // periodType is String in schema (not the PeriodType enum)
      periodType:       { type: "String", description: "Reporting period type — 'MONTHLY', 'YTD' (year-to-date cumulative), or 'YEARLY'" },
      year:             { type: "Int", description: "Calendar year" },
      month:            { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec); null for yearly totals" },
      ranking:          { type: "Int", description: "Market share rank (#1 = largest battery supplier)" },
      maker:            { type: "String", description: "Battery manufacturer name" },
      value:            { type: "Float", description: "Battery capacity shipped/installed (GWh)" },
      unit:             { type: "String", description: "Unit of measure (default: GWh)" },
      yoyChange:        { type: "Float", description: "Year-over-year % change as decimal (0.15 = +15%)" },
      marketShare:      { type: "Float", description: "Market share as decimal (0.25 = 25%)" },
      shareVsPrevMonth: { type: "Float", description: "Change in market share vs previous month as decimal" },
    },
  },

  PlantExports: {
    name: "PlantExports",
    description:
      "Monthly vehicle export volumes by individual manufacturing plant. Sources: China Customs, company announcements. " +
      "Monthly cadence. value = vehicles exported from that plant (units). " +
      "Key plants: Tesla Gigafactory Shanghai, BYD Shenzhen, NIO Hefei, etc. " +
      "Use for factory-level export analysis and production hub strategy insights.",
    fields: {
      plant:     { type: "String", description: "Manufacturing plant name (e.g., 'Tesla Gigafactory Shanghai')" },
      // brand is String in PlantExports (not the Brand enum)
      brand:     { type: "String", description: "Brand produced at this plant" },
      year:      { type: "Int", description: "Calendar year" },
      month:     { type: "Int", description: "Month number 1-12 (1=Jan, 12=Dec)" },
      value:     { type: "Float", description: "Vehicles exported from this plant during the month (units)" },
      unit:      { type: "String", description: "Unit of measure (default: vehicles)" },
      yoyChange: { type: "Float", description: "Year-over-year % change as decimal (0.15 = +15%)" },
      momChange: { type: "Float", description: "Month-over-month % change as decimal" },
    },
  },

  VehicleSpec: {
    name: "VehicleSpec",
    description:
      "Static vehicle specification sheet per model variant — dimensions, powertrain, battery, range, pricing. " +
      "Not time-series data; one row per brand+model+variant combination. " +
      "Prices in CNY (10,000 RMB units). Range in km. Power in kW. Dimensions in mm. " +
      "Use for vehicle comparisons, specs lookup, or filtering models by technical criteria.",
    fields: {
      brand:              { type: "Enum", enumName: "Brand", enumValues: BRAND_VALUES, description: "Brand/automaker" },
      model:              { type: "String", description: "Model name (e.g., Model 3, Han EV, ET7)" },
      variant:            { type: "String", description: "Specific trim/variant name within the model" },
      launchDate:         { type: "String", description: "Official launch date string" },
      vehicleType:        { type: "Enum", enumName: "VehicleType", enumValues: VEHICLE_TYPE_VALUES, description: "Powertrain type (BEV, PHEV, EREV, etc.)" },
      segment:            { type: "String", description: "Market segment (e.g., sedan, SUV, pickup, MPV)" },
      startingPrice:      { type: "Float", description: "Starting/lowest price in CNY 10,000 units (e.g., 23.99 = 239,900 RMB)" },
      currentPrice:       { type: "Float", description: "Current price in CNY 10,000 units" },
      lengthMm:           { type: "Int", description: "Body length in millimeters" },
      widthMm:            { type: "Int", description: "Body width in millimeters" },
      heightMm:           { type: "Int", description: "Body height in millimeters" },
      wheelbaseMm:        { type: "Int", description: "Wheelbase in millimeters" },
      acceleration:       { type: "Float", description: "0-100 km/h acceleration time in seconds" },
      topSpeed:           { type: "Int", description: "Maximum speed in km/h" },
      motorPowerKw:       { type: "Int", description: "Total motor power output in kilowatts" },
      motorTorqueNm:      { type: "Int", description: "Total motor torque in Newton-meters" },
      batteryCapacity:    { type: "Float", description: "Battery pack capacity in kWh" },
      rangeCltc:          { type: "Int", description: "CLTC-rated range in kilometers (Chinese standard)" },
      rangeWltp:          { type: "Int", description: "WLTP-rated range in kilometers (European standard)" },
      rangeEpa:           { type: "Int", description: "EPA-rated range in kilometers (US standard)" },
      fuelTankVolume:     { type: "Float", description: "Fuel tank volume in liters (PHEVs/EREVs only)" },
      engineDisplacement: { type: "Float", description: "Engine displacement in liters (PHEVs/EREVs only)" },
      maxChargingPower:   { type: "Int", description: "Maximum DC fast charging power in kilowatts" },
      chargingTime10To80: { type: "Int", description: "DC fast charge time from 10% to 80% in minutes" },
    },
  },

  NevSalesSummary: {
    name: "NevSalesSummary",
    description:
      "Weekly or bi-weekly NEV sales flash reports from CPCA — early month-to-date estimates before full monthly data. " +
      "Each row covers a date range (startDate to endDate). Contains both retail (to consumers) and wholesale (to dealers) figures. " +
      "retailSales and wholesaleSales in vehicles. Retail-wholesale gap indicates channel inventory change. " +
      "Use for intra-month trend tracking; use CpcaNevRetail for finalized monthly totals.",
    fields: {
      dataSource:     { type: "String", description: "Source organization (default: CPCA)" },
      year:           { type: "Int", description: "Calendar year" },
      startDate:      { type: "String", description: "Period start date (YYYY-MM-DD format)" },
      endDate:        { type: "String", description: "Period end date (YYYY-MM-DD format)" },
      retailSales:    { type: "Float", description: "NEV units sold to end consumers during this period (vehicles)" },
      retailYoy:      { type: "Float", description: "Retail year-over-year % change as decimal (0.15 = +15%)" },
      retailMom:      { type: "Float", description: "Retail month-over-month % change as decimal" },
      wholesaleSales: { type: "Float", description: "NEV units sold from manufacturers to dealers during this period (vehicles)" },
      wholesaleYoy:   { type: "Float", description: "Wholesale year-over-year % change as decimal" },
      wholesaleMom:   { type: "Float", description: "Wholesale month-over-month % change as decimal" },
      unit:           { type: "String", description: "Unit of measure (default: vehicles)" },
    },
  },

  NioPowerSnapshot: {
    name: "NioPowerSnapshot",
    description:
      "NIO power infrastructure snapshots over time — swap stations, charging stations/piles, cumulative swaps & charges, third-party pile access. " +
      "Each row is a point-in-time snapshot (asOfTime). Cumulative counts (cumulativeSwaps, cumulativeCharges) grow monotonically — they represent all-time running totals, NOT per-day or per-period session counts. " +
      "DO NOT use this table for daily/monthly/per-period session queries — use NioPowerDailyDelta instead. " +
      "Use NioPowerSnapshot only when the user explicitly wants to track cumulative milestones or network expansion over time.",
    fields: {
      asOfTime:               { type: "DateTime", description: "Timestamp when this snapshot was recorded" },
      totalStations:          { type: "Int", description: "Total NIO power stations (swap + charging combined)" },
      swapStations:           { type: "Int", description: "Number of battery swap stations" },
      highwaySwapStations:    { type: "Int", description: "Number of swap stations located on highways" },
      cumulativeSwaps:        { type: "BigInt", description: "All-time cumulative battery swap sessions since NIO launched" },
      chargingStations:       { type: "Int", description: "Number of NIO charging stations" },
      chargingPiles:          { type: "Int", description: "Number of individual NIO charging pile units" },
      cumulativeCharges:      { type: "BigInt", description: "All-time cumulative charging sessions since NIO launched" },
      thirdPartyPiles:        { type: "Int", description: "Third-party charging piles accessible via NIO app" },
      thirdPartyUsagePercent: { type: "Float", description: "Share of NIO users using third-party charging as decimal (0.25 = 25%)" },
    },
  },

  NioPowerMonthlyDelta: {
    name: "NioPowerMonthlyDelta",
    description:
      "Monthly aggregated NIO power data — one row per calendar month. " +
      "'monthly*' fields are sums of daily deltas (what was added/done that month, NOT cumulative). " +
      "Absolute snapshot fields (swapStations, cumulativeSwaps, etc.) are end-of-month readings. " +
      "Use this table for monthly or yearly swap/charge session queries (e.g. 'monthly swaps in 2025', 'yearly swap trend'). " +
      "Filter by year (integer) for a full-year view. Use yearMonth (YYYY-MM) as the chart x-axis.",
    fields: {
      year:                      { type: "Int",    description: "Calendar year (e.g. 2025)" },
      month:                     { type: "Int",    description: "Calendar month number (1=Jan … 12=Dec)" },
      yearMonth:                 { type: "String", description: "Year-month label formatted as YYYY-MM (e.g. '2025-02'), for chart x-axis" },
      monthlySwaps:              { type: "BigInt", description: "Battery swap sessions performed this month (delta)" },
      monthlyCharges:            { type: "BigInt", description: "Charging sessions performed this month (delta)" },
      monthlySwapStations:       { type: "BigInt", description: "New battery swap stations opened this month (delta)" },
      monthlyChargingStations:   { type: "BigInt", description: "New charging stations opened this month (delta)" },
      monthlyChargingPiles:      { type: "BigInt", description: "New charging pile units added this month (delta)" },
      monthlyTotalStations:      { type: "BigInt", description: "Total new NIO power stations opened this month (delta)" },
      monthlyHighwaySwapStations:{ type: "BigInt", description: "New highway swap stations opened this month (delta)" },
      monthlyThirdPartyPiles:    { type: "BigInt", description: "New third-party piles added to NIO network this month (delta)" },
      swapStations:              { type: "Int",    description: "Battery swap stations count at end of month (snapshot)" },
      chargingStations:          { type: "Int",    description: "Charging stations count at end of month (snapshot)" },
      chargingPiles:             { type: "Int",    description: "Charging pile units count at end of month (snapshot)" },
      totalStations:             { type: "Int",    description: "Total NIO power stations at end of month (snapshot)" },
      highwaySwapStations:       { type: "Int",    description: "Highway swap stations count at end of month (snapshot)" },
      thirdPartyPiles:           { type: "Int",    description: "Third-party piles accessible via NIO app at end of month (snapshot)" },
      cumulativeSwaps:           { type: "BigInt", description: "All-time cumulative swap sessions at end of month (snapshot)" },
      cumulativeCharges:         { type: "BigInt", description: "All-time cumulative charge sessions at end of month (snapshot)" },
    },
  },

  NioPowerDailyDelta: {
    name: "NioPowerDailyDelta",
    description:
      "Daily delta view of NIO power data — one row per calendar day. " +
      "'daily*' fields are deltas (what was added/done that day, NOT cumulative). " +
      "Absolute snapshot fields (swapStations, cumulativeSwaps, etc.) are end-of-day readings. " +
      "Use this table for daily swap/charge session queries (e.g. 'daily swap sessions in Feb 2026'). " +
      "Filter by year and month (integers). Use 'date' (MM-DD) as the chart x-axis. " +
      "The first day of the dataset is excluded since there is no prior day to diff against.",
    fields: {
      fullDate:                  { type: "DateTime", description: "Calendar date for this row (YYYY-MM-DD), use for range filters" },
      year:                      { type: "Int",      description: "Calendar year (e.g. 2026)" },
      month:                     { type: "Int",      description: "Calendar month number (1=Jan … 12=Dec)" },
      date:                      { type: "String",   description: "Month-day label formatted as MM-DD (e.g. '02-25'), for chart x-axis" },
      swapStations:              { type: "Int",      description: "Battery swap stations count at end of this day (snapshot)" },
      chargingStations:          { type: "Int",      description: "Charging stations count at end of this day (snapshot)" },
      chargingPiles:             { type: "Int",      description: "Charging pile units count at end of this day (snapshot)" },
      totalStations:             { type: "Int",      description: "Total NIO power stations at end of this day (snapshot)" },
      highwaySwapStations:       { type: "Int",      description: "Highway swap stations count at end of this day (snapshot)" },
      thirdPartyPiles:           { type: "Int",      description: "Third-party piles accessible via NIO app at end of this day (snapshot)" },
      cumulativeSwaps:           { type: "BigInt",   description: "All-time cumulative swap sessions at end of this day (snapshot)" },
      cumulativeCharges:         { type: "BigInt",   description: "All-time cumulative charge sessions at end of this day (snapshot)" },
      dailySwaps:                { type: "BigInt",   description: "Battery swap sessions performed on this day (delta)" },
      dailyCharges:              { type: "BigInt",   description: "Charging sessions performed on this day (delta)" },
      dailySwapStations:         { type: "BigInt",   description: "New battery swap stations opened on this day (delta)" },
      dailyChargingStations:     { type: "BigInt",   description: "New charging stations opened on this day (delta)" },
      dailyChargingPiles:        { type: "BigInt",   description: "New charging pile units added on this day (delta)" },
      dailyTotalStations:        { type: "BigInt",   description: "Total new NIO power stations opened on this day (delta)" },
      dailyHighwaySwapStations:  { type: "BigInt",   description: "New highway swap stations opened on this day (delta)" },
      dailyThirdPartyPiles:      { type: "BigInt",   description: "New third-party piles added to NIO network on this day (delta)" },
    },
  },
};

// ─── Exported constants ───────────────────────────────────────────────────────

export const ALLOWED_TABLE_NAMES: string[] = Object.keys(REGISTRY);

// ─── Exported utilities ───────────────────────────────────────────────────────

export function getTableDef(table: string): TableDef | null {
  return REGISTRY[table] ?? null;
}

export function getFieldNames(table: string): string[] {
  const def = REGISTRY[table];
  return def ? Object.keys(def.fields) : [];
}

export function isStringField(table: string, field: string): boolean {
  const def = REGISTRY[table];
  if (!def) return false;
  return def.fields[field]?.type === "String";
}

export function getBigIntFields(table: string): string[] {
  const def = REGISTRY[table];
  if (!def) return [];
  return Object.entries(def.fields)
    .filter(([, fd]) => fd.type === "BigInt")
    .map(([name]) => name);
}

/**
 * Mutates rows in place: converts BigInt values to Number for JSON serialization.
 */
export function convertBigIntsToNumbers(
  table: string,
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  const bigIntFields = getBigIntFields(table);
  if (bigIntFields.length === 0) return rows;

  for (const row of rows) {
    for (const field of bigIntFields) {
      if (typeof row[field] === "bigint") {
        row[field] = Number(row[field] as bigint);
      }
    }
  }
  return rows;
}

/**
 * Formats the fields of a table for inclusion in the AI system prompt.
 * Example output:
 *   brand: Enum(Brand) [BYD, NIO, ...],
 *   year: Int — calendar year,
 *   value: Float — total NEV units sold (vehicles)
 */
export function formatFieldsForPrompt(table: string): string {
  const def = REGISTRY[table];
  if (!def) return "";

  return Object.entries(def.fields)
    .map(([name, fd]) => {
      let typeStr: string;
      if (fd.type === "Enum" && fd.enumValues) {
        const values = fd.enumValues.join(", ");
        typeStr = `Enum(${fd.enumName ?? fd.type}) [${values}]`;
      } else {
        typeStr = fd.type;
      }
      return fd.description ? `${name}: ${typeStr} — ${fd.description}` : `${name}: ${typeStr}`;
    })
    .join(",\n   ");
}

/**
 * Returns the allowed tables list in the same shape as the old
 * `getAllowedTables()` in query-executor.ts.
 */
export function getAllowedTablesList(): Array<{
  name: string;
  description: string;
  fields: string[];
}> {
  return ALLOWED_TABLE_NAMES.map((tableName) => {
    const def = REGISTRY[tableName]!;
    return {
      name: def.name,
      description: def.description,
      fields: Object.keys(def.fields),
    };
  });
}
