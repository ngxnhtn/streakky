# 12: Worker serves the app at hb.nhutien.com

**What to build:** A new API Worker app serves the web app's build at `hb.nhutien.com`, with unknown paths falling back to the app, and answers requests under `/api`. It's bound to one D1 database, with migrations. One deploy command, run from the owner's Mac, builds the web app, applies D1 migrations and deploys the Worker to the custom domain. Local development runs the Worker with a local D1 next to the web dev server.

This ticket also starts the server side of the test harness: tests run the real Worker in the Workers runtime with a local D1. Whether Cloudflare's Workers test tooling and Vite plugin work under Vite+ hasn't been verified, so check that first and surface any blocker.

**Spec:** Streakky v1 spec, sections "Modules" (API Worker), "D1", "Deploy" and "Testing Decisions" (Seam 2). Also ADR-0003.

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** ready-for-agent

- [ ] The Worker serves the web app's build, unknown paths return the app, and a route under `/api` responds.
- [ ] The Worker is bound to one D1 database, and its migrations apply both in local dev and on deploy.
- [ ] In local dev, the web app reaches `/api` on the same origin, with the Worker running against a local D1.
- [ ] The deploy command builds the web app, applies migrations and deploys to `hb.nhutien.com`. The owner runs the first deploy, which needs their Cloudflare login.
- [ ] Nothing used needs a paid Cloudflare plan.
- [ ] Harness: a test starts the Worker in the Workers runtime with a local D1 and checks that it serves the app and falls back to it.
- [ ] `vp check` and `vp test` pass.
