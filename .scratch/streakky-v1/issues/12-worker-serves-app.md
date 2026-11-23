# 12: Worker serves the app at hb.nhutien.com

**What to build:** A new API Worker app serves the web app's build at `hb.nhutien.com`, with unknown paths falling back to the app, and answers requests under `/api`. It's bound to one D1 database, with migrations. One deploy command, run from the owner's Mac, builds the web app, applies D1 migrations and deploys the Worker to the custom domain. Local development runs the Worker with a local D1 next to the web dev server.

This ticket also starts the server side of the test harness: tests run the real Worker in the Workers runtime with a local D1. Whether Cloudflare's Workers test tooling and Vite plugin work under Vite+ hasn't been verified, so check that first and surface any blocker.

**Spec:** Streakky v1 spec, sections "Modules" (API Worker), "D1", "Deploy" and "Testing Decisions" (Seam 2). Also ADR-0003.

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** done

- [x] The Worker serves the web app's build, unknown paths return the app, and a route under `/api` responds.
- [x] The Worker is bound to one D1 database, and its migrations apply both in local dev and on deploy.
- [x] In local dev, the web app reaches `/api` on the same origin, with the Worker running against a local D1.
- [ ] The deploy command builds the web app, applies migrations and deploys to `hb.nhutien.com`. The owner runs the first deploy, which needs their Cloudflare login.
- [x] Nothing used needs a paid Cloudflare plan.
- [x] Harness: a test starts the Worker in the Workers runtime with a local D1 and checks that it serves the app and falls back to it.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24),** except the first deploy, which needs the owner's Cloudflare login. Notes for later tickets:

**What exists.** `apps/api` is the Worker (`src/index.ts`), configured in `wrangler.jsonc`, with D1 migrations in `migrations/` and Vite Task tasks in `vite.config.ts`. `0001_initial.sql` is only a comment: sign-in (13) adds better-auth's tables as `0002_...`, and sync (14) adds habits and day records. `GET /api/health` answers `{"ok":true}` once it has queried D1; any other `/api` path answers a JSON 404.

**Routing.** `run_worker_first: ["/api/*"]` means only `/api/*` reaches the Worker, browser navigations included. That matters for any link that opens an `/api/auth/*` URL in the browser. Everything else comes from the assets layer, with `index.html` for paths that have no file, and never runs the Worker. Requests that only hit assets are free and unlimited. A missing file, such as an old hashed chunk, also gets `index.html` with a 200, which is worth knowing for the service worker in ticket 11.

**Tooling under Vite+ (checked 2026-11-24).**

- The harness uses Wrangler's `createTestHarness()`, which runs the Worker in workerd from Node, so it works under `vp test` (Vitest 5.1.0) with no Vitest integration involved.
- A throwaway spike ran `@cloudflare/vitest-plugin` 1.9.0 under `vp test`, and an in-runtime test passed inside workerd. (The old `@cloudflare/vitest-pool-workers` peers Vitest 4 only.) It wasn't adopted: its `exports.default.fetch()` can't see static assets, and Seam 2's devices are habit stores running in Node. In-runtime tests would also need their own Vite config, because the root `vp test` doesn't load that plugin.
- A second spike built and served a page plus this Worker with `@cloudflare/vite-plugin` 1.70.1 under Vite+. It wasn't adopted either. Using it would move the Worker into apps/web's build and change that build's output layout, which the PWA (11) and Capacitor (16) depend on. The web dev server's `/api` proxy needs one line instead.

**Test harness.** `apps/api/test/worker.ts` has `startWorker(appBuild)`. It starts the real `wrangler.jsonc` config with a fresh in-memory D1 and every migration applied, and serves the given files in place of `apps/web/dist`, so tests don't need a web build. It gives you `fetch(path)` and `navigate(path)`; Seam 2's devices (14) will also need the Worker's base URL, which `harness.listen()` returns. Node's `fetch` overwrites `Sec-Fetch-Mode` with its own value, so use `navigate` to act like a browser opening a page. Cloudflare's docs say the harness sends the Worker's outgoing fetches through Node's `globalThis.fetch`, which ticket 13 can use to capture Resend emails with a stub. I haven't tried it. Such a stub must let the test's own requests to the Worker through. A missing migrations folder or a failing migration makes `startWorker` throw, so every Worker test fails.

**For later tickets.**

- With compatibility date 2026-11-19, Node.js compatibility is on by default: Wrangler 4.166 turns it on for dates from 2026-08-04, and `wrangler types` reported it. better-auth (13) may rely on this.
- `worker-configuration.d.ts` is generated, and fmt and lint skip it. Run `vp run api#cf-typegen` after any change to `wrangler.jsonc` (bindings, vars, secrets, compatibility date).
- `apps/api/.gitignore` already ignores `.dev.vars*`, for local secrets.
- The deploy and dev tasks are never cached. Under `vp run`, Wrangler runs non-interactively. I saw it apply local migrations without asking for confirmation.
- When I stopped `vp run api#dev` with `kill`, `wrangler` and `workerd` kept running and had to be stopped separately.

**Local development.** Use two terminals:

- `vp run api#dev`: builds the web app if it changed, applies migrations to the local D1 (kept in `apps/api/.wrangler/state`), then runs the Worker on http://localhost:8787. That server also serves the last production build.
- `vp run web#dev`: the app on http://localhost:3000, which proxies `/api` to :8787. If the Worker runs on another port, set `STREAKKY_API_ORIGIN`, for example `STREAKKY_API_ORIGIN=http://localhost:8801`.

What I verified:

- `curl` on the Worker: the app, its asset files (`.wasm` served as `application/wasm`), deep links with and without navigation headers, the health check, and the JSON 404.
- Headless Chrome: the production build served by the Worker loads at `/habits/h1`, and its `fetch("/api/health")` works. The dev app's `fetch("/api/health")` works on its own origin.
- `wrangler deploy --dry-run`: it read the web build's 6 files and bundled a 0.57 KiB Worker.
- Nothing has touched a Cloudflare account.

**Owner: first deploy.** Run these from the repo root on your Mac:

1. `vp install`
2. `vp -C apps/api exec wrangler login` opens the browser to sign in to Cloudflare.
3. `vp -C apps/api exec wrangler d1 create streakky`, then copy the `database_id` it prints into `apps/api/wrangler.jsonc` in place of `REPLACE_WITH_D1_DATABASE_ID`. The `DB` binding is already in the config, so if Wrangler offers to add one, say no.
4. If your Cloudflare login can reach more than one account, add `"account_id": "<your account id>"` to `apps/api/wrangler.jsonc`, or export `CLOUDFLARE_ACCOUNT_ID`. The deploy runs non-interactively, so Wrangler most likely can't ask which account to use.
5. Check that `hb.nhutien.com` has no DNS record yet. Cloudflare can't attach a Custom Domain to a hostname that already has a CNAME record, and it creates the DNS record and certificate itself.
6. `vp run api#deploy` builds the web app, applies the D1 migrations remotely (Wrangler backs up the database first), then deploys the Worker to `hb.nhutien.com`. This is also the command for every later release.
7. Check it: `curl https://hb.nhutien.com/api/health` should print `{"ok":true}`, https://hb.nhutien.com should open the app, and `vp -C apps/api exec wrangler d1 migrations list streakky --remote` should report no migrations left to apply.
8. Commit the `database_id`. It's an identifier, not a secret.

Steps 2 to 7 are unverified, because they need your account. Wrangler sends anonymous usage telemetry by default. To turn it off, run `vp -C apps/api exec wrangler telemetry disable`.
