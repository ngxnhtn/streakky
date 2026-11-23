import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: lazyPlugins(() => [tailwindcss(), react()]),
  test: {
    // the habit store's tests run against Node SQLite, not a browser
    environment: "node",
  },
});
