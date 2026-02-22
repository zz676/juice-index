# Juice Index

China EV market intelligence platform — API SaaS and dashboard for production data, insurance registrations, battery supply chain, and market health metrics across 50+ OEMs.

## What It Does

- **Public API** (`/api/v1`) — RESTful endpoints for brand deliveries, industry sales, battery data, exports, and vehicle specs. Bearer-token auth with tiered quotas (Free / Pro / Enterprise).
- **Dashboard** (`/dashboard`) — AI-powered query studio for natural-language questions against the dataset, with chart generation, post drafting, scheduled publishing to X, and an in-app notification feed.
- **Landing & Billing** — Marketing site, Stripe-powered subscription management, and usage-based pricing.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** Supabase Postgres + Prisma ORM
- **Auth:** Supabase Auth (OAuth + email)
- **Payments:** Stripe
- **Testing:** Vitest

## Local Dev

1. Copy `.env.example` to `.env.local` and fill in credentials.
2. Install deps: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Run: `npm run dev`

## Docs

- Swagger UI: `/docs`
- OpenAPI JSON: `/api/openapi.json`
- Feature docs: [`/docs`](./docs/)
