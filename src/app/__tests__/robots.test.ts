import { describe, it, expect } from "vitest";
import robots from "../robots";

describe("robots", () => {
  it("returns rules allowing all user agents", () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: "*", allow: "/" });
  });

  it("includes sitemap URL", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://juiceindex.io/sitemap.xml");
  });
});
