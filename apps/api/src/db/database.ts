import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "./auth-schema.ts";
import * as schema from "./schema.ts";

/** Streakky's D1 database through Drizzle, which knows every table in schema.ts. */
export const openDatabase = (d1: D1Database) => drizzle(d1, { schema });

export type Database = ReturnType<typeof openDatabase>;

/**
 * better-auth's tables in `db`, through its Drizzle adapter. D1 has no interactive transactions,
 * so the adapter's stay off, as they are by default.
 */
export const authDatabase = (db: Database) =>
  drizzleAdapter(db, { provider: "sqlite", schema: authSchema });
