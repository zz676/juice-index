# Editable SQL Query Design

**Date:** 2026-02-24

## Problem

The Generated Query card shows a read-only SQL preview. Users cannot edit it, paste their own SQL, or go back to rephrase their natural language question without losing context.

## Solution: Approach A — Raw SQL Execution

### UI (`src/app/dashboard/studio/page.tsx`)

- Remove `readOnly` from the SQL textarea; add `onChange` → `setGeneratedSql`
- Add `sqlUserEdited: boolean` state; set on edit, reset on NL regeneration
- Expand textarea height from `h-[64px]` to `h-[120px]`
- Change `cursor-default` to `cursor-text`
- **Run Query**: if `sqlUserEdited || !tableName`, send `{ rawSql }` to new Mode 3; otherwise use existing Mode 0 JSON path
- **"← Revise question"** link in card header: scrolls to + focuses the prompt textarea
- Updated placeholder: `"Paste SQL here to run directly, or generate one above..."`
- Run button enabled when `generatedSql.trim()` is non-empty (regardless of `tableName`)

### Backend (`src/app/api/dashboard/studio/generate-chart/route.ts`)

New **Mode 3** triggered by `payload.rawSql` (string, no `table`/`query`):

1. Must start with `SELECT`
2. Block: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `CREATE`, `GRANT`, `REVOKE`, `--`, `/*`, `;`
3. Extract table from `FROM` clause; validate against `ALLOWED_TABLE_NAMES`
4. Cap / append `LIMIT 1000`
5. Execute: `prisma.$queryRawUnsafe<Record<string,unknown>[]>(sql)`
6. Derive chart data via `buildChartData`
7. Rate-limit: `enforceGlobalStudioQueryLimit` (same as Mode 0)
8. Response: `{ mode: "raw-sql", data, rowCount, executionTimeMs, previewData, xField, yField, sql }`

### Unchanged

- NL → Generate → Run flow
- Copy SQL button
- Logic Process indicators
- All existing state
