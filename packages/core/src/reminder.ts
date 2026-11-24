import { addDays, fromISO, toISO } from "./dates.ts";
import { archivedSince, type BuildHabit, type Habit } from "./habit.ts";

/**
 * How many days the reminder is planned for, today included, since the app may not be opened
 * every day.
 */
const REMINDER_DAYS = 7;

/** One day's reminder: when it fires, and the build habits it names, in the person's order. */
export type Reminder = { day: string; at: Date; habits: string[] };

/**
 * The names of the active build habits without a check-in on `day`, in the person's order: what
 * that day's reminder names. Never a quit habit or an archived one.
 */
export function stillToCheckIn(habits: Habit[], day: string): string[] {
  return habits
    .filter(
      (h): h is BuildHabit =>
        h.kind === "build" && archivedSince(h) === null && !h.checkIns.includes(day),
    )
    .map((h) => h.name);
}

/**
 * The daily reminder's plan from `now`, at `time` (HH:MM) on each of the next seven days, today
 * included: each names the habits `stillToCheckIn` on its day. So today's names those not checked
 * in yet, and there's none once they all are, or once its time has passed; a later day names
 * every active build habit, since none can be checked in ahead.
 */
export function reminderPlan(habits: Habit[], time: string, now: Date): Reminder[] {
  const today = toISO(now);
  const plan: Reminder[] = [];
  for (let n = 0; n < REMINDER_DAYS; n++) {
    const day = toISO(addDays(today, n));
    const when = at(day, time);
    const waiting = stillToCheckIn(habits, day);
    if (waiting.length > 0 && when > now) plan.push({ day, at: when, habits: waiting });
  }
  return plan;
}

/** `time` (HH:MM) on `day`, local time. */
function at(day: string, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = fromISO(day);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
