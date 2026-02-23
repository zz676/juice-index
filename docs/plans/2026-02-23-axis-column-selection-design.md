# Design: Axis Column Selection in ChartCustomizer

**Date:** 2026-02-23

## Problem

When a query returns multiple columns the auto-detection heuristic picks x/y axes for the user. If the heuristic is wrong, or the user wants a different view of the data (e.g. `yoyChange` instead of `value` on the Y axis), there is no way to change it without re-prompting.

## Solution

Add an **Axes** section at the top of `ChartCustomizer` with two dropdowns — one for X axis, one for Y axis — populated from the columns of the current query result. The section is hidden when no data has been loaded or when only one column is returned.

## Architecture

### New ChartCustomizer Props

```typescript
columns: string[]        // all column names from rawData (for X dropdown)
numericColumns: string[] // numeric-only subset (for Y dropdown)
xField: string           // currently selected x-axis column
yField: string           // currently selected y-axis column
onAxisChange: (xField: string, yField: string) => void
```

### Studio Page (`page.tsx`) Changes

1. **Derive columns on data load** — when `rawData` is set, compute:
   - `columns`: `Object.keys(rawData[0])` (all columns)
   - `numericColumns`: keys where the first-row value is `number | bigint`

2. **Handle `onAxisChange`** — update `xField`/`yField` state and immediately re-derive `chartData` from `rawData` using the new fields. No new API call needed.

3. **Extract client-side rebuild util** — move the `buildPreviewData` logic (x-label formatting, numeric coercion) to a shared utility at `src/lib/studio/build-chart-data.ts` so both the API route and the client can use it.

### ChartCustomizer UI

New **"Axes"** section rendered above "Type":
- Only shown when `columns.length > 1`
- **X Axis** — `<select>` over all `columns`
- **Y Axis** — `<select>` over `numericColumns`
- Matches existing section styling (label + control pairs)

## Data Flow

```
rawData (QueryRow[]) loaded
  → derive columns[], numericColumns[]
  → pass to ChartCustomizer

User picks new axis in ChartCustomizer
  → onAxisChange(xField, yField) called
  → studio page updates xField/yField state
  → buildChartData(rawData, xField, yField) re-runs on client
  → chartData state updated → chart re-renders
```

## Files Changed

| File | Change |
|------|--------|
| `src/lib/studio/build-chart-data.ts` | New — shared util extracted from API route |
| `src/app/api/dashboard/studio/generate-chart/route.ts` | Use shared util instead of inline functions |
| `src/components/explorer/ChartCustomizer.tsx` | Add Axes section with x/y dropdowns |
| `src/app/dashboard/studio/page.tsx` | Derive columns, handle onAxisChange, rebuild chartData |

## Out of Scope

- Multi-series charts (multiple Y columns simultaneously)
- Renaming / aliasing columns
- Filtering rows based on axis selection
