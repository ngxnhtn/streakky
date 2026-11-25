import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { pwa } from "./pwa.config.ts";

/**
 * Gradle in android/, on Java 21: macOS's own, which says so if it has none, or where JAVA_HOME
 * points elsewhere, as in CI; with the Android SDK from ANDROID_HOME, or Homebrew's command-line
 * tools on the owner's Mac.
 */
const GRADLE =
  "JAVA_HOME=$(if [ -x /usr/libexec/java_home ]; then /usr/libexec/java_home -v 21; else echo $JAVA_HOME; fi) ANDROID_HOME=${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools} ./gradlew";

export default defineConfig({
  plugins: lazyPlugins(() => [tailwindcss(), react(), pwa()]),
  server: {
    // the API Worker runs beside the dev server (`vp run api#dev`); proxying keeps /api on the
    // app's own origin, as on hb.nhutien.com
    proxy: { "/api/": process.env.STREAKKY_API_ORIGIN ?? "http://localhost:8787" },
  },
  test: {
    // the habit store's tests run against Node SQLite, not a browser
    environment: "node",
  },
  run: {
    tasks: {
      // The Android app's debug APK (ticket 16), "Streakky Dev": this build synced into android/,
      // then built with the command-line Android SDK. Gradle 8.14 runs on Java 21, not a newer one.
      android: {
        command: `cap sync android && cd android && ${GRADLE} assembleDebug`,
        dependsOn: ["web#build"],
        cache: false,
      },
      // The signed release APK (ticket 18), as the release workflow builds it: the key from
      // STREAKKY_KEYSTORE and its password, the version from the tag (-PreleaseTag=vX.Y.Z).
      "android-release": {
        command: `cap sync android && cd android && ${GRADLE} assembleRelease`,
        dependsOn: ["web#build"],
        cache: false,
      },
      // the widget's Kotlin rule over core's shared widget cases (ticket 20), on the JVM: no phone;
      // synced first, since Gradle reads the plugins' files that `cap sync` writes
      "android-test": {
        command: `cap sync android && cd android && ${GRADLE} :app:testDebugUnitTest`,
        dependsOn: ["web#build"],
        cache: false,
      },
      // the debug APK on the phone connected over adb, opened: build.gradle's id with ".debug"
      "android-install": {
        command:
          "adb install -r android/app/build/outputs/apk/debug/app-debug.apk && adb shell am start -n com.ngxnhtn.streakky.debug/com.ngxnhtn.streakky.MainActivity",
        dependsOn: ["android"],
        cache: false,
      },
    },
  },
});
