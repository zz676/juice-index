# Scheduling Posts

## Overview

Users can schedule posts to be published automatically at a future date and time. Scheduling is available from two places:

1. **Studio Publish Modal** — After generating a post in the AI Studio, click "Schedule For Later" to pick a date/time instead of publishing immediately.
2. **Posts Page Compose Panel** — The compose panel on the Posts page includes date/time inputs and a "Schedule" button for PRO users.

Scheduling requires a **PRO subscription**.

## Post Lifecycle

```
DRAFT → SCHEDULED → PUBLISHING → PUBLISHED
                                 ↘ FAILED
```

| Status | Description |
|--------|-------------|
| **DRAFT** | Post saved but not queued for publishing. Can be edited, published, scheduled, or deleted. |
| **SCHEDULED** | Post queued for automatic publishing at `scheduledFor` datetime. Can be edited, rescheduled, cancelled back to DRAFT, or deleted. |
| **PUBLISHING** | Post is currently being published by the cron job. No actions available (spinner shown). |
| **PUBLISHED** | Post successfully published to X. A `tweetUrl` link is available to view it. |
| **FAILED** | Publishing failed after one or more attempts. `lastError` and `attempts` are available. Can be retried, edited, or deleted. |

## Scheduling from Studio

1. Generate a post in the AI Studio workflow (query → chart → draft).
2. **Edit the draft** — the generated text appears in an editable textarea. Adjust wording, length, or tone as needed. A live character counter shows `current/limit` with color warnings (yellow at 90%, red when over).
3. Click the **Publish** button to open the Publish Modal.
4. Click **"Schedule For Later"** — this reveals a date and time picker.
5. Select a future date and time.
6. Click **"Confirm Schedule"** — the post is created with status `SCHEDULED`.
7. A success toast confirms the scheduled date/time.

The modal validates that:
- Both date and time are provided
- The datetime is in the future
- The post content is within the character limit (280 for free X accounts, 25,000 for X Premium)

## Scheduling from Posts Page

1. Click **"Compose"** on the Posts page.
2. Write your post content.
3. Select a date and time using the date/time inputs.
4. Click **"Schedule"** — the post is created with status `SCHEDULED`.

## Editing Scheduled Posts

Scheduled posts can be edited directly without cancelling them first:

1. Find the SCHEDULED post in the table.
2. Click the **edit** (pencil) icon button in the Actions column.
3. The compose panel opens with the post content pre-filled and the existing schedule date/time pre-populated.
4. Modify the content and/or adjust the schedule date/time.
5. Click **"Schedule"** to save content changes and keep (or update) the scheduled time.
6. Alternatively, click **"Save Draft"** to move the post back to DRAFT status.

The PATCH endpoint accepts `{ content, action: "schedule", scheduledFor }` for SCHEDULED posts, so content and schedule time can be updated in a single request.

## Rescheduling

Scheduled posts can have their publish time changed:

### From Posts Page
1. Find the SCHEDULED post in the table.
2. Click the **schedule** (clock) icon button in the Actions column.
3. An inline reschedule panel appears with date/time inputs.
4. Pick a new future date/time and click **"Confirm"**.
5. The post's `scheduledFor` is updated via `PATCH /api/dashboard/user-posts/[id]` with `action: "schedule"`.

### Backend Rules for SCHEDULED Posts
- `action: "schedule"` — reschedule to a new future datetime
- `action: "draft"` — cancel scheduling and revert to DRAFT status
- `action: "publish"` — blocked to prevent double-publishing race conditions

## Cancellation

To cancel a scheduled post:
1. Click the **cancel** icon on a SCHEDULED post row.
2. This calls `POST /api/dashboard/user-posts/[id]/cancel`, which reverts the post to DRAFT status.
3. The post can then be edited, rescheduled, or deleted.

## Posts Page Features

### Summary Stats Bar
Four compact stat cards displayed below the page header:
- **Total** — count of all posts
- **Scheduled** — count of SCHEDULED posts (purple accent)
- **Published** — count of PUBLISHED posts (green accent)
- **Failed** — count of FAILED posts (red accent, only shown if > 0)

### Enhanced Table Columns
| Column | Description |
|--------|-------------|
| **Content** | Truncated post text with expand/collapse chevron. Shows character count badge. |
| **Status** | Color-coded status badge. |
| **Date** | Context-aware: shows scheduled datetime with relative time for SCHEDULED, published datetime with relative time for PUBLISHED, or creation date for others. |
| **X Post** | X icon link to the published tweet (for PUBLISHED posts with `tweetUrl`). Dash for others. |
| **Actions** | Status-specific action buttons (edit, publish, schedule, reschedule, cancel, delete, retry). |

### Expandable Post Rows
Click on the content cell to expand/collapse:
- **Expanded view** shows full post content (no truncation), all relevant dates (created, scheduled, published), and error details with attempt count for FAILED posts.

### Contextual Empty States
Each status tab shows a unique empty state message:
- **All**: "No posts yet. Compose your first post above."
- **Draft**: "No drafts. Create posts in Juice AI Studio or compose one here."
- **Scheduled**: "No scheduled posts. Schedule posts to publish automatically."
- **Published**: "No published posts yet. Publish your first post to X!"
- **Failed**: "No failed posts — Everything is working!"

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/dashboard/user-posts` | Create a new post (with `action: "schedule"` and `scheduledFor`) |
| `PATCH` | `/api/dashboard/user-posts/[id]` | Update/reschedule a post |
| `POST` | `/api/dashboard/user-posts/[id]/cancel` | Cancel a scheduled post back to DRAFT |
| `DELETE` | `/api/dashboard/user-posts/[id]` | Delete a post (not allowed for PUBLISHED or PUBLISHING) |

## Cron Job

A background cron job periodically checks for SCHEDULED posts where `scheduledFor <= now` and publishes them via the X API. Posts transition through PUBLISHING to either PUBLISHED or FAILED.
