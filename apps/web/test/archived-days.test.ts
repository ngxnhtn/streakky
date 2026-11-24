import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { archivedDays, currentStreakDays, goalDate, toISO } from "@streakky/core";
import type { HabitRecord, HabitStore } from "../src/store/habit-store.ts";
import { createStorage, openDevice, storedHabits, storeRecords } from "./devices.ts";

// Every test starts on Tuesday 24 November 2026, local time; `on` moves the clock to another day.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 9));
});
afterEach(() => vi.useRealTimers());

/** Moves the device's clock to 9am on a day, given as YYYY-MM-DD. */
const on = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, 9));
};

const build = (name: string) => ({ kind: "build" as const, name, color: "green" as const });
const quit = (name: string, quitDay: string, goal: number | null = null) => ({
  kind: "quit" as const,
  name,
  color: "red" as const,
  quitDay,
  goal,
});

/** The one habit on the device, active or archived. */
const only = (device: HabitStore) => [...device.habits(), ...device.archivedHabits()][0];
const count = (device: HabitStore) => currentStreakDays(only(device));

describe("an archived quit habit", () => {
  it("stops counting while it's archived, and carries on from there once restored", async () => {
    const storage = createStorage();
    const device = await openDevice(storage);
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    await device.archiveHabit(id);
    // the day it's archived on still counts
    const onArchiveDay = count(device);
    on("2026-11-30");
    const whileArchived = count(device);
    await device.restoreHabit(id);
    const onRestoreDay = count(device);
    on("2026-12-01");
    expect([onArchiveDay, whileArchived, onRestoreDay, count(device)]).toEqual([10, 10, 11, 12]);
  });

  it("keeps its archived period on its record, with `archived` and at the same edit time", async () => {
    const storage = createStorage();
    const device = await openDevice(storage);
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    // a minute after making it
    vi.setSystemTime(new Date(2026, 10, 24, 9, 1));
    await device.archiveHabit(id);
    await device.close();
    const archived = (await storedHabits(storage))[0];

    on("2026-11-30");
    const reopened = await openDevice(storage);
    await reopened.restoreHabit(id);
    const restoredAt = Date.now();
    await reopened.close();
    const restored = (await storedHabits(storage))[0];

    expect([archived, restored]).toMatchObject([
      {
        archived: true,
        archivedPeriods: [{ archivedOn: "2026-11-24", restoredOn: null }],
        edited: {
          archived: new Date(2026, 10, 24, 9, 1).getTime(),
          archivedPeriods: new Date(2026, 10, 24, 9, 1).getTime(),
        },
      },
      {
        archived: false,
        archivedPeriods: [{ archivedOn: "2026-11-24", restoredOn: "2026-11-30" }],
        edited: { archived: restoredAt, archivedPeriods: restoredAt },
      },
    ]);
  });

  it("holds its count across a restart while it's archived", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit(quit("No smoking", "2026-11-14"));
    await before.archiveHabit(before.habits()[0].id);
    await before.close();

    on("2026-12-24");
    const after = await openDevice(storage);
    expect([after.habits(), count(after), archivedDays(only(after)).length]).toEqual([[], 10, 30]);
  });

  it("leaves no archived days when it's restored the day it was archived", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    await device.archiveHabit(id);
    await device.restoreHabit(id);
    on("2026-11-30");
    expect([count(device), only(device).archivedPeriods]).toEqual([
      16,
      [{ archivedOn: "2026-11-24", restoredOn: "2026-11-24" }],
    ]);
  });

  it("keeps every archived period and leaves each one's days out", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    await device.archiveHabit(id);
    on("2026-11-27");
    await device.restoreHabit(id);
    on("2026-11-29");
    await device.archiveHabit(id);
    on("2026-12-03");
    await device.restoreHabit(id);
    // 19 days since the quit day; the 25th, 26th, 30th, 1st and 2nd were archived
    expect([count(device), only(device).archivedPeriods]).toEqual([
      14,
      [
        { archivedOn: "2026-11-24", restoredOn: "2026-11-27" },
        { archivedOn: "2026-11-29", restoredOn: "2026-12-03" },
      ],
    ]);
  });

  it("doesn't end its streak while archived: a slip before archiving still began it", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    await device.toggleDay(id, "2026-11-23");
    await device.archiveHabit(id);
    on("2026-11-30");
    await device.restoreHabit(id);
    // clean on the 24th and the 30th, the archived days between left out
    expect([count(device), only(device)]).toMatchObject([2, { slips: ["2026-11-23"] }]);
  });

  it("takes no slip on an archived day once restored, but does on the days it was archived and restored", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    await device.archiveHabit(id);
    on("2026-11-30");
    await device.restoreHabit(id);
    for (const day of ["2026-11-24", "2026-11-27", "2026-11-30"]) await device.toggleDay(id, day);
    expect(only(device)).toMatchObject({ slips: ["2026-11-24", "2026-11-30"] });
  });

  it("reaches its goal only once its clean days do, and celebrates nothing while archived", async () => {
    const device = await openDevice(createStorage());
    // 4 days free on the 24th, with 3 to go
    await device.createHabit(quit("No sugar", "2026-11-20", 7));
    const { id } = device.habits()[0];
    await device.archiveHabit(id);
    on("2026-12-10");
    const dueWhileArchived = device.celebrationDue(only(device));
    await device.restoreHabit(id);
    const dueOnRestore = device.celebrationDue(only(device));
    const day = goalDate(only(device));
    on("2026-12-11");
    const dueNextDay = device.celebrationDue(only(device));
    on("2026-12-12");
    expect([dueWhileArchived, dueOnRestore, day && toISO(day), dueNextDay]).toEqual([
      false,
      false,
      "2026-12-12",
      false,
    ]);
    expect(device.celebrationDue(only(device))).toBe(true);
  });
});

