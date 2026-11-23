/**
 * Two kinds of habit:
 * - build: something to do every day. Each day it's done is a check-in; a missed day ends the streak.
 * - quit:  something to stop. Every day after the quit day is clean unless a slip is logged.
 */
export type Kind = "build" | "quit";

export type ColorId = "teal" | "red" | "blue" | "ochre" | "rose" | "green";

type HabitBase = {
  id: string;
  name: string;
  color: ColorId;
  goal: number | null;
};

export type BuildHabit = HabitBase & {
  kind: "build";
  /** ISO dates (YYYY-MM-DD) it was done. Sorted, unique. */
  checkIns: string[];
};

export type QuitHabit = HabitBase & {
  kind: "quit";
  /** ISO date tracking began; the first clean day is the day after. */
  quitDay: string;
  /** ISO dates it was broken. Sorted, unique. */
  slips: string[];
};

export type Habit = BuildHabit | QuitHabit;

/**
 * An unbroken stretch of days.
 * build: `start` and `end` are its first and last check-ins.
 * quit: `start` is the quit day or a slip, `end` the slip that ended it; both exclusive.
 */
export type Streak = { start: string; end: string; days: number; current: boolean };

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
 * Habit colours, in an order that keeps neighbours apart for colour-blind readers.
 * Their light and dark values live in @streakky/ui (globals.css, `data-habit-color`).
 */
export const HABIT_COLORS: { id: ColorId; name: string }[] = [
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

/** The days a habit has logged: check-ins for a build habit, slips for a quit habit. */
export const loggedDays = (h: Habit): string[] => (h.kind === "build" ? h.checkIns : h.slips);

/**
 * Every streak, oldest first; the last one is the current streak, possibly 0 days.
 * Days after today (logged before flying west, say) are ignored until they come.
 */
export function streaksOf(h: Habit): Streak[] {
  const t = todayISO();
  if (h.kind === "quit") {
    const quitDay = h.quitDay < t ? h.quitDay : t;
    const bounds = [quitDay, ...h.slips.filter((slip) => slip > quitDay && slip <= t)];
    // a finished streak holds the clean days between two slips; the slip days themselves are not clean
    const streaks: Streak[] = bounds.slice(0, -1).map((b, i) => ({
      start: b,
      end: bounds[i + 1],
      days: Math.max(0, daysBetween(b, bounds[i + 1]) - 1),
      current: false,
    }));
    const last = bounds[bounds.length - 1];
    streaks.push({ start: last, end: t, days: Math.max(0, daysBetween(last, t)), current: true });
    return streaks;
  }
  const streaks: Streak[] = [];
  for (const day of h.checkIns) {
    if (day > t) break;
    const prev = streaks[streaks.length - 1];
    if (prev && daysBetween(prev.end, day) === 1) {
      prev.end = day;
      prev.days += 1;
    } else {
      streaks.push({ start: day, end: day, days: 1, current: false });
    }
  }
  const last = streaks[streaks.length - 1];
  // A build streak stays alive through today even before today's check-in.
  if (last && daysBetween(last.end, t) <= 1) last.current = true;
  else streaks.push({ start: t, end: t, days: 0, current: true });
  return streaks;
}

export function currentStreak(h: Habit): Streak {
  const s = streaksOf(h);
  return s[s.length - 1];
}

export const currentStreakDays = (h: Habit) => currentStreak(h).days;

export const longestStreakDays = (h: Habit) => Math.max(...streaksOf(h).map((s) => s.days));

/** Where a habit's history begins: its quit day, or a build habit's first check-in (today if none); never after today. */
export function historyStart(h: Habit): string {
  const t = todayISO();
  const first = h.kind === "quit" ? h.quitDay : (h.checkIns[0] ?? t);
  return first < t ? first : t;
}

/** A quit habit's quit day: a real YYYY-MM-DD day (it survives the round trip), today or earlier. */
export const canBeQuitDay = (day: string): boolean =>
  toISO(fromISO(day)) === day && day <= todayISO();

/** Days that can be edited: none in the future; for quit, none on or before the quit day. */
export function canToggle(h: Habit, day: string): boolean {
  if (day > todayISO()) return false;
  return h.kind === "build" || day > h.quitDay;
}

/**
 * The streak each past day belongs to, for the calendars.
 * build: the check-in days. quit: the clean days after the quit day or each slip, up to the
 * next slip (or today); slip days stay unfilled. Each streak's coloured days equal its count.
 */
export function streakDays(h: Habit): Map<string, "current" | "past"> {
  const days = new Map<string, "current" | "past">();
  for (const s of streaksOf(h)) {
    if (s.days === 0) continue;
    const first = h.kind === "quit" ? addDays(s.start, 1) : fromISO(s.start);
    const last = h.kind === "quit" && !s.current ? addDays(s.end, -1) : fromISO(s.end);
    for (let d = first; d <= last; d = addDays(d, 1)) {
      days.set(toISO(d), s.current ? "current" : "past");
    }
  }
  return days;
}

/** build: checked in today. quit: a slip logged today. */
export const loggedToday = (h: Habit) => loggedDays(h).includes(todayISO());

/** The small line in the ring's gap: when this streak began, or what today needs. */
export function sinceLabel(h: Habit): string {
  const streak = currentStreak(h);
  if (streak.days > 0) return `since ${fmtShort(streak.start)}`;
  if (h.kind === "build") return "log today to start";
  return loggedToday(h) ? "slip logged today" : "started today";
}

/** The day the goal is (or was) reached on the current streak. */
export function goalDate(h: Habit): Date | null {
  if (h.goal === null) return null;
  const streak = currentStreak(h);
  if (h.kind === "quit") return addDays(streak.start, h.goal);
  if (streak.days >= h.goal) return addDays(streak.start, h.goal - 1);
  const left = h.goal - streak.days;
  return addDays(today(), loggedToday(h) ? left : left - 1);
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

/** The words under a count: a build habit counts a streak, a quit habit counts free days. */
export function counterLabel(h: Habit, days: number): string {
  if (h.kind === "quit") return days === 1 ? "day free" : "days free";
  return "day streak";
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Sample data, placed relative to today so the counts always read the same. */
export function sampleHabits(): Habit[] {
  const t = today();
  const at = (n: number) => toISO(addDays(t, -n));
  const span = (from: number, to: number) =>
    Array.from({ length: from - to + 1 }, (_, i) => at(from - i));
  return [
    {
      id: "sugar",
      name: "No sugar",
      kind: "quit",
      color: "teal",
      goal: 21,
      quitDay: at(70),
      slips: [at(52), at(45), at(40), at(10)],
    },
    {
      id: "run",
      name: "Morning run",
      kind: "build",
      color: "green",
      goal: 21,
      checkIns: [...span(55, 46), ...span(40, 20), ...span(14, 1)],
    },
    {
      id: "read",
      name: "Read 20 pages",
      kind: "build",
      color: "ochre",
      goal: 30,
      checkIns: [...span(30, 12), ...span(7, 0)],
    },
    {
      id: "smoke",
      name: "No smoking",
      kind: "quit",
      color: "red",
      goal: 60,
      quitDay: at(140),
      slips: [at(47)],
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
