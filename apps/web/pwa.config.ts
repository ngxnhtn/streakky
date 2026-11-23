import { VitePWA } from "vite-plugin-pwa";

// the teal palette's ground, from packages/ui's globals.css
const ground = "#f7f9f8";

/** The web app manifest, and in production builds a service worker that caches the app shell. */
export const pwa = () =>
  VitePWA({
    // src/service-worker.ts registers the worker, and offers to reload once a new deploy's is waiting
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
      // the app shell, including the SQLite worker and its wasm, and the fonts (src/fonts.css);
      // DM Mono's woff fallbacks stay out, since every browser that runs the app reads woff2
      globPatterns: ["**/*.{html,js,css,wasm,woff2}"],
      // a new deploy's worker waits until the person accepts the reload the app offers, which
      // posts it { type: "SKIP_WAITING" }, so nothing typed into an open dialog is lost
      skipWaiting: false,
      // the first visit's worker takes over that page, so it works offline at once
      clientsClaim: true,
      // the API Worker's routes are never the app
      navigateFallbackDenylist: [/^\/api\//],
    },
  });
