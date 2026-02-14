import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeTableName } from "@/lib/studio/table-name";

const ALLOWED_TABLES = [
  "eVMetric",
  "automakerRankings",
  "caamNevSales",
  "cpcaNevRetail",
  "cpcaNevProduction",
  "nevSalesSummary",
  "chinaPassengerInventory",
  "chinaDealerInventoryFactor",
  "chinaViaIndex",
  "chinaBatteryInstallation",
  "batteryMakerMonthly",
  "batteryMakerRankings",
  "plantExports",
  "vehicleSpec",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const MAX_RESULTS = 1000;
const QUERY_TIMEOUT = 5000;
const ALLOWED_QUERY_KEYS = ["where", "orderBy", "take", "skip", "select", "distinct"];
const FORBIDDEN_QUERY_KEYS = new Set([
  "$queryraw",
  "$executeraw",
  "delete",
  "update",
  "create",
  "drop",
  "truncate",
  "alter",
]);

function normalizeOrderBy(orderBy: unknown): unknown {
  if (!orderBy) return orderBy;
  if (Array.isArray(orderBy)) return orderBy;
  if (typeof orderBy === "object") {
    const entries = Object.entries(orderBy as Record<string, unknown>);
    if (entries.length === 0) return orderBy;
    return entries.map(([key, value]) => ({ [key]: value }));
  }
  return orderBy;
}

export interface QueryRequest {
  table: string;
  query: Record<string, unknown>;
}

export interface QueryResult {
  table: string;
  data: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

function validateQueryStructure(query: Record<string, unknown>): void {
  const queryKeys = Object.keys(query);

  for (const key of queryKeys) {
    if (!ALLOWED_QUERY_KEYS.includes(key)) {
      throw new Error(
        `Query key "${key}" is not allowed. Allowed keys: ${ALLOWED_QUERY_KEYS.join(", ")}`
      );
    }
  }

  const findForbiddenKeyPath = (value: unknown, path: string): string | null => {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const found = findForbiddenKeyPath(value[i], `${path}[${i}]`);
        if (found) return found;
      }
      return null;
    }

    if (!value || typeof value !== "object") return null;

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_QUERY_KEYS.has(key.toLowerCase())) {
        return `${path}.${key}`;
      }
      const found = findForbiddenKeyPath(nested, `${path}.${key}`);
      if (found) return found;
    }

    return null;
  };

  const forbiddenPath = findForbiddenKeyPath(query, "query");
  if (forbiddenPath) {
    throw new Error(`Query contains forbidden key at ${forbiddenPath}`);
  }
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
  );
}

export async function executeQuery(request: QueryRequest): Promise<QueryResult> {
  const { table, query } = request;
  const startTime = Date.now();

  const normalizedTable = normalizeTableName(table);

  if (!ALLOWED_TABLES.includes(normalizedTable as AllowedTable)) {
    throw new Error(
      `Table "${table}" is not allowed. Allowed tables: ${ALLOWED_TABLES.join(", ")}`
    );
  }

  validateQueryStructure(query);

  const normalizedOrderBy = normalizeOrderBy(query.orderBy);
  const safeQuery = {
    ...query,
    ...(normalizedOrderBy !== undefined ? { orderBy: normalizedOrderBy } : {}),
    take: Math.min((query.take as number) || MAX_RESULTS, MAX_RESULTS),
  };

  const prismaTable = (prisma as unknown as Record<
    string,
    { findMany: (query: unknown) => Promise<Record<string, unknown>[]> }
  >)[normalizedTable];

  if (!prismaTable || typeof prismaTable.findMany !== "function") {
    throw new Error(`Table "${normalizedTable}" not found in Prisma client`);
  }

  try {
    const result = await Promise.race([
      prismaTable.findMany(safeQuery),
      timeout(QUERY_TIMEOUT),
    ]);

    const executionTimeMs = Date.now() - startTime;

    return {
      table: normalizedTable,
      data: result as Record<string, unknown>[],
      rowCount: (result as Record<string, unknown>[]).length,
      executionTimeMs,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw error;
  }
}

export function getTableInfo(table: string): { fields: string[]; description: string } | null {
  const tableInfo: Record<string, { fields: string[]; description: string }> = {
    eVMetric: {
      fields: [
        "brand",
        "metric",
        "periodType",
        "year",
        "period",
        "value",
        "yoyChange",
        "momChange",
        "marketShare",
        "ranking",
      ],
      description: "Brand delivery/sales data",
    },
    automakerRankings: {
      fields: ["year", "month", "ranking", "automaker", "value", "yoyChange", "momChange", "marketShare"],
      description: "Monthly automaker sales rankings",
    },
    caamNevSales: {
      fields: ["year", "month", "value", "yoyChange", "momChange", "unit"],
      description: "CAAM official NEV sales",
    },
    cpcaNevRetail: {
      fields: ["year", "month", "value", "yoyChange", "momChange", "unit"],
      description: "CPCA NEV retail sales",
    },
    cpcaNevProduction: {
      fields: ["year", "month", "value", "yoyChange", "momChange", "unit"],
      description: "CPCA NEV production volume",
    },
    chinaPassengerInventory: {
      fields: ["year", "month", "value", "unit"],
      description: "Dealer + factory inventory levels",
    },
    chinaDealerInventoryFactor: {
      fields: ["year", "month", "value"],
      description: "Dealer inventory coefficient",
    },
    chinaViaIndex: {
      fields: ["year", "month", "value", "unit"],
      description: "Vehicle Inventory Alert Index",
    },
    chinaBatteryInstallation: {
      fields: ["year", "month", "installation", "production", "unit"],
      description: "Total battery installation & production",
    },
    batteryMakerMonthly: {
      fields: ["maker", "year", "month", "installation", "production", "yoyChange"],
      description: "Battery maker monthly performance",
    },
    batteryMakerRankings: {
      fields: ["scope", "periodType", "year", "month", "ranking", "maker", "value", "marketShare"],
      description: "Battery maker market share rankings",
    },
    plantExports: {
      fields: ["plant", "brand", "year", "month", "value", "yoyChange"],
      description: "Exports by manufacturing plant",
    },
    vehicleSpec: {
      fields: ["brand", "model", "variant", "startingPrice", "currentPrice", "rangeCltc", "acceleration", "batteryCapacity", "vehicleType"],
      description: "Vehicle specifications",
    },
    nevSalesSummary: {
      fields: ["year", "startDate", "endDate", "retailSales", "retailYoy", "wholesaleSales", "wholesaleYoy"],
      description: "Weekly/bi-weekly sales flash reports",
    },
  };

  return tableInfo[table] || null;
}

export function getAllowedTables(): Array<{ name: string; description: string; fields: string[] }> {
  return ALLOWED_TABLES.map((table) => {
    const info = getTableInfo(table);
    return {
      name: table,
      description: info?.description || "",
      fields: info?.fields || [],
    };
  });
}
