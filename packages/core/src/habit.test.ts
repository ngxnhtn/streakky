import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  canToggle,
  currentStreak,
  currentStreakDays,
  goalDate,
  historyStart,
  longestStreakDays,
  streakDays,
  streaksOf,
  toISO,
  type Habit,
} from "./index.ts";

// Every test runs on Tuesday 24 November 2026, local time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 12));
});
afterEach(() => vi.useRealTimers());

const build = (checkIns: string[]): Habit => ({
  id: "run",
  name: "Morning run",
  kind: "build",
  color: "green",
  goal: null,
  checkIns,
});

const quit = (quitDay: string, slips: string[] = []): Habit => ({
  id: "smoke",
  name: "No smoking",
  kind: "quit",
  color: "red",
  goal: null,
  quitDay,
  slips,
});

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

describe("calendar highlighting", () => {
  it("highlights a build habit's check-ins by whether they belong to the current streak", () => {
    const habit = build(["2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24"]);
    expect(Object.fromEntries(streakDays(habit))).toEqual({
      "2026-11-20": "past",
      "2026-11-21": "past",
      "2026-11-23": "current",
      "2026-11-24": "current",
    });
  });

  it("highlights a quit habit's clean days, leaving the quit day and slips out", () => {
    const habit = quit("2026-11-18", ["2026-11-21"]);
    expect(Object.fromEntries(streakDays(habit))).toEqual({
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
