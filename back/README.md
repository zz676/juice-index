# juice-index

API SaaS for China EV market data, backed by an existing Supabase Postgres database.

## Key Rules
- The canonical Prisma schema lives in ev-platform.
- This repo reuses that schema for Prisma client generation.
- Do NOT run `prisma db push` or migrations from this repo.

## Local Dev
1. Create `.env.local` from `.env.example`.
2. Install deps: `npm install`.
3. Generate Prisma client: `npm run db:generate`.
4. Run: `npm run dev`.

## Docs
- Swagger UI: `/docs`
- OpenAPI JSON: `/api/openapi.json`
