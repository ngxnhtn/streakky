import { daysBetween, todayISO } from "./dates.ts";
import {
  currentStreakDays,
  historyStart,
  loggedDays,
  longestStreakDays,
  streaksOf,
  type Habit,
} from "./habit.ts";

/** The numbers on a habit's Stats tab. Every count leaves out days that don't count. */
export type Stats = {
  /** the current streak's days */
  currentStreak: number;
  /** the longest streak's days */
  longestStreak: number;
  /** the mean of every streak's days, the current one included, rounded to a whole day */
  averageStreak: number;
  /** check-ins (build) or slips (quit) that count, up to today */
  logged: number;
  /** of those, the ones in the last 30 days, today included */
  loggedLast30: number;
  /** how many of the last 30 days are in the habit's history, today included */
  trackedLast30: number;
};

/** A habit's Stats tab: its streaks, its logged days, and how the last 30 days went. */
export function habitStats(h: Habit): Stats {
  const t = todayISO();
  const lengths = streaksOf(h).map((s) => s.days);
  const logged = loggedDays(h);
  return {
    currentStreak: currentStreakDays(h),
    longestStreak: longestStreakDays(h),
    averageStreak: Math.round(lengths.reduce((sum, days) => sum + days, 0) / lengths.length),
    logged: logged.length,
    loggedLast30: logged.filter((day) => daysBetween(day, t) < 30).length,
    trackedLast30: Math.min(30, daysBetween(historyStart(h), t) + 1),
  };
}
