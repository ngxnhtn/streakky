/**
 * Writes better-auth's tables as a Drizzle schema, src/db/auth-schema.ts, from the Worker's own
 * auth options. `vp run api#db-generate` runs it before drizzle-kit, so a change to the auth
 * options or a better-auth upgrade lands in the next migration. To run it alone, from apps/api:
 *
 *   vpx scripts/auth-schema.ts
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateDrizzleSchema } from "auth/api";
import { authOptions } from "../src/auth.ts";
import { authDatabase, openDatabase } from "../src/db/database.ts";

const file = fileURLToPath(new URL("../src/db/auth-schema.ts", import.meta.url));

// the schema depends on the options and the adapter's settings, never on the database itself,
// which is never queried here
const database = authDatabase(openDatabase({} as D1Database));
const options = authOptions({
  database,
  secret: "schema-only-secret-schema-only-secret",
  allowlist: "",
  sendCode: async () => {},
});
const { code } = await generateDrizzleSchema({ adapter: database(options), file, options });
if (!code) throw new Error("better-auth generated no schema.");

const header = "// better-auth's tables, written by scripts/auth-schema.ts. Don't edit.\n";
await writeFile(file, `${header}${code}`);
console.log(`Wrote ${file}`);
