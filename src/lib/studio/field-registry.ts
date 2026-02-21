import { Brand, MetricType, PeriodType, VehicleType } from "@prisma/client";

export type FieldType = "String" | "Enum" | "Int" | "Float" | "BigInt" | "DateTime" | "Boolean";

export interface FieldDef {
  type: FieldType;
  enumName?: string;
  enumValues?: readonly string[];
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
  eVMetric: {
    name: "eVMetric",
    description: "Brand delivery/sales data",
    fields: {
      brand:        { type: "Enum", enumName: "Brand", enumValues: BRAND_VALUES },
      metric:       { type: "Enum", enumName: "MetricType", enumValues: METRIC_TYPE_VALUES },
      periodType:   { type: "Enum", enumName: "PeriodType", enumValues: PERIOD_TYPE_VALUES },
      year:         { type: "Int" },
      period:       { type: "Int" },
      vehicleModel: { type: "String" },
      region:       { type: "String" },
      category:     { type: "String" },
      dataSource:   { type: "String" },
      value:        { type: "Float" },
      unit:         { type: "String" },
      yoyChange:    { type: "Float" },
      momChange:    { type: "Float" },
      marketShare:  { type: "Float" },
      ranking:      { type: "Int" },
    },
  },

  automakerRankings: {
    name: "automakerRankings",
    description: "Monthly automaker sales rankings",
    fields: {
      dataSource:  { type: "String" },
      year:        { type: "Int" },
      month:       { type: "Int" },
      ranking:     { type: "Int" },
      automaker:   { type: "String" },
      value:       { type: "Float" },
      unit:        { type: "String" },
      yoyChange:   { type: "Float" },
      momChange:   { type: "Float" },
      marketShare: { type: "Float" },
    },
  },

  caamNevSales: {
    name: "caamNevSales",
    description: "CAAM official NEV sales",
    fields: {
      year:      { type: "Int" },
      month:     { type: "Int" },
      value:     { type: "Float" },
      unit:      { type: "String" },
      yoyChange: { type: "Float" },
      momChange: { type: "Float" },
    },
  },

  cpcaNevRetail: {
    name: "cpcaNevRetail",
    description: "CPCA NEV retail sales",
    fields: {
      year:      { type: "Int" },
      month:     { type: "Int" },
      value:     { type: "Float" },
      unit:      { type: "String" },
      yoyChange: { type: "Float" },
      momChange: { type: "Float" },
    },
  },

  cpcaNevProduction: {
    name: "cpcaNevProduction",
    description: "CPCA NEV production volume",
    fields: {
      year:      { type: "Int" },
      month:     { type: "Int" },
      value:     { type: "Float" },
      unit:      { type: "String" },
      yoyChange: { type: "Float" },
      momChange: { type: "Float" },
    },
  },

  chinaPassengerInventory: {
    name: "chinaPassengerInventory",
    description: "Dealer + factory inventory levels",
    fields: {
      year:  { type: "Int" },
      month: { type: "Int" },
      value: { type: "Float" },
      unit:  { type: "String" },
    },
  },

  chinaDealerInventoryFactor: {
    name: "chinaDealerInventoryFactor",
    description: "Dealer inventory coefficient",
    fields: {
      year:  { type: "Int" },
      month: { type: "Int" },
      value: { type: "Float" },
    },
  },

  chinaViaIndex: {
    name: "chinaViaIndex",
    description: "Vehicle Inventory Alert Index",
    fields: {
      year:  { type: "Int" },
      month: { type: "Int" },
      value: { type: "Float" },
      unit:  { type: "String" },
    },
  },

  chinaBatteryInstallation: {
    name: "chinaBatteryInstallation",
    description: "Total battery installation & production",
    fields: {
      year:         { type: "Int" },
      month:        { type: "Int" },
      installation: { type: "Float" },
      production:   { type: "Float" },
      unit:         { type: "String" },
    },
  },

  batteryMakerMonthly: {
    name: "batteryMakerMonthly",
    description: "Battery maker monthly performance",
    fields: {
      maker:        { type: "String" },
      year:         { type: "Int" },
      month:        { type: "Int" },
      installation: { type: "Float" },
      production:   { type: "Float" },
      unit:         { type: "String" },
      yoyChange:    { type: "Float" },
      momChange:    { type: "Float" },
    },
  },

