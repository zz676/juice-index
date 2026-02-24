# Engagement Pause Schedules

## Overview

The Engagement Center supports time-based pause schedules that control when the auto-reply cron runs for each user's monitored accounts. Each schedule can now optionally switch into **frequency override mode** instead of fully pausing — allowing replies to continue during a window at a different check interval.

---

## Data Model

### `EngagementConfig`

Stores global settings per user:

| Field | Type | Description |
|---|---|---|
| `globalPaused` | Boolean | Pause all accounts globally |
| `scheduleOverride` | Boolean | Disable all schedules temporarily |
| `timezone` | String | IANA timezone for schedule evaluation |

### `PauseSchedule`

Each user can have multiple named schedules:

| Field | Type | Description |
|---|---|---|
| `startTime` / `endTime` | String | `HH:MM` (24-hour) |
| `enabled` | Boolean | Whether schedule is active |
| `label` | String? | Display name |
| `frequencyOverride` | Boolean | When true: don't pause, use `overridePollInterval` instead |
| `overridePollInterval` | Int | Minutes between polls during override window |
| `PauseExceptions` | relation | Specific dates to skip the schedule |

---

## Cron Behavior (`/api/cron/engagement-poll`)

For each user-account pair, the cron applies this logic:

1. Resolve `activeSchedule` via `getActivePauseSchedule()` (returns the matching schedule or `null`).
2. If `scheduleOverride` is enabled, `activeSchedule` is forced to `null`.
3. If `activeSchedule` exists and `account.ignorePauseSchedule` is false:
   - If `activeSchedule.frequencyOverride` is **false**: skip (scheduled pause).
   - If `activeSchedule.frequencyOverride` is **true**: continue with `overridePollInterval`.
4. `interval` = `overridePollInterval` (if in override window) or `account.pollInterval` (default).

---

## UI: GlobalPauseBanner

The banner (`global-pause-banner.tsx`) displays the current pause status and the schedule list. Each schedule row uses a 3-column layout:

| Column 1 | Column 2 | Column 3 |
|---|---|---|
| Enable toggle + time range + label | Frequency override toggle + slider | Exceptions button + delete button |

- **Col 1:** Toggle `enabled`, shows `HH:MM – HH:MM`, inline label edit.
- **Col 2:** Toggle `frequencyOverride`. When off: shows "Pause during window". When on: shows a slider to set `overridePollInterval` (5–1440 min).
- **Col 3:** Button to manage date exceptions; delete button.

Changes to `frequencyOverride` and `overridePollInterval` are saved immediately via `PATCH /api/dashboard/engagement/schedules/[id]`.

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard/engagement/config` | Fetch `globalPaused`, `scheduleOverride`, `timezone`, and full schedule list |
| PATCH | `/api/dashboard/engagement/config` | Update `globalPaused`, `scheduleOverride`, `timezone` |
| PATCH | `/api/dashboard/engagement/schedules/[id]` | Update schedule fields including `frequencyOverride` and `overridePollInterval` |