describe("an archived build habit", () => {
  it("breaks its streak as days without check-ins would, though its period is kept", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = device.habits()[0];
    for (const day of ["2026-11-22", "2026-11-23", "2026-11-24"]) await device.toggleDay(id, day);
    await device.archiveHabit(id);
    const whenArchived = count(device);
    on("2026-11-27");
    await device.restoreHabit(id);
    expect([whenArchived, count(device), only(device).archivedPeriods]).toEqual([
      3,
      0,
      [{ archivedOn: "2026-11-24", restoredOn: "2026-11-27" }],
    ]);
  });
});

describe("archiving and restoring again", () => {
  it("change nothing: an archived habit isn't archived twice, nor an active one restored", async () => {
    const storage = createStorage();
    const device = await openDevice(storage);
    await device.createHabit(quit("No smoking", "2026-11-14"));
    await device.createHabit(quit("No sugar", "2026-11-14"));
    const [smoking, sugar] = device.habits();
    await device.archiveHabit(smoking.id);
    await device.close();
    const before = await storedHabits(storage);

    on("2026-11-26");
    const reopened = await openDevice(storage);
    await reopened.archiveHabit(smoking.id);
    await reopened.restoreHabit(sugar.id);
    await reopened.close();
    expect(await storedHabits(storage)).toEqual(before);
  });
});

/**
 * A quit habit record as an earlier version of the app stored it, before archived periods were
 * kept: no `archivedPeriods` and no edit time for it.
 */
const storedBeforeArchivedPeriods = (archived: boolean): HabitRecord => {
  const editedAt = new Date(2026, 10, 14, 9).getTime();
  return {
    id: "smoking",
    kind: "quit",
    name: "No smoking",
    color: "red",
    goal: null,
    quitDay: "2026-11-14",
    archived,
    order: "a0",
    deleted: false,
    edited: {
      name: editedAt,
      color: editedAt,
      goal: editedAt,
      quitDay: editedAt,
      archived: archived ? new Date(2026, 10, 20, 9).getTime() : editedAt,
      order: editedAt,
    },
  };
};