  batteryMakerRankings: {
    name: "batteryMakerRankings",
    description: "Battery maker market share rankings",
    fields: {
      dataSource:       { type: "String" },
      scope:            { type: "String" },
      // periodType is String in schema (not the PeriodType enum)
      periodType:       { type: "String" },
      year:             { type: "Int" },
      month:            { type: "Int" },
      ranking:          { type: "Int" },
      maker:            { type: "String" },
      value:            { type: "Float" },
      unit:             { type: "String" },
      yoyChange:        { type: "Float" },
      marketShare:      { type: "Float" },
      shareVsPrevMonth: { type: "Float" },
    },
  },

  plantExports: {
    name: "plantExports",
    description: "Exports by manufacturing plant",
    fields: {
      plant:     { type: "String" },
      // brand is String in PlantExports (not the Brand enum)
      brand:     { type: "String" },
      year:      { type: "Int" },
      month:     { type: "Int" },
      value:     { type: "Float" },
      unit:      { type: "String" },
      yoyChange: { type: "Float" },
      momChange: { type: "Float" },
    },
  },

  vehicleSpec: {
    name: "vehicleSpec",
    description: "Vehicle specifications",
    fields: {
      brand:              { type: "Enum", enumName: "Brand", enumValues: BRAND_VALUES },
      model:              { type: "String" },
      variant:            { type: "String" },
      launchDate:         { type: "String" },
      vehicleType:        { type: "Enum", enumName: "VehicleType", enumValues: VEHICLE_TYPE_VALUES },
      segment:            { type: "String" },
      startingPrice:      { type: "Float" },
      currentPrice:       { type: "Float" },
      lengthMm:           { type: "Int" },
      widthMm:            { type: "Int" },
      heightMm:           { type: "Int" },
      wheelbaseMm:        { type: "Int" },
      acceleration:       { type: "Float" },
      topSpeed:           { type: "Int" },
      motorPowerKw:       { type: "Int" },
      motorTorqueNm:      { type: "Int" },
      batteryCapacity:    { type: "Float" },
      rangeCltc:          { type: "Int" },
      rangeWltp:          { type: "Int" },
      rangeEpa:           { type: "Int" },
      fuelTankVolume:     { type: "Float" },
      engineDisplacement: { type: "Float" },
      maxChargingPower:   { type: "Int" },
      chargingTime10To80: { type: "Int" },
    },
  },

  nevSalesSummary: {
    name: "nevSalesSummary",
    description: "Weekly/bi-weekly sales flash reports",
    fields: {
      dataSource:     { type: "String" },
      year:           { type: "Int" },
      startDate:      { type: "String" },
      endDate:        { type: "String" },
      retailSales:    { type: "Float" },
      retailYoy:      { type: "Float" },
      retailMom:      { type: "Float" },
      wholesaleSales: { type: "Float" },
      wholesaleYoy:   { type: "Float" },
      wholesaleMom:   { type: "Float" },
      unit:           { type: "String" },
    },
  },

  nioPowerSnapshot: {
    name: "nioPowerSnapshot",
    description:
      "NIO power infrastructure snapshots over time — swap stations, charging stations/piles, cumulative swaps & charges, third-party pile access",
    fields: {
      asOfTime:               { type: "DateTime" },
      totalStations:          { type: "Int" },
      swapStations:           { type: "Int" },
      highwaySwapStations:    { type: "Int" },
      cumulativeSwaps:        { type: "BigInt" },
      chargingStations:       { type: "Int" },
      chargingPiles:          { type: "Int" },
      cumulativeCharges:      { type: "BigInt" },
      thirdPartyPiles:        { type: "Int" },
      thirdPartyUsagePercent: { type: "Float" },
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
 * Example output: `brand: Enum(Brand) [BYD, NIO, ...], year: Int, value: Float`
 */
export function formatFieldsForPrompt(table: string): string {
  const def = REGISTRY[table];
  if (!def) return "";

  return Object.entries(def.fields)
    .map(([name, fd]) => {
      if (fd.type === "Enum" && fd.enumValues) {
        const values = fd.enumValues.join(", ");
        return `${name}: Enum(${fd.enumName ?? fd.type}) [${values}]`;
      }
      return `${name}: ${fd.type}`;
    })
    .join(", ");
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
