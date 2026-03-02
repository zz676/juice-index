# Engagement Settings Tab — Design

## Overview

Add a **Settings** tab to the Engagement Center that consolidates global auto-reply configuration: reply model selection, global pause control, and pause schedules. The existing `GlobalPauseBanner` at the top of the page is removed; all its functionality moves inside this tab.

## Layout

The Settings tab contains three sections in a single-column card layout:

```
┌─────────────────────────────────────────┐
│  Reply Model                            │
│  [Grok 4.1 Fast ▾]  (auto-saves)       │
├─────────────────────────────────────────┤
│  Auto-Reply Status                      │
│  ● Active  /  ⏸ Paused                 │
│  [Pause All]  or  [Resume]              │
├─────────────────────────────────────────┤
│  Pause Schedules                        │
│  Timezone: [America/New_York ▾]        │
│  22:00→07:00  Overnight  [toggle] [×]  │
│  [+ Add Schedule]                       │
└─────────────────────────────────────────┘
```

## Backend Changes

### 1. Prisma schema — `EngagementConfig`

Add a `replyModel` field with a default of `"grok-4-1-fast-reasoning"`:

```prisma
replyModel String @default("grok-4-1-fast-reasoning")
```

Generate and apply a migration.

### 2. Config API (`/api/dashboard/engagement/config`)

- **GET**: include `replyModel` in the select and response
- **PATCH**: accept `replyModel?: string`, validate against `REPLY_MODELS` IDs, persist via upsert

### 3. Cron job (`/api/cron/engagement-poll/route.ts`)

- Fetch each user's `replyModel` from their `EngagementConfig` when building the reply batch
- Pass `model: replyModel` to `generateReply()`
- Fix the hardcoded `model: "gpt-4.1-mini"` in `AIUsage` log entries to use the actual model ID

## Frontend Changes

### `page.tsx`

- Add `"settings"` to `TabId` union
- Add Settings tab button (icon: `settings`, label: `Settings`)
- Remove `<GlobalPauseBanner onPauseStateChange={setGlobalPaused} />`
- Render `<EngagementSettingsPanel onPauseStateChange={setGlobalPaused} />` when `activeTab === "settings"`

### New `engagement-settings-panel.tsx`

A new client component that owns all settings state. It absorbs the entire `GlobalPauseBanner` component's logic (config fetch, pause toggle, schedule CRUD, timezone, schedule override) and adds:

- **Reply Model section**: dropdown using `REPLY_MODELS` from `@/lib/engagement/models`, grouped by Standard / Enterprise optgroups, auto-saves on change via `PATCH /api/dashboard/engagement/config`
- `onPauseStateChange` callback prop — called whenever `globalPaused` changes, so `AccountCard` greying-out continues to work

### `global-pause-banner.tsx`

Delete the file — all its logic is absorbed into `EngagementSettingsPanel`.

## Data Flow

```
EngagementSettingsPanel
  → GET /api/dashboard/engagement/config  (load replyModel + pause state + schedules)
  → PATCH /api/dashboard/engagement/config  (save replyModel, globalPaused, timezone, scheduleOverride)
  → PATCH /api/dashboard/engagement/schedules/:id  (toggle/update schedule)
  → POST  /api/dashboard/engagement/schedules  (add schedule)
  → DELETE /api/dashboard/engagement/schedules/:id  (delete schedule)
  → onPauseStateChange(bool) → page.tsx globalPaused → AccountCard greyout
```

```
Cron job
  → prisma.engagementConfig.findUnique({ userId })  → replyModel
  → generateReply(text, prompt, { model: replyModel })
  → AIUsage.create({ model: replyModel })
```

## Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `replyModel` field to `EngagementConfig` |
| `prisma/migrations/…` | New migration for `replyModel` column |
| `src/app/api/dashboard/engagement/config/route.ts` | GET + PATCH handle `replyModel` |
| `src/app/api/cron/engagement-poll/route.ts` | Read `replyModel` from config, pass to `generateReply()`, fix audit log |
| `src/app/dashboard/engagement/page.tsx` | Add settings tab, remove banner, render panel |
| `src/app/dashboard/engagement/engagement-settings-panel.tsx` | **New** — absorbs banner + adds model picker |
| `src/app/dashboard/engagement/global-pause-banner.tsx` | **Delete** |
