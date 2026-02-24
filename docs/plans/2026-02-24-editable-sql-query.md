# Editable SQL Query Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users edit the generated SQL query, paste raw SQL and run it directly, and navigate back to the natural language prompt to regenerate.

**Architecture:** Extract SQL validation into a utility, add a new Mode 3 raw-SQL execution path on the backend, and update the UI textarea from read-only to editable with a new execution branch and "Revise question" link.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma (`$queryRawUnsafe`), React state

---

### Task 1: Create SQL validation utility

**Files:**
- Create: `src/lib/studio/sql-validator.ts`

**Context:**
The backend needs to validate user-supplied SQL before executing it. Centralising this in a utility keeps the route handler clean and makes the rules easy to audit.

**Step 1: Create `src/lib/studio/sql-validator.ts`**

```ts
import { ALLOWED_TABLE_NAMES } from "@/lib/studio/field-registry";

// Map the SQL table names (PascalCase) back to Prisma keys (camelCase)
// so we can validate FROM clauses against the allowlist.
const SQL_TABLE_TO_PRISMA: Record<string, string> = {
  evmetric: "eVMetric",
  automakerankings: "automakerRankings",
  caamnevsales: "caamNevSales",
  cpcanevretail: "cpcaNevRetail",
  cpcanevproduction: "cpcaNevProduction",
  nevSalessummary: "nevSalesSummary",
  chinapassengerinventory: "chinaPassengerInventory",
  chinadealerInventoryfactor: "chinaDealerInventoryFactor",
  chinaviaindex: "chinaViaIndex",
  chinabatteryinstallation: "chinaBatteryInstallation",
  batterymakmonthly: "batteryMakerMonthly",
  batterymakermonthly: "batteryMakerMonthly",
  batterymakrankings: "batteryMakerRankings",
  batterymakerankings: "batteryMakerRankings",
  batterymakerankings2: "batteryMakerRankings",
  plantexports: "plantExports",
  vehiclespec: "vehicleSpec",
  niopowersnapshot: "nioPowerSnapshot",
};

const FORBIDDEN_PATTERNS = [
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\bdrop\b/i,
  /\btruncate\b/i,
  /\balter\b/i,
  /\bcreate\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /--/,
  /\/\*/,
];

export interface SqlValidationResult {
  valid: boolean;
  error?: string;
  /** Normalised SQL with LIMIT capped to 1000 */
  sql?: string;
  /** The Prisma table key extracted from FROM clause, if identifiable */
  prismaTable?: string;
}

/**
 * Validate and normalise a user-supplied SELECT query.
 * Returns { valid: false, error } on any violation, or
 * { valid: true, sql, prismaTable } on success.
 */
export function validateRawSql(input: string): SqlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, error: "SQL is empty." };
  }

  // Must start with SELECT (case-insensitive)
  if (!/^select\b/i.test(trimmed)) {
    return { valid: false, error: "Only SELECT queries are allowed." };
  }

  // Block forbidden keywords / comment syntax
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: `Query contains a forbidden keyword or syntax: ${pattern.source}`,
      };
    }
  }

  // Reject statement chaining
  // (strip string literals first to avoid false positives on values like 'a;b')
  const stripped = trimmed.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
  if (stripped.includes(";") && stripped.replace(/;\s*$/, "").includes(";")) {
    return { valid: false, error: "Multiple statements are not allowed." };
  }

  // Extract primary table from FROM clause
  const fromMatch = stripped.match(/\bfrom\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i);
  let prismaTable: string | undefined;
  if (fromMatch) {
    const sqlTableRaw = fromMatch[1];
    const key = sqlTableRaw.toLowerCase();
    prismaTable = SQL_TABLE_TO_PRISMA[key] ?? undefined;
    // Also accept if the raw name is already a Prisma key (camelCase)
    if (!prismaTable && ALLOWED_TABLE_NAMES.includes(sqlTableRaw)) {
      prismaTable = sqlTableRaw;
    }
    if (!prismaTable) {
      return {
        valid: false,
        error: `Table "${sqlTableRaw}" is not in the allowed list.`,
      };
    }
  }

  // Cap / inject LIMIT 1000
  let sql = trimmed.replace(/;?\s*$/, ""); // strip trailing semicolon
  const limitMatch = sql.match(/\blimit\s+(\d+)/i);
  if (limitMatch) {
    const existing = parseInt(limitMatch[1], 10);
    if (existing > 1000) {
      sql = sql.replace(/\blimit\s+\d+/i, "LIMIT 1000");
    }
  } else {
    sql = `${sql} LIMIT 1000`;
  }

  return { valid: true, sql, prismaTable };
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors related to `sql-validator.ts`.

**Step 3: Commit**

```bash
git checkout -b feat/editable-sql-query
git add src/lib/studio/sql-validator.ts
git commit -m "feat: add SQL validation utility for raw query execution"
```

---

### Task 2: Add Mode 3 raw SQL execution to the API route

**Files:**
- Modify: `src/app/api/dashboard/studio/generate-chart/route.ts`

**Context:**
The route currently has three modes. We add Mode 3 triggered by `payload.rawSql`. It uses the new validator, then executes the SQL via `prisma.$queryRawUnsafe`, derives chart data, and returns the same response shape as Mode 0. It uses `enforceGlobalStudioQueryLimit` (no AI cost).

**Step 1: Add the import for the validator near the top of `route.ts`** (after the existing import for `prismaFindManyToSql`)

```ts
import { validateRawSql } from "@/lib/studio/sql-validator";
```

**Step 2: Insert Mode 3 handler block** in the `POST` function, immediately after the Mode 0 block ends (after line ~885) and before the Mode 1 `if (typeof payload.prompt === "string")` check:

```ts
    // Mode 3: Execute user-supplied raw SQL (SELECT only, allowlisted tables)
    if (typeof payload.rawSql === "string" && payload.rawSql.trim().length > 0) {
      const queryLimitRes = await enforceGlobalStudioQueryLimit(userId, tier);
      if (queryLimitRes) return queryLimitRes;

      const validation = validateRawSql(payload.rawSql);
      if (!validation.valid || !validation.sql) {
        return NextResponse.json(
          { error: "INVALID_SQL", message: validation.error ?? "Invalid SQL." },
          { status: 400 }
        );
      }

      let rows: Record<string, unknown>[];
      const execStart = Date.now();
      try {
        rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          validation.sql
        );
      } catch (error) {
        const message =
          error instanceof Error && !error.message.includes("prisma")
            ? error.message
            : "Failed to execute SQL";
        return NextResponse.json(
          { error: "QUERY_EXECUTION_FAILED", message },
          { status: 400 }
        );
      }
      const executionTimeMs = Date.now() - execStart;

      const safeRows = convertBigIntsToNumbers(
        validation.prismaTable ?? "",
        rows
      );
      const preview = buildChartData(safeRows as QueryRow[]);

      prisma.apiRequestLog.create({
        data: {
          userId,
          endpoint: "/api/dashboard/studio/generate-chart",
          method: "POST",
          statusCode: 200,
          durationMs: Date.now() - reqStart,
          tierAtRequest: tier,
        },
      }).catch(() => {});

      return NextResponse.json({
        mode: "raw-sql",
        table: validation.prismaTable ?? "",
        data: safeRows,
        rowCount: rows.length,
        executionTimeMs,
        previewData: preview.points,
        xField: preview.xField,
        yField: preview.yField,
        sql: validation.sql,
      });
    }
