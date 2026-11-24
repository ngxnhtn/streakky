/**
 * Sync's two endpoints (spec, "Sync API (Worker)"): a device pushes the habits and day records it
 * changed, and pulls every row changed since the server version it last saw. The server applies
 * ADR-0002's merge rules as it stores a push.
 */
import { and, asc, eq, getTableColumns, getTableName, gt, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { Database } from "./db/database.ts";
import { dayRecords, habits, syncVersions, type ArchivedPeriod } from "./db/schema.ts";

/** The habit fields a device edits, each with its own edit time and change id. */
const FIELDS = [
  "name",
  "color",
  "goal",
  "quitDay",
  "archived",
  "archivedPeriods",
  "order",
] as const;
type Field = (typeof FIELDS)[number];

/** A habit as devices send and receive it. */
export type SyncedHabit = {
  id: string;
  kind: "build" | "quit";
  name: string;
  color: string;
  goal: number | null;
  quitDay: string | null;
  archived: boolean;
  archivedPeriods: ArchivedPeriod[];
  order: string;
  deleted: boolean;
  edited: Record<Field, number>;
  changeIds: Record<Field, string>;
};

/** A day record as devices send and receive it. */
export type SyncedDay = {
  habitId: string;
  day: string;
  logged: boolean;
  edited: number;
  changeId: string;
};

export type Pushed = { habits: SyncedHabit[]; days: SyncedDay[] };
export type Pulled = Pushed & {
  /** the server version to pull from next time */
  version: number;
  /** more rows wait past `version`: pull again */
  more: boolean;
};

/** The most rows one push may carry; devices send larger changes in several pushes. */
const PUSH_LIMIT = 200;
/** The most rows one pull returns. */
const PULL_LIMIT = 500;

type HabitRow = typeof habits.$inferSelect;

/** Where a habit row keeps each field's value, edit time and change id. */
const FIELD_KEYS: Record<Field, [keyof HabitRow, keyof HabitRow, keyof HabitRow]> = {
  name: ["name", "nameEdited", "nameChangeId"],
  color: ["color", "colorEdited", "colorChangeId"],
  goal: ["goal", "goalEdited", "goalChangeId"],
  quitDay: ["quitDay", "quitDayEdited", "quitDayChangeId"],
  archived: ["archived", "archivedEdited", "archivedChangeId"],
  archivedPeriods: ["archivedPeriods", "archivedPeriodsEdited", "archivedPeriodsChangeId"],
  order: ["order", "orderEdited", "orderChangeId"],
};
const habitColumn = getTableColumns(habits);
/** Each field's value, edit-time and change-id columns. */
const FIELD_COLUMNS = Object.fromEntries(
  FIELDS.map((field) => [field, FIELD_KEYS[field].map((key) => habitColumn[key])]),
) as unknown as Record<Field, [SQLiteColumn, SQLiteColumn, SQLiteColumn]>;

const columnName = (column: SQLiteColumn) => sql`${sql.identifier(column.name)}`;
/** The stored row's column, inside an upsert. */
const stored = (column: SQLiteColumn) =>
  sql`${sql.identifier(getTableName(column.table))}.${columnName(column)}`;
/** The pushed row's column, inside an upsert. */
const pushed = (column: SQLiteColumn) => sql`excluded.${columnName(column)}`;

/**
 * Whether the pushed edit is later than the stored one: by edit time, then by change id, so two
 * devices that edited at the same moment still agree on one winner.
 */
const later = (edited: SQLiteColumn, changeId: SQLiteColumn) =>
  sql`(${pushed(edited)}, ${pushed(changeId)}) > (${stored(edited)}, ${stored(changeId)})`;

/** The pushed value of `column` where `wins`, the stored one otherwise. */
const takeIf = (wins: SQL, column: SQLiteColumn) =>
  sql`CASE WHEN ${wins} THEN ${pushed(column)} ELSE ${stored(column)} END`;

/**
 * The rows of a push, read from one JSON parameter (flat objects keyed by column name), in the
 * table's column order, so a whole push is one statement whatever its size. Each row takes the
 * next server version, counted from `first`.
 */
function pushedRows(
  table: typeof habits | typeof dayRecords,
  userId: string,
  rows: Record<string, unknown>[],
  first: SQL,
) {
  const values = Object.values(getTableColumns(table)).map((column) => {
    if (column === table.userId) return sql`${userId}`;
    if (column === table.version) return sql`${first} + key`;
    return sql`json_extract(value, ${`$.${column.name}`})`;
  });
  // `WHERE true` lets SQLite read the ON CONFLICT that follows a SELECT
  return sql`SELECT ${sql.join(values, sql`, `)} FROM json_each(${JSON.stringify(rows)}) WHERE true`;
}

/**
 * Stores a push for the account, in one batch, which D1 runs as one transaction: two devices
 * pushing at once can't undo each other's merge.
 * - A habit's fields: the later edit wins, field by field.
 * - A day: the later edit wins, per habit and day.
 * - A deleted habit stays deleted. Its days still arriving are kept, and ignored when counting.
 * A row keeps its version unless the push changed it, so resending a push changes nothing.
 */
export async function push(
  db: Database,
  userId: string,
  { habits: pushedHabits, days: pushedDays }: Pushed,
) {
  const count = pushedHabits.length + pushedDays.length;
  if (count === 0) return;
  // the versions this push hands out: first to first + count - 1
  const first = sql`(SELECT ${syncVersions.version} FROM ${syncVersions} WHERE ${syncVersions.userId} = ${userId}) - ${count} + 1`;
  const bump = db
    .insert(syncVersions)
    .values({ userId, version: count })
    .onConflictDoUpdate({
      target: syncVersions.userId,
      set: { version: sql`${syncVersions.version} + ${count}` },
    });

  const fieldWins = FIELDS.map((field) => later(FIELD_COLUMNS[field][1], FIELD_COLUMNS[field][2]));
  const habitRows = pushedHabits.map((habit) => ({
    [habits.id.name]: habit.id,
    [habits.kind.name]: habit.kind,
    ...Object.fromEntries(
      FIELDS.flatMap((field) => {
        const [value, edited, changeId] = FIELD_COLUMNS[field];
        return [
          [value.name, habit[field]],
          [edited.name, habit.edited[field]],
          [changeId.name, habit.changeIds[field]],
        ];
      }),
    ),
    [habits.deleted.name]: habit.deleted,
  }));
  const habitsChanged = sql.join(
    [...fieldWins, sql`${pushed(habits.deleted)} > ${stored(habits.deleted)}`],
    sql` OR `,
  );
  const upsertHabits = db
    .insert(habits)
    .select(pushedRows(habits, userId, habitRows, first))
    .onConflictDoUpdate({
      target: [habits.userId, habits.id],
      set: {
        ...Object.fromEntries(
          FIELDS.flatMap((field, i) =>
            FIELD_KEYS[field].map((key) => [key, takeIf(fieldWins[i], habitColumn[key])]),
          ),
        ),
        deleted: sql`MAX(${stored(habits.deleted)}, ${pushed(habits.deleted)})`,
        version: sql`CASE WHEN ${habitsChanged} THEN ${pushed(habits.version)} ELSE ${stored(habits.version)} END`,
      },
    });

  const dayWins = later(dayRecords.edited, dayRecords.changeId);
  const dayRows = pushedDays.map((day) => ({
    [dayRecords.habitId.name]: day.habitId,
    [dayRecords.day.name]: day.day,
    [dayRecords.logged.name]: day.logged,
    [dayRecords.edited.name]: day.edited,
    [dayRecords.changeId.name]: day.changeId,
  }));
  const upsertDays = db
    .insert(dayRecords)
    // after the habits' versions
    .select(pushedRows(dayRecords, userId, dayRows, sql`${first} + ${pushedHabits.length}`))
    .onConflictDoUpdate({
      target: [dayRecords.userId, dayRecords.habitId, dayRecords.day],
      set: {
        logged: takeIf(dayWins, dayRecords.logged),
        edited: takeIf(dayWins, dayRecords.edited),
        changeId: takeIf(dayWins, dayRecords.changeId),
        version: takeIf(dayWins, dayRecords.version),
      },
    });

  await db.batch([bump, upsertHabits, upsertDays]);
}

/**
 * Every habit and day record of the account changed after server version `since`, deleted habits
 * included, oldest change first, a page of at most `PULL_LIMIT` rows at a time.
 */
export async function pull(db: Database, userId: string, since: number) {
  const limit = PULL_LIMIT;
  const [habitRows, dayRows] = await db.batch([
    db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), gt(habits.version, since)))
      .orderBy(asc(habits.version))
      .limit(limit + 1),
    db
      .select()
      .from(dayRecords)
      .where(and(eq(dayRecords.userId, userId), gt(dayRecords.version, since)))
      .orderBy(asc(dayRecords.version))
      .limit(limit + 1),
  ]);
  // every version is one row's, across both tables, so the first `limit` of both together end at
  // a version with nothing left out before it
  const changes = [
    ...habitRows.map((row) => ({ version: row.version, habit: row })),
    ...dayRows.map((row) => ({ version: row.version, day: row })),
  ].sort((a, b) => a.version - b.version);
  const page = changes.slice(0, limit);
  return {
    habits: page.flatMap((c) => ("habit" in c ? [syncedHabit(c.habit)] : [])),
    days: page.flatMap((c) => ("day" in c ? [syncedDay(c.day)] : [])),
    version: page.at(-1)?.version ?? since,
    more: changes.length > limit,
  } satisfies Pulled;
}

