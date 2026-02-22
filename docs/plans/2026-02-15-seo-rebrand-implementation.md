# SEO Infrastructure + Global EV Rebrand — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive SEO infrastructure (robots.txt, sitemap, Open Graph, JSON-LD, per-page metadata) and rebrand all user-facing text from "China EV" to global "EV" market intelligence.

**Architecture:** Two-phase approach. Phase 1 adds SEO infrastructure using Next.js App Router conventions (metadata API, `robots.ts`, `sitemap.ts`, JSON-LD script tags). Phase 2 does a text sweep across landing page, API docs, and studio to replace China-specific positioning with global EV branding. Each phase gets its own feature branch and PR.

**Tech Stack:** Next.js 15 App Router metadata API, TypeScript

---

## Phase 1: SEO Infrastructure

### Task 1: Create feature branch for SEO

**Step 1: Create and switch to feature branch**

Run: `git checkout -b seo/add-seo-infrastructure`

**Step 2: Verify branch**

Run: `git branch --show-current`
Expected: `seo/add-seo-infrastructure`

---

### Task 2: Add root metadata with Open Graph and Twitter Cards

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update the metadata export in `src/app/layout.tsx`**

Replace the existing `metadata` export (lines 5-9) with:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL("https://juiceindex.io"),
  title: {
    default: "Juice Index — EV Market Intelligence",
    template: "%s | Juice Index",
  },
  description:
    "AI-powered data intelligence on the global electric vehicle market. Production, insurance registrations, battery supply chain, and market analytics updated daily.",
  openGraph: {
    title: "Juice Index — EV Market Intelligence",
    description:
      "AI-powered data intelligence on the global electric vehicle market. Production, insurance registrations, battery supply chain, and market analytics updated daily.",
    url: "https://juiceindex.io",
    siteName: "Juice Index",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Juice Index — EV Market Intelligence",
    description:
      "AI-powered data intelligence on the global electric vehicle market.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://juiceindex.io",
  },
};
```

**Step 2: Verify the app builds**

Run: `npx next build 2>&1 | tail -5` (just check it doesn't error — full build not needed, lint check is fine too)

Alternatively run: `npx next lint`

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(seo): add Open Graph, Twitter Card, and canonical URL metadata"
```

---

### Task 3: Create `robots.ts`

**Files:**
- Create: `src/app/robots.ts`

**Step 1: Write the test**

Create `src/app/__tests__/robots.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import robots from "../robots";

describe("robots", () => {
  it("returns rules allowing all user agents", () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: "*", allow: "/" });
  });

  it("includes sitemap URL", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://juiceindex.io/sitemap.xml");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/__tests__/robots.test.ts`
Expected: FAIL (module not found)

**Step 3: Write `src/app/robots.ts`**

```typescript
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://juiceindex.io/sitemap.xml",
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/__tests__/robots.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/robots.ts src/app/__tests__/robots.test.ts
git commit -m "feat(seo): add robots.ts for search engine crawling rules"
```

---

### Task 4: Create `sitemap.ts`

**Files:**
- Create: `src/app/sitemap.ts`

**Step 1: Write the test**

Create `src/app/__tests__/sitemap.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import sitemap from "../sitemap";

describe("sitemap", () => {
  it("returns an array of URL entries", () => {
    const result = sitemap();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes the homepage with highest priority", () => {
    const result = sitemap();
    const home = result.find((e) => e.url === "https://juiceindex.io");
    expect(home).toBeDefined();
    expect(home!.priority).toBe(1.0);
  });

  it("includes /docs and /login pages", () => {
    const result = sitemap();
    const urls = result.map((e) => e.url);
    expect(urls).toContain("https://juiceindex.io/docs");
    expect(urls).toContain("https://juiceindex.io/login");
  });

  it("does not include dashboard routes", () => {
    const result = sitemap();
    const urls = result.map((e) => e.url);
    const dashboardUrls = urls.filter((u) => u.includes("/dashboard"));
    expect(dashboardUrls).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/__tests__/sitemap.test.ts`
Expected: FAIL

**Step 3: Write `src/app/sitemap.ts`**

```typescript
import type { MetadataRoute } from "next";

const BASE_URL = "https://juiceindex.io";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/__tests__/sitemap.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/sitemap.ts src/app/__tests__/sitemap.test.ts
git commit -m "feat(seo): add sitemap.ts with public page entries"
```

---

### Task 5: Add JSON-LD structured data to landing page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add JSON-LD script to the landing page component**

At the top of the `<div>` returned by `LandingPage()` (before `<Navbar />`), insert:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Juice Index",
          url: "https://juiceindex.io",
          logo: "https://juiceindex.io/logo.png",
          description:
            "AI-powered EV market intelligence platform providing production data, insurance registrations, battery supply chain analytics, and market insights.",
        },
        {
          "@type": "SoftwareApplication",
          name: "Juice Index",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: "https://juiceindex.io",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          description:
            "AI-powered data intelligence on the global electric vehicle market.",
        },
      ],
    }),
  }}
/>
```

**Step 2: Verify the app lints clean**

Run: `npx next lint`
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(seo): add JSON-LD structured data to landing page"
```

---

### Task 6: Add per-page metadata to /login and /docs

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/docs/page.tsx`

**Step 1: Add metadata to `/docs/page.tsx`**

Add at the top of the file (before the default export):

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "Explore the Juice Index REST API. Access EV production data, insurance registrations, battery supply chain metrics, and market analytics.",
};
```

