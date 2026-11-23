# 16: Android app tracer

**What to build:** Streakky runs on my Android phone as the same web build wrapped in Capacitor (ADR-0001), using the phone layout. Every existing feature works offline and signed-out. My habits are stored in native SQLite inside the app, so they survive app restarts and reboots. Export opens the Android share sheet.

**Spec:** Streakky v1 spec, user stories 63 and 68, and section "Android". Also ADR-0001.

**Blocked by:** 02 (Web app tracer: build habits saved on the device), 09 (Export)

**Status:** ready-for-agent

- [ ] The Capacitor project lives inside the web app, with an app id under the owner's domain, and builds a debug APK that installs on the owner's phone.
- [ ] The app always uses the phone layout, and every existing feature works offline and signed-out.
- [ ] Habit data is stored in native SQLite through a Capacitor SQLite plugin, and survives app restarts and phone reboots.
- [ ] Device settings are stored natively and survive restarts.
- [ ] Export opens the Android share sheet with the JSON file.
- [ ] The Android back button goes back within the app and exits from Home.
- [ ] The status bar and safe areas look right in light and dark themes.
- [ ] The app registers no service worker, since the APK already holds the app. The web build skips registering it when `window.Capacitor.isNativePlatform()` is true (`apps/web/src/service-worker.ts`); confirm on the phone that no worker is registered.
- [ ] `vp check` and `vp test` pass.
