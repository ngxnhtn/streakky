import { describe, expect, it } from "vite-plus/test";
import { reminderPlan, stillToCheckIn, type ArchivedPeriod, type Habit } from "./index.ts";

// Tuesday 24 November 2026, local time
const today = "2026-11-24";
const morning = new Date(2026, 10, 24, 9, 30);
const yesterday = "2026-11-23";

const build = (
  name: string,
  checkIns: string[] = [],
  archivedPeriods: ArchivedPeriod[] = [],
): Habit => ({
  id: name,
  name,
  kind: "build",
  color: "green",
  goal: null,
  checkIns,
  archivedPeriods,
});

const quit = (name: string): Habit => ({
  id: name,
  name,
  kind: "quit",
  color: "red",
  goal: null,
  quitDay: "2026-11-01",
  slips: [],
  archivedPeriods: [],
});

describe("the daily reminder's plan", () => {
  it("reminds today at the chosen time of the build habits not checked in yet", () => {
    const habits = [build("Morning run", [yesterday]), build("Read", [today]), quit("No sugar")];
    expect(reminderPlan(habits, "21:00", morning)[0]).toEqual({
      day: today,
      at: new Date(2026, 10, 24, 21, 0),
      habits: ["Morning run"],
    });
  });

  it("has no reminder today once every build habit is checked in", () => {
    const habits = [build("Morning run", [today]), build("Read", [today])];
    expect(reminderPlan(habits, "21:00", morning).map((r) => r.day)).not.toContain(today);
  });

  it("has no reminder today once its time has passed", () => {
    const evening = new Date(2026, 10, 24, 21, 30);
    expect(reminderPlan([build("Morning run")], "21:00", evening).map((r) => r.day)).not.toContain(
      today,
    );
  });

  it("reminds of every build habit on each day ahead, a week from today in all", () => {
    // 09:30, past a 07:15 reminder: today's has gone, the next six days' are to come
    const habits = [build("Morning run", [today]), build("Read"), quit("No sugar")];
    const plan = reminderPlan(habits, "07:15", morning);
    const both = ["Morning run", "Read"];
    expect(plan).toEqual([
      { day: "2026-11-25", at: new Date(2026, 10, 25, 7, 15), habits: both },
      { day: "2026-11-26", at: new Date(2026, 10, 26, 7, 15), habits: both },
      { day: "2026-11-27", at: new Date(2026, 10, 27, 7, 15), habits: both },
      { day: "2026-11-28", at: new Date(2026, 10, 28, 7, 15), habits: both },
      { day: "2026-11-29", at: new Date(2026, 10, 29, 7, 15), habits: both },
      { day: "2026-11-30", at: new Date(2026, 10, 30, 7, 15), habits: both },
    ]);
  });

  it("never reminds of quit habits alone", () => {
    expect(reminderPlan([quit("No sugar")], "21:00", morning)).toEqual([]);
  });

  it("leaves archived habits out", () => {
    const archived = build("Read", [], [{ archivedOn: yesterday, restoredOn: null }]);
    const named = reminderPlan([archived, build("Morning run")], "21:00", morning).flatMap(
      (r) => r.habits,
    );
    expect(new Set(named)).toEqual(new Set(["Morning run"]));
  });

  it("has no reminder when every build habit is archived", () => {
    const archived = build("Read", [], [{ archivedOn: yesterday, restoredOn: null }]);
    expect(reminderPlan([archived], "21:00", morning)).toEqual([]);
  });

  it("plans a just-past-midnight reminder for the day that has just begun", () => {
    const lateEvening = new Date(2026, 10, 24, 23, 59);
    expect(reminderPlan([build("Morning run")], "00:30", lateEvening)[0]).toEqual({
      day: "2026-11-25",
      at: new Date(2026, 10, 25, 0, 30),
      habits: ["Morning run"],
    });
  });
});

describe("the habits still to check in on a day", () => {
  it("are the active build habits without that day's check-in, in order", () => {
    const habits = [
      build("Morning run", [yesterday]),
      quit("No sugar"),
      build("Read", [today]),
      build("Stretch", [], [{ archivedOn: yesterday, restoredOn: null }]),
      build("Walk"),
    ];
    expect(stillToCheckIn(habits, today)).toEqual(["Morning run", "Walk"]);
  });
});
