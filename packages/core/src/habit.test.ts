import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  archivedDays,
  archivedSince,
  loggedDays,
  loggedToday,
  statusLabel,
  canBeQuitDay,
  canToggle,
  celebrated,
  celebrationDue,
  counterLabel,
  currentStreak,
  currentStreakDays,
  goalDate,
  goalReached,
  historyStart,
  longestStreakDays,
  sinceLabel,
  slipsRemovedByMovingQuitDay,
  daysByStreak,
  streaksOf,
  toISO,
  type ArchivedPeriod,
  type Habit,
  type QuitHabit,
} from "./index.ts";

// Every test runs on Tuesday 24 November 2026, local time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 12));
});
afterEach(() => vi.useRealTimers());

const build = (checkIns: string[], archivedPeriods: ArchivedPeriod[] = []): Habit => ({
  id: "run",
  name: "Morning run",
  kind: "build",
  color: "green",
  goal: null,
  checkIns,
  archivedPeriods,
});

const quit = (
  quitDay: string,
  slips: string[] = [],
  archivedPeriods: ArchivedPeriod[] = [],
): QuitHabit => ({
  id: "smoke",
  name: "No smoking",
  kind: "quit",
  color: "red",
  goal: null,
  quitDay,
  slips,
  archivedPeriods,
});

/** Archived on `archivedOn` (a November day) and restored on `restoredOn`, or still archived. */
const archivedNov = (archivedOn: number, restoredOn: number | null = null): ArchivedPeriod => ({
  archivedOn: nov(archivedOn),
  restoredOn: restoredOn === null ? null : nov(restoredOn),
});
const nov = (day: number) => `2026-11-${String(day).padStart(2, "0")}`;
const novDays = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => nov(from + i));

describe("build habits", () => {
  it("counts consecutive check-ins up to today as the current streak", () => {
    const habit = build(["2026-11-22", "2026-11-23", "2026-11-24"]);
    expect(currentStreak(habit)).toMatchObject({ start: "2026-11-22", days: 3 });
  });

  it("keeps the current streak alive through today before today's check-in", () => {
    const habit = build(["2026-11-22", "2026-11-23"]);
    expect(currentStreak(habit)).toMatchObject({ start: "2026-11-22", days: 2, current: true });
  });

  it("ends the streak after a missed day, leaving a current streak of 0", () => {
    const habit = build(["2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(streaksOf(habit)).toEqual([
      { start: "2026-11-20", end: "2026-11-22", days: 3, current: false },
      { start: "2026-11-24", end: "2026-11-24", days: 0, current: true },
    ]);
  });
});

describe("quit habits", () => {
  it("counts every day after the quit day as clean, today included", () => {
    expect(currentStreakDays(quit("2026-11-14"))).toBe(10);
  });

  it("starts a new streak after a slip, and the slip day itself is not clean", () => {
    expect(streaksOf(quit("2026-11-14", ["2026-11-20"]))).toEqual([
      { start: "2026-11-14", end: "2026-11-20", days: 5, current: false },
      { start: "2026-11-20", end: "2026-11-24", days: 4, current: true },
    ]);
  });

  it("has a current streak of 0 on the day of a slip", () => {
    expect(currentStreakDays(quit("2026-11-14", ["2026-11-24"]))).toBe(0);
  });

  it("ignores slips on or before the quit day", () => {
    expect(streaksOf(quit("2026-11-14", ["2026-11-10", "2026-11-14"]))).toEqual([
      { start: "2026-11-14", end: "2026-11-24", days: 10, current: true },
    ]);
  });
});

