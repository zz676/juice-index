import { describe, it, expect } from "vitest";
import sitemap from "../sitemap";

describe("sitemap", () => {
  it("returns an array of URL entries", () => {
    const result = sitemap();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes the homepage with highest priority", () => {
    const result = sitemap();
    const home = result.find((e) => e.url === "https://juiceindex.io");
    expect(home).toBeDefined();
    expect(home!.priority).toBe(1.0);
  });

  it("includes /docs and /login pages", () => {
    const result = sitemap();
    const urls = result.map((e) => e.url);
    expect(urls).toContain("https://juiceindex.io/docs");
    expect(urls).toContain("https://juiceindex.io/login");
  });

  it("does not include dashboard routes", () => {
    const result = sitemap();
    const urls = result.map((e) => e.url);
    const dashboardUrls = urls.filter((u) => u.includes("/dashboard"));
    expect(dashboardUrls).toHaveLength(0);
  });
});
