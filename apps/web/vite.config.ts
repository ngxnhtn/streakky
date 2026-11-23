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
});
