import { AUTH_PATH, createAuth } from "./auth.ts";
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
  await env.DB.prepare("SELECT 1").run();
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
    auth = {
      origin,
      instance: createAuth({
        database: env.DB,
        baseURL: origin,
        secret: env.BETTER_AUTH_SECRET,
        allowlist: env.SIGN_IN_ALLOWLIST,
        sendCode: (code) => sendSignInCode(env, code),
      }),
    };
  }
  return auth.instance;
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
