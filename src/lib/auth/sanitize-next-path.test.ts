import { describe, it, expect } from "vitest";
import { sanitizeNextPath } from "./sanitize-next-path";

describe("sanitizeNextPath", () => {
  it("returns /dashboard for null", () => {
    expect(sanitizeNextPath(null)).toBe("/dashboard");
  });

  it("returns /dashboard for empty string", () => {
    expect(sanitizeNextPath("")).toBe("/dashboard");
  });

  it("allows valid relative paths", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/auth/reset-password")).toBe("/auth/reset-password");
    expect(sanitizeNextPath("/dashboard/explorer")).toBe("/dashboard/explorer");
  });

  it("rejects paths not starting with /", () => {
    expect(sanitizeNextPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("http://evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("evil.com/hack")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs (//)", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("//evil.com/path")).toBe("/dashboard");
  });

  it("rejects paths with backslash tricks", () => {
    expect(sanitizeNextPath("/\\evil.com")).toBe("/dashboard");
  });
});
