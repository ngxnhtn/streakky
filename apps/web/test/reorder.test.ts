import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createCollection } from "@tanstack/db";
import { persistedCollectionOptions } from "@tanstack/db-sqlite-persistence-core";
import { createNodeSQLitePersistence } from "@tanstack/node-db-sqlite-persistence";
import { generateKeyBetween } from "fractional-indexing";
import type { HabitRecord, HabitStore } from "../src/store/habit-store.ts";
import { createStorage, openDevice, type DeviceStorage } from "./devices.ts";

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

const habitRecordsIn = (storage: DeviceStorage) =>
  createCollection(
    persistedCollectionOptions<HabitRecord, string>({
      id: "habits",
      getKey: (h) => h.id,
      persistence: createNodeSQLitePersistence({ database: storage.database }),
      schemaVersion: 1,
    }),
  );

/**
 * The habit records kept in a device's storage, read the way the store reads them, archived and
 * deleted ones included: what sync will send.
 */
async function storedHabits(storage: DeviceStorage): Promise<HabitRecord[]> {
  const records = habitRecordsIn(storage);
  await records.preload();
  const stored = records.toArray.map((h) => structuredClone(h));
  await records.cleanup();
  return stored;
}

/** Habit records by their order position alone. */
const byPosition = (a: HabitRecord, b: HabitRecord) => (a.order < b.order ? -1 : 1);

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

  it("changes only the moved habit's order, with the time of the move", async () => {
    const storage = createStorage();
    const device = await deviceWith(storage, "Morning run", "Read 20 pages", "Stretch");
    const before = await storedHabits(storage);
    vi.setSystemTime(new Date(2026, 10, 24, 18));
    await move(device, "Stretch", "Morning run");
    await device.close();

    const moved = before.find((h) => h.name === "Stretch")!;
    const after = await storedHabits(storage);
    const movedAfter = after.find((h) => h.id === moved.id)!;
    expect(after.filter((h) => h !== movedAfter)).toEqual(
      expect.arrayContaining(before.filter((h) => h !== moved)),
    );
    expect(movedAfter).toEqual({
      ...moved,
      order: expect.not.stringMatching(`^${moved.order}$`),
      edited: { ...moved.edited, order: new Date(2026, 10, 24, 18).getTime() },
    });
  });

  it("leaves a habit dropped where it already was untouched", async () => {
    const storage = createStorage();
    const device = await deviceWith(storage, "Morning run", "Read 20 pages", "Stretch");
    const before = await storedHabits(storage);
    vi.setSystemTime(new Date(2026, 10, 24, 18));
    await move(device, "Read 20 pages", "Morning run");
    await move(device, "Morning run", null);
    await device.close();

    expect(await storedHabits(storage)).toEqual(expect.arrayContaining(before));
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

  it("keeps a valid, stable order after many moves between the same neighbours", async () => {
    const storage = createStorage();
    const device = await deviceWith(storage, "Morning run", "Read 20 pages", "Stretch", "Meditate");
    const first = (await storedHabits(storage)).find((h) => h.name === "Morning run");
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

    const stored = (await storedHabits(storage)).toSorted(byPosition);
    const keys = stored.map((h) => h.order);
    const reopened = await openDevice(storage);
    expect(wrongMoves).toEqual([]);
    expect([stored.map((h) => h.name), namesOf(reopened)]).toEqual([expected, expected]);
    expect(stored[0]).toEqual(first);
    expect(new Set(keys).size).toBe(keys.length);
    // each is still a key the next move can place a habit before or after
    expect(() => keys.forEach((key) => generateKeyBetween(null, key))).not.toThrow();
    expect(() => keys.forEach((key) => generateKeyBetween(key, null))).not.toThrow();
  });

  it("places a moved habit after its shown neighbour without taking an archived habit's position", async () => {
    const storage = createStorage();
    const device = await deviceWith(storage, "Morning run", "Floss", "Read 20 pages", "Stretch");
    // archived, "Floss" keeps its position between the first two shown, which is where the
    // midpoint of their positions falls
    const floss = idOf(device, "Floss");
    await device.archiveHabit(floss);
    await move(device, "Stretch", "Morning run");
    const shown = namesOf(device);
    await device.restoreHabit(floss);
    const restored = namesOf(device);
    await device.close();

    const positions = (await storedHabits(storage)).map((h) => h.order);
    expect([shown, restored]).toEqual([
      ["Morning run", "Stretch", "Read 20 pages"],
      ["Morning run", "Stretch", "Floss", "Read 20 pages"],
    ]);
    expect(new Set(positions).size).toBe(4);
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
