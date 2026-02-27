import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeTableName } from "@/lib/studio/table-name";
import {
  ALLOWED_TABLE_NAMES,
  getTableDef,
  getFieldNames,
  getAllowedTablesList,
} from "@/lib/studio/field-registry";

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

  if (!ALLOWED_TABLE_NAMES.includes(normalizedTable)) {
    throw new Error(
      `Table "${table}" is not allowed. Allowed tables: ${ALLOWED_TABLE_NAMES.join(", ")}`
    );
  }

  validateQueryStructure(query);

  const normalizedOrderBy = normalizeOrderBy(query.orderBy);
  const safeQuery = {
    ...query,
    ...(normalizedOrderBy !== undefined ? { orderBy: normalizedOrderBy } : {}),
    take: Math.min((query.take as number) || MAX_RESULTS, MAX_RESULTS),
  };

  // Prisma client properties are camelCase; registry keys are PascalCase
  const prismaClientKey = normalizedTable.charAt(0).toLowerCase() + normalizedTable.slice(1);
  const prismaTable = (prisma as unknown as Record<
    string,
    { findMany: (query: unknown) => Promise<Record<string, unknown>[]> }
  >)[prismaClientKey];

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
  const def = getTableDef(table);
  if (!def) return null;
  return { fields: getFieldNames(table), description: def.description };
}

export function getAllowedTables(): Array<{ name: string; description: string; fields: string[] }> {
  return getAllowedTablesList();
}
