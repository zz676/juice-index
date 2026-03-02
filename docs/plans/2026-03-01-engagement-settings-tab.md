# Engagement Settings Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Settings tab to the Engagement Center that consolidates global pause controls, pause schedules, and a new per-user reply model selector; remove the `GlobalPauseBanner` from the page header.

**Architecture:** Add a `replyModel` column to `EngagementConfig` via Prisma migration. Update the config API to expose and persist it. Create a new `EngagementSettingsPanel` component that absorbs all `GlobalPauseBanner` logic plus the model picker. Wire the cron job to read `replyModel` and pass it to `generateReply()`.

**Tech Stack:** Next.js 15 App Router, Prisma ORM (PostgreSQL), Vercel AI SDK, React, Tailwind CSS.

---

### Task 1: Add `replyModel` to Prisma schema and migrate

**Files:**
- Modify: `prisma/schema.prisma` (EngagementConfig model, lines ~1948–1968)

**Step 1: Add the field to `EngagementConfig`**

In `prisma/schema.prisma`, inside `model EngagementConfig { … }`, add after the `timezone` field:

```prisma
/// LLM model used for auto-reply generation. Must match a REPLY_MODELS id.
replyModel       String          @default("grok-4-1-fast-reasoning")
```

**Step 2: Create and apply the migration**

```bash
npx prisma migrate dev --name add_engagement_reply_model
```

Expected: new migration folder created under `prisma/migrations/`, Prisma Client regenerated.

**Step 3: Verify Prisma Client type**

```bash
npx tsc --noEmit
```

Expected: no errors. `prisma.engagementConfig` now types `replyModel` as `string`.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add replyModel field to EngagementConfig"
```

---

### Task 2: Update config API to expose and persist `replyModel`

**Files:**
- Modify: `src/app/api/dashboard/engagement/config/route.ts`

**Step 1: Update the GET handler**

In the `select` object passed to `prisma.engagementConfig.findUnique`, add `replyModel: true`.

In the `return NextResponse.json(…)` call, add:
```ts
replyModel: config?.replyModel ?? "grok-4-1-fast-reasoning",
```

**Step 2: Update the PATCH handler**

Change the `body` type from:
```ts
let body: { globalPaused?: boolean; scheduleOverride?: boolean; timezone?: string };
```
to:
```ts
let body: { globalPaused?: boolean; scheduleOverride?: boolean; timezone?: string; replyModel?: string };
```

After the existing validations, add:
```ts
if (body.replyModel !== undefined) {
  const { REPLY_MODELS } = await import("@/lib/engagement/models");
  if (!REPLY_MODELS.some((m) => m.id === body.replyModel)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Unknown reply model" }, { status: 400 });
  }
}
```

Add `replyModel` to the `updateData` block:
```ts
if (body.replyModel !== undefined) updateData.replyModel = body.replyModel;
```

Add `replyModel: true` to the `select` in both `upsert` branches. Return `replyModel` in the response.

**Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/api/dashboard/engagement/config/route.ts
git commit -m "feat: expose replyModel in engagement config API"
```

---

### Task 3: Update cron job to use `replyModel` from config

**Files:**
- Modify: `src/app/api/cron/engagement-poll/route.ts`

**Step 1: Add `replyModel` to the config select**

In the `prisma.engagementConfig.findUnique` call (around line 94), add `replyModel: true` to the `select` object.

**Step 2: Pass `replyModel` to both `generateReply()` calls**

There are two `generateReply()` calls in this file (around lines 258 and 537). Both currently pass options without a `model` field. Update each to:

```ts
const generated = await generateReply(…text…, …prompt…, {
  accountContext: account.accountContext,
  recentReplies: recentReplyTexts,
  temperature: account.temperature,
  model: config?.replyModel ?? "grok-4-1-fast-reasoning",
});
```

**Step 3: Fix the hardcoded `"gpt-4.1-mini"` in `AIUsage.create` calls**

There are two `AIUsage.create` calls for `source: "engagement-reply"` that hardcode `model: "gpt-4.1-mini"` (around lines 270 and 547). Change both to:

```ts
model: config?.replyModel ?? "grok-4-1-fast-reasoning",
```

**Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add src/app/api/cron/engagement-poll/route.ts
git commit -m "feat: read replyModel from EngagementConfig in cron job"
```

---

### Task 4: Create `EngagementSettingsPanel` component

**Files:**
- Create: `src/app/dashboard/engagement/engagement-settings-panel.tsx`

This component absorbs ALL logic from `global-pause-banner.tsx` and adds a Reply Model section on top.

**Step 1: Copy the full `GlobalPauseBanner` source as the starting point**

The new file should export `EngagementSettingsPanel` (not `GlobalPauseBanner`). Keep the same props interface:
```ts
interface Props {
  onPauseStateChange?: (paused: boolean) => void;
}
```

**Step 2: Extend `ConfigData` type to include `replyModel`**

```ts
type ConfigData = {
  globalPaused: boolean;
  scheduleOverride: boolean;
  timezone: string;
  replyModel: string;
  schedules: PauseSchedule[];
};
```

**Step 3: Add `replyModel` state and save handler**

Inside the component, after other state declarations:
```ts
// replyModel is stored inside config state, already loaded from GET /config
```

Add a save-on-change handler:
```ts
const updateReplyModel = async (modelId: string) => {
  if (!config) return;
  setConfig({ ...config, replyModel: modelId });
  await fetch("/api/dashboard/engagement/config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ replyModel: modelId }),
  });
};
```

**Step 4: Build the JSX — full layout**

Replace the `GlobalPauseBanner` JSX with a non-banner layout. Structure:

```tsx
import { REPLY_MODELS } from "@/lib/engagement/models";

