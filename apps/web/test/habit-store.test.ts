import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { currentStreakDays } from "@streakky/core";
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
