import { describe, it, expect, vi, afterEach } from "vitest";
import { getRedirectBase } from "./redirect-base";

describe("getRedirectBase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns NEXT_PUBLIC_APP_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://juiceindex.com");
    expect(getRedirectBase()).toBe("https://juiceindex.com");
  });

  it("strips trailing slash from NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://juiceindex.com/");
    expect(getRedirectBase()).toBe("https://juiceindex.com");
  });

  it("returns fallback when env var is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getRedirectBase("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("returns empty string when env var unset and no fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getRedirectBase()).toBe("");
  });

  it("NEXT_PUBLIC_SITE_URL takes precedence over NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://juiceindex.io");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://old.example.com");
    expect(getRedirectBase()).toBe("https://juiceindex.io");
  });

  it("falls back to NEXT_PUBLIC_APP_URL when NEXT_PUBLIC_SITE_URL is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://juiceindex.io");
    expect(getRedirectBase()).toBe("https://juiceindex.io");
  });

  it("strips trailing slash from NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://juiceindex.io/");
    expect(getRedirectBase()).toBe("https://juiceindex.io");
  });
});
