import { describe, it, expect } from "vitest";
import {
  isWithinPauseSchedule,
  getActivePauseSchedule,
  isValidTimeString,
  isValidDateString,
} from "./pause-utils";
import type { PauseScheduleLike } from "./pause-utils";

// Helper: build a schedule with no exceptions
function makeSchedule(
  startTime: string,
  endTime: string,
  opts: Partial<PauseScheduleLike> = {},
): PauseScheduleLike {
  return {
    id: "s1",
    enabled: true,
    startTime,
    endTime,
    label: null,
    frequencyOverride: false,
    overridePollInterval: 5,
    PauseExceptions: [],
    ...opts,
  };
}

// Use UTC as the test timezone — no DST, fully deterministic.
const TZ = "UTC";

// Build a UTC Date for a given date+time string (interpreted as UTC).
function nyDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00Z`);
}

describe("isValidTimeString", () => {
  it("accepts valid HH:mm values", () => {
    expect(isValidTimeString("00:00")).toBe(true);
    expect(isValidTimeString("23:59")).toBe(true);
    expect(isValidTimeString("12:30")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidTimeString("24:00")).toBe(false);
    expect(isValidTimeString("1:30")).toBe(false);
    expect(isValidTimeString("12:60")).toBe(false);
    expect(isValidTimeString("")).toBe(false);
    expect(isValidTimeString("12:30:00")).toBe(false);
  });
});

describe("isValidDateString", () => {
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidDateString("2026-03-15")).toBe(true);
    expect(isValidDateString("2000-01-01")).toBe(true);
  });

  it("rejects invalid dates", () => {
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026/03/15")).toBe(false);
    expect(isValidDateString("26-03-15")).toBe(false);
    expect(isValidDateString("")).toBe(false);
  });
});

describe("isWithinPauseSchedule — same-day range (12:00 → 13:00)", () => {
  const schedule = makeSchedule("12:00", "13:00");

  it("is active at 12:00", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "12:00"))).toBe(true);
  });

  it("is active at 12:30", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "12:30"))).toBe(true);
  });

  it("is inactive at exactly 13:00 (exclusive end)", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "13:00"))).toBe(false);
  });

  it("is inactive at 11:59", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "11:59"))).toBe(false);
  });

  it("is inactive at 13:01", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "13:01"))).toBe(false);
  });
});

describe("isWithinPauseSchedule — cross-midnight range (23:00 → 07:00)", () => {
  const schedule = makeSchedule("23:00", "07:00");

  it("is active at 23:00", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "23:00"))).toBe(true);
  });

  it("is active at 00:00 (past midnight)", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-16", "00:00"))).toBe(true);
  });

  it("is active at 06:59", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-16", "06:59"))).toBe(true);
  });

  it("is inactive at exactly 07:00 (exclusive end)", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-16", "07:00"))).toBe(false);
  });

  it("is inactive at 07:01", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-16", "07:01"))).toBe(false);
  });

  it("is inactive at 22:59", () => {
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "22:59"))).toBe(false);
  });
});

describe("isWithinPauseSchedule — exception dates", () => {
  it("skips the schedule when today is an exception", () => {
    const schedule = makeSchedule("12:00", "13:00", {
      PauseExceptions: [{ date: "2026-03-15" }],
    });
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "12:30"))).toBe(false);
  });

  it("does not skip on a different date", () => {
    const schedule = makeSchedule("12:00", "13:00", {
      PauseExceptions: [{ date: "2026-03-14" }],
    });
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "12:30"))).toBe(true);
  });
});

describe("isWithinPauseSchedule — disabled schedules", () => {
  it("ignores disabled schedules", () => {
    const schedule = makeSchedule("12:00", "13:00", { enabled: false });
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "12:30"))).toBe(false);
  });
});

describe("isWithinPauseSchedule — empty schedule list", () => {
  it("returns false with no schedules", () => {
    expect(isWithinPauseSchedule([], TZ, nyDate("2026-03-15", "12:00"))).toBe(false);
  });
});

describe("isWithinPauseSchedule — equal start and end", () => {
  it("returns false when start === end (edge: zero-duration window)", () => {
    const schedule = makeSchedule("12:00", "12:00");
    expect(isWithinPauseSchedule([schedule], TZ, nyDate("2026-03-15", "12:00"))).toBe(false);
  });
});

describe("getActivePauseSchedule", () => {
  it("returns the first matching schedule", () => {
    const s1 = makeSchedule("10:00", "11:00", { id: "s1" });
    const s2 = makeSchedule("12:00", "13:00", { id: "s2" });
    const result = getActivePauseSchedule([s1, s2], TZ, nyDate("2026-03-15", "12:30"));
    expect(result?.id).toBe("s2");
  });

  it("returns null when no schedule matches", () => {
    const schedule = makeSchedule("12:00", "13:00");
    const result = getActivePauseSchedule([schedule], TZ, nyDate("2026-03-15", "14:00"));
    expect(result).toBeNull();
  });
});
