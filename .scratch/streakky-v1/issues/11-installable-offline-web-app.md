# 11: Installable offline web app

**What to build:** I can install Streakky from my browser, and after the first visit it opens with no network at all. The app also asks the browser to keep its storage, so my habits are less likely to be deleted. A new deploy is picked up on the next open.

**Spec:** Streakky v1 spec, user stories 38, 40–41, and section "Web layouts and PWA".

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** done

- [x] The web app has a manifest and icons, and Chrome offers to install it.
- [x] After one online visit, the app opens and works with the network off, served from the app shell cached by its service worker.
- [x] After a new build is deployed, the app offers it on the next open with an "update ready" prompt, and switches when the person accepts (changed by the owner on 2026-11-24; it no longer reloads by itself).
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

**Follow-up (2026-11-24): update prompt, self-hosted fonts, no worker in the Android app.** These replace the "Updates" and "Fonts" notes above, and settle the note for 16. They also change the third criterion: a new deploy is now offered on the next open and runs once the person accepts it, or by itself once every tab of the app has closed.

- **Updates:** a new deploy's worker now installs and waits (`skipWaiting: false`; `clientsClaim` stays on for the first visit). `src/service-worker.ts` looks for a waiting worker on load, on `updatefound`, and calls `registration.update()` whenever the app regains the foreground (`visibilitychange`, `focus`). While one waits, `src/UpdatePrompt.tsx` shows a one-line notice along the bottom, "A new version is ready.", with **Not now** and **Reload**. Reload posts `{ type: "SKIP_WAITING" }`, which Workbox's generated `sw.js` handles when `skipWaiting` is false, and the page reloads on `controllerchange`. When another tab has already switched to the new version, Reload only reloads. Not now hides the notice for the rest of the page's life; a page resumed from the background is not a new open. The prompt never takes focus and sits under a dialog's scrim; it is an always-present `role="status"` region with an explicit `aria-live`, which Radix's modal leaves unhidden while a dialog is open.
- **Fonts:** Instrument Sans (`@fontsource-variable/instrument-sans`, its `wdth` files carrying wdth 75–100 and wght 400–700) and DM Mono 400 and 500 (`@fontsource/dm-mono`) are bundled through `src/fonts.css` and precached as six woff2 files (17 precache entries in all). Fontsource names the variable face "Instrument Sans Variable", so `fonts.css` declares its files again as "Instrument Sans". The Google Fonts links and the runtime caching are gone; `apps/demo` keeps its links.
- **For 16:** the worker isn't registered when `window.Capacitor.isNativePlatform()` is true; ticket 16 now has an acceptance criterion to confirm it on the phone.
- **Checked in headless Chrome 158 against `vp build` + `vp preview` (builds A, B and C differing in Home's heading):**
  - A New habit dialog open with a name typed, B deployed, the tab hidden and shown again: the prompt appeared within the update check, the page didn't reload in the next 5 s, and focus and the typed name stayed in the dialog. The live region had no `aria-hidden` while the dialog was open.
  - Not now: still A, no reload. Reopening the tab: still A, with the prompt again. Reload: the page reloaded into B, with the habit made on A still there.
  - C deployed, then a reopen: B from the cache, with the prompt and no reload of its own. With two tabs on B, Reload in one moved it to C; the other didn't reload by itself and kept offering Reload, which then moved it to C. The same held for a first-visit tab, one with no worker in control when it loaded, while another tab accepted.
  - After Not now, once every tab had left the app, the next open ran the new version with no prompt.
  - Both buttons are 44 px tall, and Reload showed a 2 px focus outline from the keyboard. The notice is one row, 62 px tall at 390 px wide and 64 px at 320; with its 8 px offset it stays within the 72 px Home leaves at the bottom. Light and dark, and 1024 px wide, looked right.
  - Fonts: no request went to Google. After one online visit, with the HTTP cache cleared and the server stopped, a new tab opened the app and loaded Instrument Sans and DM Mono 400 and 500 from the worker, DM Mono for the first time. Text widths changed with `font-weight` and `font-stretch`, so both axes work.
  - With `window.Capacitor.isNativePlatform()` stubbed to return true, no worker registered; returning false, it did. In dev the fonts load and no worker registers. No console errors or warnings in any run.
- **Focus rings:** Button's own ring draws nothing at the moment: its `outline-none` sets Tailwind's `--tw-outline-style` to `none`, which `focus-visible:outline-2` reads. The prompt adds `focus-visible:outline-solid` to its buttons until Button is fixed. _Resolved 2026-11-24: the design system's `focus-ring` utility fixed every control, and the workaround is gone._