Note: The title template in the root layout will render this as "API Documentation | Juice Index".

**Step 2: Add metadata to `/login/page.tsx`**

The login page is a client component (`"use client"`), so we cannot add a `metadata` export directly. Instead, create a wrapper layout or use `generateMetadata` in a parent. The simplest approach: create `src/app/login/layout.tsx`:

```typescript
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Juice Index to access EV market data, AI-powered analytics, and API tools.",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
```

**Step 3: Verify lint passes**

Run: `npx next lint`
Expected: no errors

**Step 4: Commit**

```bash
git add src/app/docs/page.tsx src/app/login/layout.tsx
git commit -m "feat(seo): add per-page metadata to /docs and /login"
```

---

### Task 7: Update docs and create Phase 1 PR

**Files:**
- Modify or create: `docs/seo.md`

**Step 1: Create `docs/seo.md` documenting the SEO setup**

Write a brief doc explaining:
- What SEO files exist (`robots.ts`, `sitemap.ts`, metadata in `layout.tsx`)
- How to add metadata to new pages (use the title template)
- JSON-LD structured data location

**Step 2: Commit the doc**

```bash
git add docs/seo.md
git commit -m "docs: add SEO infrastructure documentation"
```

**Step 3: Push branch and create PR**

```bash
git push -u origin seo/add-seo-infrastructure
```

Create PR with:
- Title: "Add SEO infrastructure (robots, sitemap, OG tags, JSON-LD)"
- Summary: References `docs/seo.md` and `docs/plans/2026-02-15-seo-rebrand-design.md`
- Test plan: vitest tests for robots.ts and sitemap.ts, `next lint` clean, visual verification of meta tags via browser devtools

---

## Phase 2: Global EV Rebrand

### Task 8: Create feature branch for rebrand

**Step 1: Switch to main and pull**

Run: `git checkout main && git pull`

**Step 2: Create rebrand branch**

Run: `git checkout -b rebrand/global-ev`

---

### Task 9: Rebrand landing page text

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Make the following text replacements in `src/app/page.tsx`**

| Line | Old | New |
|------|-----|-----|
| 15 | `"Track factory output across 50+ OEMs including BYD, Tesla China, and NIO. Monitor capacity utilization in real-time."` | `"Track factory output across 50+ OEMs including BYD, Tesla, and NIO. Monitor capacity utilization in real-time."` |
| 107 | `China&apos;s EV market` | `the EV market` |
| 153 | `the Chinese EV ecosystem` | `the global EV ecosystem` |
| 114 | `the world&apos;s fastest-growing auto sector` | `the world&apos;s fastest-growing industry` |
| 249 | `China&apos;s electric vehicle market` | `the global electric vehicle market` |
| 299 | `the Chinese EV revolution` | `the global EV revolution` |
| 346 | `the world&apos;s most complex automotive market` | `the world&apos;s most dynamic automotive market` |

**Step 2: Verify lint passes**

Run: `npx next lint`

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "rebrand: update landing page copy from China EV to global EV"
```

---

### Task 10: Rebrand OpenAPI spec and studio samples

**Files:**
- Modify: `src/app/api/openapi.json/route.ts`
- Modify: `src/app/dashboard/studio/page.tsx`

**Step 1: Update OpenAPI spec**

In `src/app/api/openapi.json/route.ts` line 49, change:
- `"China battery installation"` → `"Battery installation"`

**Step 2: Update studio sample queries**

In `src/app/dashboard/studio/page.tsx` lines 157-158, change:
- `"China dealer inventory factor by month 2024"` → `"Dealer inventory factor by month 2024"`
- `"China passenger vehicle inventory levels 2024"` → `"Passenger vehicle inventory levels 2024"`

**Step 3: Verify lint passes**

Run: `npx next lint`

**Step 4: Commit**

```bash
git add src/app/api/openapi.json/route.ts src/app/dashboard/studio/page.tsx
git commit -m "rebrand: remove China-specific references from API docs and studio"
```

---

### Task 11: Update docs and create Phase 2 PR

**Step 1: Update `docs/seo.md` to note the rebrand**

Add a section noting that the site was rebranded from "China EV" to global "EV" positioning, and that brand entity names (e.g., "Tesla China") and database table names were intentionally left unchanged.

**Step 2: Commit**

```bash
git add docs/seo.md
git commit -m "docs: document global EV rebrand decisions"
```

**Step 3: Push branch and create PR**

```bash
git push -u origin rebrand/global-ev
```

Create PR with:
- Title: "Rebrand from China EV to global EV positioning"
- Summary: References the design doc. Lists all changed files with explanations.
- Test plan: `next lint` clean, visual review of landing page copy, verify OpenAPI spec at `/docs`

---

## Verification Checklist

After both PRs are merged:

- [ ] `https://juiceindex.io/robots.txt` returns valid robots file
- [ ] `https://juiceindex.io/sitemap.xml` returns valid sitemap
- [ ] Landing page source contains Open Graph meta tags
- [ ] Landing page source contains Twitter Card meta tags
- [ ] Landing page source contains JSON-LD structured data
- [ ] `/docs` page title shows "API Documentation | Juice Index"
- [ ] `/login` page title shows "Sign In | Juice Index"
- [ ] No references to "China" in any marketing/positioning text
- [ ] Brand entity names "Tesla China" still present in data routes
- [ ] Google Rich Results Test passes for structured data
