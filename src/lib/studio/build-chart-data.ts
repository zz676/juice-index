// src/lib/studio/build-chart-data.ts
// Shared utility for building chart preview data from raw query rows.
// Used by both the generate-chart API route (server-side) and the studio
// client component (client-side, when the user changes axis columns without
// making a new API call).

export type DataRow = Record<string, unknown>;
export type PreviewPoint = { label: string; value: number };

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toLabel(row: DataRow, xField: string): string {
  if (xField === "month" && row.month !== undefined && row.year !== undefined) {
    const monthIndex = Number(row.month) - 1;
    return `${MONTH_NAMES[monthIndex] || row.month} ${row.year}`;
  }
  if (xField === "period" && row.period !== undefined && row.year !== undefined) {
    const monthIndex = Number(row.period) - 1;
    return `${MONTH_NAMES[monthIndex] || row.period} ${row.year}`;
  }
  return String(row[xField]);
}

function isNumericValue(v: unknown): boolean {
  return typeof v === "number" || typeof v === "bigint";
}

export function detectXField(sample: DataRow): string | null {
  if (sample.month !== undefined && sample.year !== undefined) return "month";
  if (sample.period !== undefined && sample.year !== undefined) return "period";
  if (sample.brand !== undefined) return "brand";
  if (sample.maker !== undefined) return "maker";
  if (sample.automaker !== undefined) return "automaker";
  const keys = Object.keys(sample);
  const firstText = keys.find((key) => typeof sample[key] === "string");
  if (firstText) return firstText;
  return keys[0] || null;
}

export function detectYField(sample: DataRow): string | null {
  if (isNumericValue(sample.value)) return "value";
  if (isNumericValue(sample.installation)) return "installation";
  if (isNumericValue(sample.retailSales)) return "retailSales";
  const excluded = new Set(["year", "month", "period", "ranking"]);
  const keys = Object.keys(sample);
  const firstNumeric = keys.find(
    (key) => isNumericValue(sample[key]) && !excluded.has(key)
  );
  return firstNumeric || null;
}

/** Returns all column names and the numeric-only subset from the first row of a result set. */
export function deriveColumns(rows: DataRow[]): { columns: string[]; numericColumns: string[] } {
  if (!rows.length) return { columns: [], numericColumns: [] };
  const columns = Object.keys(rows[0]);
  const numericColumns = columns.filter((k) => isNumericValue(rows[0][k]));
  return { columns, numericColumns };
}

export function buildChartData(
  rows: DataRow[],
  xField?: string,
  yField?: string
): { points: PreviewPoint[]; xField: string; yField: string } {
  if (!rows.length) return { points: [], xField: "label", yField: "value" };
  const sample = rows[0];
  const resolvedX = xField || detectXField(sample) || "label";
  const resolvedY = yField || detectYField(sample) || "value";
  const points: PreviewPoint[] = rows.slice(0, 120).map((row) => ({
    label: toLabel(row, resolvedX),
    value: toNumber(row[resolvedY]),
  }));
  return { points, xField: resolvedX, yField: resolvedY };
}

// ── Multi-series (year comparison) support ────────────────────────────────

export type MultiSeriesPoint = { label: string; [series: string]: string | number };

/** Returns the group field name if the row looks like time-series data with a year column. */
export function detectGroupField(sample: DataRow): string | null {
  if (sample.year !== undefined) return "year";
  return null;
}

const MONTH_SHORT: Record<number, string> = {
  1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
};

function toMonthLabel(row: DataRow, xField: string): string {
  if ((xField === "month" || xField === "period") && row[xField] !== undefined) {
    const idx = Number(row[xField]);
    return MONTH_SHORT[idx] ?? String(row[xField]);
  }
  return String(row[xField] ?? "");
}

/**
 * Pivots rows into multi-series format for year-comparison charts.
 * Input:  [{ year: 2023, period: 1, value: 15000 }, ...]
 * Output: [{ label: "Jan", "2023": 15000, "2024": 18000 }, ...]
 */
export function buildMultiSeriesChartData(
  rows: DataRow[],
  groupField: string,
  xField?: string,
  yField?: string,
): {
  points: MultiSeriesPoint[];
  series: string[];
  xField: string;
  yField: string;
  groupField: string;
} {
  if (!rows.length) return { points: [], series: [], xField: "label", yField: "value", groupField };

  const sample = rows[0];
  const resolvedX = xField || (sample.period !== undefined ? "period" : sample.month !== undefined ? "month" : detectXField(sample)) || "label";
  const resolvedY = yField || detectYField(sample) || "value";

  // Collect series keys and x-axis values
  const seriesSet = new Set<string>();
  const isMonthField = resolvedX === "period" || resolvedX === "month";
  const numericPeriods = new Set<number>(); // used when xField is period/month

  for (const row of rows) {
    seriesSet.add(String(row[groupField] ?? ""));
    if (isMonthField) {
      const n = Number(row[resolvedX]);
      if (!isNaN(n)) numericPeriods.add(n);
    }
  }

  // For period/month fields sort numerically 1→12 so x-axis always starts at Jan
  let xValuesOrdered: string[];
  if (isMonthField) {
    xValuesOrdered = Array.from(numericPeriods)
      .sort((a, b) => a - b)
      .map((n) => MONTH_SHORT[n] ?? String(n));
  } else {
    const seen = new Set<string>();
    xValuesOrdered = [];
    for (const row of rows) {
      const label = String(row[resolvedX] ?? "");
      if (!seen.has(label)) { seen.add(label); xValuesOrdered.push(label); }
    }
  }

  const series = Array.from(seriesSet).sort();

  // Build pivot map: xLabel -> { seriesKey -> value }
  const pivot = new Map<string, Record<string, number>>();
  for (const xLabel of xValuesOrdered) {
    pivot.set(xLabel, {});
  }
  for (const row of rows) {
    const xLabel = toMonthLabel(row, resolvedX);
    const seriesKey = String(row[groupField] ?? "");
    const existing = pivot.get(xLabel);
    if (existing) {
      existing[seriesKey] = toNumber(row[resolvedY]);
    }
  }

  const points: MultiSeriesPoint[] = xValuesOrdered.map((xLabel) => {
    const entry: MultiSeriesPoint = { label: xLabel };
    const vals = pivot.get(xLabel) ?? {};
    for (const s of series) {
      entry[s] = vals[s] ?? 0;
    }
    return entry;
  });

  return { points, series, xField: resolvedX, yField: resolvedY, groupField };
}
