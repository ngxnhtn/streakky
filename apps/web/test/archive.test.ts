import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
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
const names = (habits: { name: string }[]) => habits.map((h) => h.name);

describe("archiving a habit", () => {
  it("moves it from the active habits to the archived habits", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Stretch"));
    await device.archiveHabit(device.habits()[0].id);
    expect([names(device.habits()), names(device.archivedHabits())]).toEqual([
      ["Stretch"],
      ["Morning run"],
    ]);
  });

  it("keeps its check-ins and slips", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const [morningRun, smoking] = device.habits();
    for (const day of ["2026-11-22", "2026-11-23", "2026-11-24"])
      await device.toggleDay(morningRun.id, day);
    await device.toggleDay(smoking.id, "2026-11-20");
    await device.archiveHabit(morningRun.id);
    await device.archiveHabit(smoking.id);
    expect(device.archivedHabits()).toMatchObject([
      { name: "Morning run", checkIns: ["2026-11-22", "2026-11-23", "2026-11-24"] },
      { name: "No smoking", quitDay: "2026-11-14", slips: ["2026-11-20"] },
    ]);
  });

  it("lists archived habits in the person's order", async () => {
    const device = await openDevice(createStorage());
    for (const name of ["Morning run", "Read 20 pages", "Stretch"])
      await device.createHabit(build(name));
    const [morningRun, reading, stretch] = device.habits();
    await device.archiveHabit(stretch.id);
    await device.archiveHabit(morningRun.id);
    await device.archiveHabit(reading.id);
    expect(names(device.archivedHabits())).toEqual(["Morning run", "Read 20 pages", "Stretch"]);
  });

  it("keeps it archived after a restart", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit(build("Morning run"));
    await before.toggleDay(before.habits()[0].id);
    await before.archiveHabit(before.habits()[0].id);
    await before.close();

    const after = await openDevice(storage);
    expect([after.habits(), after.archivedHabits()]).toMatchObject([
      [],
      [{ name: "Morning run", checkIns: ["2026-11-24"] }],
    ]);
  });

  it("leaves an archived habit's days as they are until it is restored", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const [morningRun, smoking] = device.habits();
    await device.toggleDay(morningRun.id, "2026-11-23");
    await device.archiveHabit(morningRun.id);
    await device.archiveHabit(smoking.id);
    await device.toggleDay(morningRun.id);
    await device.toggleDay(morningRun.id, "2026-11-23");
    await device.toggleDay(smoking.id, "2026-11-20");
    expect(device.archivedHabits()).toMatchObject([
      { name: "Morning run", checkIns: ["2026-11-23"] },
      { name: "No smoking", slips: [] },
    ]);
  });

  it("tells the screens", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const heard: string[][] = [];
    device.subscribe(() => heard.push(names(device.archivedHabits())));
    await device.archiveHabit(device.habits()[0].id);
    expect(heard.at(-1)).toEqual(["Morning run"]);
  });
});

describe("restoring an archived habit", () => {
  it("brings it back to the active habits, in its place, with its full history", async () => {
    const device = await openDevice(createStorage());
    for (const name of ["Morning run", "Read 20 pages", "Stretch"])
      await device.createHabit(build(name));
    const reading = device.habits()[1];
    for (const day of ["2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24"])
      await device.toggleDay(reading.id, day);
    await device.archiveHabit(reading.id);
    await device.restoreHabit(reading.id);
    expect([device.habits(), device.archivedHabits()]).toMatchObject([
      [
        { name: "Morning run" },
        {
          name: "Read 20 pages",
          checkIns: ["2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24"],
        },
        { name: "Stretch" },
      ],
      [],
    ]);
  });

  it("takes check-ins again once restored", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = device.habits()[0];
    await device.archiveHabit(id);
    await device.restoreHabit(id);
    await device.toggleDay(id);
    expect(device.habits()).toMatchObject([{ name: "Morning run", checkIns: ["2026-11-24"] }]);
  });

  it("keeps it restored after a restart", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit(build("Morning run"));
    await before.archiveHabit(before.habits()[0].id);
    await before.restoreHabit(before.archivedHabits()[0].id);
    await before.close();

    const after = await openDevice(storage);
    expect([names(after.habits()), after.archivedHabits()]).toEqual([["Morning run"], []]);
  });
});

describe("deleting a habit", () => {
  it("takes it and its days off the active habits, and leaves the others", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Stretch"));
    const [morningRun, stretch] = device.habits();
    await device.toggleDay(morningRun.id);
    await device.toggleDay(stretch.id);
    await device.deleteHabit(morningRun.id);
    expect([device.habits(), device.archivedHabits()]).toMatchObject([
      [{ name: "Stretch", checkIns: ["2026-11-24"] }],
      [],
    ]);
  });

  it("takes an archived habit off the archived habits", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const { id } = device.habits()[0];
    await device.archiveHabit(id);
    await device.deleteHabit(id);
    expect([device.habits(), device.archivedHabits()]).toEqual([[], []]);
  });

  it("keeps it deleted after a restart", async () => {
    const storage = createStorage();
    const before = await openDevice(storage);
    await before.createHabit(build("Morning run"));
    await before.toggleDay(before.habits()[0].id);
    await before.deleteHabit(before.habits()[0].id);
    await before.close();

    const after = await openDevice(storage);
    expect([after.habits(), after.archivedHabits()]).toEqual([[], []]);
  });

  it("still lists new habits after the others", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Stretch"));
    await device.deleteHabit(device.habits()[1].id);
    await device.createHabit(build("Read 20 pages"));
    expect(names(device.habits())).toEqual(["Morning run", "Read 20 pages"]);
  });
});

describe("a deleted habit", () => {
  it("can't be restored or archived", async () => {
    const storage = createStorage();
    const device = await openDevice(storage);
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Stretch"));
    const [morningRun, stretch] = device.habits();
    await device.archiveHabit(stretch.id);
    await device.deleteHabit(morningRun.id);
    await device.deleteHabit(stretch.id);
    await device.restoreHabit(morningRun.id);
    await device.restoreHabit(stretch.id);
    await device.archiveHabit(morningRun.id);
    const shown = [device.habits(), device.archivedHabits()];
    await device.close();

    const reopened = await openDevice(storage);
    await reopened.restoreHabit(stretch.id);
    expect([shown, [reopened.habits(), reopened.archivedHabits()]]).toEqual([
      [[], []],
      [[], []],
    ]);
  });

  it("refuses check-ins and slips", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(quit("No smoking", "2026-11-14"));
    const [morningRun, smoking] = device.habits();
    await device.deleteHabit(morningRun.id);
    await device.deleteHabit(smoking.id);
    await device.toggleDay(morningRun.id);
    await device.toggleDay(smoking.id, "2026-11-20");
    // nothing logged on a deleted habit reaches the export either
    expect([device.habits(), JSON.parse(device.exportHabits().text).habits]).toEqual([[], []]);
  });

  it("stays deleted when it is deleted again", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    const { id } = device.habits()[0];
    await device.deleteHabit(id);
    await device.deleteHabit(id);
    await device.restoreHabit(id);
    expect([device.habits(), device.archivedHabits()]).toEqual([[], []]);
  });
});

describe("commands on a habit that isn't there", () => {
  it("change nothing", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.archiveHabit("no-such-habit");
    await device.restoreHabit("no-such-habit");
    await device.deleteHabit("no-such-habit");
    expect([names(device.habits()), device.archivedHabits()]).toEqual([["Morning run"], []]);
  });
});
