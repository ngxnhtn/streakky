import { defineConfig } from "drizzle-kit";

// drizzle-kit only writes migrations (`vp run api#db-generate`); Wrangler applies them to D1, on
// deploy, in `vp run api#dev` and in the test harness, from the migrations_dir in wrangler.jsonc
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
