import type { CapacitorConfig } from "@capacitor/cli";
import { ANDROID_APP_ORIGIN } from "@streakky/contract";

// the address the app's pages come from, which the API Worker allows through CORS
const origin = new URL(ANDROID_APP_ORIGIN);

/**
 * The Android app (ADR-0001): this web app's build, `dist`, wrapped in Capacitor. Run
 * `vp run web#android` to build it, sync it into `android/`, and build the debug APK.
 */
const config: CapacitorConfig = {
  appId: "com.ngxnhtn.streakky",
  appName: "Streakky",
  webDir: "dist",
  // the ink of the icon and the launch screen, until the page draws its own ground
  backgroundColor: "#06525c",
  server: { androidScheme: origin.protocol.slice(0, -1), hostname: origin.hostname },
  plugins: {
    SystemBars: {
      // edge to edge: the page draws under the status and navigation bars, and pads itself with
      // env(safe-area-inset-*), as index.html's viewport-fit=cover asks
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
