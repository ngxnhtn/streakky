import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  defaultSettings,
  currentStreakDays,
  HABIT_NAME_MAX_LENGTH,
  loggedToday,
  streaksOf,
  type Habit,
} from "@streakky/core";
import type { NewHabit } from "../src/store/habit-store.ts";
import { createStorage, openDevice } from "./devices.ts";

// Every test starts on Tuesday 24 November 2026, local time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 9));
});
afterEach(() => vi.useRealTimers());

const build = (name: string) => ({ kind: "build" as const, name, color: "green" as const });

describe("a device on its own", () => {
  it("shows a new build habit", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit({ kind: "build", name: "Morning run", color: "green" });
    expect(device.habits()).toMatchObject([
      { kind: "build", name: "Morning run", color: "green", goal: null, checkIns: [] },
    ]);
  });

  it("won't make a habit with an empty name, a name too long, or a colour that isn't one", async () => {
    const device = await openDevice(createStorage());
    const tooLong = "a".repeat(HABIT_NAME_MAX_LENGTH + 1);
    for (const habit of [build(" "), build(tooLong), { ...build("Run"), color: "purple" }]) {
      await expect(device.createHabit(habit as NewHabit)).rejects.toThrow();
    }
    await device.createHabit(build("a".repeat(HABIT_NAME_MAX_LENGTH)));
    expect(device.habits().map((h) => h.name.length)).toEqual([HABIT_NAME_MAX_LENGTH]);
  });

  it("lists new habits after the existing ones", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Read 20 pages"));
    await device.createHabit(build("Stretch"));
    expect(device.habits().map((h) => h.name)).toEqual(["Morning run", "Read 20 pages", "Stretch"]);
  });

  it("checks in today and undoes it", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = device.habits()[0];
    await device.toggleDay(id);
    const checkedIn = currentStreakDays(device.habits()[0]);
    await device.toggleDay(id);
    expect([checkedIn, currentStreakDays(device.habits()[0])]).toEqual([1, 0]);
  });

  it("counts the current streak as the days pass", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = device.habits()[0];
    const streakOn = (day: number) => {
      vi.setSystemTime(new Date(2026, 10, day, 9));
      return currentStreakDays(device.habits()[0]);
    };
    await device.toggleDay(id);
    const counts = [streakOn(24), streakOn(25)];
    await device.toggleDay(id);
    counts.push(streakOn(25), streakOn(26), streakOn(27));
    expect(counts).toEqual([1, 1, 2, 2, 0]);
  });
});

describe("device settings", () => {
  it("keep only the stored settings it recognises", async () => {
    const storage = createStorage();
    // as an older or damaged version of the app might have left them
    storage.keyValues.setItem(
      "streakky.settings",
      JSON.stringify({ theme: "dark", palette: "violet", layout: 5, weekStart: 0 }),
    );
    const device = await openDevice(storage);
    expect(device.settings()).toMatchObject({
      theme: "dark",
      palette: "teal",
      layout: "grid",
      weekStart: 0,
    });
  });

  it("ignore stored settings that aren't an object", async () => {
    const storage = createStorage();
    storage.keyValues.setItem("streakky.settings", JSON.stringify(["dark"]));
    const device = await openDevice(storage);
    expect(device.settings()).toEqual(defaultSettings);
  });

  it("start with the system theme, teal palette, grid layout and Monday weeks", async () => {
    const device = await openDevice(createStorage());
    expect(device.settings()).toMatchObject({
      theme: "system",
      palette: "teal",
      layout: "grid",
      weekStart: 1,
    });
  });

  it("change straight away, and the screens hear of it", async () => {
    const device = await openDevice(createStorage());
    const heard: string[] = [];
    device.subscribe(() => heard.push(device.settings().theme));
    device.changeSettings({ theme: "dark" });
    expect([heard, device.settings()]).toMatchObject([
      ["dark"],
      { theme: "dark", palette: "teal", layout: "grid", weekStart: 1 },
    ]);
  });

  it("keep a change made in another tab when this tab changes a different one", async () => {
    const storage = createStorage();
    const [tab, otherTab] = [await openDevice(storage), await openDevice(storage)];
    otherTab.changeSettings({ theme: "dark" });
    tab.changeSettings({ palette: "olive" });
    await Promise.all([tab.close(), otherTab.close()]);

    const reopened = await openDevice(storage);
    expect(reopened.settings()).toMatchObject({ theme: "dark", palette: "olive" });
  });
});