```

**Step 3: Add the `QueryRow` type import** — check if it is already imported at the top of the file. If not, it is used via the cast `safeRows as QueryRow[]` — use `Record<string, unknown>[]` directly instead, removing the cast:

```ts
const preview = buildChartData(safeRows);
```

**Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no new errors.

**Step 5: Commit**

```bash
git add src/app/api/dashboard/studio/generate-chart/route.ts
git commit -m "feat: add Mode 3 raw SQL execution endpoint"
```

---

### Task 3: Update the UI — editable SQL textarea + state

**Files:**
- Modify: `src/app/dashboard/studio/page.tsx`

**Context:**
The page has a `generatedSql` state that currently feeds a read-only textarea. We need to:
- Add `sqlUserEdited` state
- Add a `promptRef` to focus the prompt textarea
- Make the SQL textarea editable
- Reset `sqlUserEdited` when NL generation writes new SQL

**Step 1: Add `sqlUserEdited` state and `promptRef`** near the other `useState` declarations (around line 78, after `const [generatedSql, setGeneratedSql] = useState("")`):

```ts
const [sqlUserEdited, setSqlUserEdited] = useState(false);
const promptRef = useRef<HTMLTextAreaElement>(null);
```

**Step 2: Reset `sqlUserEdited` in `generateRunnableQuery`** — after `setGeneratedSql(nextSql)` (around line 400):

```ts
setSqlUserEdited(false);
```

Also reset it in `applyQueryExecutionResult` after `setGeneratedSql(...)` (around line 306):

```ts
setSqlUserEdited(false);
```

**Step 3: Attach `promptRef` to the prompt textarea** (around line 995):

```tsx
<textarea
  ref={promptRef}
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
  className="w-full min-h-[66px] bg-white border border-slate-custom-300 rounded-lg pt-3 px-3 pb-0 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-colors resize-y shadow-sm placeholder-slate-custom-400 text-slate-custom-800"
  placeholder="e.g. Compare Tesla Shanghai exports vs domestic sales for Q1 2024..."
