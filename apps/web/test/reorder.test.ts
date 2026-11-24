import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { HabitRecord, HabitStore } from "../src/store/habit-store.ts";
import { createStorage, openDevice, storeRecords, type DeviceStorage } from "./devices.ts";

// Every test starts on Tuesday 24 November 2026, local time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 9));
});
afterEach(() => vi.useRealTimers());

const build = (name: string) => ({ kind: "build" as const, name, color: "green" as const });

/** A device with build habits of these names, added in this order. */
async function deviceWith(storage: DeviceStorage, ...names: string[]) {
  const device = await openDevice(storage);
  for (const name of names) await device.createHabit(build(name));
  return device;
}

const namesOf = (device: HabitStore) => device.habits().map((h) => h.name);
const idOf = (device: HabitStore, name: string) =>
  device.habits().find((h) => h.name === name)?.id ?? `no habit named ${name}`;

/** Moves the habit named `name` to just after the one named `after`, or first with null. */
const move = (device: HabitStore, name: string, after: string | null) =>
  device.moveHabit(idOf(device, name), after === null ? null : idOf(device, after));

/** A build habit at `order` as a sync stores it: ties in position show in the order of their ids. */
const syncedAt = (id: string, name: string, order: string): HabitRecord => ({
  id,
  kind: "build",
  name,
  color: "green",
  goal: null,
  quitDay: null,
  archived: false,
  archivedPeriods: [],
  order,
  deleted: false,
  edited: { name: 1, color: 1, goal: 1, quitDay: 1, archived: 1, archivedPeriods: 1, order: 1 },
  pending: false,
});

