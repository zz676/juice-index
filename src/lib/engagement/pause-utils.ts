/**
 * Utilities for evaluating whether the current time falls within a configured
 * pause schedule. Used by both the cron job and client-side status display.
 */

export type PauseExceptionLike = {
  date: string; // "YYYY-MM-DD"
};

export type PauseScheduleLike = {
  id: string;
  enabled: boolean;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  label?: string | null;
  frequencyOverride: boolean;
  overridePollInterval: number;
  PauseExceptions: PauseExceptionLike[];
};

/** Returns true if `time` (HH:mm) is within the [start, end) pause window. */
function isTimeInWindow(current: string, start: string, end: string): boolean {
  if (start === end) return false;
  if (start < end) {
    // Same-day window, e.g. 12:00 → 13:00
    return current >= start && current < end;
  }
  // Cross-midnight window, e.g. 23:00 → 07:00
  return current >= start || current < end;
}

/** Converts a Date to the local "HH:mm" and "YYYY-MM-DD" in the given IANA timezone. */
function toLocalParts(now: Date, timezone: string): { time: string; date: string } {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const year = get(dateParts, "year");
  const month = get(dateParts, "month");
  const day = get(dateParts, "day");
  const hour = get(timeParts, "hour");
  const minute = get(timeParts, "minute");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

/**
 * Returns the first active PauseSchedule that covers `now` in the given
 * timezone, or `null` if none match.
 *
 * A schedule is skipped if its today's date appears in its PauseExceptions list.
 */
export function getActivePauseSchedule(
  schedules: PauseScheduleLike[],
  timezone: string,
  now: Date = new Date(),
): PauseScheduleLike | null {
  const { time, date } = toLocalParts(now, timezone);

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;

    // Skip if today is an exception date
    const isException = schedule.PauseExceptions.some((e) => e.date === date);
    if (isException) continue;

    if (isTimeInWindow(time, schedule.startTime, schedule.endTime)) {
      return schedule;
    }
  }

  return null;
}

/**
 * Returns true if any enabled schedule covers the current time.
 * Convenience wrapper around getActivePauseSchedule.
 */
export function isWithinPauseSchedule(
  schedules: PauseScheduleLike[],
  timezone: string,
  now: Date = new Date(),
): boolean {
  return getActivePauseSchedule(schedules, timezone, now) !== null;
}

/** Validates an "HH:mm" 24-hour time string. */
export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

/** Validates a "YYYY-MM-DD" date string. */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !isNaN(d.getTime());
}
