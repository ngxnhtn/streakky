import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  currentStreakDays,
  slipsCountedAgainByMovingQuitDay,
  slipsRemovedByMovingQuitDay,
  type ArchivedPeriod,
  type QuitHabit,
} from "./index.ts";

// Every test runs on Tuesday 24 November 2026, local time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 12));
});
afterEach(() => vi.useRealTimers());

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

describe("slips counted again by moving the quit day", () => {
  it("lists slips on or before the quit day that fall after an earlier one", () => {
    // say, logged offline on another device before this one moved the quit day past them
    const habit = quit("2026-11-10", ["2026-11-05", "2026-11-08", "2026-11-15"]);
    expect(slipsCountedAgainByMovingQuitDay(habit, "2026-11-06")).toEqual(["2026-11-08"]);
    expect(slipsCountedAgainByMovingQuitDay(habit, "2026-11-01")).toEqual([
      "2026-11-05",
      "2026-11-08",
    ]);
  });

  it("lists a slip on the quit day itself", () => {
    expect(
      slipsCountedAgainByMovingQuitDay(quit("2026-11-10", ["2026-11-10"]), "2026-11-09"),
    ).toEqual(["2026-11-10"]);
  });

  it("leaves out a slip on the new quit day, which still can't count", () => {
    expect(
      slipsCountedAgainByMovingQuitDay(quit("2026-11-10", ["2026-11-06"]), "2026-11-06"),
    ).toEqual([]);
  });

  it("lists none when the quit day moves later or stays", () => {
    const habit = quit("2026-11-10", ["2026-11-05", "2026-11-15"]);
    expect(slipsCountedAgainByMovingQuitDay(habit, "2026-11-20")).toEqual([]);
    expect(slipsCountedAgainByMovingQuitDay(habit, "2026-11-10")).toEqual([]);
  });

  it("leaves out slips that already count", () => {
    const habit = quit("2026-11-10", ["2026-11-12", "2026-11-20"]);
    expect(slipsCountedAgainByMovingQuitDay(habit, "2026-11-01")).toEqual([]);
  });

  it("leaves out slips after today, which wait until their day comes", () => {
    const habit = quit("2026-11-10", ["2026-11-05", "2026-11-25"]);
    expect(slipsCountedAgainByMovingQuitDay(habit, "2026-11-01")).toEqual(["2026-11-05"]);
  });

  it("leaves out slips on archived days, which count neither way", () => {
    // archived on the 12th and restored on the 20th: with the quit day on the 1st, the 13th to the 19th are archived days
    const archived = [{ archivedOn: "2026-11-12", restoredOn: "2026-11-20" }];
    const habit = quit("2026-11-16", ["2026-11-11", "2026-11-15"], archived);
    expect(slipsCountedAgainByMovingQuitDay(habit, "2026-11-01")).toEqual(["2026-11-11"]);
  });

  it("matches the change in the current streak", () => {
    const habit = quit("2026-11-20", ["2026-11-18"]);
    expect(currentStreakDays(habit)).toBe(4);
    expect(slipsCountedAgainByMovingQuitDay(habit, "2026-11-10")).toEqual(["2026-11-18"]);
    expect(currentStreakDays({ ...habit, quitDay: "2026-11-10" })).toBe(6);
  });

  it("never lists a slip that moving the quit day removes", () => {
    const habit = quit("2026-11-10", ["2026-11-05", "2026-11-12", "2026-11-20"]);
    for (const day of ["2026-11-01", "2026-11-12", "2026-11-24"]) {
      const removed = slipsRemovedByMovingQuitDay(habit, day);
      const countedAgain = slipsCountedAgainByMovingQuitDay(habit, day);
      expect(removed.filter((slip) => countedAgain.includes(slip))).toEqual([]);
    }
  });
});