describe("longest streak", () => {
  it("is the longest stretch of check-ins in a build habit's history", () => {
    const habit = build(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-23"]);
    expect(longestStreakDays(habit)).toBe(4);
  });

  it("counts the current streak of a quit habit when it is the longest", () => {
    expect(longestStreakDays(quit("2026-11-01", ["2026-11-05"]))).toBe(19);
  });
});

describe("goal date", () => {
  const withGoal = (habit: Habit, goal: number): Habit => ({ ...habit, goal });
  const goalDay = (habit: Habit) => {
    const d = goalDate(habit);
    return d && toISO(d);
  };

  it("has none when the habit has no goal", () => {
    expect(goalDate(build(["2026-11-24"]))).toBeNull();
  });

  it("is the day a build streak will reach its goal if every day is checked in", () => {
    expect(goalDay(withGoal(build(["2026-11-22", "2026-11-23"]), 7))).toBe("2026-11-28");
  });

  it("does not move once today is checked in", () => {
    const habit = withGoal(build(["2026-11-22", "2026-11-23", "2026-11-24"]), 7);
    expect(goalDay(habit)).toBe("2026-11-28");
  });

  it("is the day a build streak reached its goal once it has", () => {
    const checkIns = Array.from(
      { length: 15 },
      (_, i) => `2026-11-${String(10 + i).padStart(2, "0")}`,
    );
    expect(goalDay(withGoal(build(checkIns), 7))).toBe("2026-11-16");
  });

  it("is the goal's number of clean days after a quit habit's streak began", () => {
    expect(goalDay(withGoal(quit("2026-11-14"), 21))).toBe("2026-12-05");
  });

  it("restarts after a slip", () => {
    expect(goalDay(withGoal(quit("2026-11-01", ["2026-11-20"]), 7))).toBe("2026-11-27");
  });
});

describe("editable days", () => {
  it("locks every future day", () => {
    expect(canToggle(build([]), "2026-11-25")).toBe(false);
  });

  it("lets a build habit change today and any past day", () => {
    expect([canToggle(build([]), "2026-11-24"), canToggle(build([]), "2020-01-01")]).toEqual([
      true,
      true,
    ]);
  });

  it("lets a quit habit change only days after its quit day", () => {
    const habit = quit("2026-11-14");
    expect([canToggle(habit, "2026-11-14"), canToggle(habit, "2026-11-15")]).toEqual([false, true]);
  });
});

describe("quit day", () => {
  it("can be today or a past day, never a future one", () => {
    expect([
      canBeQuitDay("2026-11-24"),
      canBeQuitDay("2025-01-31"),
      canBeQuitDay("2026-11-25"),
    ]).toEqual([true, true, false]);
  });

  it("must be a real day", () => {
    expect([canBeQuitDay(""), canBeQuitDay("2026-02-30"), canBeQuitDay("0050-01-01")]).toEqual([
      false,
      false,
      false,
    ]);
  });
});

describe("calendar highlighting", () => {
  it("highlights a build habit's check-ins by whether they belong to the current streak", () => {
    const habit = build(["2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24"]);
    expect(Object.fromEntries(daysByStreak(habit))).toEqual({
      "2026-11-20": "past",
      "2026-11-21": "past",
      "2026-11-23": "current",
      "2026-11-24": "current",
    });
  });

  it("highlights a quit habit's clean days, leaving the quit day and slips out", () => {
    const habit = quit("2026-11-18", ["2026-11-21"]);
    expect(Object.fromEntries(daysByStreak(habit))).toEqual({
      "2026-11-19": "past",
      "2026-11-20": "past",
      "2026-11-22": "current",
      "2026-11-23": "current",
      "2026-11-24": "current",
    });
  });
});

describe("history start", () => {
  it("is a quit habit's quit day", () => {
    expect(historyStart(quit("2026-11-14", ["2026-11-20"]))).toBe("2026-11-14");
  });

  it("is a build habit's first check-in", () => {
    expect(historyStart(build(["2026-11-03", "2026-11-20"]))).toBe("2026-11-03");
  });

  it("is today for a build habit with no check-ins yet", () => {
    expect(historyStart(build([]))).toBe("2026-11-24");
  });
});

describe("quit habit labels", () => {
  it("count clean days, one day in the singular", () => {
    const habit = quit("2026-11-14");
    expect([counterLabel(habit, 1), counterLabel(habit, 10)]).toEqual(["day free", "days free"]);
  });

  it("say when the current streak began", () => {
    expect(sinceLabel(quit("2026-11-14", ["2026-11-20"]))).toBe("since Fri 20 Nov");
  });

  it("say a slip was logged today", () => {
    expect(sinceLabel(quit("2026-11-14", ["2026-11-24"]))).toBe("slip logged today");
  });

  it("say the habit started today on its quit day", () => {
    expect(sinceLabel(quit("2026-11-24"))).toBe("started today");
  });
});

describe("at midnight", () => {
  const at = (day: number, hours: number, minutes: number) =>
    vi.setSystemTime(new Date(2026, 10, day, hours, minutes));

  it("adds a clean day to a quit habit's current streak", () => {
    const habit = quit("2026-11-14");
    at(24, 23, 59);
    const before = currentStreakDays(habit);
    at(25, 0, 1);
    expect([before, currentStreakDays(habit)]).toEqual([10, 11]);
  });

  it("ends a build streak whose last check-in was the day before yesterday", () => {
    const habit = build(["2026-11-22", "2026-11-23"]);
    at(24, 23, 59);
    const before = currentStreakDays(habit);
    at(25, 0, 1);
    expect([before, currentStreakDays(habit)]).toEqual([2, 0]);
  });
});

// A day can fall after today on this device after flying west: logged as "today" in Tokyo,
// it is tomorrow in Hanoi. Such days are ignored until they come.
describe("days after today", () => {
  it("ignore a slip dated after today", () => {
    expect(currentStreakDays(quit("2026-11-14", ["2026-11-25"]))).toBe(10);
  });

  it("ignore a check-in dated after today", () => {
    expect(currentStreakDays(build(["2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"]))).toBe(
      3,
    );
  });

  it("treat a quit day after today as today", () => {
    const habit = quit("2026-11-25");
    expect([historyStart(habit), currentStreakDays(habit)]).toEqual(["2026-11-24", 0]);
  });
});

describe("build habit labels", () => {
  it("say to check in today while there is no current streak", () => {
    expect(sinceLabel(build(["2026-11-20"]))).toBe("check in today to start");
  });
});

describe("logged days that count", () => {
  it("leave out a quit habit's slips on or before the quit day and after today", () => {
    const habit = quit("2026-11-14", ["2026-11-10", "2026-11-14", "2026-11-20", "2026-11-25"]);
    expect(loggedDays(habit)).toEqual(["2026-11-20"]);
  });

  it("leave out a build habit's check-ins after today", () => {
    expect(loggedDays(build(["2026-11-23", "2026-11-25"]))).toEqual(["2026-11-23"]);
  });

  it("don't count a slip on today's quit day as logged today", () => {
    expect(loggedToday(quit("2026-11-24", ["2026-11-24"]))).toBe(false);
  });
});

describe("status line", () => {
  it("says what a build habit needs today", () => {
    expect([
      statusLabel(build(["2026-11-23", "2026-11-24"])),
      statusLabel(build(["2026-11-23"])),
      statusLabel(build([])),
    ]).toEqual(["Checked in today", "Not checked in today", "Check in today to start"]);
  });

  it("says how a quit habit's current streak stands", () => {
    expect([
      statusLabel(quit("2026-11-14", ["2026-11-24"])),
      statusLabel(quit("2026-11-24")),
      statusLabel(quit("2026-11-14")),
    ]).toEqual(["Slip logged today", "Started today", "Since 14 Nov"]);
  });
});

describe("moving the quit day", () => {
  it("reports the slips on or before the new quit day, that day's own slip included", () => {
    const habit = quit("2026-11-01", ["2026-11-05", "2026-11-10", "2026-11-20"]);
    expect(slipsRemovedByMovingQuitDay(habit, "2026-11-10")).toEqual(["2026-11-05", "2026-11-10"]);
  });

  it("reports none when the quit day moves earlier", () => {
    expect(slipsRemovedByMovingQuitDay(quit("2026-11-10", ["2026-11-15"]), "2026-11-01")).toEqual(
      [],
    );
  });

  it("reports none when no slip falls on or before the new quit day", () => {
    expect(slipsRemovedByMovingQuitDay(quit("2026-11-01", ["2026-11-20"]), "2026-11-19")).toEqual(
      [],
    );
  });

  it("leaves out slips that don't count already: on or before the quit day, or after today", () => {
    const habit = quit("2026-11-10", ["2026-11-05", "2026-11-10", "2026-11-12", "2026-11-25"]);
    expect(slipsRemovedByMovingQuitDay(habit, "2026-11-24")).toEqual(["2026-11-12"]);
  });

  it("counts from the new quit day once those slips are removed", () => {
    const habit = quit("2026-11-01", ["2026-11-05", "2026-11-20"]);
    const removed = slipsRemovedByMovingQuitDay(habit, "2026-11-06");
    const moved = {
      ...habit,
      quitDay: "2026-11-06",
      slips: habit.slips.filter((s) => !removed.includes(s)),
    };
    expect(streaksOf(moved).map((s) => s.days)).toEqual([13, 4]);
  });
});

describe("a goal", () => {
  const withGoal = (habit: Habit, goal: number | null): Habit => ({ ...habit, goal });
  const days = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => `2026-11-${String(from + i).padStart(2, "0")}`);

  it("is reached once the current streak is as long as it", () => {
    expect([
      goalReached(withGoal(build(days(18, 24)), 7)),
      goalReached(withGoal(build(days(19, 24)), 7)),
      goalReached(withGoal(build(days(18, 24)), null)),
    ]).toEqual([true, false, false]);
  });

  it("carries over to the next streak after a break", () => {
    // the first streak reached 7 days; the current one, since the 20th, has 5 and needs 2 more
    const habit = withGoal(build([...days(1, 10), ...days(20, 24)]), 7);
    const on = goalDate(habit);
    expect([goalReached(habit), on && toISO(on)]).toEqual([false, "2026-11-26"]);
  });
});