describe("a device after a restart", () => {
  it("still has its habits and check-ins", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit(build("Morning run"));
    await before.toggleDay(before.habits()[0].id);
    await before.close();

    const after = await openDevice(storage);
    expect(after.habits()).toMatchObject([{ name: "Morning run", checkIns: ["2026-11-24"] }]);
  });

  it("still has its settings", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    before.changeSettings({ theme: "dark", palette: "oxblood" });
    before.changeSettings({ layout: "list", weekStart: 0 });
    await before.close();

    const after = await openDevice(storage);
    expect(after.settings()).toMatchObject({
      theme: "dark",
      palette: "oxblood",
      layout: "list",
      weekStart: 0,
    });
  });
});

const quit = (name: string, quitDay: string) => ({
  kind: "quit" as const,
  name,
  color: "red" as const,
  quitDay,
});

describe("a quit habit on a device", () => {
  it("counts its clean days since a past quit day", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    expect(currentStreakDays(device.habits()[0])).toBe(10);
  });

  it("resets the current streak with a slip today", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    await device.toggleDay(device.habits()[0].id);
    expect(currentStreakDays(device.habits()[0])).toBe(0);
  });

  it("restores the current streak when today's slip is removed", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    await device.toggleDay(id);
    await device.toggleDay(id);
    expect(currentStreakDays(device.habits()[0])).toBe(10);
  });

  it("adds a clean day as each day passes", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const before = currentStreakDays(device.habits()[0]);
    vi.setSystemTime(new Date(2026, 10, 25, 9));
    expect([before, currentStreakDays(device.habits()[0])]).toEqual([10, 11]);
  });

  it("can't be created with a quit day in the future", async () => {
    const device = await openDevice(createStorage());
    await expect(device.createHabit(quit("No smoking", "2026-11-25"))).rejects.toThrow();
    expect(device.habits()).toEqual([]);
  });

  it("can't be created without a quit day", async () => {
    const device = await openDevice(createStorage());
    await expect(device.createHabit(quit("No smoking", ""))).rejects.toThrow();
    expect(device.habits()).toEqual([]);
  });

  it("refuses slips on or before its quit day", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-24"));
    const { id } = device.habits()[0];
    await device.toggleDay(id);
    await device.toggleDay(id, "2026-11-20");
    expect(device.habits()[0]).toMatchObject({ slips: [] });
  });

  it("keeps its quit day and slips after a restart", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit(quit("No smoking", "2026-11-14"));
    await before.toggleDay(before.habits()[0].id, "2026-11-20");
    await before.close();

    const after = await openDevice(storage);
    expect(after.habits()).toMatchObject([
      { kind: "quit", name: "No smoking", quitDay: "2026-11-14", slips: ["2026-11-20"] },
    ]);
  });
});

