/**
 * What the Android home-screen widget knows of a habit, and how it counts from that alone (ticket
 * 20, ADR-0001). The app writes each habit's summary whenever something changes; the widget, a
 * native view, works out the current streak from the summary and its own today, so it stays right
 * after midnight without the app. The widget's Kotlin rule copies `countFromSummary`, and the two
 * are held together by the cases in fixtures/widget-cases.json.
 */
import { daysBetween } from "./dates.ts";
import { archivedDays, archivedSince, currentStreak, loggedDays, streaksOf } from "./habit.ts";
import type { ColorId, Habit } from "./habit.ts";

type SummaryBase = {
  id: string;
  name: string;
  color: ColorId;
  /** archived, so its widget says so in place of a count until it's restored */
  archived: boolean;
};

/** A habit as its widget shows it, whatever the day. */
export type WidgetSummary =
  | (SummaryBase & {
      kind: "build";
      /** the last check-in, YYYY-MM-DD, or null with none */
      lastCheckIn: string | null;
      /** how long the streak ending on the last check-in is */
      streakAtLastCheckIn: number;
    })
  | (SummaryBase & {
      kind: "quit";
      /** the quit day or the last slip, YYYY-MM-DD: the current streak counts the days after it */
      since: string;
      /** the archived days since then, which don't count; fixed while the habit is active */
      archivedDaysSince: number;
    });

export function widgetSummary(habit: Habit): WidgetSummary {
  const base = {
    id: habit.id,
    name: habit.name,
    color: habit.color,
    archived: archivedSince(habit) !== null,
  };
  if (habit.kind === "quit") {
    const since = currentStreak(habit).start;
    const archivedDaysSince = archivedDays(habit).filter((day) => day > since).length;
    return { ...base, kind: "quit", since, archivedDaysSince };
  }
  const lastCheckIn = loggedDays(habit).at(-1) ?? null;
  const ending = streaksOf(habit).find((s) => s.days > 0 && s.end === lastCheckIn);
  return { ...base, kind: "build", lastCheckIn, streakAtLastCheckIn: ending?.days ?? 0 };
}

/**
 * The habit's current streak on `today` (YYYY-MM-DD), from its summary: a build habit's streak
 * lives through the day after its last check-in, and a quit habit counts the days since its quit
 * day or last slip, less the archived ones.
 */
export function countFromSummary(summary: WidgetSummary, today: string): number {
  if (summary.kind === "quit") {
    return Math.max(0, daysBetween(summary.since, today) - summary.archivedDaysSince);
  }
  const { lastCheckIn } = summary;
  return lastCheckIn !== null && daysBetween(lastCheckIn, today) <= 1
    ? summary.streakAtLastCheckIn
    : 0;
}
