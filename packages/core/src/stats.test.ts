import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { habitStats, type ArchivedPeriod, type Habit } from "./index.ts";

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
  archivedPeriods: [],
});

const quit = (
  quitDay: string,
  slips: string[] = [],
  archivedPeriods: ArchivedPeriod[] = [],
): Habit => ({
  id: "smoke",
  name: "No smoking",
  kind: "quit",
  color: "red",
  goal: null,
  quitDay,
  slips,
  archivedPeriods,
});

const nov = (day: number) => `2026-11-${String(day).padStart(2, "0")}`;
const novDays = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => nov(from + i));

describe("a build habit's stats", () => {
  it("counts its streaks, check-ins and last 30 days", () => {
    const habit = build([...novDays(1, 3), ...novDays(20, 24)]);
    expect(habitStats(habit)).toEqual({
      currentStreak: 5,
      longestStreak: 5,
      averageStreak: 4,
      logged: 8,
      loggedLast30: 8,
      // tracked since the first check-in, on 1 November
      trackedLast30: 24,
    });
  });

  it("is all zeroes on a new habit, tracked today only", () => {
    expect(habitStats(build([]))).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      averageStreak: 0,
      logged: 0,
      loggedLast30: 0,
      trackedLast30: 1,
    });
  });

  it("averages the current streak in, at 0 days after a break", () => {
    // streaks of 1 and 2 days, then a current streak of 0
    const stats = habitStats(build([nov(10), nov(12), nov(13)]));
    expect(stats).toMatchObject({ currentStreak: 0, longestStreak: 2, averageStreak: 1 });
  });

  it("rounds the average to a whole day", () => {
    // streaks of 1 and 2 days, the second still current
    expect(habitStats(build([nov(20), nov(23), nov(24)])).averageStreak).toBe(2);
  });

  it("keeps the last 30 days to today and the 29 before it", () => {
    const habit = build(["2026-10-01", "2026-10-25", "2026-10-26", nov(24)]);
    expect(habitStats(habit)).toMatchObject({ logged: 4, loggedLast30: 2, trackedLast30: 30 });
  });

  it("leaves out check-ins after today", () => {
    const habit = build([nov(24), nov(25)]);
    expect(habitStats(habit)).toMatchObject({ currentStreak: 1, logged: 1, loggedLast30: 1 });
  });
});

describe("a quit habit's stats", () => {
  it("counts its streaks and slips", () => {
    // 8 clean days to the 10th's slip, 9 to the 20th's, and 4 since
    const habit = quit(nov(1), [nov(10), nov(20)]);
    expect(habitStats(habit)).toEqual({
      currentStreak: 4,
      longestStreak: 9,
      averageStreak: 7,
      logged: 2,
      loggedLast30: 2,
      trackedLast30: 24,
    });
  });

  it("starts at 0 on its quit day", () => {
    expect(habitStats(quit(nov(24)))).toMatchObject({
      currentStreak: 0,
      longestStreak: 0,
      averageStreak: 0,
      logged: 0,
      trackedLast30: 1,
    });
  });

  it("leaves out slips that don't count and archived days", () => {
    // a slip on the quit day, and the 16th to the 19th archived
    const archived = [{ archivedOn: nov(15), restoredOn: nov(20) }];
    const habit = quit(nov(10), [nov(10), nov(17)], archived);
    expect(habitStats(habit)).toMatchObject({ currentStreak: 10, longestStreak: 10, logged: 0 });
  });
});
