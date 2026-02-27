# Chart Styles — Design

**Date:** 2026-02-27
**Status:** Approved

## Overview

Allow users to save their current chart customization settings as a named style, build a personal library of styles, and apply any saved style from the Studio chart editor. Styles can also be renamed or deleted from the Dashboard Settings page.

## Data Model

New Prisma model `UserChartStyle`, following the established pattern of `UserTone` and `UserImageStyle`:

```prisma
model UserChartStyle {
  id        String   @id @default(cuid())
  userId    String
  name      String
  config    Json     // full ChartConfig object
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  User      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId])
  @@map("juice_user_chart_styles")
}
```

- The `config` field stores the complete `ChartConfig` shape (same as `DEFAULT_CHART_CONFIG`).
- The `User` model receives a `userChartStyles UserChartStyle[]` relation field.
- No default styles are seeded — users build their own library from the Studio.

## API Routes

### `src/app/api/dashboard/studio/chart-styles/route.ts`

| Method | Body | Behaviour |
|--------|------|-----------|
| `GET` | — | Return all styles for the current user, ordered by `createdAt asc` |
| `POST` | `{ name, config }` | Create a new style; 409 if name already exists for user |

### `src/app/api/dashboard/studio/chart-styles/[id]/route.ts`

| Method | Body | Behaviour |
|--------|------|-----------|
| `PUT` | `{ name?, config? }` | Update name and/or config; 409 on name conflict |
| `DELETE` | — | Delete the style; 404 if not found or not owned by user |

Both routes use `requireUser()` for authentication.

## Studio UI — ChartCustomizer "Styles" Tab

A new **Styles** tab (icon: `bookmarks`) is added to the `ChartCustomizer` sidebar after the existing tabs.

**Tab contents:**

```
SAVED STYLES
┌─────────────────────────┐
│ My Dark Theme        ▾  │   ← select dropdown
└─────────────────────────┘
[Apply]  [Delete]

─────────────────────────────
SAVE CURRENT AS
┌─────────────────────────┐
│ Style name...           │
└─────────────────────────┘
[Save Style]
```

- **Dropdown** lists saved styles by name. Shows "No saved styles yet" placeholder when empty.
- **Apply** replaces the live `ChartConfig` with the selected style's config.
- **Delete** removes the selected style after an inline confirmation step.
- **Save current as** — text input + "Save Style" button — POSTs the current `ChartConfig` as a new named style.
- Styles are fetched when the Customizer opens and re-fetched after save/delete.

## Settings Page — Chart Styles Section

A **Chart Styles** section is added to the Dashboard Settings page.

```
Chart Styles
─────────────────────────────────────────────
  My Dark Theme          [Rename] [Delete]
  Corporate Blue         [Rename] [Delete]
  Minimal Light          [Rename] [Delete]
─────────────────────────────────────────────
```

- Each row shows the style name with **Rename** (inline text edit → PUT) and **Delete** (confirm → DELETE) actions.
- When empty, shows: *"Save your first style from the Studio chart customizer."*
- No config editing or creation here — Settings is for organization only.

## File Checklist

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `UserChartStyle` model; add relation to `User` |
| `src/app/api/dashboard/studio/chart-styles/route.ts` | New — GET + POST |
| `src/app/api/dashboard/studio/chart-styles/[id]/route.ts` | New — PUT + DELETE |
| `src/components/explorer/ChartCustomizer.tsx` | Add Styles tab with apply/save/delete UI |
| `src/app/dashboard/settings/page.tsx` (or equivalent) | Add Chart Styles management section |
