/**
 * Days are calendar dates written YYYY-MM-DD, in the time zone the app sets from its settings
 * (`setTimeZone`), or the device's own until it does; they change at that zone's midnight. A
 * `Date` standing for a day holds it at local midnight, whatever the zone.
 */

const DAY = 86_400_000;

/** The device's own time zone now, an IANA name such as "Asia/Ho_Chi_Minh". */
export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Whether two names are one time zone, as an older name and its newer one are. */
export function sameTimeZone(a: string, b: string): boolean {
  const named = (zone: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
  return named(a) === named(b);
}

/**
 * The clock of the time zone days follow, reading a moment's date and time there; unset while
 * days follow the device's own zone.
 */
let zoneClock: Intl.DateTimeFormat | undefined;
/** A moment's time of day, as "14:32", in the time zone days follow. */
let timeOfDay: Intl.DateTimeFormat;

/**
 * Sets the time zone days follow, an IANA name, from the device's settings; `undefined` for the
 * device's own.
 */
export function setTimeZone(timeZone: string | undefined) {
  timeOfDay = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone });
  zoneClock =
    timeZone === undefined
      ? undefined
      : new Intl.DateTimeFormat("en-US", {
          timeZone,
          hourCycle: "h23",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
}
setTimeZone(undefined);

/** The day a moment falls on in the time zone days follow, YYYY-MM-DD. */
export function dayOf(moment: Date | number): string {
  if (!zoneClock) return toISO(new Date(moment));
  const part = partsOf(zoneClock, moment);
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * When a time of day, HH:MM, comes on a day in the time zone days follow; the day's start by
 * default. Where the clocks go back and show the time twice, the first; where they go forward
 * past it, the moment straight after, as a day whose midnight is skipped starts at 01:00.
 */
export function momentOf(day: string, time = "00:00"): Date {
  const [year, month, date] = day.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if (!zoneClock) return new Date(year, month - 1, date, hours, minutes);
  const clock = zoneClock;
  // how far the zone's clocks are ahead of UTC at a moment
  const offsetAt = (moment: number) => {
    const part = partsOf(clock, moment);
    const shown = Date.UTC(
      Number(part("year")),
      Number(part("month")) - 1,
      Number(part("day")),
      Number(part("hour")),
      Number(part("minute")),
      Number(part("second")),
    );
    return shown - Math.floor(moment / 1000) * 1000;
  };
  const asIfUtc = Date.UTC(year, month - 1, date, hours, minutes);
  // the moments it would be with the offset of the day before and of the day after: the same,
  // unless the clocks change between them
  const [before, after] = [asIfUtc - offsetAt(asIfUtc - DAY), asIfUtc - offsetAt(asIfUtc + DAY)];
  const shows = (moment: number) => moment + offsetAt(moment) === asIfUtc;
  const showing = [before, after].filter(shows);
  return new Date(showing.length > 0 ? Math.min(...showing) : Math.max(before, after));
}

/** When the next day starts in the time zone days follow. */
export const tomorrowStarts = () => momentOf(toISO(addDays(todayISO(), 1)));

/** A formatter's parts for a moment, by type. */
function partsOf(format: Intl.DateTimeFormat, moment: Date | number) {
  const parts = format.formatToParts(moment);
  return (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
}

export function today(): Date {
  return fromISO(dayOf(Date.now()));
}

/**
 * A day held as a `Date`, at local midnight, written YYYY-MM-DD. For the day a moment falls on in
 * the time zone days follow, `dayOf`.
 */
export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** A day given either way: as a date, or as YYYY-MM-DD. */
const asDate = (d: Date | string): Date => (typeof d === "string" ? fromISO(d) : d);

export function addDays(d: Date | string, n: number): Date {
  const out = new Date(asDate(d));
  out.setDate(out.getDate() + n);
  return out;
}

export function daysBetween(a: Date | string, b: Date | string): number {
  return Math.round((asDate(b).getTime() - asDate(a).getTime()) / DAY);
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

export const fmtShort = (d: Date | string) => shortDate.format(asDate(d)).replace(",", "");
export const fmtLong = (d: Date) => longDate.format(d).replace(",", "");
export const fmtDayMonth = (d: Date | string) => dayMonth.format(asDate(d));
/** A moment's time of day in the time zone days follow, as "14:32". */
export const fmtTime = (moment: Date | number) => timeOfDay.format(moment);

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
