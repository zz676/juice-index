import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Juice Index API",
      version: "v1",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/v1/brands": {
        get: {
          summary: "List brands",
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/brands/{brand}/metrics": {
        get: {
          summary: "Brand metrics",
          parameters: [
            { name: "brand", in: "path", required: true, schema: { type: "string" } },
            { name: "metric", in: "query", schema: { type: "string" } },
            { name: "periodType", in: "query", schema: { type: "string" } },
            { name: "year", in: "query", schema: { type: "integer" } },
            { name: "period", in: "query", schema: { type: "integer" } },
            { name: "from", in: "query", schema: { type: "string" } },
            { name: "to", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/industry/caam-nev-sales": { get: { summary: "CAAM NEV sales", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/cpca-retail": { get: { summary: "CPCA NEV retail", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/cpca-production": { get: { summary: "CPCA NEV production", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/battery-installation": { get: { summary: "China battery installation", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/dealer-inventory-factor": { get: { summary: "Dealer inventory factor", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/via-index": { get: { summary: "VIA index", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/passenger-inventory": { get: { summary: "Passenger inventory", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/plant-exports": { get: { summary: "Plant exports", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/battery-maker-rankings": { get: { summary: "Battery maker rankings", responses: { "200": { description: "OK" } } } },
      "/api/v1/industry/battery-maker-monthly": { get: { summary: "Battery maker monthly", responses: { "200": { description: "OK" } } } }
    },
  };

  return NextResponse.json(spec);
}
