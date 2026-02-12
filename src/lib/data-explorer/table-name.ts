const CANONICAL_TABLES = new Set([
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
]);

const ALIASES: Record<string, string> = {
  evmetric: "eVMetric",
  automakerrankings: "automakerRankings",
  caamnevsales: "caamNevSales",
  cpcanevretail: "cpcaNevRetail",
  cpcanevproduction: "cpcaNevProduction",
  nevsalessummary: "nevSalesSummary",
  chinapassengerinventory: "chinaPassengerInventory",
  chinadealerinventoryfactor: "chinaDealerInventoryFactor",
  chinaviaindex: "chinaViaIndex",
  chinabatteryinstallation: "chinaBatteryInstallation",
  batterymakermonthly: "batteryMakerMonthly",
  batterymakerrankings: "batteryMakerRankings",
  plantexports: "plantExports",
  vehiclespec: "vehicleSpec",

  ev_metric: "eVMetric",
  evmetrics: "eVMetric",
  automaker_ranking: "automakerRankings",
  automaker_rankings: "automakerRankings",
  cpca_retail: "cpcaNevRetail",
  cpca_production: "cpcaNevProduction",
  battery_maker_monthly: "batteryMakerMonthly",
  battery_maker_rankings: "batteryMakerRankings",
  passenger_inventory: "chinaPassengerInventory",
  dealer_inventory_factor: "chinaDealerInventoryFactor",
  via_index: "chinaViaIndex",
  battery_installation: "chinaBatteryInstallation",
};

export function normalizeTableName(raw: string): string {
  const cleaned = (raw || "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, "");

  if (CANONICAL_TABLES.has(cleaned)) return cleaned;

  const lower = cleaned.toLowerCase();
  return ALIASES[lower] || cleaned;
}
