const CANONICAL_TABLES = new Set([
  "EVMetric",
  "AutomakerRankings",
  "CaamNevSales",
  "CpcaNevRetail",
  "CpcaNevProduction",
  "NevSalesSummary",
  "ChinaPassengerInventory",
  "ChinaDealerInventoryFactor",
  "ChinaViaIndex",
  "ChinaBatteryInstallation",
  "BatteryMakerMonthly",
  "BatteryMakerRankings",
  "PlantExports",
  "VehicleSpec",
  "NioPowerSnapshot",
]);

const ALIASES: Record<string, string> = {
  evmetric: "EVMetric",
  automakerrankings: "AutomakerRankings",
  caamnevsales: "CaamNevSales",
  cpcanevretail: "CpcaNevRetail",
  cpcanevproduction: "CpcaNevProduction",
  nevsalessummary: "NevSalesSummary",
  chinapassengerinventory: "ChinaPassengerInventory",
  chinadealerinventoryfactor: "ChinaDealerInventoryFactor",
  chinaviaindex: "ChinaViaIndex",
  chinabatteryinstallation: "ChinaBatteryInstallation",
  batterymakermonthly: "BatteryMakerMonthly",
  batterymakerrankings: "BatteryMakerRankings",
  plantexports: "PlantExports",
  vehiclespec: "VehicleSpec",

  ev_metric: "EVMetric",
  evmetrics: "EVMetric",
  automaker_ranking: "AutomakerRankings",
  automaker_rankings: "AutomakerRankings",
  cpca_retail: "CpcaNevRetail",
  cpca_production: "CpcaNevProduction",
  battery_maker_monthly: "BatteryMakerMonthly",
  battery_maker_rankings: "BatteryMakerRankings",
  passenger_inventory: "ChinaPassengerInventory",
  dealer_inventory_factor: "ChinaDealerInventoryFactor",
  via_index: "ChinaViaIndex",
  battery_installation: "ChinaBatteryInstallation",

  niopowersnapshot: "NioPowerSnapshot",
  nio_power_snapshot: "NioPowerSnapshot",
  nio_power: "NioPowerSnapshot",
  power_snapshot: "NioPowerSnapshot",
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
