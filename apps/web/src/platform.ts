/**
 * Inside the Android app (ticket 16), Capacitor's bridge defines `window.Capacitor` before the
 * app's scripts run. A plain browser has no such global, so there this is always false.
 */
export const insideNativeApp = () =>
  (
    globalThis as typeof globalThis & { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor?.isNativePlatform?.() === true;

/** What the app takes from the platform it runs on, beyond a browser's: none of it on the web. */
export type Platform = {
  /**
   * Android's back button: calls `back` on each press, which goes back in the app and says whether
   * it did. When Home has nothing to go back from, it returns false, and the app closes.
   */
  backButton?: (back: () => boolean) => () => void;
  /** Makes the status and navigation bars' icons light over a dark theme, dark over a light one. */
  systemBars?: (dark: boolean) => void;
};
