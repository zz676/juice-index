# Reply Monitoring Date Range Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add start/end date pickers to the Date and Post Date columns in the Reply Monitoring table so users can filter replies by time range.

**Architecture:** Two inline column-header dropdowns (same click-outside pattern as the existing Account filter) each containing `<input type="date">` From/To fields. State flows down into `fetchReplies`, which appends four new query params (`dateFrom`, `dateTo`, `postDateFrom`, `postDateTo`) to the API call. The API route parses those params and adds `gte`/`lte` conditions to the Prisma `where` clause.

**Tech Stack:** Next.js 14 App Router, React (useState/useRef/useEffect), Prisma ORM, Tailwind CSS, TypeScript.

**Design doc:** `docs/plans/2026-02-28-reply-monitoring-date-filters-design.md`

---

### Task 1: Extend the API route to accept date range params

**Files:**
- Modify: `src/app/api/dashboard/engagement/replies/route.ts`

**Step 1: Read the current file**

Open `src/app/api/dashboard/engagement/replies/route.ts` and confirm the current `where` building block (lines ~26–32).

**Step 2: Add date param parsing after the existing `accountId` line**

In the `GET` handler, after:
```ts
if (accountId) {
  where.monitoredAccountId = accountId;
}
```

Add:
```ts
const dateFrom = url.searchParams.get("dateFrom");
const dateTo = url.searchParams.get("dateTo");
const postDateFrom = url.searchParams.get("postDateFrom");
const postDateTo = url.searchParams.get("postDateTo");

if (dateFrom || dateTo) {
  where.createdAt = {
    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
    ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
  };
}
if (postDateFrom || postDateTo) {
  where.sourceTweetCreatedAt = {
    ...(postDateFrom ? { gte: new Date(postDateFrom) } : {}),
    ...(postDateTo ? { lte: new Date(postDateTo + "T23:59:59.999Z") } : {}),
  };
}
```

`dateTo` uses end-of-day so the selected day is fully included.

