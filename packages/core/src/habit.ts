import {
  addDays,
  daysBetween,
  fmtDayMonth,
  fmtShort,
  fromISO,
  today,
  todayISO,
  toISO,
} from "./dates.ts";

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

/**
 * A habit's logged days that count, oldest first: check-ins up to today for a build habit; slips
 * after the quit day and up to today for a quit habit. Days after today (logged before flying
 * west, say) wait until they come, and a quit day after today counts as today.
 */
export function loggedDays(h: Habit): string[] {
  const t = todayISO();
  if (h.kind === "build") return h.checkIns.filter((day) => day <= t);
  const quitDay = effectiveQuitDay(h);
  return h.slips.filter((slip) => slip > quitDay && slip <= t);
}

const effectiveQuitDay = (h: QuitHabit) => (h.quitDay < todayISO() ? h.quitDay : todayISO());

/** Every streak, oldest first, from the logged days that count; the last one is the current streak, possibly 0 days. */
export function streaksOf(h: Habit): Streak[] {
  const t = todayISO();
  if (h.kind === "quit") {
    const bounds = [effectiveQuitDay(h), ...loggedDays(h)];
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
  for (const day of loggedDays(h)) {
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

/**
 * The slips that moving a quit habit's quit day to `day` would remove: the ones that count now
 * and fall on or before `day`, since only days after the quit day can be slips. Moving the quit
 * day earlier removes none.
 */
export const slipsRemovedByMovingQuitDay = (h: QuitHabit, day: string): string[] =>
  loggedDays(h).filter((slip) => slip <= day);

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
export function daysByStreak(h: Habit): Map<string, "current" | "past"> {
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
  if (h.kind === "build") return "check in today to start";
  return loggedToday(h) ? "slip logged today" : "started today";
}

/** The line under a habit's name in a list: what today needs, or how the current streak stands. */
export function statusLabel(h: Habit): string {
  const streak = currentStreak(h);
  if (h.kind === "quit") {
    if (loggedToday(h)) return "Slip logged today";
    return streak.days === 0 ? "Started today" : `Since ${fmtDayMonth(streak.start)}`;
  }
  if (loggedToday(h)) return "Checked in today";
  return streak.days === 0 ? "Check in today to start" : "Not checked in today";
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

/** Whether the current streak has reached the habit's goal. */
export const goalReached = (h: Habit): boolean => h.goal !== null && currentStreakDays(h) >= h.goal;

/**
 * What a device keeps of the goals it has celebrated for one habit: the highest goal, and the
 * first day of the current streak when it reached it.
 */
export type Celebrated = { goal: number; start: string };

/**
 * A celebration holds for the streak it was for and for whatever that streak grows into, such as
 * once a missed day before it is backfilled. A later streak, after a break, has a new start.
 */
const sameStreak = (h: Habit, last: Celebrated) => last.start >= currentStreak(h).start;

/**
 * Whether the current streak has reached its goal and not yet had a celebration, given what the
 * device kept from the last one. The same goal carries over to the next streak after a break,
 * and a higher goal on the same streak earns a celebration of its own.
 */
export function celebrationDue(h: Habit, last: Celebrated | null): boolean {
  if (!goalReached(h)) return false;
  return last === null || !sameStreak(h, last) || last.goal < (h.goal ?? 0);
}

/**
 * What the device keeps once the current streak's reached goal has had its celebration, whether
 * it played or was let pass. Lowering the goal afterwards doesn't forget the higher one.
 */
export function celebrated(h: Habit, last: Celebrated | null): Celebrated | null {
  if (h.goal === null) return last;
  const { start } = currentStreak(h);
  if (last && sameStreak(h, last)) return { goal: Math.max(last.goal, h.goal), start };
  return { goal: h.goal, start };
}

/** The words under a count: a build habit counts a streak, a quit habit counts free days. */
export function counterLabel(h: Habit, days: number): string {
  if (h.kind === "quit") return days === 1 ? "day free" : "days free";
  return "day streak";
}

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
