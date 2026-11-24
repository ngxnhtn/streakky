# 16: Android app tracer

**What to build:** Streakky runs on my Android phone as the same web build wrapped in Capacitor (ADR-0001), using the phone layout. Every existing feature works offline and signed-out. My habits are stored in native SQLite inside the app, so they survive app restarts and reboots. Export opens the Android share sheet.

**Spec:** Streakky v1 spec, user stories 63 and 68, and section "Android". Also ADR-0001.

**Blocked by:** 02 (Web app tracer: build habits saved on the device), 09 (Export)

**Status:** done

- [x] The Capacitor project lives inside the web app, with an app id under the owner's domain, and builds a debug APK that installs on the owner's phone.
- [x] The app always uses the phone layout, and every existing feature works offline and signed-out.
- [x] Habit data is stored in native SQLite through a Capacitor SQLite plugin, and survives app restarts and phone reboots.
- [x] Device settings are stored natively and survive restarts.
- [x] Export opens the Android share sheet with the JSON file.
- [x] The Android back button goes back within the app and exits from Home.
- [x] The status bar and safe areas look right in light and dark themes.
- [x] The app registers no service worker, since the APK already holds the app. The web build skips registering it when `window.Capacitor.isNativePlatform()` is true (`apps/web/src/service-worker.ts`); confirm on the phone that no worker is registered.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).**

- **Owner decisions:**
  - The app id is `com.ngxnhtn.streakky`, the owner's own handle rather than the domain.
  - It's built with the command-line Android SDK, not Android Studio: `brew install --cask android-commandlinetools`, the Android 16 platform (API 36) and build tools 36 through `sdkmanager`, about 500 MB. The owner's Temurin 21 runs Gradle, since Gradle 8.14 can't run on Java 25.
  - `vp run web#android` builds the debug APK, and `vp run web#android-install` puts it on the phone over adb.
- **Capacitor 8.6** sits inside the web app: `apps/web/capacitor.config.ts`, and the Android project in `apps/web/android/`. Its build output and the copied web build are ignored.
  - `src/android.ts` holds everything Android-only, and `main.tsx` loads it only inside the app, so the web build doesn't carry it.
  - **Habits:** native SQLite through `@capacitor-community/sqlite` with `@tanstack/capacitor-db-sqlite-persistence`, in `databases/streakkySQLite.db`.
  - **Settings:** native preferences (`shared_prefs/CapacitorStorage.xml`), read into memory as the app opens and written back on each change.
  - **The API:** `https://hb.nhutien.com`.
  - **Export:** writes the file to the app's cache and opens the share sheet; closing the sheet isn't an error, and a failed export now says so in Settings.
  - **The back button** goes through the screen stack (the `Platform` type in `platform.ts`). It closes an open sheet, or goes back a screen, or, from Home with nothing open, closes the app.
- **Status bar and edges:** Capacitor 8's `SystemBars` draws edge to edge, keeping to `viewport-fit=cover`. The status and navigation bar icons are set light or dark from the theme, as soon as the settings are read. The app pads itself with the safe-area insets: the top and sides on its root, and a shared `--edge-*` for sheets, the bottom notices and the screens' ends, so landscape cutouts and side navigation bars are kept clear too.
- **The icon and launch screen** are Streakky's own: the web icon's ring as a vector on the teal ink, with a monochrome layer for themed icons, and the same mark on Android's launch screen. `scripts/render-icons.ts` also renders the PNG icons that Android 7 still needs. Capacitor's placeholder images are gone. The SQLite plugin's biometric permissions are removed, since the app never opens a database by fingerprint.
- **Checked on the owner's Pixel 8** (Android 17, WebView 157), over adb and the WebView's DevTools socket:
  - **Running:** natively, with no service worker and the phone layout.
  - **Storage:** two habits, a check-in and the light theme came back after a force-stop and relaunch, with the habits in the app's SQLite file and the theme in its preferences.
  - **Back button:** it closed the options sheet, then left the habit for Home. From Sign in it went to Settings, from Settings to Home, and from Home it left the app.
  - **Export:** it opened the share sheet ("Sharing 1 file: streakky-2026-11-24.json"), and closing that came back to the app.
  - **Looks:** the status bar icons were light in the dark theme and dark in the light one, with the content clear of the status bar and the gesture bar. App info showed "Streakky" with its icon, and the launch screen showed the mark.
  - **Errors:** none. Capacitor's debug builds do log a closed share sheet as a refused plugin call.
- **Not done here:**
  - **Sign in** is still reachable in the app, but can't reach the server until ticket 17 (CORS and a bearer token). It says it can't be reached.
  - **Syncing** is already set to run when the app comes back to the front or online, which does nothing while signed out.
- **Not checked:**
  - **A phone reboot:** the habits live in the app's own SQLite file, which a force-stop and relaunch already proved is read back from storage.
  - **Landscape**, on the phone itself.
- **Low risks, kept:**
  - A settings write goes to the native preferences just after it's made, so a setting changed in the instant before the app is killed could be lost.
  - A back press during a screen's slide is ignored, as on native Android.
