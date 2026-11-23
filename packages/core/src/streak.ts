/**
 * Two kinds of streak:
 * - build: a good habit. You log each day you do it; a missed day ends the run.
 * - quit:  a bad habit. Every day counts by itself; you log a slip only when it happens.
 */
export type Mode = "build" | "quit";

export type ColorId = "teal" | "red" | "blue" | "ochre" | "rose" | "green";

export type Streak = {
  id: string;
  name: string;
  mode: Mode;
  color: ColorId;
  goal: number | null;
  /** ISO date (YYYY-MM-DD) tracking began */
  start: string;
  /** build: the days it was done. quit: the days a slip was logged. Sorted, unique. */
  marks: string[];
};

/** A run of days. `end` is the last done day (build) or the slip day (quit, exclusive). */
export type Run = { start: string; end: string; days: number; now: boolean };

export type Theme = "system" | "light" | "dark";

export type Layout = "grid" | "list";

export type PaletteId = "teal" | "cobalt" | "olive" | "oxblood" | "graphite";

/** App colour themes. Their colours live in @streakky/ui (globals.css, `data-palette`). */
export const PALETTES: { id: PaletteId; name: string }[] = [
  { id: "teal", name: "Teal" },
  { id: "cobalt", name: "Cobalt" },
  { id: "olive", name: "Olive" },
  { id: "oxblood", name: "Oxblood" },
  { id: "graphite", name: "Graphite" },
];

export type Settings = {
  theme: Theme;
  palette: PaletteId;
  layout: Layout;
  weekStart: 0 | 1;
  reminder: boolean;
  reminderTime: string;
  celebrate: boolean;
};

export const GOALS = [7, 14, 21, 30, 60, 90, 180, 365];

/**
 * Streak colours, in an order that keeps neighbours apart for colour-blind readers.
 * Their light and dark values live in @streakky/ui (globals.css, `data-streak-color`).
 */
export const STREAK_COLORS: { id: ColorId; name: string }[] = [
  { id: "teal", name: "Teal" },
  { id: "red", name: "Red" },
  { id: "blue", name: "Blue" },
  { id: "ochre", name: "Ochre" },
  { id: "rose", name: "Rose" },
  { id: "green", name: "Green" },
];

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

/** Every run, oldest first; the last one is the current run (`now`), possibly 0 days. */
export function runsOf(s: Streak): Run[] {
  const t = todayISO();
  if (s.mode === "quit") {
    const bounds = [s.start, ...s.marks.filter((m) => m > s.start)];
    // a finished run holds the clean days between two slips; the slip days themselves are not clean
    const runs: Run[] = bounds.slice(0, -1).map((b, i) => ({
      start: b,
      end: bounds[i + 1],
      days: Math.max(0, daysBetween(b, bounds[i + 1]) - 1),
      now: false,
    }));
    const last = bounds[bounds.length - 1];
    runs.push({ start: last, end: t, days: Math.max(0, daysBetween(last, t)), now: true });
    return runs;
  }
  const runs: Run[] = [];
  for (const m of s.marks) {
    const prev = runs[runs.length - 1];
    if (prev && daysBetween(prev.end, m) === 1) {
      prev.end = m;
      prev.days += 1;
    } else {
      runs.push({ start: m, end: m, days: 1, now: false });
    }
  }
  const last = runs[runs.length - 1];
  // A build run stays alive through today even before today is logged.
  if (last && daysBetween(last.end, t) <= 1) last.now = true;
  else runs.push({ start: t, end: t, days: 0, now: true });
  return runs;
}

export function currentRun(s: Streak): Run {
  const r = runsOf(s);
  return r[r.length - 1];
}

export const currentDays = (s: Streak) => currentRun(s).days;

/** Days that can be edited: none in the future; for quit, none on or before the quit day. */
export function canToggle(s: Streak, day: string): boolean {
  if (day > todayISO()) return false;
  return s.mode === "build" || day > s.start;
}

/**
 * The run each past day belongs to, for the calendars.
 * build: the done days. quit: the clean days after each start or slip, up to the next slip
 * (or today); slip days stay unfilled. Each run's coloured days equal its count.
 */
export function dayKinds(s: Streak): Map<string, "now" | "past"> {
  const kinds = new Map<string, "now" | "past">();
  for (const r of runsOf(s)) {
    if (r.days === 0) continue;
    const first = s.mode === "quit" ? addDays(r.start, 1) : fromISO(r.start);
    const last = s.mode === "quit" && !r.now ? addDays(r.end, -1) : fromISO(r.end);
    for (let d = first; d <= last; d = addDays(d, 1)) {
      kinds.set(toISO(d), r.now ? "now" : "past");
    }
  }
  return kinds;
}

/** build: logged today. quit: a slip logged today. */
export const markedToday = (s: Streak) => s.marks.includes(todayISO());

/** The small line in the ring's gap: when this run began, or what today needs. */
export function sinceLabel(s: Streak): string {
  const run = currentRun(s);
  if (run.days > 0) return `since ${fmtShort(run.start)}`;
  if (s.mode === "build") return "log today to start";
  return markedToday(s) ? "slip logged today" : "started today";
}

/** The day the goal is (or was) reached on the current run. */
export function goalDate(s: Streak): Date | null {
  if (s.goal === null) return null;
  const run = currentRun(s);
  if (s.mode === "quit") return addDays(run.start, s.goal);
  if (run.days >= s.goal) return addDays(run.start, s.goal - 1);
  const left = s.goal - run.days;
  return addDays(today(), markedToday(s) ? left : left - 1);
}

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

/** The words under a count: a build streak is a streak, a quit streak counts free days. */
export function counterLabel(s: Streak, days: number): string {
  if (s.mode === "quit") return days === 1 ? "day free" : "days free";
  return "day streak";
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Sample data, placed relative to today so the counts always read the same. */
export function sampleStreaks(): Streak[] {
  const t = today();
  const at = (n: number) => toISO(addDays(t, -n));
  const span = (from: number, to: number) =>
    Array.from({ length: from - to + 1 }, (_, i) => at(from - i));
  return [
    {
      id: "sugar",
      name: "No sugar",
      mode: "quit",
      color: "teal",
      goal: 21,
      start: at(70),
      marks: [at(52), at(45), at(40), at(10)],
    },
    {
      id: "run",
      name: "Morning run",
      mode: "build",
      color: "green",
      goal: 21,
      start: at(60),
      marks: [...span(55, 46), ...span(40, 20), ...span(14, 1)],
    },
    {
      id: "read",
      name: "Read 20 pages",
      mode: "build",
      color: "ochre",
      goal: 30,
      start: at(40),
      marks: [...span(30, 12), ...span(7, 0)],
    },
    {
      id: "smoke",
      name: "No smoking",
      mode: "quit",
      color: "red",
      goal: 60,
      start: at(140),
      marks: [at(47)],
    },
  ];
}

export const defaultSettings: Settings = {
  theme: "system",
  palette: "teal",
  layout: "grid",
  weekStart: 1,
  reminder: true,
  reminderTime: "21:00",
  celebrate: true,
};
