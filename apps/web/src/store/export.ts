import { toISO, todayISO, type ColorId, type Habit } from "@streakky/core";

/**
 * A habit in the export file. Its days are every check-in or slip recorded on it, including any
 * that don't count yet or at all (a day after today, a slip on or before the quit day or on an
 * archived day), so that a backup loses nothing the person logged. Counting them is left to
 * whatever reads the file.
 */
export type ExportedHabit = {
  id: string;
  name: string;
  color: ColorId;
  goal: number | null;
  archived: boolean;
  /**
   * Every time it was archived, oldest first, as the days it was archived and restored on
   * (YYYY-MM-DD), with `restoredOn` null on the last while it's still archived. A quit habit's days
   * strictly between the two are archived days: neither clean days nor slips. Build habits have
   * them too, though they count nothing. Since version 2; a version 1 file has none.
   */
  archivedPeriods: { archivedOn: string; restoredOn: string | null }[];
} & (
  | { kind: "build"; checkIns: string[] }
  | { kind: "quit"; /** YYYY-MM-DD */ quitDay: string; slips: string[] }
);

/**
 * What the export file holds: every habit not deleted, archived ones included, in the person's
 * order. A later version of the shape gets a new `version`, so an import can tell them apart.
 * - Version 1 (ticket 09): no `archivedPeriods`. Read as none: a quit habit counts every day.
 * - Version 2: each habit's `archivedPeriods`.
 */
export type ExportContent = {
  format: "streakky-export";
  version: 2;
  /**
   * When the file was made: the device's date and time with its offset from UTC (ISO 8601, such
   * as 2026-11-24T09:00:00+07:00), so its date agrees with the file name and the days inside.
   */
  exportedAt: string;
  habits: ExportedHabit[];
};

/** A file to hand to the person: how each platform does that is its own choice (save-file.ts). */
export type ExportFile = { name: string; type: "application/json"; text: string };

/**
 * The export file of these habits, made now and named with today's date in the time zone days
 * follow. When it was made is the device's own time, with its offset from UTC.
 */
export function toExportFile(habits: (Habit & { archived: boolean })[]): ExportFile {
  const now = new Date();
  const content: ExportContent = {
    format: "streakky-export",
    version: 2,
    exportedAt: localDateTime(now),
    habits: habits.map(toExportedHabit),
  };
  return {
    name: `streakky-${todayISO()}.json`,
    type: "application/json",
    text: `${JSON.stringify(content, null, 2)}\n`,
  };
}

function localDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const minutesEastOfUtc = -d.getTimezoneOffset();
  const hours = pad(Math.floor(Math.abs(minutesEastOfUtc) / 60));
  const offset = `${minutesEastOfUtc < 0 ? "-" : "+"}${hours}:${pad(Math.abs(minutesEastOfUtc) % 60)}`;
  return `${toISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset}`;
}

/** Spelled out field by field, so the file's shape changes only with its version. */
function toExportedHabit(h: Habit & { archived: boolean }): ExportedHabit {
  const { id, name, color, goal, archived } = h;
  const archivedPeriods = h.archivedPeriods.map(({ archivedOn, restoredOn }) => ({
    archivedOn,
    restoredOn,
  }));
  return h.kind === "build"
    ? { id, kind: "build", name, color, goal, archived, archivedPeriods, checkIns: h.checkIns }
    : {
        id,
        kind: "quit",
        name,
        color,
        goal,
        quitDay: h.quitDay,
        archived,
        archivedPeriods,
        slips: h.slips,
      };
}
