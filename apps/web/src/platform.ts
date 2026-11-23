/**
 * Inside the Android app (ticket 16), Capacitor's bridge defines `window.Capacitor` before the
 * app's scripts run. A plain browser has no such global, so there this is always false.
 */
export const insideNativeApp = () =>
  (
    globalThis as typeof globalThis & { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor?.isNativePlatform?.() === true;
