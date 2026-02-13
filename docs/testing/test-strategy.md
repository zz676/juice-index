# Testing Strategy for Visual Data Studio (juice-index)

This document outlines the testing strategy for the Visual Data Studio features, ensuring reliability, data accuracy, and expected user behavior.

## 1. Testing Pyramid

We will adopt a testing pyramid approach, focusing on a solid foundation of unit tests, supported by integration tests for API/DB layers, and critical path E2E tests for user flows.

### 1.1 Unit Tests (Vitest)
**Focus**: Pure functions, utilities, and isolated component logic.
**Status**: Vitest is configured (`vitest.config.ts`) with `@/*` path alias support. Run with `npm test`.
- **Data Transformation**: Testing `chart-data.ts` and other utility functions that format data for Recharts.
- **Rate Limiting**: Verifying token bucket logic and tier limits in isolation.
- **Prompt Engineering**: Testing prompt generation logic for the natural language to SQL service.

### 1.2 Integration Tests (Vitest + Test DB)
**Focus**: API endpoints, Database interactions, and Service layers.
- **API Endpoints**: Testing `/api/dashboard/*` routes for correct status codes, data structure, and error handling.
- **Database Queries**: Verifying Prisma queries return expected data from the shared schema.
- **Third-Party Integrations**: Mocking Stripe and OpenAI Vercel SDK interactions to verify handling of external responses.

### 1.3 End-to-End (E2E) Tests (Playwright / Cypress)
**Focus**: Critical user journeys and UI interactions in a real browser environment.
- **Data Explorer Flow**: User enters prompt -> query generates -> chart renders -> user customizes chart.
- **Dashboard Access**: Verifying tier-based access control (Free vs. Pro).
- **Billing Flow**: Simulating subscription upgrades and verifying feature unlocking.

## 2. Tools & Stack

- **Test Runner**: Vitest (configured, see `vitest.config.ts`). Run: `npm test` or `npm run test:watch`.
- **E2E Framework**: Playwright (fast, reliable, native browser support).
- **Mocking**: `vi` (Vitest) — `vi.stubEnv()` for env vars, `vi.mock()` for modules.
- **Database**: Dockerized Postgres for integration tests (or a dedicated test schema).

## 3. Test Data Management

Since we rely on a shared database (`ev-platform`), we must be careful with test data.
- **Read-Only Tests**: VDS features are primarily read-only. Tests should largely verify data retrieval without mutating shared tables.
- **Write Tests**: For `ApiKey`, `ApiRequestLog`, and `Session` tables (which are `juice_` specific), we can safely create and delete test records.
- **Seeding**: Use a minimal seed script to populate `juice_users` and `juice_api_keys` for test runs.

## 4. CI/CD Integration

Tests should run on every Pull Request:
1. **Lint & Build**: Ensure code quality.
2. **Unit Tests**: Fast feedback loop.
3. **Integration Tests**: Verify API contracts.
4. **E2E Tests**: Run on merge to main or before release.
