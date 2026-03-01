/** A tracked company entry used by the stock scraper cron job. */
export interface CompanyConfig {
  ticker: string;
  companyName: string;
  country: string;
  isEV: boolean;
  /** Exchange market code: "US" | "HK" | "CN" | "IN" | "EU" */
  market: string;
}

/**
 * All tracked EV companies. Tickers are Yahoo Finance symbols.
 * Non-public or delisted companies are included — the scraper returns null
 * for them gracefully and their market data fields will be null in the DB.
 */
export const EV_COMPANIES: CompanyConfig[] = [
  { ticker: "TSLA",          companyName: "Tesla",                   country: "USA",         isEV: true, market: "US" },
  { ticker: "002594.SZ",     companyName: "BYD",                     country: "China",       isEV: true, market: "CN" },
  { ticker: "XIACF",         companyName: "Xiaomi",                  country: "China",       isEV: true, market: "US" },
  { ticker: "RIVN",          companyName: "Rivian",                  country: "USA",         isEV: true, market: "US" },
  { ticker: "LI",            companyName: "Li Auto",                 country: "China",       isEV: true, market: "US" },
  { ticker: "XPEV",          companyName: "XPeng",                   country: "China",       isEV: true, market: "US" },
  { ticker: "NIO",           companyName: "NIO",                     country: "China",       isEV: true, market: "US" },
  { ticker: "VFS",           companyName: "VinFast Auto",            country: "Vietnam",     isEV: true, market: "US" },
  { ticker: "9863.HK",       companyName: "Leapmotor",               country: "China",       isEV: true, market: "HK" },
  { ticker: "1585.HK",       companyName: "Yadea Group",             country: "China",       isEV: true, market: "HK" },
  { ticker: "LCID",          companyName: "Lucid Motors",            country: "USA",         isEV: true, market: "US" },
  { ticker: "ATHERENERG.NS", companyName: "Ather Energy",            country: "India",       isEV: true, market: "IN" },
  { ticker: "PSNY",          companyName: "Polestar",                country: "Sweden",      isEV: true, market: "US" },
  { ticker: "OLAELEC.NS",    companyName: "Ola Electric Mobility",   country: "India",       isEV: true, market: "IN" },
  { ticker: "OLECTRA.NS",    companyName: "Olectra Greentech",       country: "India",       isEV: true, market: "IN" },
  { ticker: "LOT",           companyName: "Lotus Technology",        country: "China",       isEV: true, market: "US" },
  { ticker: "HYLN",          companyName: "Hyliion",                 country: "USA",         isEV: true, market: "US" },
  { ticker: "LVWR",          companyName: "LiveWire Group",          country: "USA",         isEV: true, market: "US" },
  { ticker: "NIU",           companyName: "NIU",                     country: "China",       isEV: true, market: "US" },
  { ticker: "FFAI",          companyName: "Faraday Future",          country: "USA",         isEV: true, market: "US" },
  { ticker: "KNDI",          companyName: "Kandi Technologies",      country: "China",       isEV: true, market: "US" },
  { ticker: "SEV",           companyName: "Aptera Motors",           country: "USA",         isEV: true, market: "US" },
  { ticker: "GGR",           companyName: "Gogoro",                  country: "Taiwan",      isEV: true, market: "US" },
  { ticker: "EBUS.AS",       companyName: "Ebusco Holding",          country: "Netherlands", isEV: true, market: "EU" },
  { ticker: "EZGO",          companyName: "EZGO Technologies",       country: "China",       isEV: true, market: "US" },
  { ticker: "WKHS",          companyName: "Workhorse Group",         country: "USA",         isEV: true, market: "US" },
  { ticker: "XOS",           companyName: "XOS",                     country: "USA",         isEV: true, market: "US" },
  { ticker: "REE",           companyName: "REE Automotive",          country: "Israel",      isEV: true, market: "US" },
  { ticker: "PEV",           companyName: "Phoenix Motor",           country: "USA",         isEV: true, market: "US" },
  { ticker: "CENN",          companyName: "Cenntro Electric Group",  country: "USA",         isEV: true, market: "US" },
  { ticker: "UCAR",          companyName: "U Power",                 country: "China",       isEV: true, market: "US" },
  { ticker: "GP",            companyName: "GreenPower Motor",        country: "Canada",      isEV: true, market: "US" },
  { ticker: "ZEVY",          companyName: "Lightning eMotors",       country: "USA",         isEV: true, market: "US" },
];

/** All companies to scrape (union of all lists). Extend here when adding non-EV auto makers. */
export const ALL_COMPANIES: CompanyConfig[] = [...EV_COMPANIES];