describe("a goal's celebration", () => {
  const withGoal = (habit: Habit, goal: number): Habit => ({ ...habit, goal });
  const days = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => `2026-11-${String(from + i).padStart(2, "0")}`);

  it("is due once the current streak reaches the goal, and not before", () => {
    expect([
      celebrationDue(withGoal(build(days(19, 23)), 7), null),
      celebrationDue(withGoal(build(days(18, 24)), 7), null),
    ]).toEqual([false, true]);
  });

  it("plays once for a streak, however long it grows", () => {
    const reached = withGoal(build(days(17, 23)), 7);
    const kept = celebrated(reached, null);
    expect([
      celebrationDue(reached, kept),
      celebrationDue(withGoal(build(days(17, 24)), 7), kept),
    ]).toEqual([false, false]);
  });

  it("is due again on the next streak after a break", () => {
    vi.setSystemTime(new Date(2026, 10, 10, 12));
    const kept = celebrated(withGoal(build(days(1, 10)), 7), null);
    vi.setSystemTime(new Date(2026, 10, 24, 12));
    const nextStreak = withGoal(build([...days(1, 10), ...days(18, 24)]), 7);
    expect(celebrationDue(nextStreak, kept)).toBe(true);
  });

  it("is due again when the same streak reaches a higher goal", () => {
    const kept = celebrated(withGoal(build(days(1, 24)), 7), null);
    expect([
      celebrationDue(withGoal(build(days(1, 24)), 21), kept),
      celebrationDue(withGoal(build(days(1, 24)), 30), kept),
    ]).toEqual([true, false]);
  });

  it("isn't due again when a missed day before the streak is backfilled", () => {
    const kept = celebrated(withGoal(build([...days(10, 12), ...days(14, 24)]), 7), null);
    expect(celebrationDue(withGoal(build(days(10, 24)), 7), kept)).toBe(false);
  });

  it("remembers the higher goal after the goal is lowered", () => {
    const at21 = celebrated(withGoal(build(days(1, 24)), 21), null);
    const at7 = celebrated(withGoal(build(days(1, 24)), 7), at21);
    expect(celebrationDue(withGoal(build(days(1, 24)), 21), at7)).toBe(false);
  });

  it("is due for a quit habit on the day its goal is reached", () => {
    const habit = withGoal(quit("2026-11-17"), 7);
    vi.setSystemTime(new Date(2026, 10, 23, 23, 59));
    const before = celebrationDue(habit, null);
    vi.setSystemTime(new Date(2026, 10, 24, 0, 1));
    expect([before, celebrationDue(habit, null)]).toEqual([false, true]);
  });

  it("is due again for a quit habit after a slip, once the next streak reaches the goal", () => {
    const kept = celebrated(withGoal(quit("2026-11-01"), 7), null);
    expect([
      celebrationDue(withGoal(quit("2026-11-01", ["2026-11-20"]), 7), kept),
      celebrationDue(withGoal(quit("2026-11-01", ["2026-11-17"]), 7), kept),
    ]).toEqual([false, true]);
  });
});

