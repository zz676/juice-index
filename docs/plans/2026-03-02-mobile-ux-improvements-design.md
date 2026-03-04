# Mobile UX Improvements Design

**Date:** 2026-03-02

## Overview

Make the dashboard usable on mobile phones. The sidebar is currently always visible and takes up significant width on small screens. This design adds a fixed bottom tab bar for mobile navigation, hides the sidebar below `md` breakpoint, and fixes padding/layout issues that cause content to be obscured by the bottom bar.

---

## 1. Dashboard Layout (`src/app/dashboard/layout.tsx`)

### Sidebar
- Add `hidden md:flex` to the `<aside>` so it disappears entirely on screens narrower than 768px.

### Mobile header (non-studio pages)
- On mobile (`md:hidden`) the header currently shows only the centered search bar and right-side notification bell — no logo.
- Add a Juice Index logo link on the left side of the header, visible only on mobile (`flex md:hidden`), since the sidebar (which normally hosts the logo) is hidden.

### Content wrapper
- The page content `<div>` currently has `p-8 pt-0 pb-0`. Add `pb-16 md:pb-0` so content clears the fixed 64px bottom nav on mobile.

### Bottom tab bar
- New `<nav>` element: `fixed bottom-0 left-0 right-0 h-16 flex md:hidden z-30`
- Background: same lime-green gradient as the sidebar.
- Iterates `finalNavItems` (all items including admin extras, scrollable via `overflow-x-auto`).
- Each item: icon + short label, `flex-col items-center justify-center`, active state with `text-primary`.
- Border top: `border-t border-green-100`.

---

## 2. Engagement Page Tabs (`src/app/dashboard/engagement/page.tsx`)

- Wrap the `<nav>` in a `<div className="overflow-x-auto">`.
- Add `whitespace-nowrap` to the `<nav>`.
- Shorten tab labels for mobile using responsive classes or a label map:
  - "Monitored Accounts" → "Accounts"
  - "Reply Monitoring" → "Replies"
  - "Account Analytics" → "Analytics"
  - "Tone Settings" → "Tones"
  - "Settings" → "Settings" (unchanged)
- Desktop keeps full labels; a simple approach is to always use short labels since they're clear enough at all sizes.

---

## 3. Studio Page (`src/app/dashboard/studio/page.tsx`)

### Header
- `px-6` → `px-4 md:px-6` for comfortable spacing on small phones.

### Main content
- `pb-5` → `pb-20 md:pb-5` to clear the mobile bottom nav bar.

### Examples category grid
- `grid-cols-3` → `grid-cols-2 sm:grid-cols-3` so 6 categories fit in 2 rows of 3 on phones instead of scrolling off-screen.

---

## 4. Overview Page

No structural changes needed — the stat card grid already uses `sm:grid-cols-2 lg:grid-cols-4` and the news/catalysts section uses `lg:grid-cols-2`. Bottom nav clearance is handled by the layout wrapper `pb-16` change.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/dashboard/layout.tsx` | Hide sidebar on mobile, add logo to mobile header, add `pb-16 md:pb-0` to content, add bottom tab bar |
| `src/app/dashboard/engagement/page.tsx` | Scrollable tabs with shortened labels |
| `src/app/dashboard/studio/page.tsx` | `px-4 md:px-6` header, `pb-20 md:pb-5` main, `grid-cols-2 sm:grid-cols-3` categories |
