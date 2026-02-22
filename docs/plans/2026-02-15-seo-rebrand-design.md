# SEO Infrastructure + Global EV Rebrand Design

**Date:** 2026-02-15
**Domain:** juiceindex.io

## Goal

Add comprehensive SEO infrastructure and rebrand the site from "China EV" to global "EV" market intelligence. Two phases, two PRs.

---

## Phase 1: SEO Infrastructure

### 1.1 Root Metadata (`src/app/layout.tsx`)

- Title template: `"%s | Juice Index"` with default `"Juice Index — EV Market Intelligence"`
- Description: global EV positioning
- Open Graph tags: title, description, image, site name, type, url
- Twitter Card tags: `summary_large_image`, title, description, image
- Canonical URL: `https://juiceindex.io`
- Robots: `index, follow`
- `metadataBase`: `new URL("https://juiceindex.io")`

### 1.2 Static Files (Next.js App Router)

- `src/app/robots.ts` — allows all crawlers, points to sitemap
- `src/app/sitemap.ts` — includes `/`, `/login`, `/docs`; excludes dashboard/auth routes

### 1.3 JSON-LD Structured Data

Add `SoftwareApplication` + `Organization` schema to landing page (`src/app/page.tsx`) via `<script type="application/ld+json">`.

### 1.4 Per-Page Metadata

- `/login/page.tsx` — `"Sign In | Juice Index"`
- `/docs/page.tsx` — `"API Documentation | Juice Index"`

---

## Phase 2: Global EV Rebrand

### 2.1 Files to update (marketing/positioning text)

| File | Change |
|------|--------|
| `src/app/layout.tsx` | "China EV Market Intelligence" -> "EV Market Intelligence" |
| `src/app/layout.tsx` | "China's electric vehicle market" -> "the global electric vehicle market" |
| `src/app/page.tsx` hero h1 | "China's EV market" -> "the EV market" |
| `src/app/page.tsx` hero subtitle | "the world's fastest-growing auto sector" -> "the world's fastest-growing industry" |
| `src/app/page.tsx` features intro | "the Chinese EV ecosystem" -> "the global EV ecosystem" |
| `src/app/page.tsx` Production feature | "50+ OEMs including BYD, Tesla China, and NIO" -> "50+ OEMs including BYD, Tesla, and NIO" |
| `src/app/page.tsx` coverage section | "China's electric vehicle market" -> "the global electric vehicle market" |
| `src/app/page.tsx` CTA | "the Chinese EV revolution" -> "the global EV revolution" |
| `src/app/page.tsx` footer tagline | "the world's most complex automotive market" -> "the world's most dynamic automotive market" |
| `src/app/api/openapi.json/route.ts` | "China battery installation" -> "Battery installation" |
| `src/app/dashboard/studio/page.tsx` | Remove "China" from sample query strings |

### 2.2 Files NOT changed (data names, not marketing)

- Brand entity names: "Tesla China" in `brands/route.ts`, `delivery-chart/route.ts`, `notification-prefs.tsx`, `search/route.ts`
- Database table names: `ChinaPassengerInventory` etc. in `sql-preview.ts`
- Seed notification messages referencing real events
- Chinese language option in notification preferences
