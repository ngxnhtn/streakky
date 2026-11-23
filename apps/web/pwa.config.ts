import { VitePWA } from "vite-plugin-pwa";

// the teal palette's ground, from packages/ui's globals.css
const ground = "#f7f9f8";

/** The web app manifest, and in production builds a service worker that caches the app shell. */
export const pwa = () =>
  VitePWA({
    // src/service-worker.ts registers the worker, and reloads pages a new deploy's worker takes over
    injectRegister: false,
    includeAssets: ["favicon.svg", "apple-touch-icon.png"],
    manifest: {
      name: "Streakky",
      short_name: "Streakky",
      description: "Track the habits you're building and the ones you're quitting.",
      display: "standalone",
      background_color: ground,
      theme_color: ground,
      // made by scripts/render-icons.ts
      icons: [
        { src: "icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      // the app shell, including the SQLite worker and its wasm
      globPatterns: ["**/*.{html,js,css,wasm}"],
      // a new deploy's worker takes over open pages at once, without waiting for them to close
      skipWaiting: true,
      clientsClaim: true,
      // the API Worker's routes are never the app
      navigateFallbackDenylist: [/^\/api\//],
      // the fonts come from Google: the worker keeps the ones it has seen, so they outlive the
      // browser's own cache when opening offline
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "google-fonts-stylesheets",
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts",
            cacheableResponse: { statuses: [0, 200] },
            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
      ],
    },
  });
