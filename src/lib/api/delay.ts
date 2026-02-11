export const FREE_DELAY_DAYS = 30;

export type YearMonth = { year: number; month: number };

export function parseYearMonth(value: string): YearMonth | null {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function freeCutoff(now: Date): Date {
  return addDaysUtc(now, -FREE_DELAY_DAYS);
}

export function freeMaxMonthly(cutoff: Date): YearMonth {
  // Period-end based delay: a monthly record is eligible only after the end of that month.
  const y = cutoff.getUTCFullYear();
  const m0 = cutoff.getUTCMonth();
  const d = cutoff.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();

  if (d >= lastDay) {
    return { year: y, month: m0 + 1 };
  }

  const prevMonthEnd = new Date(Date.UTC(y, m0, 0));
  return { year: prevMonthEnd.getUTCFullYear(), month: prevMonthEnd.getUTCMonth() + 1 };
}

export function nextUtcMidnightEpochSeconds(now: Date): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const next = Date.UTC(y, m, d + 1, 0, 0, 0, 0);
  return Math.floor(next / 1000);
}
