import { describe, it, expect } from "vitest";
import { parseYahooQuote } from "../yahoo-finance";

const makeFixture = (overrides: Record<string, unknown> = {}) => ({
  quoteSummary: {
    result: [
      {
        price: {
          regularMarketPrice: { raw: 34.9 },
          marketCap: { raw: 905_000_000_000 },
          regularMarketVolume: { raw: 12_000_000 },
        },
        summaryDetail: {
          trailingPE: { raw: 28.5 },
        },
        calendarEvents: {
          earnings: {
            earningsDate: [{ raw: 1773705600, fmt: "Mar 17, 2026" }],
          },
        },
      },
    ],
    error: null,
    ...overrides,
  },
});

describe("parseYahooQuote", () => {
  it("extracts all five fields from a complete response", () => {
    const result = parseYahooQuote(makeFixture());
    expect(result).not.toBeNull();
    expect(result!.price).toBe(34.9);
    expect(result!.marketCap).toBe(905_000_000_000);
    expect(result!.volume).toBe(BigInt(12_000_000));
    expect(result!.peRatio).toBe(28.5);
    expect(result!.earningsDateRaw).toBe("Mar 17, 2026");
    expect(result!.earningsDate).toBeInstanceOf(Date);
    expect(result!.earningsDate!.getUTCFullYear()).toBe(2026);
    expect(result!.earningsDate!.getUTCMonth()).toBe(2); // March = 2
    expect(result!.earningsDate!.getUTCDate()).toBe(17);
  });

  it("returns null when result array is empty", () => {
    expect(parseYahooQuote({ quoteSummary: { result: [], error: null } })).toBeNull();
  });

  it("returns null on API-level error", () => {
    expect(parseYahooQuote({ quoteSummary: { result: null, error: { code: "Not Found" } } })).toBeNull();
  });

  it("returns null for completely unexpected shape", () => {
    expect(parseYahooQuote(null)).toBeNull();
    expect(parseYahooQuote("garbage")).toBeNull();
    expect(parseYahooQuote({})).toBeNull();
  });

  it("tolerates missing peRatio (negative-earnings company)", () => {
    const fixture = makeFixture();
    delete (fixture.quoteSummary.result[0] as any).summaryDetail.trailingPE;
    const result = parseYahooQuote(fixture);
    expect(result).not.toBeNull();
    expect(result!.peRatio).toBeNull();
  });

  it("handles range-format earningsDateRaw — uses raw timestamp, not fmt string", () => {
    const fixture = makeFixture();
    (fixture.quoteSummary.result[0] as any).calendarEvents.earnings.earningsDate = [
      { raw: 1773705600, fmt: "Mar 17, 2026 - Mar 21, 2026" },
    ];
    const result = parseYahooQuote(fixture);
    expect(result).not.toBeNull();
    expect(result!.earningsDateRaw).toBe("Mar 17, 2026 - Mar 21, 2026");
    expect(result!.earningsDate).toBeInstanceOf(Date);
    expect(result!.earningsDate!.getUTCFullYear()).toBe(2026);
  });

  it("tolerates missing earningsDate", () => {
    const fixture = makeFixture();
    (fixture.quoteSummary.result[0] as any).calendarEvents.earnings.earningsDate = [];
    const result = parseYahooQuote(fixture);
    expect(result).not.toBeNull();
    expect(result!.earningsDate).toBeNull();
    expect(result!.earningsDateRaw).toBeNull();
  });
});