/>
```

**Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**

```bash
git add src/app/dashboard/studio/page.tsx
git commit -m "feat: add sqlUserEdited state and promptRef"
```

---

### Task 4: Add `runRawSql` function and update `runGeneratedQuery` routing

**Files:**
- Modify: `src/app/dashboard/studio/page.tsx`

**Context:**
When `sqlUserEdited` is true or `tableName` is empty (direct paste), we send `{ rawSql }` to the API instead of `{ table, query }`. Add a dedicated `runRawSql` async function and update `runGeneratedQuery` to delegate to it.

**Step 1: Add `runRawSql` function** — insert it just before `runGeneratedQuery` (around line 451):

```ts
const runRawSql = async () => {
  if (!generatedSql.trim()) {
    showToast("error", "Enter or paste a SQL query first.");
    return;
  }

  setIsRunningQuery(true);
  showToast("info", "Running query...");

  try {
    const res = await fetch("/api/dashboard/studio/generate-chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawSql: generatedSql,
        chartType: chartConfig.chartType,
        chartTitle: chartConfig.title,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      throw new Error(
        (typeof data.message === "string" && data.message) ||
          (typeof data.error === "string" && data.error) ||
          "Failed to run query"
      );
    }

    applyQueryExecutionResult(data);
    fetchUsage();
  } catch (err) {
    console.error(err);
    showToast(
      "error",
      err instanceof Error ? err.message : "Failed to run query"
    );
  } finally {
    setIsRunningQuery(false);
  }
};
```

**Step 2: Update `runGeneratedQuery`** — replace the guard at the top (around line 452–455):

Before:
```ts
const runGeneratedQuery = async () => {
  if (!tableName) {
    showToast("error", "Generate a query first.");
    return;
  }
```

After:
```ts
const runGeneratedQuery = async () => {
  // If user edited the SQL directly or pasted without generating, use raw SQL path
  if (sqlUserEdited || !tableName) {
    await runRawSql();
    return;
  }
```

**Step 3: Update the Run Query button `disabled` prop** (around line 1157) — currently it's:

```ts
disabled={isRunningQuery || !tableName || !queryJsonText.trim() || queryQuotaExhausted}
```

Change to:
```ts
disabled={isRunningQuery || (!generatedSql.trim() && !tableName) || queryQuotaExhausted}
```

This enables the button whenever there is any SQL content.

**Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**

```bash
git add src/app/dashboard/studio/page.tsx
git commit -m "feat: add runRawSql function and route runGeneratedQuery through it"
```

---

### Task 5: Make the SQL textarea editable + update placeholder

**Files:**
- Modify: `src/app/dashboard/studio/page.tsx`

**Context:**
The textarea at line ~1195 has `readOnly` and `cursor-default`. Remove both, add `onChange`, expand height, update placeholder.

**Step 1: Replace the SQL textarea** (lines ~1195–1200):

Before:
```tsx
<textarea
  value={generatedSql || ""}
  readOnly
  placeholder="SELECT * FROM ..."
  className="w-full h-[64px] rounded border border-primary/40 bg-primary/5 px-3 py-2 text-[11px] font-mono text-slate-custom-700 focus:outline-none cursor-default"
/>
```

After:
```tsx
<textarea
  value={generatedSql}
  onChange={(e) => {
    setGeneratedSql(e.target.value);
    setSqlUserEdited(true);
  }}
  placeholder="Paste SQL here to run directly, or generate one above..."
  className="w-full h-[120px] rounded border border-primary/40 bg-primary/5 px-3 py-2 text-[11px] font-mono text-slate-custom-700 focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-colors resize-y cursor-text"
/>
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/dashboard/studio/page.tsx
git commit -m "feat: make SQL textarea editable with user-edit tracking"
```

---

### Task 6: Add "Revise question" link in the Generated Query card header

**Files:**
- Modify: `src/app/dashboard/studio/page.tsx`

**Context:**
A small `← Revise question` button in the card header (line ~1153) lets users jump back to Section 1 to tweak their natural language prompt. It calls `setActiveSection(1)` and focuses the prompt textarea.

**Step 1: Add the link** — inside the `div` at line ~1153 (the right side of the card header, where the Run Query button lives), add the link _above_ the Run Query button:

Find this block (around line 1153–1174):
```tsx
<div className="flex flex-col items-end gap-1">
  <button
    onClick={runGeneratedQuery}
    disabled={...}
    ...
  >
```

Change to:
```tsx
<div className="flex flex-col items-end gap-1">
  <button
    onClick={() => {
      setActiveSection(1);
      setTimeout(() => promptRef.current?.focus(), 50);
    }}
    className="text-[10px] text-slate-custom-400 hover:text-primary transition-colors flex items-center gap-0.5 mb-0.5"
  >
    <span className="material-icons-round text-[10px]">arrow_back</span>
    Revise question
  </button>
  <button
    onClick={runGeneratedQuery}
    disabled={...}
    ...
  >
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/dashboard/studio/page.tsx
git commit -m "feat: add Revise question link to return to NL prompt"
```

---

### Task 7: Full build verification

**Step 1: Run full build**

```bash
npm run build
```
Expected: Build completes with no errors. TypeScript and Next.js compilation succeed.

**Step 2: Commit docs**

```bash
git add docs/plans/2026-02-24-editable-sql-query.md docs/plans/2026-02-24-editable-sql-query-design.md
git commit -m "docs: add editable SQL query design and implementation plan"
```

**Step 3: Push and open PR**

```bash
git push -u origin feat/editable-sql-query
gh pr create \
  --title "feat: editable SQL query with raw execution and revise question link" \
  --body "$(cat <<'EOF'
## What
Makes the Generated Query SQL textarea editable. Users can edit the AI-generated SQL, paste their own query and run it directly, or click "Revise question" to go back to the natural language prompt.

See [docs/plans/2026-02-24-editable-sql-query-design.md](docs/plans/2026-02-24-editable-sql-query-design.md).

## Why
Previously the SQL was display-only. Users had no way to tweak the query or run a custom one without regenerating from scratch.

## Changes
- `src/lib/studio/sql-validator.ts` — new utility: validates SELECT-only SQL, blocks forbidden keywords, extracts/validates table name, caps LIMIT to 1000
- `src/app/api/dashboard/studio/generate-chart/route.ts` — Mode 3: raw SQL execution via `prisma.$queryRawUnsafe`, same rate-limiting as Mode 0
- `src/app/dashboard/studio/page.tsx` — editable textarea, `sqlUserEdited` state, `promptRef`, `runRawSql`, updated Run Query routing and disabled logic, "Revise question" link
- `docs/plans/` — design doc and implementation plan

## Testing
- `npx tsc --noEmit` passes at each step
- `npm run build` passes at end
- Manual: generate a query, edit SQL, click Run → executes edited SQL
- Manual: paste SQL in empty textarea, click Run → executes pasted SQL
- Manual: click "Revise question" → focus returns to prompt textarea
- Manual: generate fresh via NL → `sqlUserEdited` resets, normal JSON path used
EOF
)"
```
