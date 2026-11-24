import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  currentStreakDays,
  goalDate,
  streaksOf,
  toISO,
  type Habit,
  type QuitHabit,
} from "@streakky/core";
import type { HabitStore } from "../src/store/habit-store.ts";
import { createStorage, openDevice } from "./devices.ts";

// Every test starts on Tuesday 24 November 2026, local time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 9));
});
afterEach(() => vi.useRealTimers());

const build = (name: string) => ({ kind: "build" as const, name, color: "green" as const });
const quit = (name: string, quitDay: string) => ({
  kind: "quit" as const,
  name,
  color: "red" as const,
  quitDay,
});
const on = (day: number) => vi.setSystemTime(new Date(2026, 10, day, 9));
/** The device's one habit. */
const only = (device: HabitStore): Habit => device.habits()[0];
const onlyQuit = (device: HabitStore): QuitHabit => {
  const habit = only(device);
  if (habit.kind !== "quit") throw new Error(`${habit.name} isn't a quit habit`);
  return habit;
};

describe("editing a habit on a device", () => {
  it("renames it", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning rnu"));
    await device.editHabit(only(device).id, { name: "Morning run" });
    expect(only(device)).toMatchObject({ name: "Morning run", color: "green" });
  });

  it("changes its colour", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.editHabit(only(device).id, { color: "blue" });
    expect(only(device)).toMatchObject({ name: "Morning run", color: "blue" });
  });

  it("keeps its kind and its days", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = only(device);
    for (const day of ["2026-11-22", "2026-11-23", "2026-11-24"]) await device.toggleDay(id, day);
    await device.editHabit(id, { name: "Evening run", color: "ochre", goal: 7 });
    expect([only(device), currentStreakDays(only(device))]).toMatchObject([
      { kind: "build", checkIns: ["2026-11-22", "2026-11-23", "2026-11-24"] },
      3,
    ]);
  });

  it("tells the screens at once", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const heard: string[] = [];
    device.subscribe(() => heard.push(only(device).name));
    await device.editHabit(only(device).id, { name: "Evening run" });
    expect(heard.at(-1)).toBe("Evening run");
  });

  it("keeps the edits after a restart", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit(quit("No smokng", "2026-11-14"));
    await before.editHabit(only(before).id, { name: "No smoking", color: "teal", goal: 30 });
    await before.close();

    const after = await openDevice(storage);
    expect(after.habits()).toMatchObject([
      { kind: "quit", name: "No smoking", color: "teal", goal: 30, quitDay: "2026-11-14" },
    ]);
  });

  it("refuses an empty name", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await expect(device.editHabit(only(device).id, { name: "  " })).rejects.toThrow();
    expect(only(device).name).toBe("Morning run");
  });
});

describe("a habit's goal on a device", () => {
  it("can be chosen when creating the habit", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ ...build("Morning run"), goal: 30 });
    await device.createHabit({ ...quit("No smoking", "2026-11-14"), goal: 90 });
    await device.createHabit(build("Stretch"));
    expect(device.habits().map((h) => h.goal)).toEqual([30, 90, null]);
  });

  it("can be set, changed and removed later", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = only(device);
    const goals = [only(device).goal];
    for (const goal of [7, 21, null]) {
      await device.editHabit(id, { goal });
      goals.push(only(device).goal);
    }
    expect(goals).toEqual([null, 7, 21, null]);
  });

  it("is one of the presets", async () => {
    const device = await openDevice(createStorage());
    await expect(device.createHabit({ ...build("Morning run"), goal: 10 })).rejects.toThrow();
    await device.createHabit(build("Morning run"));
    await expect(device.editHabit(only(device).id, { goal: 10 })).rejects.toThrow();
    expect(device.habits()).toMatchObject([{ name: "Morning run", goal: null }]);
  });

  it("says when the current streak will reach it", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ ...quit("No smoking", "2026-11-14"), goal: 21 });
    // ten clean days so far, eleven to go
    expect(toISO(goalDate(only(device))!)).toBe("2026-12-05");
  });
});

