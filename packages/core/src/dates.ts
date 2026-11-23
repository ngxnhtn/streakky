/** Days are local calendar dates written YYYY-MM-DD; they change at the device's midnight. */

const DAY = 86_400_000;

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date | string, n: number): Date {
  const out = typeof d === "string" ? fromISO(d) : new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const x = typeof a === "string" ? fromISO(a) : a;
  const y = typeof b === "string" ? fromISO(b) : b;
  return Math.round((y.getTime() - x.getTime()) / DAY);
}

export const todayISO = () => toISO(today());

const shortDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export const fmtShort = (d: Date | string) =>
  shortDate.format(typeof d === "string" ? fromISO(d) : d).replace(",", "");
export const fmtLong = (d: Date) => longDate.format(d).replace(",", "");
export const fmtDayMonth = (d: Date | string) =>
  dayMonth.format(typeof d === "string" ? fromISO(d) : d);

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
