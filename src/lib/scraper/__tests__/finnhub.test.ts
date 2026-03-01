import { describe, it, expect } from "vitest";
import { parseFinnhubQuote } from "../finnhub";

const quoteFixture = { c: 34.9, d: 0.5, dp: 1.45, h: 35.2, l: 34.1, o: 34.3, pc: 34.4, t: 1773705600 };
const metricFixture = {
  metric: {
    marketCapitalization: 905_000, // in millions → 905B
    peBasicExclExtraTTM: 28.5,
  },
};
const earningsFixture = {
  earningsCalendar: [{ date: "2026-04-22", symbol: "LI", epsEstimate: 0.62, year: 2026, quarter: 1 }],
};

describe("parseFinnhubQuote", () => {
  it("extracts all fields from a complete response", () => {
    const result = parseFinnhubQuote(quoteFixture, metricFixture, earningsFixture);
    expect(result).not.toBeNull();
    expect(result!.price).toBe(34.9);
    expect(result!.marketCap).toBe(905_000_000_000);
    expect(result!.peRatio).toBe(28.5);
    expect(result!.volume).toBeNull();
    expect(result!.earningsDate).toBeInstanceOf(Date);
    expect(result!.earningsDateRaw).toBe("2026-04-22");
  });

  it("returns null when price is 0 and no metric or earnings data", () => {
    expect(parseFinnhubQuote({ c: 0 }, {}, { earningsCalendar: [] })).toBeNull();
  });

  it("returns null for completely unexpected shape", () => {
    expect(parseFinnhubQuote(null, null, null)).toBeNull();
    expect(parseFinnhubQuote("garbage", "garbage", "garbage")).toBeNull();
  });

  it("tolerates missing peRatio (negative-earnings company)", () => {
    const result = parseFinnhubQuote(quoteFixture, { metric: { marketCapitalization: 1000 } }, earningsFixture);
    expect(result).not.toBeNull();
    expect(result!.peRatio).toBeNull();
  });

  it("falls back to peTTM when peBasicExclExtraTTM is absent", () => {
    const result = parseFinnhubQuote(quoteFixture, { metric: { marketCapitalization: 1000, peTTM: 55.0 } }, earningsFixture);
    expect(result).not.toBeNull();
    expect(result!.peRatio).toBe(55.0);
  });

  it("tolerates missing earnings calendar", () => {
    const result = parseFinnhubQuote(quoteFixture, metricFixture, { earningsCalendar: [] });
    expect(result).not.toBeNull();
    expect(result!.earningsDate).toBeNull();
    expect(result!.earningsDateRaw).toBeNull();
  });
});
