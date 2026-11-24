import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  counterLabel,
  countFromSummary,
  todayISO,
  widgetSummary,
  type ArchivedPeriod,
  type Habit,
  type WidgetSummary,
} from "./index.ts";

afterEach(() => vi.useRealTimers());

/** Noon local time on 2026-11-24 plus `n` days. */
const onDay = (n: number) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24 + n, 12));
};
/** The day `n` days from 2026-11-24, YYYY-MM-DD. */
const day = (n: number) => {
  const d = new Date(2026, 10, 24 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const quit = (
  quitDay: string,
  slips: string[] = [],
  archivedPeriods: ArchivedPeriod[] = [],
): Habit => ({
  id: "sugar",
  name: "No sugar",
  kind: "quit",
  color: "red",
  goal: null,
  quitDay,
  slips,
  archivedPeriods,
});

const build = (checkIns: string[]): Habit => ({
  id: "run",
  name: "Morning run",
  kind: "build",
  color: "green",
  goal: null,
  checkIns,
  archivedPeriods: [],
});

/** A widget case: the summary the app wrote, a later day, and what the widget should show. */
type WidgetCase = { summary: WidgetSummary; today: string; count: number; label: string };

/**
 * The app writes the habit's summary today; the widget then counts from it on later days without
 * the app. `expected` is the count each of those days should show, by days from today (0 is
 * today), worked out by hand from the habit's history. Its label is the app's own wording.
 */
function casesFor(habit: Habit, expected: Record<number, number>): WidgetCase[] {
  onDay(0);
  const summary = widgetSummary(habit);
  return Object.entries(expected).map(([n, count]) => {
    onDay(Number(n));
    return { summary, today: todayISO(), count, label: counterLabel(habit, count) };
  });
}

const buildCases = () => [
  // checked in today, three days running
  ...casesFor(build([day(-2), day(-1), day(0)]), { 0: 3, 1: 3, 2: 0, 5: 0 }),
  // checked in yesterday, not yet today: the streak lives through today
  ...casesFor(build([day(-3), day(-2), day(-1)]), { 0: 3, 1: 0 }),
  // a gap before the last check-in
  ...casesFor(build([day(-5), day(-4), day(-1)]), { 0: 1, 1: 0 }),
  // never checked in
  ...casesFor(build([]), { 0: 0, 3: 0 }),
];

const quitCases = () => [
  // no slip since the quit day
  ...casesFor(quit(day(-10)), { 0: 10, 1: 11, 5: 15 }),
  // a slip three days back
  ...casesFor(quit(day(-20), [day(-12), day(-3)]), { 0: 3, 2: 5 }),
  // a slip today, and a quit day today: nothing yet, one tomorrow
  ...casesFor(quit(day(-6), [day(0)]), { 0: 0, 1: 1 }),
  ...casesFor(quit(day(0)), { 0: 0, 1: 1 }),
  // archived for a while, then restored: the three days between don't count
  ...casesFor(quit(day(-20), [], [{ archivedOn: day(-8), restoredOn: day(-4) }]), { 0: 17, 3: 20 }),
];

const counted = (cases: WidgetCase[]) => cases.map((c) => countFromSummary(c.summary, c.today));

describe("a habit's widget", () => {
  it("counts a build habit's streak from its summary, today and on the days after", () => {
    const cases = buildCases();
    expect(counted(cases)).toEqual(cases.map((c) => c.count));
  });

  it("counts a quit habit's clean days from its summary, today and on the days after", () => {
    const cases = quitCases();
    expect(counted(cases)).toEqual(cases.map((c) => c.count));
  });

  // The widget's Kotlin rule runs over the same cases (WidgetRuleTest), so the two can't drift.
  // A change to the cases fails here until the file is written again with `vp test -u`.
  it("shares its cases with the widget's own rule", async () => {
    const cases = [...buildCases(), ...quitCases()];
    await expect(`${JSON.stringify(cases, null, 2)}\n`).toMatchFileSnapshot(
      "../fixtures/widget-cases.json",
    );
  });

  it("says when a habit is archived, which its widget shows in place of a count", () => {
    onDay(0);
    const archived = quit(day(-20), [], [{ archivedOn: day(-2), restoredOn: null }]);
    const restored = quit(day(-20), [], [{ archivedOn: day(-8), restoredOn: day(-4) }]);
    expect([widgetSummary(archived).archived, widgetSummary(restored).archived]).toEqual([
      true,
      false,
    ]);
  });
});
