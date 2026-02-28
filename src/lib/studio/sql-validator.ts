import { ALLOWED_TABLE_NAMES } from "@/lib/studio/field-registry";

// Maps lowercased SQL table names (as they appear in FROM clauses) to Prisma model keys
const SQL_TABLE_TO_PRISMA: Record<string, string> = {
  evmetric: "EVMetric",
  automakerankings: "AutomakerRankings",
  caamnevsales: "CaamNevSales",
  cpcanevretail: "CpcaNevRetail",
  cpcanevproduction: "CpcaNevProduction",
  nevSalessummary: "NevSalesSummary",
  nevsalessummary: "NevSalesSummary",
  chinapassengerinventory: "ChinaPassengerInventory",
  chinadealerInventoryfactor: "ChinaDealerInventoryFactor",
  chinaDealerInventoryfactor: "ChinaDealerInventoryFactor",
  chinadealerInventory: "ChinaDealerInventoryFactor",
  chinaviaindex: "ChinaViaIndex",
  chinabatteryinstallation: "ChinaBatteryInstallation",
  batterymakermonthly: "BatteryMakerMonthly",
  batterymakerankings: "BatteryMakerRankings",
  batterymakerankings2: "BatteryMakerRankings",
  plantexports: "PlantExports",
  vehiclespec: "VehicleSpec",
  niopowersnapshot: "NioPowerSnapshot",
  niopowerdailydelta: "NioPowerDailyDelta",
  niopowermonthlydelta: "NioPowerMonthlyDelta",
};

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\bdrop\b/i,
  /\btruncate\b/i,
  /\balter\b/i,
  /\bcreate\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /--/,
  /\/\*/,
];

export interface SqlValidationResult {
  valid: boolean;
  error?: string;
  /** Normalised SQL with LIMIT capped to 1000 */
  sql?: string;
  /** The Prisma table key extracted from FROM clause, if identifiable */
  prismaTable?: string;
}

/**
 * Validate and normalise a user-supplied SELECT query.
 * Returns { valid: false, error } on any violation, or
 * { valid: true, sql, prismaTable } on success.
 */
export function validateRawSql(input: string): SqlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, error: "SQL is empty." };
  }

  // Must start with SELECT or WITH (CTEs), and must not contain DML
  if (!/^(select|with)\b/i.test(trimmed)) {
    return { valid: false, error: "Only SELECT queries are allowed." };
  }

  // Block forbidden keywords / comment syntax
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: `Query contains a forbidden keyword or syntax.`,
      };
    }
  }

  // Reject statement chaining
  // Strip string literals first to avoid false positives on values like 'a;b'
  const stripped = trimmed.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
  const withoutTrailingSemicolon = stripped.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    return { valid: false, error: "Multiple statements are not allowed." };
  }

  // Extract primary table from FROM clause
  const fromMatch = stripped.match(/\bfrom\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i);
  let prismaTable: string | undefined;
  if (fromMatch) {
    const sqlTableRaw = fromMatch[1];
    const key = sqlTableRaw.toLowerCase();
    prismaTable = SQL_TABLE_TO_PRISMA[key];
    // Also accept if the raw name is already a valid Prisma key (camelCase)
    if (!prismaTable && ALLOWED_TABLE_NAMES.includes(sqlTableRaw)) {
      prismaTable = sqlTableRaw;
    }
    if (!prismaTable) {
      return {
        valid: false,
        error: `Table "${sqlTableRaw}" is not in the allowed list.`,
      };
    }
  }

  // Cap / inject LIMIT 1000
  let sql = trimmed.replace(/;\s*$/, ""); // strip trailing semicolon
  const limitMatch = sql.match(/\blimit\s+(\d+)/i);
  if (limitMatch) {
    const existing = parseInt(limitMatch[1], 10);
    if (existing > 1000) {
      sql = sql.replace(/\blimit\s+\d+/i, "LIMIT 1000");
    }
  } else {
    sql = `${sql} LIMIT 1000`;
  }

  return { valid: true, sql, prismaTable };
}
