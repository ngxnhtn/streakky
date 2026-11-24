import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { pwa } from "./pwa.config.ts";

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
      // The Android app's debug APK (ticket 16): this build synced into android/, then built with
      // the command-line Android SDK. Gradle 8.14 runs on Java 21, not a newer one.
      android: {
        command:
          "cap sync android && cd android && JAVA_HOME=$(/usr/libexec/java_home -v 21) ANDROID_HOME=${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools} ./gradlew assembleDebug",
        dependsOn: ["web#build"],
        cache: false,
      },
      // the widget's Kotlin rule over core's shared widget cases (ticket 20), on the JVM: no phone
      "android-test": {
        command:
          "cd android && JAVA_HOME=$(/usr/libexec/java_home -v 21) ANDROID_HOME=${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools} ./gradlew :app:testDebugUnitTest",
        cache: false,
      },
      // that APK on the phone connected over adb, opened
      "android-install": {
        command:
          "adb install -r android/app/build/outputs/apk/debug/app-debug.apk && adb shell am start -n com.ngxnhtn.streakky/.MainActivity",
        dependsOn: ["android"],
        cache: false,
      },
    },
  },
});
