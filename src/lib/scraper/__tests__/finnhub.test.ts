import { describe, it, expect } from "vitest";
import { parseStockExtras } from "../finnhub";

const metricFixture = { metric: { peBasicExclExtraTTM: 28.5 } };
const earningsFixture = {
  earningsCalendar: [{ date: "2026-04-22", symbol: "LI", epsEstimate: 0.62, year: 2026, quarter: 1 }],
};

describe("parseStockExtras", () => {
  it("extracts peRatio and earnings from a complete response", () => {
    const result = parseStockExtras(metricFixture, earningsFixture);
    expect(result.peRatio).toBe(28.5);
    expect(result.earningsDate).toBeInstanceOf(Date);
    expect(result.earningsDateRaw).toBe("2026-04-22");
  });

  it("tolerates missing peRatio (negative-earnings company)", () => {
    const result = parseStockExtras({ metric: {} }, earningsFixture);
    expect(result.peRatio).toBeNull();
  });

  it("falls back to peTTM when peBasicExclExtraTTM is absent", () => {
    const result = parseStockExtras({ metric: { peTTM: 55.0 } }, earningsFixture);
    expect(result.peRatio).toBe(55.0);
  });

  it("tolerates missing earnings calendar", () => {
    const result = parseStockExtras(metricFixture, { earningsCalendar: [] });
    expect(result.earningsDate).toBeNull();
    expect(result.earningsDateRaw).toBeNull();
  });

  it("picks the nearest upcoming date when calendar is out of order", () => {
    const unordered = {
      earningsCalendar: [
        { date: "2026-09-01", symbol: "NIO" },
        { date: "2026-03-10", symbol: "NIO" },
        { date: "2026-06-01", symbol: "NIO" },
      ],
    };
    const result = parseStockExtras(metricFixture, unordered);
    expect(result.earningsDateRaw).toBe("2026-03-10");
  });
});
