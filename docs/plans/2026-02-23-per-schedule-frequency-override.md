# Per-Schedule Frequency Override Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move frequency override from a single global setting to a per-schedule setting, and redesign schedule rows into a 3-column layout.

**Architecture:** Remove `globalFrequencyOverride`/`globalPollInterval` from `EngagementConfig` and add `frequencyOverride`/`overridePollInterval` to `PauseSchedule`. When a schedule is active and has `frequencyOverride: true`, the cron uses that schedule's `overridePollInterval` instead of pausing. The `ScheduleRow` UI component is redesigned into 3 columns: (1) enable toggle + time + label, (2) frequency override toggle + slider, (3) exceptions + delete.

**Tech Stack:** Next.js 14 App Router, Prisma (PostgreSQL, `db push`), React, Tailwind CSS

---

## Task 1: Schema — move frequency fields from EngagementConfig to PauseSchedule

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Edit the schema**

In `prisma/schema.prisma`:

Remove these two fields from `EngagementConfig` (around line 1854):
```prisma
  /// When true, all monitored accounts use globalPollInterval instead of their own pollInterval.
  globalFrequencyOverride Boolean         @default(false)
  /// Poll interval (minutes) applied to all accounts when globalFrequencyOverride is true.
  globalPollInterval      Int             @default(5)
```

Add these two fields to `PauseSchedule` (after the `enabled` field, around line 1882):
```prisma
  /// When true, accounts use overridePollInterval during this window instead of being paused.
  frequencyOverride    Boolean @default(false)
  /// Poll interval (minutes) to use when frequencyOverride is true (replaces pause behavior).
  overridePollInterval Int     @default(5)
```

**Step 2: Push schema and regenerate client**

```bash
npx prisma db push
npx prisma generate
```

Expected: `✓ Your database is now in sync with your Prisma schema.`

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: move frequency override from EngagementConfig to PauseSchedule"
```

---

## Task 2: Update PauseScheduleLike type in pause-utils.ts

**Files:**
- Modify: `src/lib/engagement/pause-utils.ts`

**Step 1: Add new fields to the shared type**

In `src/lib/engagement/pause-utils.ts`, update `PauseScheduleLike` (lines 10–17):

```typescript
export type PauseScheduleLike = {
  id: string;
  enabled: boolean;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  label?: string | null;
  frequencyOverride: boolean;
  overridePollInterval: number;
  PauseExceptions: PauseExceptionLike[];
};
```

**Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: errors about places that construct `PauseScheduleLike` objects without the new fields — those will be fixed in subsequent tasks.

**Step 3: Commit**

```bash
git add src/lib/engagement/pause-utils.ts
git commit -m "feat: add frequencyOverride fields to PauseScheduleLike type"
```

---

## Task 3: Update config API — GET exposes new schedule fields, PATCH removes global frequency

**Files:**
- Modify: `src/app/api/dashboard/engagement/config/route.ts`

**Step 1: Update GET — add new fields to PauseSchedules select**

In the `GET` handler's Prisma select for `PauseSchedules` (around line 18), add:
```typescript
PauseSchedules: {
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    label: true,
    startTime: true,
    endTime: true,
    enabled: true,
    frequencyOverride: true,       // ← add
    overridePollInterval: true,    // ← add
    createdAt: true,
    PauseExceptions: {
      select: { id: true, date: true },
      orderBy: { date: "asc" },
    },
  },
},
```

**Step 2: Update GET — remove global frequency from response**

Remove from `return NextResponse.json(...)`:
```typescript
globalFrequencyOverride: config?.globalFrequencyOverride ?? false,
globalPollInterval: config?.globalPollInterval ?? 5,
```

**Step 3: Update PATCH — remove global frequency from body type**

Change the body type annotation (line ~61) from:
```typescript
let body: {
  globalPaused?: boolean;
  scheduleOverride?: boolean;
  timezone?: string;
  globalFrequencyOverride?: boolean;
  globalPollInterval?: number;
};
```
To:
```typescript
let body: { globalPaused?: boolean; scheduleOverride?: boolean; timezone?: string };
```

**Step 4: Remove global frequency validation, updateData assignments, and response fields**

Delete the two validation blocks:
```typescript
if (body.globalFrequencyOverride !== undefined && typeof body.globalFrequencyOverride !== "boolean") { ... }
if (body.globalPollInterval !== undefined) { ... }
```

Update the `updateData` type:
```typescript
const updateData: { globalPaused?: boolean; scheduleOverride?: boolean; timezone?: string } = {};
```

Remove these two lines:
```typescript
if (body.globalFrequencyOverride !== undefined) updateData.globalFrequencyOverride = body.globalFrequencyOverride;
if (body.globalPollInterval !== undefined) updateData.globalPollInterval = Number(body.globalPollInterval);
```

Update the upsert `select` to remove:
```typescript
globalFrequencyOverride: true,
globalPollInterval: true,
```

Update the final `return NextResponse.json(...)` to remove:
```typescript
globalFrequencyOverride: config.globalFrequencyOverride,
globalPollInterval: config.globalPollInterval,
```

**Step 5: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: errors only in files that still reference `globalFrequencyOverride` (GlobalPauseBanner, page.tsx, account-card.tsx, cron) — those will be fixed later.

**Step 6: Commit**

```bash
git add src/app/api/dashboard/engagement/config/route.ts
git commit -m "feat: remove globalFrequency from config API, expose per-schedule frequency fields"
```

---

## Task 4: Update schedule PATCH API — accept frequencyOverride and overridePollInterval

**Files:**
- Modify: `src/app/api/dashboard/engagement/schedules/[id]/route.ts`

**Step 1: Expand body type**

Change line 30:
```typescript
let body: { label?: string; startTime?: string; endTime?: string; enabled?: boolean; frequencyOverride?: boolean; overridePollInterval?: number };
```

**Step 2: Add validation after existing checks (after line 44)**

```typescript
if (body.frequencyOverride !== undefined && typeof body.frequencyOverride !== "boolean") {
  return NextResponse.json({ error: "BAD_REQUEST", message: "frequencyOverride must be a boolean" }, { status: 400 });
}

