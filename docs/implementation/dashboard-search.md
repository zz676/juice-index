# Dashboard Search

## Overview

Global search functionality in the dashboard header that allows users to search across news posts and EV brands. Results appear in a dropdown overlay with keyboard navigation support.

## Architecture

### API Endpoint

**`GET /api/dashboard/search?q=<term>`**

- Requires a minimum 2-character query; returns empty results otherwise
- Searches two categories in parallel:
  - **News**: Prisma `post.findMany` with case-insensitive `contains` across `translatedTitle`, `originalTitle`, and `translatedSummary`. Filtered to `status: "PUBLISHED"`, limited to 8 results, ordered by `createdAt desc`.
  - **Brands**: In-memory filter of the `Brand` enum using the `BRAND_LABELS` map, excluding `OTHER_BRAND` and `INDUSTRY`.
- No explicit auth — relies on the existing Supabase middleware (same pattern as `/api/dashboard/feed`).

**Response shape:**
```json
{
  "news": [
    {
      "id": "...",
      "title": "...",
      "summary": "...",
      "sourceUrl": "...",
      "time": "...",
      "category": "..."
    }
  ],
  "brands": [
    { "code": "BYD", "label": "BYD" }
  ]
}
```

### SearchOverlay Component

`src/components/dashboard/SearchOverlay.tsx` — a self-contained client component that replaces the static search input in the dashboard layout header.

**Features:**
- 300ms debounced fetch to `/api/dashboard/search`
- `Cmd+K` / `Ctrl+K` keyboard shortcut to focus the input (shown as a badge hint)
- Dropdown results panel with **Brands** and **News** sections
- Loading skeleton state (animate-pulse)
- Empty state when no results found
- Click-outside-to-close
- Keyboard navigation: Arrow keys to move, Enter to select, Escape to close

**Result click behavior:**
- **News**: Opens `sourceUrl` in a new tab
- **Brands**: Navigates to `/dashboard/studio?prompt=Show {brand} monthly deliveries for 2024`

### Studio Prompt Pre-fill

`src/app/dashboard/studio/page.tsx` reads an optional `prompt` query parameter from the URL on mount. If present and the prompt state is empty, it sets the prompt. This enables brand search results to deep-link into Studio with a pre-filled query.

## Files

| File | Purpose |
|------|---------|
| `src/app/api/dashboard/search/route.ts` | Search API endpoint |
| `src/components/dashboard/SearchOverlay.tsx` | Search UI component |
| `src/app/dashboard/layout.tsx` | Dashboard layout (imports SearchOverlay) |
| `src/app/dashboard/studio/page.tsx` | Studio page (reads `prompt` URL param) |
