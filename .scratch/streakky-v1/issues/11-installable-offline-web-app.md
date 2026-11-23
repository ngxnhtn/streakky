# 11: Installable offline web app

**What to build:** I can install Streakky from my browser, and after the first visit it opens with no network at all. The app also asks the browser to keep its storage, so my habits are less likely to be deleted. A new deploy is picked up on the next open.

**Spec:** Streakky v1 spec, user stories 38, 40–41, and section "Web layouts and PWA".

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** done

- [x] The web app has a manifest and icons, and Chrome offers to install it.
- [x] After one online visit, the app opens and works with the network off, served from the app shell cached by its service worker.
- [x] After a new build is deployed, the app runs the new version within one reopen.
- [x] On load the app requests persistent storage, and it works normally if the browser declines.
- [x] `vp check` and `vp test` pass, and the production build includes the service worker.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **How it's built:** vite-plugin-pwa 2.0 (Workbox `generateSW`) works under Vite+ (Vite 8, Rolldown). Its options live in `apps/web/pwa.config.ts`, and it writes `manifest.webmanifest` and `sw.js`. The app registers the worker itself in `src/service-worker.ts`, in production builds only, with the script and scope taken from Vite's `base` and no host assumed. The precache is the app shell: `index.html`, the JS and CSS, the SQLite OPFS worker, the wa-sqlite `.wasm`, the manifest and the icons (11 entries, about 2 MB).
- **Icons:** `scripts/render-icons.ts` (`vpx scripts/render-icons.ts` from `apps/web`) draws the playground's ring mark in ground colour on the teal ink and screenshots it with headless Chrome. It writes the 192 and 512 icons, a 512 maskable icon, a 180 apple-touch icon and `favicon.svg` into `public/`. The manifest uses the teal ground for `theme_color` and `background_color`, the same as the existing `theme-color` meta tag.
- **Checked in headless Chrome 158 against `vp build` + `vp preview`:**
  - First online visit: the worker takes control and precaches the shell. `Page.getAppManifest` reports no errors, and `Page.getInstallabilityErrors` is empty.
  - Server stopped, page and worker emulating offline, then a reload: every response came from the worker and the app opened. Creating a habit and checking in worked and survived another offline reload.
  - A fresh browser launch with all traffic sent to a dead proxy: the app opened and worked.
  - No console errors in any of these runs. In dev no worker is registered.
- **Updates:** the new worker skips waiting and claims open pages. A page that an older worker served reloads on `controllerchange`. In tests, a reopen after a rebuild showed the cached old version, then reloaded into the new bundle about 3 s later. Anything typed into an open dialog at that moment is lost; check-ins are already saved.
- **Persistent storage:** `openBrowserHabitStore` calls `navigator.storage.persist()` unless storage is already persisted. Headless Chrome answered `false`; Chrome grants it to installed or well-used sites. A `persist()` that throws didn't affect the app.
- **Fonts:** Instrument Sans and DM Mono still load from Google Fonts. The worker caches the stylesheet and font files it sees, from the second online load onward. After only a first visit, offline fonts come from the browser's HTTP cache. A font that has never been used online, such as DM Mono if nothing has shown it yet, falls back offline. Self-hosting the fonts would put them in the precache.
- **For 12 (Worker serves the app):**
  - Serve `sw.js`, `index.html` and `manifest.webmanifest` without long-lived caching; `/assets/*` is content-hashed.
  - The worker answers every in-scope navigation with the cached `index.html`, except paths under `/api/`.
- **For 16 (Android):** the build registers the worker wherever it runs in production, so inside Capacitor too. Decide there whether to skip it, since the APK already bundles the shell.
- **Limits:** Workbox leaves any file over 2 MiB out of the precache, with only a build warning. The `.wasm` is 1.13 MB and the main bundle 0.68 MB.
- **Lockfile:** vite-plugin-pwa brings in Workbox's build tooling (Babel, Rollup, Terser) as dev dependencies, about 3,000 lockfile lines. `vp install` already reported ignored build scripts for `@journeyapps/wa-sqlite` before this ticket.
