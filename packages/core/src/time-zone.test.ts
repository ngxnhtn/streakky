import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  currentStreakDays,
  deviceTimeZone,
  isTimeZone,
  momentOf,
  sameTimeZone,
  reminderPlan,
  setTimeZone,
  todayISO,
  type Habit,
} from "./index.ts";

afterEach(() => {
  setTimeZone(undefined);
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/** The clock at a moment, given in UTC. */
const at = (moment: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(moment));
};

describe("days in the chosen time zone", () => {
  it("change at that zone's midnight, whatever the device's", () => {
    setTimeZone("Asia/Ho_Chi_Minh"); // UTC+7: midnight there is 17:00 UTC
    at("2026-11-25T16:59:00Z");
    const before = todayISO();
    at("2026-11-25T17:00:00Z");
    expect([before, todayISO()]).toEqual(["2026-11-25", "2026-11-26"]);
  });

  it("can be ahead of one zone and behind another at the same moment", () => {
    at("2026-11-25T10:30:00Z");
    setTimeZone("Pacific/Kiritimati"); // UTC+14: 00:30 on the 26th
    const ahead = todayISO();
    setTimeZone("Pacific/Pago_Pago"); // UTC-11: 23:30 on the 24th
    expect([ahead, todayISO()]).toEqual(["2026-11-26", "2026-11-24"]);
  });

  it("count a habit's streak", () => {
    setTimeZone("Pacific/Kiritimati");
    at("2026-11-25T10:30:00Z"); // the 26th there
    const noSugar: Habit = {
      id: "sugar",
      name: "No sugar",
      kind: "quit",
      color: "red",
      goal: null,
      quitDay: "2026-11-20",
      slips: [],
      archivedPeriods: [],
    };
    // clean from the 21st through the 26th
    expect(currentStreakDays(noSugar)).toBe(6);
  });

  it("start at that zone's midnight, an hour sooner the day after the clocks go forward", () => {
    setTimeZone("Europe/London"); // GMT until 01:00 UTC on 29 March 2026, then BST, UTC+1
    const starts = ["2026-03-29", "2026-03-30"].map((day) => momentOf(day).toISOString());
    expect(starts).toEqual(["2026-03-29T00:00:00.000Z", "2026-03-29T23:00:00.000Z"]);
  });

  it("set the daily reminder's time, which keeps to the zone's clocks as they change", () => {
    setTimeZone("Europe/London");
    const run: Habit = {
      id: "run",
      name: "Morning run",
      kind: "build",
      color: "green",
      goal: null,
      checkIns: [],
      archivedPeriods: [],
    };
    const plan = reminderPlan([run], "21:00", new Date("2026-03-28T08:00:00Z"));
    expect(plan.slice(0, 2).map((r) => [r.day, r.at.toISOString()])).toEqual([
      ["2026-03-28", "2026-03-28T21:00:00.000Z"],
      ["2026-03-29", "2026-03-29T20:00:00.000Z"],
    ]);
  });

  it("start when the clocks first show that time, or straight after they skip it", () => {
    // Santiago's clocks go from 00:00 to 01:00 on 6 September 2026; London's show 01:30 twice
    // on 25 October 2026, first in summer time
    setTimeZone("America/Santiago");
    const skipped = momentOf("2026-09-06").toISOString();
    setTimeZone("Europe/London");
    const twice = momentOf("2026-10-25", "01:30").toISOString();
    expect([skipped, twice]).toEqual(["2026-09-06T04:00:00.000Z", "2026-10-25T00:30:00.000Z"]);
  });

  it("are the device's own until a zone is set", () => {
    vi.stubEnv("TZ", "Pacific/Kiritimati"); // the device in UTC+14
    at("2026-11-25T10:30:00Z");
    expect([deviceTimeZone(), todayISO()]).toEqual(["Pacific/Kiritimati", "2026-11-26"]);
  });
});

describe("a time zone", () => {
  it("is the same one under an older name", () => {
    expect([
      sameTimeZone("Asia/Saigon", "Asia/Ho_Chi_Minh"),
      sameTimeZone("Asia/Ho_Chi_Minh", "Asia/Bangkok"),
    ]).toEqual([true, false]);
  });

  it("is one the device knows by name", () => {
    expect(["Asia/Ho_Chi_Minh", "UTC", "Mars/Olympus_Mons", "", 7].map(isTimeZone)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});
