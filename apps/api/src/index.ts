import {
  ANDROID_APP_ORIGIN,
  AUTH_PATH,
  SESSION_TOKEN_HEADER,
  SYNC_PATH,
  type PushAnswer,
} from "@streakky/contract";
import { lt, sql } from "drizzle-orm";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { createAuth } from "./auth.ts";
import { authDatabase, openDatabase, type Database } from "./db/database.ts";
import { signInAttempts } from "./db/schema.ts";
import { sendSignInCode } from "./email.ts";
import { pull, push, readPush } from "./sync.ts";

/** The Worker's bindings, and what a signed-in request carries past the session check. */
type WorkerEnv = { Bindings: Env; Variables: { userId: string } };

/** A push's largest body: a full push of the longest habits is far smaller. */
const MAX_PUSH_BYTES = 512 * 1024;

/**
 * Sync's push and pull (src/sync.ts), for a signed-in device only: its session cookie, or the
 * bearer token the Android app sends.
 */
const sync = new Hono<WorkerEnv>()
  .use(async (c, next) => {
    const { headers, response: session } = await authFor(c.req.raw, c.env).api.getSession({
      headers: c.req.raw.headers,
      returnHeaders: true,
    });
    // Once a day of use, checking the session renews it for a year (`updateAge` in auth.ts), and
    // better-auth sets its cookie again; for a session that has ended, it clears the cookie. The
    // answer carries those cookies, as /get-session's does: a device syncs more often than it
    // asks that, and its cookie has to last a year from its last use, not from signing in.
    const withCookies = (response: Response) => {
      for (const cookie of headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
      return response;
    };
    if (!session) return withCookies(c.json({ error: "Not signed in" }, 401));
    c.set("userId", session.user.id);
    await next();
    withCookies(c.res);
  })
  .get("/pull", async (c) => {
    const since = Number(c.req.query("since") ?? "0");
    if (!Number.isSafeInteger(since) || since < 0) return c.json({ error: "Bad since" }, 400);
    return c.json(await pull(openDatabase(c.env.DB), c.var.userId, since));
  })
  .post(
    "/push",
    sameOrigin(),
    bodyLimit({ maxSize: MAX_PUSH_BYTES, onError: (c) => c.json({ error: "Too large" }, 413) }),
    async (c) => {
      const body: unknown = await c.req.json().catch(() => undefined);
      const pushed = readPush(body);
      if (pushed === "too-large") return c.json({ error: "Too large" }, 413);
      if (pushed === "invalid") return c.json({ error: "Bad push" }, 400);
      await push(openDatabase(c.env.DB), c.var.userId, pushed);
      // rows the server couldn't read stay waiting on the device; the rest are stored
      return c.json({ refused: pushed.refused } satisfies PushAnswer);
    },
  );

/**
 * The Worker at hb.nhutien.com. The assets layer serves every file of the web app's build without
 * running it (see `assets` in wrangler.jsonc). It answers /api, and any path with no file.
 */
const app = new Hono<WorkerEnv>()
  // The Android app's pages come from another origin (ANDROID_APP_ORIGIN), so its WebView asks before
  // each request with a bearer token or a JSON body, and only reads what's allowed here: its
  // session token comes back in a header, since its cookies wouldn't be its own. The web app is
  // on the Worker's own origin, so this changes nothing for it.
  .use(
    "/api/*",
    cors({
      origin: ANDROID_APP_ORIGIN,
      allowMethods: ["GET", "POST"],
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: [SESSION_TOKEN_HEADER],
      maxAge: 24 * 60 * 60,
    }),
  )
  .get("/api/health", async (c) => {
    // healthy once the Worker has reached its D1 database
    await openDatabase(c.env.DB).run(sql`select 1`);
    return c.json({ ok: true });
  })
  .on(["GET", "POST"], `${AUTH_PATH}/*`, (c) => authFor(c.req.raw, c.env).handler(c.req.raw))
  .route(SYNC_PATH, sync)
  .all("/api", (c) => c.json({ error: "Not found" }, 404))
  .all("/api/*", (c) => c.json({ error: "Not found" }, 404))
  .all("*", (c) => appFallback(c.req.raw, c.env));

export default app;

/**
 * Refuses a write that rides on the session cookie from a page on another origin, as better-auth
 * does for its own writes. A bearer token is never sent by the browser on its own, so a request
 * carrying one, such as the Android app's, needs no such check.
 */
function sameOrigin(): MiddlewareHandler<WorkerEnv> {
  return async (c, next) => {
    const origin = c.req.header("Origin");
    const bearer = c.req.header("Authorization")?.startsWith("Bearer ");
    if (!bearer && origin !== undefined && origin !== new URL(c.req.url).origin) {
      return c.json({ error: "Wrong origin" }, 403);
    }
    await next();
  };
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
  const utcDay = Math.floor(Date.now() / 86_400_000);
  const [, counted] = await db.batch([
    db.delete(signInAttempts).where(lt(signInAttempts.utcDay, utcDay - 1)),
    db
      .insert(signInAttempts)
      .values({ email, path, utcDay, count: 1 })
      .onConflictDoUpdate({
        target: [signInAttempts.email, signInAttempts.path, signInAttempts.utcDay],
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