function syncedHabit(row: HabitRow): SyncedHabit {
  const edited = {} as Record<Field, number>;
  const changeIds = {} as Record<Field, string>;
  for (const field of FIELDS) {
    const [, editedKey, changeIdKey] = FIELD_KEYS[field];
    edited[field] = row[editedKey] as number;
    changeIds[field] = row[changeIdKey] as string;
  }
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    color: row.color,
    goal: row.goal,
    quitDay: row.quitDay,
    archived: row.archived,
    archivedPeriods: row.archivedPeriods,
    order: row.order,
    deleted: row.deleted,
    edited,
    changeIds,
  };
}

const syncedDay = (row: typeof dayRecords.$inferSelect): SyncedDay => ({
  habitId: row.habitId,
  day: row.day,
  logged: row.logged,
  edited: row.edited,
  changeId: row.changeId,
});

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[\w-]{1,64}$/;
/** Change ids are the devices' own; records kept from before sync have none, sent as "". */
const CHANGE_ID = /^[\w-]{0,64}$/;
/** Fractional positions grow a character every few moves into the same gap; leave them room. */
const ORDER = /^[0-9A-Za-z]{1,1024}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isTime = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
const matches = (pattern: RegExp, value: unknown) =>
  typeof value === "string" && pattern.test(value);

