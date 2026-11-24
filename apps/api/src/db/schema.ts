/**
 * Every table in Streakky's D1 database. Change a table here, then run `vp run api#db-generate`,
 * which writes the SQL migration that deploy applies. better-auth's tables come from
 * auth-schema.ts, which that task regenerates from the auth options.
 */
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export * from "./auth-schema.ts";

/**
 * Sign-in steps per address and UTC day, across every client IP, so guessing a code stays capped
 * however many addresses an attacker has (see src/auth.ts, DAILY_LIMITS).
 */
export const signInAttempts = sqliteTable(
  "sign_in_attempts",
  {
    email: text().notNull(),
    /** The better-auth endpoint, such as /sign-in/email-otp. */
    path: text().notNull(),
    /** Days since 1970-01-01, in UTC. */
    day: integer().notNull(),
    count: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.email, table.path, table.day] })],
);
