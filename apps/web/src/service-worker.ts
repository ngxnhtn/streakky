/**
 * Registers the service worker that vite-plugin-pwa builds (see vite.config.ts). It caches the app
 * shell, so the app opens with no network after one visit. Dev has no service worker.
 *
 * A new deploy's worker takes over open pages as soon as it has cached the new app shell, and a
 * page an older worker served then reloads into the new version, so a deploy runs by the end of
 * the first reopen after it.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const base = import.meta.env.BASE_URL;
  const servedByOlderWorker = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (servedByOlderWorker) location.reload();
  });
  navigator.serviceWorker
    .register(`${base}sw.js`, { scope: base })
    .catch((error: unknown) => console.warn("Streakky can't work offline in this browser:", error));
}
