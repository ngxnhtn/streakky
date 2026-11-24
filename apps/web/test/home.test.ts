import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { emptyHome } from "../src/screens/Home.tsx";
import type { HabitStore } from "../src/store/habit-store.ts";
import { createStorage, openDevice } from "./devices.ts";

// Every test starts on Tuesday 24 November 2026, local time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 9));
});
afterEach(() => vi.useRealTimers());

const build = (name: string) => ({ kind: "build" as const, name, color: "green" as const });

/** What Home says with nothing to show on this device, as it reads the store. */
const homeOf = (device: HabitStore) => emptyHome(device.habits(), device.archivedHabits());

describe("Home with no habit to show", () => {
  it("says nothing is counted yet on a new device", async () => {
    const device = await openDevice(createStorage());
    expect(homeOf(device)).toBe("no habits");
  });

  it("shows the habits while any is active", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Stretch"));
    await device.archiveHabit(device.habits()[0].id);
    expect(homeOf(device)).toBeNull();
  });

  it("says every habit is archived once the last active one is, after a restart too", async () => {
    const storage = createStorage();
    const device = await openDevice(storage);
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Stretch"));
    for (const habit of device.habits()) await device.archiveHabit(habit.id);
    expect(homeOf(device)).toBe("all archived");
    expect(homeOf(await openDevice(storage))).toBe("all archived");
  });

  it("shows the habits again once one is restored", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.archiveHabit(device.habits()[0].id);
    await device.restoreHabit(device.archivedHabits()[0].id);
    expect(homeOf(device)).toBeNull();
  });

  it("goes back to nothing counted yet once every archived habit is deleted", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.createHabit(build("Stretch"));
    for (const habit of device.habits()) await device.archiveHabit(habit.id);
    const [first, second] = device.archivedHabits();
    await device.deleteHabit(first.id);
    expect(homeOf(device)).toBe("all archived");
    await device.deleteHabit(second.id);
    expect(homeOf(device)).toBe("no habits");
  });

  it("says nothing is counted yet when the only habits were deleted", async () => {
    const device = await openDevice(createStorage());
    await device.createHabit(build("Morning run"));
    await device.deleteHabit(device.habits()[0].id);
    expect(homeOf(device)).toBe("no habits");
  });
});
