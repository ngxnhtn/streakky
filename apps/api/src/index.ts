import { lt, sql } from "drizzle-orm";
import { AUTH_PATH, createAuth } from "./auth.ts";
import { authDatabase, openDatabase, type Database } from "./db/database.ts";
import { signInAttempts } from "./db/schema.ts";
import { sendSignInCode } from "./email.ts";

/**
 * The Worker at hb.nhutien.com. The assets layer serves every file of the web app's build without
 * running it (see `assets` in wrangler.jsonc). It answers /api, and any path with no file.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/health") return health(env);
    if (pathname.startsWith(`${AUTH_PATH}/`)) return authFor(request, env).handler(request);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return appFallback(request, env);
  },
} satisfies ExportedHandler<Env>;

/** Healthy once the Worker has reached its D1 database. */
async function health(env: Env): Promise<Response> {
  await openDatabase(env.DB).run(sql`select 1`);
  return Response.json({ ok: true });
}

let auth: { origin: string; instance: ReturnType<typeof createAuth> } | undefined;

/**
 * better-auth for the origin the request came to: https://hb.nhutien.com once deployed, which is
 * the only host routed to this Worker, and the local address in development and tests. Kept for
 * the isolate's later requests, since setting it up costs CPU time.
 */
function authFor(request: Request, env: Env) {
  const { origin } = new URL(request.url);
  if (auth?.origin !== origin) {
    const db = openDatabase(env.DB);
    auth = {
      origin,
      instance: createAuth({
        database: authDatabase(db),
        baseURL: origin,
        secret: env.BETTER_AUTH_SECRET,
        allowlist: env.SIGN_IN_ALLOWLIST,
        sendCode: (code) => sendSignInCode(env, code),
        countAttempt: (email, path) => countAttempt(db, email, path),
      }),
    };
  }
  return auth.instance;
}

/** Counts a sign-in step for an address in today's row (UTC), dropping rows from before yesterday. */
async function countAttempt(db: Database, email: string, path: string): Promise<number> {
  const day = Math.floor(Date.now() / 86_400_000);
  const [, counted] = await db.batch([
    db.delete(signInAttempts).where(lt(signInAttempts.day, day - 1)),
    db
      .insert(signInAttempts)
      .values({ email, path, day, count: 1 })
      .onConflictDoUpdate({
        target: [signInAttempts.email, signInAttempts.path, signInAttempts.day],
        set: { count: sql`${signInAttempts.count} + 1` },
      })
      .returning({ count: signInAttempts.count }),
  ]);
  return counted[0]?.count ?? 0;
}

/**
 * A path with no file. Under /assets/ it is a build file that no longer exists, such as a script
 * of the version a page loaded before the latest deploy, so it gets a 404 that page can fail on
 * cleanly. Any other path belongs to the app, which routes it, so it gets the app's index.html.
 */
function appFallback(request: Request, env: Env): Promise<Response> | Response {
  if (new URL(request.url).pathname.startsWith("/assets/")) {
    return new Response("Not found", { status: 404 });
  }
  return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
}