if (body.overridePollInterval !== undefined) {
  const VALID_POLL_INTERVALS = [5, 10, 15, 30, 60, 210, 300, 510, 690, 930, 1200, 1440, 10080];
  if (!VALID_POLL_INTERVALS.includes(Number(body.overridePollInterval))) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid overridePollInterval value" }, { status: 400 });
  }
}
```

**Step 3: Update updateData type and assignments**

Change the `data` declaration type (line 47):
```typescript
const data: Record<string, string | boolean | number | null> = {};
```

Add after existing assignments:
```typescript
if (body.frequencyOverride !== undefined) data.frequencyOverride = body.frequencyOverride;
if (body.overridePollInterval !== undefined) data.overridePollInterval = Number(body.overridePollInterval);
```

**Step 4: Add new fields to the Prisma select**

In the `prisma.pauseSchedule.update` select (lines 60–68), add:
```typescript
select: {
  id: true,
  label: true,
  startTime: true,
  endTime: true,
  enabled: true,
  frequencyOverride: true,       // ← add
  overridePollInterval: true,    // ← add
  createdAt: true,
  PauseExceptions: { select: { id: true, date: true }, orderBy: { date: "asc" } },
},
```

**Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/app/api/dashboard/engagement/schedules/[id]/route.ts
git commit -m "feat: add frequencyOverride to schedule PATCH API"
```

---

## Task 5: Update cron — use per-schedule frequency override

**Files:**
- Modify: `src/app/api/cron/engagement-poll/route.ts`

**Step 1: Add new fields to PauseSchedules select (lines 84–94)**

In the `engagementConfig.findUnique` select, update `PauseSchedules`:
```typescript
PauseSchedules: {
  where: { enabled: true },
  select: {
    id: true,
    label: true,
    startTime: true,
    endTime: true,
    enabled: true,
    frequencyOverride: true,       // ← add
    overridePollInterval: true,    // ← add
    PauseExceptions: { select: { date: true } },
  },
},
```

Also remove `globalFrequencyOverride: true` and `globalPollInterval: true` from the select if present.

**Step 2: Replace `scheduleActive` boolean with `activeSchedule` object (lines 117–121)**

Replace:
```typescript
const scheduleActive =
  !config?.scheduleOverride &&
  !!config?.PauseSchedules?.length &&
  isWithinPauseSchedule(config.PauseSchedules, config.timezone ?? "America/New_York", now);
```

With:
```typescript
const activeSchedule = config?.scheduleOverride
  ? null
  : getActivePauseSchedule(
      config?.PauseSchedules ?? [],
      config?.timezone ?? "America/New_York",
      now,
    );
```

**Step 3: Update the import to include `getActivePauseSchedule`**

Change line 14:
```typescript
import { isWithinPauseSchedule, getActivePauseSchedule } from "@/lib/engagement/pause-utils";
```

