# Axis Column Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users choose which columns to use for the X and Y axes in ChartCustomizer when a query returns multiple columns.

**Architecture:** Extract `buildPreviewData` and its helpers from the API route into a shared client-usable utility. Add new props to `ChartCustomizer` for axis dropdowns. Handle `onAxisChange` in the studio page by rebuilding `chartData` client-side from `rawData`.

**Tech Stack:** TypeScript, Next.js App Router, React, Recharts

---

## Task 1: Create shared `build-chart-data` utility

**Files:**
- Create: `src/lib/studio/build-chart-data.ts`

**Step 1: Create the file with extracted helpers**

Copy `toNumber`, `toLabel`, `detectXField`, `detectYField`, and `buildPreviewData` from `src/app/api/dashboard/studio/generate-chart/route.ts` into the new file. Adjust types to use plain `Record<string, unknown>` instead of the route-internal `DataRow` alias. Export all five functions plus the `PreviewPoint` type.

```typescript
// src/lib/studio/build-chart-data.ts

export type DataRow = Record<string, unknown>;
export type PreviewPoint = { label: string; value: number };

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
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
```

**Step 2: Verify the file compiles**

```bash
cd /Users/zhizhou/Downloads/agent/juice-index/copy2/juice-index
npx tsc --noEmit
```

Expected: No errors related to the new file.

**Step 3: Commit**

```bash
git add src/lib/studio/build-chart-data.ts
git commit -m "feat: add shared buildChartData utility extracted from generate-chart route"
```

---

## Task 2: Update `generate-chart/route.ts` to use the shared utility

**Files:**
- Modify: `src/app/api/dashboard/studio/generate-chart/route.ts`

**Step 1: Import from shared util and delete duplicated code**

At the top of the route file, add:

```typescript
import {
  buildChartData,
  toLabel,
  toNumber,
  detectXField,
  detectYField,
  type DataRow,
  type PreviewPoint,
} from "@/lib/studio/build-chart-data";
```

Then delete the inline definitions of `toNumber`, `toLabel`, `isNumericValue`, `detectXField`, `detectYField`, and `buildPreviewData` from the route file.

