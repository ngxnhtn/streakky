/**
 * The habit and day records a device stores, and the TanStack DB collections that hold them. The
 * habit store and sync both work on these; the screens see habits as core's model, never records.
 */
import {
  persistedCollectionOptions,
  type PersistedCollectionPersistence,
} from "@tanstack/db-sqlite-persistence-core";
import type { ArchivedPeriod, ColorId, Kind } from "@streakky/core";
import type { EditableField } from "@streakky/contract";

export { EDITABLE_FIELDS, type EditableField } from "@streakky/contract";

/** A habit as the device stores and syncs it. */
export type HabitRecord = {
  /** generated on the device */
  id: string;
  /** fixed at creation */
  kind: Kind;
  name: string;
  color: ColorId;
  goal: number | null;
  /** YYYY-MM-DD, quit habits only */
  quitDay: string | null;
  archived: boolean;
  /**
   * Every time it was archived, oldest first, the last one open (`restoredOn: null`) while it's
   * archived. Archiving and restoring write it with `archived`, at the same edit time, so when
   * devices merge, the two come from the same device's edit (ADR-0002). Records stored before it
   * came have none, and read as having no archived periods.
   */
  archivedPeriods?: ArchivedPeriod[];
  /** fractional position, so a reorder changes only one habit */
  order: string;
  /** tombstone: once true, never false again, whatever else changed later (ADR-0002) */
  deleted: boolean;
  /**
   * The device time of each editable field's last change. Records stored before `archivedPeriods`
   * came have no time for it: read it as `archived`'s, since the two change together.
   */
  edited: Record<Exclude<EditableField, "archivedPeriods">, number> & { archivedPeriods?: number };
  /**
   * The id of each editable field's last change, which breaks a tie in edit time when devices
   * merge. Records stored before sync have none, and count as the lowest.
   */
  changeIds?: Partial<Record<EditableField, string>>;
  /** Device-local: whether a change waits for a push. Records stored before sync do. */
  pending?: boolean;
};

/**
 * One habit's day: a check-in (build) or a slip (quit) while `logged`. Removing one writes
 * `logged: false` instead of deleting the record, so the later edit can win when devices sync.
 * A habit and a day together identify the record.
 */
export type DayRecord = {
  habitId: string;
  /** YYYY-MM-DD */
  day: string;
  logged: boolean;
  /** device time of the last change */
  edited: number;
  /** the id of the last change, which breaks a tie in edit time; none before sync */
  changeId?: string;
  /** Device-local: whether a change waits for a push. Records stored before sync do. */
  pending?: boolean;
};

/** A day record's key: its habit and its day. */
export const dayKey = ({ habitId, day }: { habitId: string; day: string }) => `${habitId}/${day}`;

/**
 * The collections' options: their ids and schema version are what the device's stored records
 * are kept under. Changing either would reset a collection, wiping its stored records, or refuse
 * to open it (spec, "Synced data shape"), so both stay as they are.
 */
export const habitCollectionOptions = (persistence: PersistedCollectionPersistence) =>
  persistedCollectionOptions<HabitRecord, string>({
    id: "habits",
    getKey: (h) => h.id,
    persistence,
    schemaVersion: 1,
  });

export const dayCollectionOptions = (persistence: PersistedCollectionPersistence) =>
  persistedCollectionOptions<DayRecord, string>({
    id: "days",
    getKey: dayKey,
    persistence,
    schemaVersion: 1,
  });

/**
 * A record's archived periods as the device counts them: none on a record stored before they were
 * kept, and an open one only while the habit is archived, as archiving and restoring leave them.
 */
export const archivedPeriodsOf = (h: HabitRecord): ArchivedPeriod[] =>
  (h.archivedPeriods ?? []).filter((p) => p.restoredOn !== null || h.archived);

/**
 * The person's order. Two devices adding a habit after the same one offline give both the same
 * position, so ties fall back to the id, the same on every device.
 */
export const byOrder = (a: HabitRecord, b: HabitRecord) =>
  a.order < b.order ? -1 : a.order > b.order ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