**Step 3: Build and type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/api/dashboard/engagement/replies/route.ts
git commit -m "feat: add date range query params to replies API"
```

---

### Task 2: Add date filter state and extend fetchReplies in the table component

**Files:**
- Modify: `src/app/dashboard/engagement/reply-monitoring-table.tsx`

**Step 1: Add four new state variables**

After the existing `const [filterOpen, setFilterOpen] = useState(false);` line, add:

```ts
const [datePickerOpen, setDatePickerOpen] = useState<"date" | "postDate" | null>(null);
const [dateFrom, setDateFrom] = useState<string>("");
const [dateTo, setDateTo] = useState<string>("");
const [postDateFrom, setPostDateFrom] = useState<string>("");
const [postDateTo, setPostDateTo] = useState<string>("");
const datePickerRef = useRef<HTMLDivElement>(null);
```

**Step 2: Register click-outside handler for the new date picker ref**

The existing `useEffect` handles `filterRef`. Add a second one immediately after it:

```ts
useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
      setDatePickerOpen(null);
    }
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, []);
```

**Step 3: Extend the fetchReplies signature**

Change the function signature from:
```ts
const fetchReplies = async (
  page = 1,
  tab: "All" | EngagementReplyStatus = activeTab,
  sort = sortBy,
  order = sortOrder,
  accountId: string | null = selectedAccountId,
) => {
```
to:
```ts
const fetchReplies = async (
  page = 1,
  tab: "All" | EngagementReplyStatus = activeTab,
  sort = sortBy,
  order = sortOrder,
  accountId: string | null = selectedAccountId,
  df = dateFrom,
  dt = dateTo,
  pdf = postDateFrom,
  pdt = postDateTo,
) => {
```

**Step 4: Append date params to the query string inside fetchReplies**

After the existing `if (accountId) params.set("accountId", accountId);` line, add:
```ts
if (df) params.set("dateFrom", df);
if (dt) params.set("dateTo", dt);
if (pdf) params.set("postDateFrom", pdf);
if (pdt) params.set("postDateTo", pdt);
```

**Step 5: Build and type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 6: Commit**

```bash
git add src/app/dashboard/engagement/reply-monitoring-table.tsx
git commit -m "feat: extend fetchReplies with date range params"
```

---

### Task 3: Build the Date column header with inline date picker popover

**Files:**
- Modify: `src/app/dashboard/engagement/reply-monitoring-table.tsx`

**Step 1: Add a helper to reset date range state and refetch**

Inside the component (near the other handlers), add:

```ts
const handleDateChange = (
  field: "dateFrom" | "dateTo" | "postDateFrom" | "postDateTo",
  value: string,
) => {
  const next = { dateFrom, dateTo, postDateFrom, postDateTo, [field]: value };
  if (field === "dateFrom") setDateFrom(value);
  if (field === "dateTo") setDateTo(value);
  if (field === "postDateFrom") setPostDateFrom(value);
  if (field === "postDateTo") setPostDateTo(value);
  fetchReplies(1, activeTab, sortBy, sortOrder, selectedAccountId,
    next.dateFrom, next.dateTo, next.postDateFrom, next.postDateTo);
};

const clearDateFilter = (which: "date" | "postDate") => {
  if (which === "date") {
    setDateFrom("");
    setDateTo("");
    fetchReplies(1, activeTab, sortBy, sortOrder, selectedAccountId, "", "", postDateFrom, postDateTo);
  } else {
    setPostDateFrom("");
    setPostDateTo("");
    fetchReplies(1, activeTab, sortBy, sortOrder, selectedAccountId, dateFrom, dateTo, "", "");
  }
};
```

**Step 2: Replace the Date column `<th>` with the new filter-aware header**

Find this block (around line 301–309 in the original file):
```tsx
<th className="px-4 py-3 text-left">
  <button
    onClick={() => handleSort("createdAt")}
    className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700"
  >
    Date
    <SortIcon field="createdAt" />
  </button>
</th>
```

Replace with:
```tsx
<th className="px-4 py-3 text-left">
  <div className="relative" ref={datePickerOpen === "date" ? datePickerRef : undefined}>
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleSort("createdAt")}
        className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700"
      >
        Date
        <SortIcon field="createdAt" />
      </button>
      <button
        onClick={() => setDatePickerOpen(datePickerOpen === "date" ? null : "date")}
        className={`flex items-center transition-colors ${
          dateFrom || dateTo ? "text-primary" : "text-slate-custom-300 hover:text-slate-custom-500"
        }`}
        title="Filter by date"
      >
        <span className="material-icons-round text-[14px]">filter_list</span>
        {(dateFrom || dateTo) && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block ml-0.5" />
        )}
      </button>
    </div>

    {datePickerOpen === "date" && (
      <div className="absolute left-0 top-full mt-2 bg-white rounded-xl border border-slate-custom-200 shadow-lg p-3 z-50 w-56 space-y-2">
        <p className="text-[11px] font-semibold text-slate-custom-500 uppercase tracking-wide">
          Filter by Date
        </p>
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-custom-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateChange("dateFrom", e.target.value)}
            className="w-full text-xs border border-slate-custom-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-custom-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateChange("dateTo", e.target.value)}
            className="w-full text-xs border border-slate-custom-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => clearDateFilter("date")}
            className="text-xs text-slate-custom-500 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    )}
  </div>
</th>
```

**Step 3: Build and type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/dashboard/engagement/reply-monitoring-table.tsx
git commit -m "feat: add date range filter popover to Date column header"
```

---

### Task 4: Build the Post Date column header with inline date picker popover

**Files:**
- Modify: `src/app/dashboard/engagement/reply-monitoring-table.tsx`

**Step 1: Replace the Post Date column `<th>` with the filter-aware header**

Find this block (around line 310–312 in the original file):
```tsx
<th className="px-4 py-3 text-left text-xs font-semibold text-slate-custom-500">
  Post Date
</th>
```

Replace with:
```tsx
<th className="px-4 py-3 text-left">
  <div className="relative" ref={datePickerOpen === "postDate" ? datePickerRef : undefined}>
    <div className="flex items-center gap-1">
      <span className="text-xs font-semibold text-slate-custom-500">Post Date</span>
      <button
        onClick={() => setDatePickerOpen(datePickerOpen === "postDate" ? null : "postDate")}
        className={`flex items-center transition-colors ${
          postDateFrom || postDateTo ? "text-primary" : "text-slate-custom-300 hover:text-slate-custom-500"
        }`}
        title="Filter by post date"
      >
        <span className="material-icons-round text-[14px]">filter_list</span>
        {(postDateFrom || postDateTo) && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block ml-0.5" />
        )}
      </button>
    </div>

    {datePickerOpen === "postDate" && (
      <div className="absolute left-0 top-full mt-2 bg-white rounded-xl border border-slate-custom-200 shadow-lg p-3 z-50 w-56 space-y-2">
        <p className="text-[11px] font-semibold text-slate-custom-500 uppercase tracking-wide">
          Filter by Post Date
        </p>
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-custom-500">From</label>
          <input
            type="date"
            value={postDateFrom}
            onChange={(e) => handleDateChange("postDateFrom", e.target.value)}
            className="w-full text-xs border border-slate-custom-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-custom-500">To</label>
          <input
            type="date"
            value={postDateTo}
            onChange={(e) => handleDateChange("postDateTo", e.target.value)}
            className="w-full text-xs border border-slate-custom-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {(postDateFrom || postDateTo) && (
          <button
            onClick={() => clearDateFilter("postDate")}
            className="text-xs text-slate-custom-500 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    )}
  </div>
</th>
```

**Step 2: Fix the `datePickerRef` attachment**

The `datePickerRef` is conditionally attached based on which picker is open. This works because only one popover is open at a time. Verify no TypeScript error from using `undefined` as a `ref` value (React accepts `undefined` for ref prop).

**Step 3: Build and type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/dashboard/engagement/reply-monitoring-table.tsx
git commit -m "feat: add date range filter popover to Post Date column header"
```

---

### Task 5: Final verification and PR

**Step 1: Full build**

```bash
npm run build
```
Expected: successful build, no type errors.

**Step 2: Manual smoke test**

1. Open the Reply Monitoring tab in the browser.
2. Click the filter icon next to **Date** — popover should appear with From/To inputs.
3. Set a From date — table should reload and show only replies on/after that date.
4. Set a To date — table should reload and show only replies within the range.
5. Click **Clear** — filters reset, full list returns.
6. Click outside the popover — it should close.
7. Repeat steps 2–6 for **Post Date**.
8. Verify both filters can be active simultaneously.
9. Verify the blue dot indicator appears when a filter is active and disappears when cleared.
10. Verify sorting still works on the Date column alongside an active date filter.

**Step 3: Create PR**

```bash
git push origin HEAD
```
Then open a PR targeting `main` using the `commit-commands:commit-push-pr` skill or `gh pr create`.