describe("a quit habit's archived days", () => {
  it("run from the day after archiving through the day before restoring", () => {
    const habit = quit("2026-11-01", [], [archivedNov(10, 15)]);
    expect(archivedDays(habit)).toEqual(novDays(11, 14));
  });

  it("are left out of the count without ending the streak", () => {
    const habit = quit("2026-11-01", [], [archivedNov(10, 15)]);
    // 23 days since the quit day, 4 of them archived
    expect(streaksOf(habit)).toEqual([
      { start: "2026-11-01", end: "2026-11-24", days: 19, current: true },
    ]);
  });

  it("are left out for every time it was archived", () => {
    const habit = quit("2026-11-01", [], [archivedNov(5, 8), archivedNov(12, 20)]);
    expect([archivedDays(habit), currentStreakDays(habit)]).toEqual([
      [...novDays(6, 7), ...novDays(13, 19)],
      14,
    ]);
  });

  it("are none when it's restored the day it was archived, or the day after", () => {
    const habit = quit("2026-11-01", [], [archivedNov(10, 10), archivedNov(15, 16)]);
    expect([archivedDays(habit), currentStreakDays(habit)]).toEqual([[], 23]);
  });

  it("run through today while it's still archived, holding the count where it stopped", () => {
    const habit = quit("2026-11-01", [], [archivedNov(20)]);
    expect([archivedDays(habit), currentStreakDays(habit)]).toEqual([novDays(21, 24), 19]);
  });

  it("stop the count growing at midnight while it's archived", () => {
    const habit = quit("2026-11-14", [], [archivedNov(20)]);
    vi.setSystemTime(new Date(2026, 10, 24, 23, 59));
    const before = currentStreakDays(habit);
    vi.setSystemTime(new Date(2026, 10, 25, 0, 1));
    expect([before, currentStreakDays(habit)]).toEqual([6, 6]);
  });

  it("let the count carry on from where it stopped once it's restored", () => {
    const archived = quit("2026-11-01", [], [archivedNov(20)]);
    vi.setSystemTime(new Date(2026, 10, 27, 12));
    const restored = quit("2026-11-01", [], [archivedNov(20, 27)]);
    const onRestoreDay = currentStreakDays(restored);
    vi.setSystemTime(new Date(2026, 10, 28, 12));
    // 19 on the archive day; the restore day and the next count again
    expect([currentStreakDays(archived), onRestoreDay, currentStreakDays(restored)]).toEqual([
      19, 20, 21,
    ]);
  });

  it("count only after the quit day", () => {
    // the quit day moved into an earlier archived period once it was restored
    const habit = quit("2026-11-05", [], [archivedNov(1, 10)]);
    expect([archivedDays(habit), currentStreakDays(habit)]).toEqual([novDays(6, 9), 15]);
  });

  it("are none when restored on a day before the one it was archived on, as after flying west", () => {
    expect(archivedDays(quit("2026-11-01", [], [archivedNov(22, 21)]))).toEqual([]);
  });

  it("leave a slip on the day before archiving as it was", () => {
    const habit = quit("2026-11-01", ["2026-11-19"], [archivedNov(20, 23)]);
    // the 20th, 23rd and 24th are clean; the 21st and 22nd archived
    expect(streaksOf(habit)).toEqual([
      { start: "2026-11-01", end: "2026-11-19", days: 17, current: false },
      { start: "2026-11-19", end: "2026-11-24", days: 3, current: true },
    ]);
  });

  it("leave a slip on the day it was archived counting, as today's would", () => {
    const habit = quit("2026-11-01", ["2026-11-20"], [archivedNov(20, 23)]);
    expect([loggedDays(habit), currentStreakDays(habit)]).toEqual([["2026-11-20"], 2]);
  });

  it("don't count a slip on an archived day, as one merged in from another device", () => {
    const habit = quit("2026-11-01", ["2026-11-21"], [archivedNov(20, 23)]);
    expect([loggedDays(habit), currentStreakDays(habit)]).toEqual([[], 21]);
  });

  it("are left out of the longest streak", () => {
    // 18 clean days to a slip on 20 Oct, then 35 days since it, 25 of them archived
    const habit = quit(
      "2026-10-01",
      ["2026-10-20"],
      [{ archivedOn: "2026-10-25", restoredOn: "2026-11-20" }],
    );
    expect([longestStreakDays(habit), streaksOf(habit).map((s) => s.days)]).toEqual([18, [18, 10]]);
  });

  it("stay unfilled on the calendar, and are listed apart", () => {
    const habit = quit("2026-11-14", ["2026-11-23"], [archivedNov(17, 21)]);
    expect([Object.fromEntries(daysByStreak(habit)), archivedDays(habit)]).toEqual([
      {
        "2026-11-15": "past",
        "2026-11-16": "past",
        "2026-11-17": "past",
        "2026-11-21": "past",
        "2026-11-22": "past",
        "2026-11-24": "current",
      },
      novDays(18, 20),
    ]);
  });

  it("can't be edited, though the days it was archived and restored on can", () => {
    const habit = quit("2026-11-14", [], [archivedNov(17, 21)]);
    expect([17, 18, 20, 21].map((day) => canToggle(habit, nov(day)))).toEqual([
      true,
      false,
      false,
      true,
    ]);
  });

  it("give the day it was archived on while it still is", () => {
    expect([
      archivedSince(quit("2026-11-01", [], [archivedNov(5, 8), archivedNov(20)])),
      archivedSince(quit("2026-11-01", [], [archivedNov(5, 8)])),
      archivedSince(quit("2026-11-01")),
    ]).toEqual(["2026-11-20", null, null]);
  });
});

