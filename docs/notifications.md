# In-App Notification System

## Overview

The notification system provides an in-app notification feed accessible from the bell icon in the dashboard header. Users see a dropdown panel with their recent notifications, unread indicators, and can mark items as read.

## Data Model

### NotificationType Enum

| Value | Description |
|-------|-------------|
| `DIGEST_READY` | A content digest has been generated |
| `ALERT` | A trending topic or price alert |
| `WELCOME` | Onboarding welcome message |
| `SYSTEM` | System-level notifications (post published, etc.) |

### Notification Table (`juice_notifications`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (cuid) | Primary key |
| `userId` | String | Foreign key to User |
| `type` | NotificationType | Category of notification |
| `title` | String | Short headline |
| `message` | String | Longer description |
| `link` | String? | Optional navigation target |
| `read` | Boolean | Read status (default: false) |
| `createdAt` | DateTime | Timestamp |

Indexes: `[userId, createdAt DESC]` for feed queries, `[userId, read]` for unread counts.

## API Endpoints

### GET `/api/dashboard/notifications`

Fetch paginated notifications for the authenticated user.

**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 50)

**Response:**
```json
{
  "notifications": [...],
  "pagination": { "page": 1, "limit": 20, "total": 6, "totalPages": 1 },
  "unreadCount": 3
}
```

### PATCH `/api/dashboard/notifications`

Mark notifications as read.

**Body (mark specific):**
```json
{ "ids": ["clxyz123", "clxyz456"] }
```

**Body (mark all):**
```json
{ "all": true }
```

**Response:**
```json
{ "success": true, "unreadCount": 0 }
```

### POST `/api/dashboard/notifications/seed`

Temporary endpoint to create sample notifications for the current user. Creates 6 notifications with realistic China EV content across all notification types.

## Component: NotificationBell

Located at `src/components/dashboard/NotificationBell.tsx`. Client component that renders:

- Bell icon button with conditional green dot for unread notifications
- Dropdown panel with notification list (max 400px height, scrollable)
- Each notification shows a type-specific icon, title, message preview, and relative timestamp
- "Mark all as read" button in the header
- Click-outside-to-close behavior
- Clicking a notification marks it as read and navigates to its link

## Extending with Real Triggers

To create notifications from other parts of the system, use Prisma directly:

```ts
import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

await prisma.notification.create({
  data: {
    userId: "user-id",
    type: NotificationType.DIGEST_READY,
    title: "Your digest is ready",
    message: "5 new articles about BYD and Tesla.",
    link: "/dashboard/posts",
  },
});
```

Planned trigger points (not yet wired):
- Digest generation completion -> `DIGEST_READY`
- Alert threshold crossed -> `ALERT`
- User sign-up -> `WELCOME`
- Scheduled post published -> `SYSTEM`