// Inside return (…):
<div className="space-y-6">

  {/* ── Reply Model ── */}
  <div className="bg-card rounded-xl border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] p-5">
    <h2 className="text-sm font-semibold text-slate-custom-900 mb-1">Reply Model</h2>
    <p className="text-xs text-slate-custom-500 mb-3">
      LLM used for all auto-generated replies.
    </p>
    <select
      value={config.replyModel}
      onChange={(e) => updateReplyModel(e.target.value)}
      className="w-full text-sm border border-slate-custom-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card text-slate-custom-700"
    >
      <optgroup label="Standard">
        {REPLY_MODELS.filter((m) => m.tier === "standard").map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </optgroup>
      <optgroup label="Enterprise">
        {REPLY_MODELS.filter((m) => m.tier === "enterprise").map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </optgroup>
    </select>
  </div>

  {/* ── Auto-Reply Status ── */}
  <div className="bg-card rounded-xl border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] p-5">
    <h2 className="text-sm font-semibold text-slate-custom-900 mb-3">Auto-Reply Status</h2>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`material-icons-round text-[18px] ${statusIconClass}`}>{statusIcon}</span>
        <p className={`text-sm font-medium ${statusTextClass}`}>{statusText}</p>
      </div>
      {/* Paste the existing pause/resume/override button block here unchanged */}
      {/* (the 4-branch conditional: globalPaused → Resume, isSchedulePaused → Override On, isScheduleOverridden → Cancel Override, default → Pause All) */}
    </div>
  </div>

  {/* ── Pause Schedules ── */}
  <div className="bg-card rounded-xl border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] p-5 space-y-4">
    <h2 className="text-sm font-semibold text-slate-custom-900">Pause Schedules</h2>
    {/* Paste the full expanded-panel content (timezone selector + schedule list + add form) here unchanged */}
  </div>

</div>
```

Remove: the `expanded` state and `setExpanded` toggle — schedules are always visible in the Settings tab.

Remove: the `bannerBg` / `border-rounded-xl overflow-hidden` wrapper since we now use separate cards.

Keep: ALL schedule CRUD handlers (`toggleScheduleEnabled`, `deleteSchedule`, `addSchedule`, `addException`, `deleteException`, `updateScheduleFrequency`, `updateTimezone`, `toggleGlobalPause`, `setScheduleOverride`) — copy them verbatim.

Keep: the `ScheduleRow` sub-component at the bottom of the file — copy it verbatim.

Keep: `isWithinWindow`, `getActiveSchedule`, `TIMEZONES`, `POLL_STEPS`, `POLL_LABELS` — copy verbatim.

**Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 6: Commit**

```bash
git add src/app/dashboard/engagement/engagement-settings-panel.tsx
git commit -m "feat: create EngagementSettingsPanel with model picker and pause controls"
```

---

### Task 5: Wire Settings tab into `page.tsx` and remove the banner

**Files:**
- Modify: `src/app/dashboard/engagement/page.tsx`
- Delete: `src/app/dashboard/engagement/global-pause-banner.tsx`

**Step 1: Update imports**

Remove:
```ts
import { GlobalPauseBanner } from "./global-pause-banner";
```
Add:
```ts
import { EngagementSettingsPanel } from "./engagement-settings-panel";
```

**Step 2: Update `TabId` type**

```ts
type TabId = "accounts" | "replies" | "analytics" | "tones" | "settings";
```

**Step 3: Add the tab button**

In the tabs array (the `[…] as const` block), add after the `"tones"` entry:
```ts
{ id: "settings", label: "Settings", icon: "settings" },
```

**Step 4: Remove `<GlobalPauseBanner>`**

Delete the line:
```tsx
<GlobalPauseBanner onPauseStateChange={setGlobalPaused} />
```

**Step 5: Add the Settings tab panel**

After the `{activeTab === "tones" && …}` block, add:
```tsx
{/* Tab: Settings */}
{activeTab === "settings" && (
  <EngagementSettingsPanel onPauseStateChange={setGlobalPaused} />
)}
```

**Step 6: Delete the old banner file**

```bash
rm src/app/dashboard/engagement/global-pause-banner.tsx
```

**Step 7: Type check and build**

```bash
npx tsc --noEmit
npm run build
```

Expected: no errors, build succeeds.

**Step 8: Commit**

```bash
git add src/app/dashboard/engagement/page.tsx
git rm src/app/dashboard/engagement/global-pause-banner.tsx
git commit -m "feat: add Settings tab to Engagement Center, remove GlobalPauseBanner"
```

---

### Task 6: Update docs

**Files:**
- Modify: `docs/tier-quotas.md` — update Redis key list with note that `replyModel` is DB-stored, not Redis
- Modify: `docs/implementation/engagement-playground.md` — brief note that the global reply model is set in Settings tab

**Step 1: Add a note to `docs/operation/engagement-center.md` (or create if missing)**

Add a section:

```md
## Settings Tab

The Settings tab (Engagement Center → Settings) provides global per-user configuration:

- **Reply Model**: LLM used for all auto-generated replies. Stored as `replyModel` on `EngagementConfig`. Defaults to `grok-4-1-fast-reasoning`.
- **Auto-Reply Status**: Global pause toggle (replaces the old top-of-page banner).
- **Pause Schedules**: Timezone and time-window schedule management.
```

**Step 2: Commit**

```bash
git add docs/
git commit -m "docs: document engagement Settings tab"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass (no tests reference `GlobalPauseBanner` by import path).

**Step 2: Run build**

```bash
npm run build
```

Expected: clean build, no type errors.

**Step 3: Push branch and create PR**

Follow project git workflow: push feature branch, open PR to `main`.