describe("a quit habit's goal across archived days", () => {
  const withGoal = (habit: QuitHabit, goal: number): QuitHabit => ({ ...habit, goal });
  const goalDay = (habit: Habit) => {
    const d = goalDate(habit);
    return d && toISO(d);
  };

  it("is reached on the day its clean days reach it, archived days left out", () => {
    // clean on the 11th and 12th, archived the 13th to the 19th, clean again from the 20th
    const habit = quit("2026-11-10", [], [archivedNov(12, 20)]);
    expect([
      goalReached(withGoal(habit, 7)),
      goalDay(withGoal(habit, 7)),
      goalDay(withGoal(habit, 14)),
    ]).toEqual([true, "2026-11-24", "2026-12-01"]);
  });

  it("can't be reached while the habit is archived, and has no date then", () => {
    const habit = withGoal(quit("2026-11-10", [], [archivedNov(12)]), 7);
    vi.setSystemTime(new Date(2026, 11, 10, 12));
    expect([currentStreakDays(habit), goalReached(habit), goalDay(habit)]).toEqual([
      2,
      false,
      null,
    ]);
  });

  it("is worked out from the continuing count once the habit is restored", () => {
    vi.setSystemTime(new Date(2026, 11, 10, 12));
    const habit = withGoal(
      quit("2026-11-10", [], [{ archivedOn: "2026-11-12", restoredOn: "2026-12-10" }]),
      7,
    );
    // the 11th, the 12th and the restore day are clean, with 4 days to go
    expect([currentStreakDays(habit), goalDay(habit)]).toEqual([3, "2026-12-14"]);
  });

  it("keeps the day it was reached on before the habit was archived", () => {
    const habit = withGoal(quit("2026-11-01", [], [archivedNov(20)]), 7);
    expect([goalReached(habit), goalDay(habit)]).toEqual([true, "2026-11-08"]);
  });

  it("isn't celebrated for archived days, only once the clean days reach it", () => {
    const habit = withGoal(quit("2026-11-10", [], [archivedNov(12, 20)]), 7);
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const before = celebrationDue(habit, null);
    vi.setSystemTime(new Date(2026, 10, 24, 12));
    expect([before, celebrationDue(habit, null)]).toEqual([false, true]);
  });
});

describe("a build habit's archived days", () => {
  it("are days without check-ins, ending a streak as any would", () => {
    const checkIns = [...novDays(18, 20), ...novDays(23, 24)];
    const habit = build(checkIns, [archivedNov(20, 23)]);
    expect([archivedDays(habit), streaksOf(habit)]).toEqual([[], streaksOf(build(checkIns))]);
  });
});