describe("a habit stored before archived periods were kept", () => {
  it("reads as never archived before, and counts every day", async () => {
    const storage = createStorage();
    await storeRecords(storage, { habits: [storedBeforeArchivedPeriods(false)] });
    const device = await openDevice(storage);
    expect(device.habits()).toMatchObject([{ name: "No smoking", archivedPeriods: [] }]);
    expect(count(device)).toBe(10);
  });

  it("starts its first archived period when it's archived", async () => {
    const storage = createStorage();
    await storeRecords(storage, { habits: [storedBeforeArchivedPeriods(false)] });
    const device = await openDevice(storage);
    await device.archiveHabit("smoking");
    on("2026-11-30");
    expect(count(device)).toBe(10);
  });

  it("still counts the days it spent archived before then, and is restored with no period made up", async () => {
    const storage = createStorage();
    await storeRecords(storage, { habits: [storedBeforeArchivedPeriods(true)] });
    const device = await openDevice(storage);
    const whileArchived = count(device);
    await device.restoreHabit("smoking");
    const restored = count(device);
    await device.close();
    expect([whileArchived, restored, (await storedHabits(storage))[0]]).toMatchObject([
      10,
      10,
      { archived: false, archivedPeriods: [], edited: { archivedPeriods: Date.now() } },
    ]);
  });
});

describe("an export with archived habits", () => {
  it("keeps every archived period, in version 2 of the file", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const [morningRun, smoking] = device.habits();
    await device.archiveHabit(smoking.id);
    on("2026-11-30");
    await device.restoreHabit(smoking.id);
    on("2026-12-02");
    await device.archiveHabit(smoking.id);

    const content = JSON.parse(device.exportHabits().text);
    expect(content).toMatchObject({ format: "streakky-export", version: 2 });
    expect(content.habits).toEqual([
      { ...morningRun, archived: false, archivedPeriods: [] },
      {
        id: smoking.id,
        kind: "quit",
        name: "No smoking",
        color: "red",
        goal: null,
        quitDay: "2026-11-14",
        archived: true,
        archivedPeriods: [
          { archivedOn: "2026-11-24", restoredOn: "2026-11-30" },
          { archivedOn: "2026-12-02", restoredOn: null },
        ],
        slips: [],
      },
    ]);
  });

  it("matches the archived habits the device shows", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    await device.createHabit(build("Morning run"));
    for (const habit of device.habits()) await device.archiveHabit(habit.id);
    on("2026-11-30");

    const { habits } = JSON.parse(device.exportHabits().text);
    expect(habits).toEqual(device.archivedHabits().map((habit) => ({ ...habit, archived: true })));
  });

  it("keeps a slip on an archived day, which doesn't count", async () => {
    // as a slip logged on another device would arrive, where the habit wasn't archived
    const storage = createStorage();
    await storeRecords(storage, {
      habits: [
        {
          ...storedBeforeArchivedPeriods(false),
          archivedPeriods: [{ archivedOn: "2026-11-18", restoredOn: "2026-11-22" }],
        },
      ],
      days: [{ habitId: "smoking", day: "2026-11-20", logged: true, edited: Date.now() }],
    });
    const device = await openDevice(storage);
    const { habits } = JSON.parse(device.exportHabits().text);
    // the 19th, 20th and 21st were archived
    expect([count(device), habits[0].slips]).toEqual([7, ["2026-11-20"]]);
  });

  it("gives a habit stored before archived periods were kept none", async () => {
    const storage = createStorage();
    await storeRecords(storage, { habits: [storedBeforeArchivedPeriods(true)] });
    const device = await openDevice(storage);
    const { habits } = JSON.parse(device.exportHabits().text);
    expect(habits).toMatchObject([{ archived: true, archivedPeriods: [] }]);
  });
});