const isArchivedPeriod = (value: unknown) =>
  isObject(value) &&
  matches(DAY, value.archivedOn) &&
  (value.restoredOn === null || matches(DAY, value.restoredOn));

/** What each field may hold: far more than the app writes, to keep out only what no device sends. */
const VALID_VALUE: Record<Field, (value: unknown) => boolean> = {
  name: (v) => typeof v === "string" && v.length > 0 && v.length <= 1000,
  color: (v) => matches(/^[a-z-]{1,32}$/, v),
  goal: (v) => v === null || (Number.isSafeInteger(v) && (v as number) > 0),
  quitDay: (v) => v === null || matches(DAY, v),
  archived: (v) => typeof v === "boolean",
  archivedPeriods: (v) => Array.isArray(v) && v.length <= 1000 && v.every(isArchivedPeriod),
  order: (v) => matches(ORDER, v),
};

const isHabit = (value: unknown): value is SyncedHabit =>
  isObject(value) &&
  matches(ID, value.id) &&
  (value.kind === "build" || value.kind === "quit") &&
  typeof value.deleted === "boolean" &&
  isObject(value.edited) &&
  isObject(value.changeIds) &&
  FIELDS.every(
    (field) =>
      VALID_VALUE[field](value[field]) &&
      isTime((value.edited as Record<string, unknown>)[field]) &&
      matches(CHANGE_ID, (value.changeIds as Record<string, unknown>)[field]),
  );

const isDay = (value: unknown): value is SyncedDay =>
  isObject(value) &&
  matches(ID, value.habitId) &&
  matches(DAY, value.day) &&
  typeof value.logged === "boolean" &&
  isTime(value.edited) &&
  matches(CHANGE_ID, value.changeId);

/** Where in a push the rows the server couldn't read were: their places in each list. */
export type Refused = { habits: number[]; days: number[] };

/**
 * The rows of a push the server can store, and where the ones it can't were, or why it takes none
 * at all. One row it can't read doesn't hold up the rest: the device keeps that one waiting, and
 * the others sync.
 */
export function readPush(body: unknown): (Pushed & { refused: Refused }) | "invalid" | "too-large" {
  if (!isObject(body) || !Array.isArray(body.habits) || !Array.isArray(body.days)) return "invalid";
  if (body.habits.length + body.days.length > PUSH_LIMIT) return "too-large";
  const unreadable = (rows: unknown[], readable: (row: unknown) => boolean) =>
    rows.flatMap((row, i) => (readable(row) ? [] : [i]));
  return {
    habits: body.habits.filter(isHabit),
    days: body.days.filter(isDay),
    refused: { habits: unreadable(body.habits, isHabit), days: unreadable(body.days, isDay) },
  };
}
