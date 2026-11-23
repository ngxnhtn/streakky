/**
 * Registers the service worker that vite-plugin-pwa builds (see pwa.config.ts). It caches the app
 * shell and its fonts, so the app opens with no network after one visit. Dev has no service
 * worker, and neither has the Android app, whose APK already holds the app.
 *
 * A new deploy's worker installs beside the running version and waits. The app then offers to
 * reload into it (UpdatePrompt.tsx); a page reloads only when the person accepts, so nothing typed
 * into an open dialog is lost. Dismissed, the update waits for a later open.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || insideNativeApp()) return;
  const base = import.meta.env.BASE_URL;
  const container = navigator.serviceWorker;
  // false only until the first visit's worker claims the page
  let hadController = container.controller !== null;
  let accepted = false;
  container.addEventListener("controllerchange", () => {
    if (accepted) location.reload();
    // another tab accepted the update, so this page runs the old version under the new worker
    else if (hadController) offer(() => location.reload());
    hadController = true;
  });
  container.register(`${base}sw.js`, { scope: base }).then(
    (registration) => {
      // a new version's worker that has cached its app shell and waits for the running one
      const offerWaiting = () => {
        const waiting = registration.waiting;
        if (!waiting || !registration.active) return;
        offer(() => {
          // it may have taken over meanwhile, say from another tab: then the page only reloads
          if (waiting.state !== "installed") return location.reload();
          accepted = true;
          waiting.postMessage({ type: "SKIP_WAITING" });
        });
      };
      const offerOnceInstalled = (worker: ServiceWorker | null) =>
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") offerWaiting();
        });
      offerWaiting();
      offerOnceInstalled(registration.installing);
      registration.addEventListener("updatefound", () =>
        offerOnceInstalled(registration.installing),
      );
      // look for a new deploy whenever the app comes back to the foreground; offline, update()
      // rejects and the app carries on
      const checkForUpdate = () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", checkForUpdate);
      window.addEventListener("focus", checkForUpdate);
    },
    (error: unknown) => console.warn("Streakky can't work offline in this browser:", error),
  );
}

/** Switches the page to the new version: reloads it, once its worker has taken over. */
export type Update = () => void;

let ready: Update | null = null;
const listeners = new Set<() => void>();

function offer(update: Update) {
  ready = update;
  for (const listener of listeners) listener();
}

/** The update ready to switch to, or null while the page runs the newest version it knows. */
export const readyUpdate = (): Update | null => ready;

/** Calls `listener` whenever a new update becomes ready; returns the unsubscribe. */
export function subscribeToUpdates(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Inside the Android app (ticket 16), Capacitor's bridge defines `window.Capacitor` before the
 * app's scripts run. A plain browser has no such global, so the web app always registers.
 */
const insideNativeApp = () =>
  (
    globalThis as typeof globalThis & { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor?.isNativePlatform?.() === true;
