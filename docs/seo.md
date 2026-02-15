# SEO Infrastructure

## Overview

Juice Index uses Next.js App Router conventions for SEO. All SEO configuration lives in `src/app/`.

## Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root metadata: title template, Open Graph, Twitter Cards, canonical URL, robots |
| `src/app/robots.ts` | Generates `/robots.txt` — allows all crawlers, points to sitemap |
| `src/app/sitemap.ts` | Generates `/sitemap.xml` — lists public pages (excludes dashboard) |
| `src/app/page.tsx` | JSON-LD structured data (Organization + SoftwareApplication schemas) |
| `src/app/docs/page.tsx` | Per-page metadata for API docs |
| `src/app/login/layout.tsx` | Per-page metadata for login (via layout wrapper since page is a client component) |

## Adding Metadata to New Pages

Use the title template system. Export a `metadata` object from your page:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Title", // Renders as "Page Title | Juice Index"
  description: "Page description for search engines.",
};
```

If the page is a client component (`"use client"`), create a `layout.tsx` in the same directory and export metadata from there instead.

## Domain

All SEO URLs reference `https://juiceindex.io`. This is hardcoded in:
- `layout.tsx` (metadataBase, OG url, canonical)
- `robots.ts` (sitemap URL)
- `sitemap.ts` (BASE_URL constant)
- `page.tsx` (JSON-LD urls)

## Testing

Tests for robots and sitemap live in `src/app/__tests__/`:
- `robots.test.ts` — verifies crawl rules and sitemap URL
- `sitemap.test.ts` — verifies page entries, priorities, and dashboard exclusion

Run: `npx vitest run src/app/__tests__/`

## Global EV Rebrand

The site was rebranded from "China EV" to global "EV" market intelligence. All user-facing marketing text was updated:

- Landing page hero, features, coverage, CTA, footer
- OpenAPI spec summaries
- Studio sample query strings

**Intentionally unchanged:**
- Brand entity names (e.g., "Tesla China") — these are actual data entities
- Database table names (e.g., `ChinaPassengerInventory`) — these are schema references
- Seed notification messages referencing real events
- Chinese language option in notification preferences