(Remove `isWithinPauseSchedule` if it's no longer used after this change — check with grep.)

**Step 4: Update per-account schedule check (lines 373–389)**

Replace:
```typescript
if (scheduleActive && !account.ignorePauseSchedule) {
  console.log(`[cron]   @${account.username}: SKIP: scheduled pause active`);
  skipped++;
  skipReasons.scheduledPause++;
  continue;
}

const interval = config?.globalFrequencyOverride
  ? (config.globalPollInterval ?? 5)
  : (account.pollInterval ?? 5);
```

With:
```typescript
if (activeSchedule && !account.ignorePauseSchedule) {
  if (!activeSchedule.frequencyOverride) {
    console.log(`[cron]   @${account.username}: SKIP: scheduled pause active`);
    skipped++;
    skipReasons.scheduledPause++;
    continue;
  }
  // Schedule has frequency override — don't pause, use override interval instead
}

const interval = (activeSchedule?.frequencyOverride && !account.ignorePauseSchedule)
  ? (activeSchedule.overridePollInterval ?? 5)
  : (account.pollInterval ?? 5);
```

**Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors (pause-utils types now match).

**Step 6: Commit**

```bash
git add src/app/api/cron/engagement-poll/route.ts
git commit -m "feat: apply per-schedule frequency override in cron (replaces global override)"
```

---

## Task 6: Redesign GlobalPauseBanner — remove global section, 3-column ScheduleRow

**Files:**
- Modify: `src/app/dashboard/engagement/global-pause-banner.tsx`

This is the largest UI change. Make all edits carefully.

### Part A — Remove global frequency infrastructure

**Step 1: Remove from `ConfigData` type**

Remove `globalFrequencyOverride: boolean` and `globalPollInterval: number`.

**Step 2: Remove `localGlobalInterval` state**

Delete: `const [localGlobalInterval, setLocalGlobalInterval] = useState<number>(0);`

**Step 3: Remove `onFrequencyOverrideChange` from Props**

Remove it from the `Props` type and the function destructuring.

**Step 4: Remove `toggleGlobalFrequency` and `commitGlobalPollInterval` functions**

Delete both functions entirely.

**Step 5: In `fetchConfig`, remove the lines that call `setLocalGlobalInterval` and `onFrequencyOverrideChange`**

**Step 6: Remove the Global Frequency Override UI section from the expanded panel**

Delete the entire `{/* Global Frequency Override */}` `<div>` block (lines 369–417).

### Part B — Update PauseSchedule type

**Step 7: Update the `PauseSchedule` type in the file** (top of file, around line 7):

```typescript
type PauseSchedule = {
  id: string;
  label: string | null;
  startTime: string;
  endTime: string;
  enabled: boolean;
  frequencyOverride: boolean;
  overridePollInterval: number;
  PauseExceptions: PauseException[];
};
```

### Part C — Add frequency update handler

**Step 8: Add `updateScheduleFrequency` function** after the existing `deleteSchedule` function:

```typescript
const updateScheduleFrequency = async (
  scheduleId: string,
  patch: { frequencyOverride?: boolean; overridePollInterval?: number },
) => {
  const res = await fetch(`/api/dashboard/engagement/schedules/${scheduleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    const data = await res.json();
    setConfig((prev) =>
      prev
        ? { ...prev, schedules: prev.schedules.map((s) => (s.id === scheduleId ? data.schedule : s)) }
        : prev,
    );
  }
};
```

### Part D — Pass new handler to ScheduleRow and update props + usage

**Step 9: Update ScheduleRow usage** in the expanded panel:

```tsx
{config.schedules.map((schedule) => (
  <ScheduleRow
    key={schedule.id}
    schedule={schedule}
    onToggle={() => toggleScheduleEnabled(schedule)}
    onDelete={() => deleteSchedule(schedule.id)}
    onFrequencyUpdate={(patch) => updateScheduleFrequency(schedule.id, patch)}
    onAddException={(date) => addException(schedule.id, date)}
    onDeleteException={(exId) => deleteException(schedule.id, exId)}
  />
))}
```

### Part E — Redesign ScheduleRow to 3 columns

**Step 10: Update `ScheduleRowProps`** (bottom of file, ~line 503):

```typescript
type ScheduleRowProps = {
  schedule: PauseSchedule;
  onToggle: () => void;
  onDelete: () => void;
  onFrequencyUpdate: (patch: { frequencyOverride?: boolean; overridePollInterval?: number }) => void;
  onAddException: (date: string) => void;
  onDeleteException: (exId: string) => void;
};
```

**Step 11: Rewrite `ScheduleRow` component** — replace the entire function body:

```tsx
function ScheduleRow({
  schedule,
  onToggle,
  onDelete,
  onFrequencyUpdate,
  onAddException,
  onDeleteException,
}: ScheduleRowProps) {
  const [showExceptions, setShowExceptions] = useState(false);
  const [newExDate, setNewExDate] = useState("");
  const [localInterval, setLocalInterval] = useState(() => {
    const idx = POLL_STEPS.indexOf(schedule.overridePollInterval ?? 5);
    return idx >= 0 ? idx : 0;
  });

  return (
    <div className="border border-slate-custom-200 rounded-lg p-3 bg-slate-custom-50 space-y-2">
      {/* 3-column row */}
      <div className="grid grid-cols-3 gap-3 items-start">

        {/* Col 1: Enable toggle + time + label */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onToggle}
            className={`w-8 h-5 rounded-full relative transition-colors shrink-0 ${
              schedule.enabled ? "bg-green-500" : "bg-slate-custom-300"
            }`}
            aria-label={schedule.enabled ? "Disable schedule" : "Enable schedule"}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                schedule.enabled ? "translate-x-3" : "translate-x-0.5"
              }`}
            />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-mono text-slate-custom-700 truncate">
              {schedule.startTime} → {schedule.endTime}
            </p>
            {schedule.label && (
              <p className="text-[11px] text-slate-custom-500 truncate">{schedule.label}</p>
            )}
          </div>
        </div>

        {/* Col 2: Frequency override */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-custom-500 leading-none">
              {schedule.frequencyOverride
                ? `Poll every ${POLL_LABELS[localInterval]}`
                : "Pause during window"}
            </p>
            <button
              onClick={() => onFrequencyUpdate({ frequencyOverride: !schedule.frequencyOverride })}
              className={`w-8 h-5 rounded-full relative transition-colors shrink-0 ${
                schedule.frequencyOverride ? "bg-primary" : "bg-slate-custom-300"
              }`}
              aria-label={schedule.frequencyOverride ? "Disable frequency override" : "Enable frequency override"}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  schedule.frequencyOverride ? "translate-x-3" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {schedule.frequencyOverride && (
            <input
              type="range"
              min={0}
              max={POLL_STEPS.length - 1}
              step={1}
              value={localInterval}
              onChange={(e) => setLocalInterval(Number(e.target.value))}
              onPointerUp={(e) =>
                onFrequencyUpdate({
                  overridePollInterval: POLL_STEPS[Number((e.target as HTMLInputElement).value)],
                })
              }
              className="w-full h-1.5 accent-primary"
            />
          )}
        </div>

        {/* Col 3: Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setShowExceptions((v) => !v)}
            className="flex items-center gap-0.5 text-xs text-slate-custom-500 hover:text-slate-custom-700 transition-colors"
            aria-label="Toggle exceptions"
          >
            <span className="material-icons-round text-[14px]">event_busy</span>
            {schedule.PauseExceptions.length > 0 && (
              <span className="text-[11px]">{schedule.PauseExceptions.length}</span>
            )}
            <span className="material-icons-round text-[12px]">
              {showExceptions ? "expand_less" : "expand_more"}
            </span>
          </button>
          <button
            onClick={onDelete}
            className="text-slate-custom-400 hover:text-red-500 transition-colors"
            aria-label="Delete schedule"
          >
            <span className="material-icons-round text-[16px]">delete_outline</span>
          </button>
        </div>
      </div>

      {/* Exceptions panel */}
      {showExceptions && (
        <div className="pt-2 border-t border-slate-custom-200 space-y-2">
          {schedule.PauseExceptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {schedule.PauseExceptions.map((ex) => (
                <span
                  key={ex.id}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-white border border-slate-custom-200 rounded-full text-slate-custom-600"
                >
                  {ex.date}
                  <button
                    onClick={() => onDeleteException(ex.id)}
                    className="text-slate-custom-400 hover:text-red-500 transition-colors leading-none"
                    aria-label={`Remove exception ${ex.date}`}
                  >
                    <span className="material-icons-round text-[11px]">close</span>
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={newExDate}
              onChange={(e) => setNewExDate(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => {
                if (newExDate) {
                  onAddException(newExDate);
                  setNewExDate("");
                }
              }}
              disabled={!newExDate}
              className="text-xs px-2 py-1 font-medium bg-white border border-slate-custom-200 rounded-lg hover:bg-slate-custom-50 transition-colors disabled:opacity-40"
            >
              Skip this date
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 12: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: errors only in page.tsx and account-card.tsx (onFrequencyOverrideChange prop) — fixed in next task.

**Step 13: Commit**

```bash
git add src/app/dashboard/engagement/global-pause-banner.tsx
git commit -m "feat: per-schedule frequency override UI with 3-column ScheduleRow"
```

---

## Task 7: Clean up page.tsx and account-card.tsx

**Files:**
- Modify: `src/app/dashboard/engagement/page.tsx`
- Modify: `src/app/dashboard/engagement/account-card.tsx`

### page.tsx

**Step 1: Remove two state variables**

Delete:
```typescript
const [globalFrequencyOverride, setGlobalFrequencyOverride] = useState(false);
const [globalPollInterval, setGlobalPollInterval] = useState(5);
```

**Step 2: Remove `onFrequencyOverrideChange` from GlobalPauseBanner**

Change:
```tsx
<GlobalPauseBanner
  onPauseStateChange={setGlobalPaused}
  onFrequencyOverrideChange={(on, interval) => {
    setGlobalFrequencyOverride(on);
    setGlobalPollInterval(interval);
  }}
/>
```
To:
```tsx
<GlobalPauseBanner onPauseStateChange={setGlobalPaused} />
```

**Step 3: Remove the two props from AccountCard**

Change:
```tsx
<AccountCard
  ...
  globalFrequencyOverride={globalFrequencyOverride}
  globalPollInterval={globalPollInterval}
  ...
/>
```
To just the original props (no globalFrequency props).

### account-card.tsx

**Step 4: Remove from AccountCardProps interface**

Delete:
```typescript
globalFrequencyOverride?: boolean;
globalPollInterval?: number;
```

**Step 5: Remove from component destructuring**

**Step 6: Restore the original frequency slider section** — replace the current version with the simple original:

```tsx
{/* Check frequency slider */}
<div>
  <p className="text-xs font-medium text-slate-custom-500 mb-2">
    Check Frequency
    <span className="ml-1 font-normal text-slate-custom-400">
      ({POLL_LABELS[localPollInterval]})
    </span>
  </p>
  <input
    type="range"
    min={0}
    max={POLL_STEPS.length - 1}
    step={1}
    value={localPollInterval}
    onChange={(e) => setLocalPollInterval(Number(e.target.value))}
    onPointerUp={(e) =>
      scheduleCommit({ pollInterval: POLL_STEPS[Number((e.target as HTMLInputElement).value)] })
    }
    className="w-full h-1.5 accent-primary"
    disabled={loading}
  />
  <div className="flex justify-between text-[10px] text-slate-custom-400 mt-0.5">
    <span>Frequent</span>
    <span>Rare</span>
  </div>
</div>
```

**Step 7: Verify TypeScript is fully clean**

```bash
npx tsc --noEmit
```

Expected: **zero errors**.

**Step 8: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: successful build.

**Step 9: Commit**

```bash
git add src/app/dashboard/engagement/page.tsx src/app/dashboard/engagement/account-card.tsx
git commit -m "feat: remove global frequency override from page and account card"
```

---

## Manual Test Checklist

1. Open Engagement Center → expand the banner (schedule icon button)
2. Add a schedule if none exists
3. Each schedule row shows **3 columns**: time/label | frequency control | actions
4. Col 2 defaults to "Pause during window" with toggle OFF
5. Toggle ON → label changes to "Poll every 5 min", slider appears
6. Move slider → label updates live; pointer-up commits (`PATCH /schedules/[id]` with `overridePollInterval`)
7. Toggle OFF → slider hides, label reverts to "Pause during window"
8. The standalone "Global Frequency Override" section is gone
9. Per-account frequency sliders work independently (no disabled/global state)

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Remove global freq from `EngagementConfig`; add `frequencyOverride`+`overridePollInterval` to `PauseSchedule` |
| `src/lib/engagement/pause-utils.ts` | Add new fields to `PauseScheduleLike` |
| `src/app/api/dashboard/engagement/config/route.ts` | GET exposes per-schedule fields; PATCH drops global freq |
| `src/app/api/dashboard/engagement/schedules/[id]/route.ts` | PATCH accepts + validates new fields |
| `src/app/api/cron/engagement-poll/route.ts` | Switch from `scheduleActive` bool to `activeSchedule` object; apply per-schedule freq override |
| `src/app/dashboard/engagement/global-pause-banner.tsx` | Remove global section; add `updateScheduleFrequency`; redesign `ScheduleRow` to 3 columns |
| `src/app/dashboard/engagement/page.tsx` | Remove global freq state + props |
| `src/app/dashboard/engagement/account-card.tsx` | Remove global freq props + restore simple slider |
