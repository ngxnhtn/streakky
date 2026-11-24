/**
 * Every table in Streakky's D1 database. Change a table here, then run `vp run api#db-generate`,
 * which writes the SQL migration that deploy applies. better-auth's tables come from
 * auth-schema.ts, which that task regenerates from the auth options.
 */
import type { ArchivedPeriod, ColorId } from "@streakky/core";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema.ts";

export * from "./auth-schema.ts";

/** The account a synced row belongs to; its rows go when the account does. */
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

/**
 * Every editable field keeps the device time of its last change and the id of that change, so
 * "later edit wins" works field by field, and a tie in time goes to the higher change id
 * (ADR-0002). Every row also carries its account's server version from the push that last
 * changed it, which pulls ask after.
 */
const edited = (field: string) => integer(`${field}_edited`).notNull();
const changeId = (field: string) => text(`${field}_change_id`).notNull();

/** Habits as the devices sync them (spec, "Synced data shape"), one row per habit and account. */
export const habits = sqliteTable(
  "habits",
  {
    userId: owner(),
    id: text().notNull(),
    kind: text({ enum: ["build", "quit"] }).notNull(),
    name: text().notNull(),
    nameEdited: edited("name"),
    nameChangeId: changeId("name"),
    // the devices' colour ids; the server takes any it can read (src/sync.ts)
    color: text().$type<ColorId>().notNull(),
    colorEdited: edited("color"),
    colorChangeId: changeId("color"),
    goal: integer(),
    goalEdited: edited("goal"),
    goalChangeId: changeId("goal"),
    quitDay: text("quit_day"),
    quitDayEdited: edited("quit_day"),
    quitDayChangeId: changeId("quit_day"),
    archived: integer({ mode: "boolean" }).notNull(),
    archivedEdited: edited("archived"),
    archivedChangeId: changeId("archived"),
    archivedPeriods: text("archived_periods", { mode: "json" }).$type<ArchivedPeriod[]>().notNull(),
    archivedPeriodsEdited: edited("archived_periods"),
    archivedPeriodsChangeId: changeId("archived_periods"),
    order: text("sort_order").notNull(),
    orderEdited: edited("sort_order"),
    orderChangeId: changeId("sort_order"),
    /** tombstone: once true, never false again */
    deleted: integer({ mode: "boolean" }).notNull(),
    version: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("habits_version_idx").on(table.userId, table.version),
  ],
);

/** A habit's day: a check-in or a slip while `logged`, per habit, day and account. */
export const dayRecords = sqliteTable(
  "day_records",
  {
    userId: owner(),
    habitId: text("habit_id").notNull(),
    /** YYYY-MM-DD */
    day: text().notNull(),
    logged: integer({ mode: "boolean" }).notNull(),
    edited: integer().notNull(),
    changeId: text("change_id").notNull(),
    version: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.habitId, table.day] }),
    index("day_records_version_idx").on(table.userId, table.version),
  ],
);

/** Each account's latest server version: every synced row it changes takes the next one. */
export const syncVersions = sqliteTable("sync_versions", {
  userId: owner().primaryKey(),
  version: integer().notNull(),
});

/**
 * Sign-in steps per address and UTC day, across every client IP, so guessing a code stays capped
 * however many IPs an attacker has (see src/auth.ts, DAILY_LIMITS).
 */
export const signInAttempts = sqliteTable(
  "sign_in_attempts",
  {
    email: text().notNull(),
    /** The better-auth endpoint, such as /sign-in/email-otp. */
    path: text().notNull(),
    /** Days since 1970-01-01, in UTC. */
    utcDay: integer("day").notNull(),
    count: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.email, table.path, table.utcDay] })],
);
