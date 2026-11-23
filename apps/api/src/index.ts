/**
 * The Worker at hb.nhutien.com. Only requests under /api reach it: the assets layer serves the
 * web app's build, and the app itself for any other path (see `assets` in wrangler.jsonc).
 */
export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/health") return health(env);
    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/** Healthy once the Worker has reached its D1 database. */
async function health(env: Env): Promise<Response> {
  await env.DB.prepare("SELECT 1").run();
  return Response.json({ ok: true });
}