describe("moving a quit habit's quit day on a device", () => {
  const streakLengths = (habit: Habit) => streaksOf(habit).map((s) => s.days);

  it("moves it to an earlier day, which adds clean days", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    await device.moveQuitDay(only(device).id, "2026-11-04");
    expect([onlyQuit(device).quitDay, currentStreakDays(only(device))]).toEqual(["2026-11-04", 20]);
  });

  it("removes the slips on or before the new quit day and keeps the later ones", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-01"));
    const { id } = only(device);
    for (const day of ["2026-11-05", "2026-11-10", "2026-11-20"]) await device.toggleDay(id, day);
    await device.moveQuitDay(id, "2026-11-10");
    // clean 11–19 November, the slip on the 20th, clean again 21–24 November
    expect([onlyQuit(device).slips, streakLengths(only(device))]).toEqual([["2026-11-20"], [9, 4]]);
  });

  it("doesn't bring the removed slips back when the quit day moves back", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit(quit("No smoking", "2026-11-01"));
    const { id } = only(before);
    await before.toggleDay(id, "2026-11-05");
    await before.moveQuitDay(id, "2026-11-08");
    await before.moveQuitDay(id, "2026-11-01");
    await before.close();

    const after = await openDevice(storage);
    expect([onlyQuit(after).slips, currentStreakDays(only(after))]).toEqual([[], 23]);
  });

  it("leaves the removed slips out of the export", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-01"));
    const { id } = only(device);
    for (const day of ["2026-11-05", "2026-11-20"]) await device.toggleDay(id, day);
    await device.moveQuitDay(id, "2026-11-06");
    const { habits } = JSON.parse(device.exportHabits().text);
    expect(habits).toMatchObject([{ quitDay: "2026-11-06", slips: ["2026-11-20"] }]);
  });

  it("can move to today, but not to a day that hasn't come", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = only(device);
    await expect(device.moveQuitDay(id, "2026-11-25")).rejects.toThrow();
    const kept = onlyQuit(device).quitDay;
    await device.moveQuitDay(id, "2026-11-24");
    expect([kept, onlyQuit(device).quitDay, currentStreakDays(only(device))]).toEqual([
      "2026-11-14",
      "2026-11-24",
      0,
    ]);
  });

  it("isn't possible for a build habit", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await expect(device.moveQuitDay(only(device).id, "2026-11-20")).rejects.toThrow();
    expect(only(device)).toMatchObject({ kind: "build", checkIns: [] });
  });
});

describe("a goal's celebration on a device", () => {
  it("is due on the check-in that reaches the goal, and once played, not again", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ ...build("Morning run"), goal: 7 });
    const { id } = only(device);
    for (let day = 18; day <= 23; day++) await device.toggleDay(id, `2026-11-${day}`);
    const beforeToday = device.celebrationDue(only(device));
    await device.toggleDay(id);
    const onToday = device.celebrationDue(only(device));
    device.markCelebrated(only(device));
    // undoing and redoing today's check-in reaches the goal again on the same streak
    await device.toggleDay(id);
    await device.toggleDay(id);
    expect([beforeToday, onToday, device.celebrationDue(only(device))]).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("is due for a quit habit on the day its goal is reached", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ ...quit("No smoking", "2026-11-20"), goal: 7 });
    const before = device.celebrationDue(only(device));
    on(27);
    expect([before, device.celebrationDue(only(device))]).toEqual([false, true]);
  });

  it("is due again when the next streak after a slip reaches the same goal", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ ...quit("No smoking", "2026-11-10"), goal: 7 });
    const { id } = only(device);
    device.markCelebrated(only(device));
    await device.toggleDay(id);
    const afterSlip = device.celebrationDue(only(device));
    on(30);
    const sixDaysOn = device.celebrationDue(only(device));
    vi.setSystemTime(new Date(2026, 11, 1, 9));
    expect([afterSlip, sixDaysOn, device.celebrationDue(only(device))]).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("is due again when the same streak reaches a higher goal", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ ...quit("No smoking", "2026-11-10"), goal: 7 });
    const { id } = only(device);
    device.markCelebrated(only(device));
    await device.editHabit(id, { goal: 21 });
    const raised = device.celebrationDue(only(device));
    vi.setSystemTime(new Date(2026, 11, 1, 9));
    expect([raised, device.celebrationDue(only(device))]).toEqual([false, true]);
  });

  it("isn't due for a goal the current streak had already reached when it was set", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ ...quit("No smoking", "2026-11-01"), goal: 7 });
    await device.createHabit(quit("No sugar", "2026-11-01"));
    await device.editHabit(device.habits()[1].id, { goal: 21 });
    expect(device.habits().map((h) => device.celebrationDue(h))).toEqual([false, false]);
  });

  it("isn't due when moving the quit day reaches the goal", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ ...quit("No smoking", "2026-11-20"), goal: 7 });
    await device.moveQuitDay(only(device).id, "2026-11-10");
    expect(device.celebrationDue(only(device))).toBe(false);
  });

  it("stays played after a restart", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit({ ...quit("No smoking", "2026-11-20"), goal: 7 });
    on(27);
    before.markCelebrated(only(before));
    await before.close();

    const after = await openDevice(storage);
    expect(after.celebrationDue(only(after))).toBe(false);
  });

  it("has a Celebrations setting, on at first, that the device keeps", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    const atFirst = before.settings().celebrate;
    before.changeSettings({ celebrate: false });
    await before.close();

    const after = await openDevice(storage);
    expect([atFirst, after.settings().celebrate]).toEqual([true, false]);
  });
});
