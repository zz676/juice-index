# Landing Page Redesign

## Overview

Full redesign of the landing page (`src/app/page.tsx`) from a monolithic client component to a server component with client component islands.

## Architecture

### Before
- Single `"use client"` component with `mounted` state guard causing hydration flash
- All sections in one file
- No mobile hamburger menu
- No animations despite Framer Motion being available

### After
- **Server component** (`page.tsx`) for SEO/LCP and zero hydration flash
- **Client component islands** for interactivity:
  - `Navbar.tsx` — responsive nav with mobile hamburger menu (Framer Motion `AnimatePresence`)
  - `HeroViz.tsx` — animated typewriter + chart visualization with looping queries
  - `AnimatedSection.tsx` — reusable scroll-triggered fade-in (Framer Motion `useInView`)
  - `PricingToggle.tsx` — monthly/annual pricing switch
  - `CountUp.tsx` — scroll-triggered number count-up animation

## Page Sections

1. **Navbar** — Fixed, backdrop blur, `h-16`, real `logo.png` via `next/image`, desktop/mobile responsive
2. **Hero** — Two-column layout (desktop), badge, headline, subtitle, two CTAs, animated data viz
3. **Features Grid** — 4-column grid with scroll-triggered fade-up animations
4. **How It Works** — 3 horizontal steps with dashed connector lines (desktop)
5. **Pricing Preview** — 3-tier cards with monthly/annual toggle, links to `/pricing`
6. **Data Coverage** — Dark section with animated count-up stats and category pills
7. **Final CTA** — Light background, two CTA buttons (replaces non-functional email form)
8. **Footer** — Real `logo.png`, fixed dead links, dynamic copyright year

## Design Decisions

- **Aesthetic**: Modern SaaS (Linear/Vercel/Stripe style) — light, airy, generous whitespace
- **Audience**: Broad (investors, strategists, researchers)
- **Core product**: Data Explorer (AI-powered querying), not raw API
- **Social proof**: Removed entirely (was fake placeholder)
- **Hero visual**: Animated data visualization showing live query demo with typewriter effect

## Stale Content Fixed

| Issue | Fix |
|-------|-----|
| "Live Data 2024 Q1" badge | "Live Data — Updated Daily" |
| Copyright 2024 | `{new Date().getFullYear()}` |
| Dead `#` links | Point to real routes (`/docs`, `/privacy`, `/terms`, `mailto:`) |
| CTA email form (non-functional) | Replaced with Link buttons to signup |
| Social proof section | Removed entirely |
| Navbar "J" square | `next/image` with `logo.png` |
| Layout metadata "for developers" | Updated to reflect Data Explorer product |

## Files

### New
- `src/components/landing/Navbar.tsx`
- `src/components/landing/HeroViz.tsx`
- `src/components/landing/AnimatedSection.tsx`
- `src/components/landing/PricingToggle.tsx`
- `src/components/landing/CountUp.tsx`

### Modified
- `src/app/page.tsx` — Full rewrite (server component)
- `src/app/layout.tsx` — Updated metadata description
