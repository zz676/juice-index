import { describe, it, expect } from "vitest";
import { parseMarketCapHtml } from "../companiesmarketcap";

// Minimal HTML fixture mimicking companiesmarketcap.com table rows
const fixture = `
<tr><td class="fav"></td><td class="rank-td td-right" data-sort="1">1</td>
<td class="name-td"><div class="name-div"><a href="/tesla/marketcap/">
<div class="company-name">Tesla</div>
<div class="company-code"><span class="rank d-none"></span>TSLA</div>
</a></div></td>
<td class="td-right" data-sort="1510391414784">$1.510 T</td>
<td class="td-right" data-sort="40251">$402.51</td></tr>

<tr><td class="fav"></td><td class="rank-td td-right" data-sort="2">2</td>
<td class="name-td"><div class="name-div"><a href="/toyota/marketcap/">
<div class="company-name">Toyota</div>
<div class="company-code"><span class="rank d-none"></span>TM</div>
</a></div></td>
<td class="td-right" data-sort="315916484608">$315.91 B</td>
<td class="td-right" data-sort="24238">$242.38</td></tr>

<tr><td class="fav"></td><td class="rank-td td-right" data-sort="8">8</td>
<td class="name-td"><div class="name-div"><a href="/bmw/marketcap/">
<div class="company-name">BMW</div>
<div class="company-code"><span class="rank d-none"></span>BMW.DE</div>
</a></div></td>
<td class="td-right" data-sort="64470000000">$64.47 B</td>
<td class="td-right" data-sort="10577">$105.77</td></tr>
`;

describe("parseMarketCapHtml", () => {
  it("extracts price and market cap for US and international tickers", () => {
    const result = parseMarketCapHtml(fixture);

    expect(result.size).toBe(3);

    const tesla = result.get("TSLA")!;
    expect(tesla.marketCap).toBe(1510391414784);
    expect(tesla.price).toBeCloseTo(402.51);

    const toyota = result.get("TM")!;
    expect(toyota.marketCap).toBe(315916484608);
    expect(toyota.price).toBeCloseTo(242.38);

    const bmw = result.get("BMW.DE")!;
    expect(bmw.marketCap).toBe(64470000000);
    expect(bmw.price).toBeCloseTo(105.77);
  });

  it("returns empty map for HTML with no matching rows", () => {
    expect(parseMarketCapHtml("<html><body>no data</body></html>").size).toBe(0);
  });
});
