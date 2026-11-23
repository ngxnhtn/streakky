import { toISO, type ColorId, type Habit } from "@streakky/core";

/**
 * A habit in the export file. Its days are every check-in or slip recorded on it, including any
 * that don't count yet or at all (a day after today, a slip on or before the quit day), so that a
 * backup loses nothing the person logged. Counting them is left to whatever reads the file.
 */
export type ExportedHabit = {
  id: string;
  name: string;
  color: ColorId;
  goal: number | null;
  archived: boolean;
} & (
  | { kind: "build"; checkIns: string[] }
  | { kind: "quit"; /** YYYY-MM-DD */ quitDay: string; slips: string[] }
);

/**
 * What the export file holds: every habit not deleted, archived ones included, in the person's
 * order. A later version of the shape gets a new `version`, so an import can tell them apart.
 */
export type ExportContent = {
  format: "streakky-export";
  version: 1;
  /**
   * When the file was made: the device's date and time with its offset from UTC (ISO 8601, such
   * as 2026-11-24T09:00:00+07:00), so its date agrees with the file name and the days inside.
   */
  exportedAt: string;
  habits: ExportedHabit[];
};

/** A file to hand to the person: how each platform does that is its own choice (save-file.ts). */
export type ExportFile = { name: string; type: "application/json"; text: string };

/** The export file of these habits, made now and named with today's date. */
export function toExportFile(habits: (Habit & { archived: boolean })[]): ExportFile {
  const now = new Date();
  const content: ExportContent = {
    format: "streakky-export",
    version: 1,
    exportedAt: localDateTime(now),
    habits: habits.map(toExportedHabit),
  };
  return {
    name: `streakky-${toISO(now)}.json`,
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
  return h.kind === "build"
    ? { id, kind: "build", name, color, goal, archived, checkIns: h.checkIns }
    : { id, kind: "quit", name, color, goal, quitDay: h.quitDay, archived, slips: h.slips };
}
