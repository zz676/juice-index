/** A tracked company entry used by the stock scraper cron job. */
export interface CompanyConfig {
  ticker: string;
  companyName: string;
  country: string;
  isEV: boolean;
  /** Exchange market code: "US" | "HK" | "CN" | "IN" | "EU" | "JP" | "KR" | "TR" | "TW" */
  market: string;
}

/**
 * Top 60 largest auto companies by market cap, including EV and traditional automakers.
 * Tickers are Yahoo Finance / Finnhub symbols.
 * Non-public or delisted companies are included — the scraper returns null
 * for them gracefully and their market data fields will be null in the DB.
 */
export const ALL_COMPANIES: CompanyConfig[] = [
  // ── EV companies ──────────────────────────────────────────────────────────
  { ticker: "TSLA",          companyName: "Tesla",                         country: "USA",         isEV: true,  market: "US" },
  { ticker: "002594.SZ",     companyName: "BYD",                           country: "China",       isEV: true,  market: "CN" },
  { ticker: "XIACF",         companyName: "Xiaomi",                        country: "China",       isEV: true,  market: "US" },
  { ticker: "RIVN",          companyName: "Rivian",                        country: "USA",         isEV: true,  market: "US" },
  { ticker: "LI",            companyName: "Li Auto",                       country: "China",       isEV: true,  market: "US" },
  { ticker: "XPEV",          companyName: "XPeng",                         country: "China",       isEV: true,  market: "US" },
  { ticker: "NIO",           companyName: "NIO",                           country: "China",       isEV: true,  market: "US" },
  { ticker: "VFS",           companyName: "VinFast Auto",                  country: "Vietnam",     isEV: true,  market: "US" },
  { ticker: "9863.HK",       companyName: "Leapmotor",                     country: "China",       isEV: true,  market: "HK" },
  { ticker: "LCID",          companyName: "Lucid Motors",                  country: "USA",         isEV: true,  market: "US" },
  { ticker: "PSNY",          companyName: "Polestar",                      country: "Sweden",      isEV: true,  market: "US" },
  { ticker: "LOT",           companyName: "Lotus Technology",              country: "China",       isEV: true,  market: "US" },
  { ticker: "FFAI",          companyName: "Faraday Future",                country: "USA",         isEV: true,  market: "US" },
  { ticker: "KNDI",          companyName: "Kandi Technologies",            country: "China",       isEV: true,  market: "US" },
  { ticker: "SEV",           companyName: "Aptera Motors",                 country: "USA",         isEV: true,  market: "US" },
  { ticker: "REE",           companyName: "REE Automotive",                country: "Israel",      isEV: true,  market: "US" },
  { ticker: "PEV",           companyName: "Phoenix Motor",                 country: "USA",         isEV: true,  market: "US" },
  { ticker: "CENN",          companyName: "Cenntro Electric Group",        country: "USA",         isEV: true,  market: "US" },

  // ── Traditional automakers ────────────────────────────────────────────────
  { ticker: "TM",            companyName: "Toyota",                        country: "Japan",       isEV: false, market: "US" },
  { ticker: "005380.KS",     companyName: "Hyundai",                       country: "S. Korea",    isEV: false, market: "KR" },
  { ticker: "GM",            companyName: "General Motors",                country: "USA",         isEV: false, market: "US" },
  { ticker: "RACE",          companyName: "Ferrari",                       country: "Italy",       isEV: false, market: "US" },
  { ticker: "BMW.DE",        companyName: "BMW",                           country: "Germany",     isEV: false, market: "EU" },
  { ticker: "MBG.DE",        companyName: "Mercedes-Benz",                 country: "Germany",     isEV: false, market: "EU" },
  { ticker: "VOW3.DE",       companyName: "Volkswagen",                    country: "Germany",     isEV: false, market: "EU" },
  { ticker: "F",             companyName: "Ford",                          country: "USA",         isEV: false, market: "US" },
  { ticker: "000270.KS",     companyName: "Kia",                           country: "S. Korea",    isEV: false, market: "KR" },
  { ticker: "MARUTI.NS",     companyName: "Maruti Suzuki India",           country: "India",       isEV: false, market: "IN" },
  { ticker: "M&M.NS",        companyName: "Mahindra & Mahindra",           country: "India",       isEV: false, market: "IN" },
  { ticker: "P911.DE",       companyName: "Porsche",                       country: "Germany",     isEV: false, market: "EU" },
  { ticker: "HMC",           companyName: "Honda",                         country: "Japan",       isEV: false, market: "US" },
  { ticker: "7269.T",        companyName: "Suzuki Motor",                  country: "Japan",       isEV: false, market: "JP" },
  { ticker: "601127.SS",     companyName: "Seres Group",                   country: "China",       isEV: false, market: "CN" },
  { ticker: "601633.SS",     companyName: "Great Wall Motors",             country: "China",       isEV: false, market: "CN" },
  { ticker: "600104.SS",     companyName: "SAIC Motor",                    country: "China",       isEV: false, market: "CN" },
  { ticker: "STLA",          companyName: "Stellantis",                    country: "Netherlands", isEV: false, market: "US" },
  { ticker: "0175.HK",       companyName: "Geely",                         country: "China",       isEV: false, market: "HK" },
  { ticker: "9973.HK",       companyName: "Chery Automobile",              country: "China",       isEV: false, market: "HK" },
  { ticker: "HYUNDAI.NS",    companyName: "Hyundai Motor India",           country: "India",       isEV: false, market: "IN" },
  { ticker: "600418.SS",     companyName: "JAC Motors",                    country: "China",       isEV: false, market: "CN" },
  { ticker: "TATAMOTORS.NS", companyName: "Tata Motors",                   country: "India",       isEV: false, market: "IN" },
  { ticker: "000625.SZ",     companyName: "Chongqing Changan",             country: "China",       isEV: false, market: "CN" },
  { ticker: "7270.T",        companyName: "Subaru",                        country: "Japan",       isEV: false, market: "JP" },
  { ticker: "7202.T",        companyName: "Isuzu",                         country: "Japan",       isEV: false, market: "JP" },
  { ticker: "601238.SS",     companyName: "GAC",                           country: "China",       isEV: false, market: "CN" },
  { ticker: "RNO.PA",        companyName: "Renault",                       country: "France",      isEV: false, market: "EU" },
  { ticker: "2207.TW",       companyName: "Hotai Motor",                   country: "Taiwan",      isEV: false, market: "TW" },
  { ticker: "0489.HK",       companyName: "Dongfeng Motor",                country: "China",       isEV: false, market: "HK" },
  { ticker: "7201.T",        companyName: "Nissan",                        country: "Japan",       isEV: false, market: "JP" },
  { ticker: "FROTO.IS",      companyName: "Ford Otosan",                   country: "Turkey",      isEV: false, market: "TR" },
  { ticker: "VOLCAR-B.ST",   companyName: "Volvo Car",                     country: "Sweden",      isEV: false, market: "EU" },
  { ticker: "7261.T",        companyName: "Mazda",                         country: "Japan",       isEV: false, market: "JP" },
  { ticker: "000800.SZ",     companyName: "FAW Car",                       country: "China",       isEV: false, market: "CN" },
  { ticker: "7211.T",        companyName: "Mitsubishi Motors",             country: "Japan",       isEV: false, market: "JP" },
  { ticker: "TOASO.IS",      companyName: "Tofaş Türk Otomobil Fabrikası", country: "Turkey",     isEV: false, market: "TR" },
  { ticker: "FORCEMOT.NS",   companyName: "Force Motors",                  country: "India",       isEV: false, market: "IN" },
  { ticker: "PII",           companyName: "Polaris",                       country: "USA",         isEV: false, market: "US" },
  { ticker: "2201.TW",       companyName: "Yulon Motor",                   country: "Taiwan",      isEV: false, market: "TW" },
  { ticker: "AML.L",         companyName: "Aston Martin",                  country: "UK",          isEV: false, market: "EU" },
  { ticker: "003620.KS",     companyName: "KG Mobility",                   country: "S. Korea",    isEV: false, market: "KR" },
];
