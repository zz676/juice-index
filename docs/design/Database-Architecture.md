# Database Architecture & Schema Strategy

This document outlines the database strategy for **Juice Index**, specifically how it shares a database with the **EV Platform** project while maintaining isolation for application-specific data.

## 1. Core Principles

-   **Shared Database**: Both projects connect to the same PostgreSQL database.
-   **Shared Data** (✅ Synced): Industry data (EV metrics, specs, news) is shared and accessible by both apps.
-   **Isolated Auth** (🔒 Separated): User accounts, sessions, and app settings are strictly separated to allow independent development.
-   **Safety First**: We use a "Legacy Model" pattern to prevent Prisma from accidentally deleting tables used by the other project.

---

## 2. Table Categorization

### A. Shared Tables (Data & Content)
*These tables are defined identically in both projects. Changes here must be synced manually to `ev-platform`'s schema.*

**Industry Data:**
-   `EVMetric` / `EVMetricSource`
-   `VehicleSpec` / `VehicleSpecSource`
-   `ChinaPassengerInventory`, `ChinaBatteryInstallation`, `CaamNevSales`, `ChinaDealerInventoryFactor`
-   `CpcaNevRetail`, `CpcaNevProduction`, `ChinaViaIndex`
-   `BatteryMakerMonthly`, `PlantExports`, `NevSalesSummary`
-   `AutomakerRankings`, `BatteryMakerRankings`, `NioPowerSnapshot`
-   `ScrapedArticle`

**News & Posts:**
-   `Post`
-   `PostContent`
-   `PostTranslation`
-   `PostArchive`

### B. Juice Index Tables (App Specific)
*These tables are unique to Juice Index and use the `juice_` prefix in the database. You can modify these freely.*

**User & Auth:**
-   `User` → `juice_users`
-   `Account` → `juice_accounts`
-   `Session` → `juice_sessions`
-   `MagicLink` → `juice_magic_links`
-   `XAccount` → `juice_x_accounts`

**App Features:**
-   `ApiSubscription` → `juice_api_subscriptions`
-   `UserPreference` → `juice_user_preferences`
-   `SavedPost` → `juice_saved_posts`
-   `Subscriber` → `juice_subscribers`
-   `AIUsage` → `juice_ai_usage`
-   `MetricPost` → `juice_metric_posts`
-   `XPublication` → `juice_x_publications`
-   `PostingLog` → `juice_posting_logs`
-   `DigestContent` → `juice_digest_content`
-   `EmailNotification` / `EmailEvent` → `juice_email_notifications` / `juice_email_events`

---

## 3. The "Legacy Model" Protection Strategy

To prevent Prisma from deleting the original tables used by `ev-platform` (e.g., the original `User` table), we include "Legacy" models in our `schema.prisma`.

**How it works:**
1.  **Model Name**: We prefix the model with `Legacy` (e.g., `LegacyUser`).
2.  **`@@map`**: We map it to the *existing* table name (e.g., `@@map("User")`). This tells Prisma "This table exists and is part of my schema, don't drop it."
3.  **`@@ignore`**: We ignore the model in the client generation. This keeps your generic `prisma.user` clean and pointing to the *new* `juice_users` table.

**Example:**
```prisma
// 1. The Real User Model (Juice Index)
model User {
  id    String @id
  email String @unique
  // ...
  @@map("juice_users") // <--- Creates/Uses 'juice_users' table
}

// 2. The Legacy User Model (EV Platform Protection)
model LegacyUser {
  id    String @id
  // ... fields matching the original table ...
  @@map("User")     // <--- Points to 'User' table (Prevents Deletion)
  @@ignore          // <--- Hides from Client SDK
}
```

## 4. Maintenance Guide

### When adding a new feature to Juice Index:
-   Just add a new model.
-   If it's for internal app usage, add `@@map("juice_new_feature")` to keep it namespaced.

### When modifying Shared Data (e.g. `EVMetric`):
-   Update the model in `juice-index/prisma/schema.prisma`.
-   **Critical**: Copy the same change to `ev-platform/prisma/schema.prisma` so the other app knows about the new column.

### When dealing with Auth/Users:
-   Modify the `User` model freely. It only affects `juice_users`.
-   **Do not** modify `LegacyUser` unless the `ev-platform` schema changes significantly (renaming columns), but generally, you can leave it alone as a placeholder.