describe("reordering habits on a device", () => {
  it("moves a habit between two others", async () => {
    const device = await deviceWith(createStorage(), "Morning run", "Read 20 pages", "Stretch");
    await move(device, "Stretch", "Morning run");
    expect(namesOf(device)).toEqual(["Morning run", "Stretch", "Read 20 pages"]);
  });

  it("moves a habit to the top and to the end", async () => {
    const device = await deviceWith(createStorage(), "Morning run", "Read 20 pages", "Stretch");
    await move(device, "Stretch", null);
    const top = namesOf(device);
    await move(device, "Morning run", "Read 20 pages");
    expect([top, namesOf(device)]).toEqual([
      ["Stretch", "Morning run", "Read 20 pages"],
      ["Stretch", "Read 20 pages", "Morning run"],
    ]);
  });

  it("keeps the order after a restart", async () => {
    const storage = createStorage();
    const before = await deviceWith(storage, "Morning run", "Read 20 pages", "Stretch");
    await move(before, "Morning run", "Stretch");
    await before.close();

    const after = await openDevice(storage);
    expect(namesOf(after)).toEqual(["Read 20 pages", "Stretch", "Morning run"]);
  });

  it("ignores a move next to itself, or of or after a habit that isn't there", async () => {
    const device = await deviceWith(createStorage(), "Morning run", "Read 20 pages", "Stretch");
    await move(device, "Stretch", "Stretch");
    await device.moveHabit(idOf(device, "Stretch"), "no-such-habit");
    await device.moveHabit("no-such-habit", null);
    expect(namesOf(device)).toEqual(["Morning run", "Read 20 pages", "Stretch"]);
  });

  it("adds a new habit at the end after a reorder", async () => {
    const device = await deviceWith(createStorage(), "Morning run", "Read 20 pages", "Stretch");
    await move(device, "Stretch", null);
    await device.createHabit(build("Drink water"));
    expect(namesOf(device)).toEqual(["Stretch", "Morning run", "Read 20 pages", "Drink water"]);
  });

  it("keeps the order right through many moves between the same neighbours, and after", async () => {
    const storage = createStorage();
    const device = await deviceWith(storage, "Morning run", "Read 20 pages", "Stretch", "Meditate");
    // the last habit goes between the first two, again and again, so every new position is
    // squeezed in just after the first habit's
    const expected = ["Morning run", "Read 20 pages", "Stretch", "Meditate"];
    const wrongMoves: string[][] = [];
    for (let i = 0; i < 300; i++) {
      const last = expected.pop()!;
      expected.splice(1, 0, last);
      await move(device, last, "Morning run");
      if (namesOf(device).join() !== expected.join()) wrongMoves.push(namesOf(device));
    }
    await device.close();

    const reopened = await openDevice(storage);
    const afterRestart = namesOf(reopened);
    // every habit can still go anywhere: to the top, to the end, and between two squeezed ones
    await move(reopened, "Meditate", null);
    await move(reopened, "Morning run", "Stretch");
    await move(reopened, "Stretch", "Meditate");
    expect([wrongMoves, afterRestart, namesOf(reopened)]).toEqual([
      [],
      ["Morning run", "Read 20 pages", "Stretch", "Meditate"],
      ["Meditate", "Stretch", "Read 20 pages", "Morning run"],
    ]);
  });

  it("places a moved habit after its shown neighbour without taking an archived habit's position", async () => {
    const storage = createStorage();
    // ids that would show "Floss" before "Stretch" if the two shared a position
    await storeRecords(storage, {
      habits: [
        syncedAt("run", "Morning run", "a0"),
        syncedAt("floss", "Floss", "a1"),
        syncedAt("read", "Read 20 pages", "a2"),
        syncedAt("stretch", "Stretch", "a3"),
      ],
    });
    const device = await openDevice(storage);
    // archived, "Floss" keeps its position between the first two shown, which is where the
    // midpoint of their positions falls
    await device.archiveHabit("floss");
    await move(device, "Stretch", "Morning run");
    const shown = namesOf(device);
    await device.restoreHabit("floss");
    expect([shown, namesOf(device)]).toEqual([
      ["Morning run", "Stretch", "Read 20 pages"],
      ["Morning run", "Stretch", "Floss", "Read 20 pages"],
    ]);
  });

  it("moves a habit between two that share a position, as devices adding habits offline leave them", async () => {
    const storage = createStorage();
    // three devices each added a habit after "Read" offline, and synced
    await storeRecords(storage, {
      habits: [
        syncedAt("read", "Read 20 pages", "a0"),
        syncedAt("run", "Morning run", "a1"),
        syncedAt("stretch", "Stretch", "a1"),
        syncedAt("walk", "Walk", "a1"),
      ],
    });
    const device = await openDevice(storage);
    const before = namesOf(device);
    await move(device, "Read 20 pages", "Stretch");
    const moved = namesOf(device);
    await device.close();
    const reopened = await openDevice(storage);
    expect([before, moved, namesOf(reopened)]).toEqual([
      ["Read 20 pages", "Morning run", "Stretch", "Walk"],
      ["Morning run", "Stretch", "Read 20 pages", "Walk"],
      ["Morning run", "Stretch", "Read 20 pages", "Walk"],
    ]);
  });

  it("ignores a move of or after an archived habit", async () => {
    const device = await deviceWith(createStorage(), "Morning run", "Floss", "Read 20 pages");
    const floss = idOf(device, "Floss");
    await device.archiveHabit(floss);
    await device.moveHabit(idOf(device, "Read 20 pages"), floss);
    await device.moveHabit(floss, null);
    await device.restoreHabit(floss);
    expect(namesOf(device)).toEqual(["Morning run", "Floss", "Read 20 pages"]);
  });
});

describe("the reorder hint", () => {
  it("isn't dismissed on a new device", async () => {
    const device = await openDevice(createStorage());
    expect(device.settings().reorderHintDismissed).toBe(false);
  });

  it("is dismissed by the first reorder, and stays dismissed after a restart", async () => {
    const storage = createStorage();
    const device = await deviceWith(storage, "Morning run", "Read 20 pages");
    await move(device, "Read 20 pages", null);
    const dismissed = device.settings().reorderHintDismissed;
    await device.close();

    const restarted = await openDevice(storage);
    expect([dismissed, restarted.settings().reorderHintDismissed]).toEqual([true, true]);
  });

  it("stays when a habit is dropped where it already was", async () => {
    const device = await deviceWith(createStorage(), "Morning run", "Read 20 pages");
    await move(device, "Read 20 pages", "Morning run");
    expect(device.settings().reorderHintDismissed).toBe(false);
  });

  it("stays dismissed after a restart once dismissed", async () => {
    const storage = createStorage();
    const device = await openDevice(storage);
    device.changeSettings({ reorderHintDismissed: true });
    await device.close();

    const restarted = await openDevice(storage);
    expect(restarted.settings().reorderHintDismissed).toBe(true);
  });
});