Replace every call to `buildPreviewData(rows)` in the route with `buildChartData(rows)`. The return shape is identical: `{ points, xField, yField }`.

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/api/dashboard/studio/generate-chart/route.ts
git commit -m "refactor: use shared buildChartData in generate-chart route"
```

---

## Task 3: Add axis props and Axes section to `ChartCustomizer`

**Files:**
- Modify: `src/components/explorer/ChartCustomizer.tsx`

The `ChartCustomizerProps` interface currently has: `config`, `onChange`, `isOpen`, `onToggle`.

**Step 1: Extend the props interface**

Add to `ChartCustomizerProps`:

```typescript
interface ChartCustomizerProps {
    config: ChartConfig;
    onChange: (config: ChartConfig) => void;
    isOpen: boolean;
    onToggle: () => void;
    // Axis selection (only rendered when columns.length > 1)
    columns?: string[];
    numericColumns?: string[];
    xField?: string;
    yField?: string;
    onAxisChange?: (xField: string, yField: string) => void;
}
```

**Step 2: Destructure new props in the component**

```typescript
export function ChartCustomizer({
    config, onChange, isOpen, onToggle,
    columns = [], numericColumns = [], xField = "", yField = "",
    onAxisChange,
}: ChartCustomizerProps) {
```

**Step 3: Add "Axes" section to the section tabs array**

In the `sections` array, add a new entry as the first item (rendered above "Type"):

```typescript
const sections = [
    { id: "axes", icon: "swap_horiz", label: "Axes" },
    { id: "type", icon: "dashboard", label: "Type" },
    { id: "colors", icon: "palette", label: "Colors" },
    { id: "typography", icon: "text_fields", label: "Text" },
    { id: "source", icon: "copyright", label: "Source" },
];
```

Only add the "axes" tab when `columns.length > 1`. Compute a `visibleSections` array:

```typescript
const visibleSections = columns.length > 1
    ? sections
    : sections.filter((s) => s.id !== "axes");
```

Use `visibleSections` in the tab rendering loop instead of `sections`.

**Step 4: Add Axes section content**

Inside the `{/* Content */}` `<div>`, add a new conditional block before the `type` section:

```tsx
{activeSection === "axes" && columns.length > 1 && (
    <div className="space-y-4">
        <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">X Axis</label>
            <select
                value={xField}
                onChange={(e) => onAxisChange?.(e.target.value, yField)}
                className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
                {columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                ))}
            </select>
        </div>
        <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Y Axis</label>
            <select
                value={yField}
                onChange={(e) => onAxisChange?.(xField, e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
                {numericColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                ))}
            </select>
        </div>
    </div>
)}
```

**Step 5: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 6: Commit**

```bash
git add src/components/explorer/ChartCustomizer.tsx
git commit -m "feat: add Axes section with x/y column dropdowns to ChartCustomizer"
```

---

## Task 4: Update studio `page.tsx` to derive columns and handle axis changes

**Files:**
- Modify: `src/app/dashboard/studio/page.tsx`

**Step 1: Add import for shared util**

At the top, with other imports:

```typescript
import { buildChartData } from "@/lib/studio/build-chart-data";
```

**Step 2: Add `columns` and `numericColumns` state**

In `StudioPageInner`, add two new state variables near `xField`/`yField`:

```typescript
const [columns, setColumns] = useState<string[]>([]);
const [numericColumns, setNumericColumns] = useState<string[]>([]);
```

**Step 3: Derive columns when `rawData` is set**

Inside `applyQueryExecutionResult` (around line 283), after the existing `setRawData(...)` call, add:

```typescript
const rows = Array.isArray(data.data) ? (data.data as QueryRow[]) : [];
if (rows.length > 0) {
    const allCols = Object.keys(rows[0]);
    const numCols = allCols.filter(
        (k) => typeof rows[0][k] === "number" || typeof rows[0][k] === "bigint"
    );
    setColumns(allCols);
    setNumericColumns(numCols);
} else {
    setColumns([]);
    setNumericColumns([]);
}
```

Note: `rows` may already be set above via `setRawData` — compute it from `data.data` directly here to avoid closure issues.

**Step 4: Add `handleAxisChange` callback**

In the component body (near other handlers):

```typescript
const handleAxisChange = useCallback(
    (newXField: string, newYField: string) => {
        setXField(newXField);
        setYField(newYField);
        const { points } = buildChartData(rawData, newXField, newYField);
        setChartData(points);
    },
    [rawData]
);
```

**Step 5: Pass new props to `<ChartCustomizer>`**

At line 1972, update the JSX:

```tsx
<ChartCustomizer
    config={chartConfig}
    onChange={setChartConfig}
    isOpen={showCustomizer}
    onToggle={() => setShowCustomizer(false)}
    columns={columns}
    numericColumns={numericColumns}
    xField={xField}
    yField={yField}
    onAxisChange={handleAxisChange}
/>
```

**Step 6: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 7: Run build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 8: Commit**

```bash
git add src/app/dashboard/studio/page.tsx
git commit -m "feat: derive columns from rawData and wire axis change to ChartCustomizer"
```

---

## Task 5: Manual verification

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Run a multi-column query**

Go to `/dashboard/studio`, run a prompt that returns multiple columns, e.g.:

> "Show Tesla monthly deliveries for 2024"

Expected: Query returns rows with columns like `brand`, `month`, `year`, `value`, `yoyChange`.

**Step 3: Open ChartCustomizer**

Click the customize icon. Verify:
- "Axes" tab appears as the first tab
- X Axis dropdown lists all column names
- Y Axis dropdown lists only numeric columns

**Step 4: Change Y axis**

Select `yoyChange` in the Y Axis dropdown. Verify:
- Chart re-renders immediately with `yoyChange` values on Y axis
- No API call is made (check network tab)

**Step 5: Single-column edge case**

Run a query that returns only one column. Verify:
- "Axes" tab does not appear in ChartCustomizer

**Step 6: Commit complete**

No commit needed — verification only.
