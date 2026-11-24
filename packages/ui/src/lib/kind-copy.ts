import type { Kind } from "@streakky/core";

/**
 * The words that differ between a build habit and a quit habit, in one place. Core's
 * `counterLabel`, `sinceLabel` and `statusLabel` hold the ones about counts and today.
 */
export type KindCopy = {
  /** the kind, over a habit's name on its desktop page */
  kindName: string;
  /** New habit: what the kind means, under the choice */
  hint: string;
  /** New habit: an example name */
  namePlaceholder: string;
  /** today's tick or slip on a habit's face, named for the habit */
  todayToggle: (name: string) => string;
  /** the calendar's legend for a day of a streak */
  streakDay: string;
  /** the calendar in Edit days: what a tap does */
  editHint: string;
  /** a day the calendar can change, to a screen reader: logged, or not */
  dayLogged: string;
  dayNotLogged: string;
  /** Stats: the logged days that count, for one and for any other number */
  logged: { one: string; other: string };
  /** the Goal tab's days to go: "3 days to go", "3 clean days to go" */
  goalDay: string;
  /** the streaks chart, while the current streak has no days yet */
  noStreakYet: string;
  /** the same, while the habit is archived */
  noStreakArchived: string;
};

export const KIND_COPY: Record<Kind, KindCopy> = {
  build: {
    kindName: "Habit to build",
    hint: "Check in each day you do it. A missed day ends the streak.",
    namePlaceholder: "Morning run",
    todayToggle: (name) => `Check in ${name} today`,
    streakDay: "Check-in",
    editHint: "Tap a day to check in or undo it.",
    dayLogged: "checked in",
    dayNotLogged: "not checked in",
    logged: { one: "Check-in", other: "Check-ins" },
    goalDay: "day",
    noStreakYet: "check in today to start",
    // its days while archived are days without check-ins
    noStreakArchived: "none while archived",
  },
  quit: {
    kindName: "Habit to quit",
    hint: "Counts up every day by itself. Log a slip only if it happens.",
    namePlaceholder: "No smoking",
    todayToggle: (name) => `Log a slip for ${name} today`,
    streakDay: "Clean day",
    editHint: "Tap a day to log a slip on it, or tap again to remove it.",
    dayLogged: "slip",
    dayNotLogged: "clean day",
    logged: { one: "Slip", other: "Slips" },
    goalDay: "clean day",
    // a slip today, or a quit day today: the streak starts again from the next day
    noStreakYet: "first clean day tomorrow",
    // its count stays where it was until it's restored
    noStreakArchived: "held while archived",
  },
};