describe("an export from a device", () => {
  it("holds every habit with its fields and its check-ins or slips by day", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const [morningRun, smoking] = device.habits();
    for (const day of ["2026-11-21", "2026-11-23", "2026-11-24"])
      await device.toggleDay(morningRun.id, day);
    // a check-in added and removed again isn't one
    await device.toggleDay(morningRun.id, "2026-11-22");
    await device.toggleDay(morningRun.id, "2026-11-22");
    await device.toggleDay(smoking.id, "2026-11-20");

    const { habits } = JSON.parse(device.exportHabits().text);
    expect(habits).toEqual([
      {
        id: morningRun.id,
        kind: "build",
        name: "Morning run",
        color: "green",
        goal: null,
        archived: false,
        archivedPeriods: [],
        checkIns: ["2026-11-21", "2026-11-23", "2026-11-24"],
      },
      {
        id: smoking.id,
        kind: "quit",
        name: "No smoking",
        color: "red",
        goal: null,
        quitDay: "2026-11-14",
        archived: false,
        archivedPeriods: [],
        slips: ["2026-11-20"],
      },
    ]);
  });

  it("matches the habits the device shows, in their order", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    await device.createHabit(build("Stretch"));
    await device.toggleDay(device.habits()[0].id);
    await device.toggleDay(device.habits()[1].id, "2026-11-18");

    const { habits } = JSON.parse(device.exportHabits().text);
    expect(habits).toEqual(device.habits().map((habit) => ({ ...habit, archived: false })));
  });

  it("is a JSON file named with today's date, saying its format and version", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const file = device.exportHabits();
    expect([file.name, file.type, JSON.parse(file.text)]).toMatchObject([
      "streakky-2026-11-24.json",
      "application/json",
      { format: "streakky-export", version: 2 },
    ]);
  });

  it.each([
    ["Asia/Kathmandu", "2026-11-24T09:00:00+05:45"],
    ["America/St_Johns", "2026-11-24T09:00:00-03:30"],
  ])("gives the time it was made in the device's time zone (%s)", async (zone, exportedAt) => {
    const deviceZone = process.env.TZ;
    process.env.TZ = zone;
    try {
      vi.setSystemTime(new Date(2026, 10, 24, 9));
      const device = await openDevice(createStorage());
      const content = JSON.parse(device.exportHabits().text);
      expect([content.exportedAt, Date.parse(content.exportedAt)]).toEqual([
        exportedAt,
        new Date(2026, 10, 24, 9).getTime(),
      ]);
    } finally {
      if (deviceZone === undefined) delete process.env.TZ;
      else process.env.TZ = deviceZone;
    }
  });

  it("keeps a check-in on a day that hasn't come yet, as after flying west", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.toggleDay(device.habits()[0].id);
    // the clock goes back past midnight: the check-in doesn't count until its day comes, but it stays
    vi.setSystemTime(new Date(2026, 10, 23, 22));
    const { habits } = JSON.parse(device.exportHabits().text);
    expect([currentStreakDays(device.habits()[0]), habits[0].checkIns]).toEqual([
      0,
      ["2026-11-24"],
    ]);
  });

  it("is empty on a device with no habits", async () => {
    const device = await openDevice(createStorage());
    expect(JSON.parse(device.exportHabits().text)).toMatchObject({ habits: [] });
  });

  it("includes archived habits, marked archived, in their place in the order", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    await device.createHabit(build("Stretch"));
    const [morningRun, smoking, stretch] = device.habits();
    await device.toggleDay(smoking.id, "2026-11-20");
    await device.archiveHabit(smoking.id);

    const { habits } = JSON.parse(device.exportHabits().text);
    expect(habits).toEqual([
      { ...morningRun, archived: false },
      { ...device.archivedHabits()[0], archived: true },
      { ...stretch, archived: false },
    ]);
    expect(habits[1]).toMatchObject({ name: "No smoking", slips: ["2026-11-20"] });
  });

  it("leaves out deleted habits and their days", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Stretch"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const [morningRun, stretch, smoking] = device.habits();
    await device.toggleDay(stretch.id);
    await device.toggleDay(smoking.id, "2026-11-20");
    await device.archiveHabit(smoking.id);
    await device.deleteHabit(stretch.id);
    await device.deleteHabit(smoking.id);

    const { habits } = JSON.parse(device.exportHabits().text);
    expect(habits).toEqual([{ ...morningRun, archived: false }]);
  });
});

describe("editing past days on a device", () => {
  const streakLengths = (habit: Habit) => streaksOf(habit).map((s) => s.days);

  it("joins two streaks into one when a missed day is backfilled", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = device.habits()[0];
    for (const day of ["2026-11-21", "2026-11-22", "2026-11-24"]) await device.toggleDay(id, day);
    const before = streakLengths(device.habits()[0]);
    await device.toggleDay(id, "2026-11-23");
    expect([before, streakLengths(device.habits()[0])]).toEqual([[2, 1], [4]]);
  });

  it("splits a streak when a past check-in is removed", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = device.habits()[0];
    for (const day of ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24"]) {
      await device.toggleDay(id, day);
    }
    const before = streakLengths(device.habits()[0]);
    await device.toggleDay(id, "2026-11-22");
    expect([before, streakLengths(device.habits()[0])]).toEqual([[5], [2, 2]]);
  });

  it("splits a quit streak with a past slip", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    const before = streakLengths(device.habits()[0]);
    await device.toggleDay(id, "2026-11-20");
    // clean 15–19 November, the slip on the 20th, clean again 21–24 November
    expect([before, streakLengths(device.habits()[0])]).toEqual([[10], [5, 4]]);
  });

  it("refuses a check-in or a slip on a future day", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const [morningRun, smoking] = device.habits();
    await device.toggleDay(morningRun.id, "2026-11-25");
    await device.toggleDay(smoking.id, "2026-11-25");
    // when that day comes, neither was logged
    vi.setSystemTime(new Date(2026, 10, 25, 9));
    expect(device.habits().map((h) => [loggedToday(h), currentStreakDays(h)])).toEqual([
      [false, 0],
      [false, 11],
    ]);
  });
});
