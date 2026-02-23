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
  return String(row[xField]);
}

function isNumericValue(v: unknown): boolean {
  return typeof v === "number" || typeof v === "bigint";
}

export function detectXField(sample: DataRow): string | null {
  if (sample.month !== undefined && sample.year !== undefined) return "month";
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
