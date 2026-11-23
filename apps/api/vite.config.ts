import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      // the Worker on http://localhost:8787 with a local D1, migrated first; it serves the last web
      // build, and the web dev server (`vp run web#dev`) proxies /api here for live app development
      dev: {
        command: "wrangler d1 migrations apply streakky --local && wrangler dev",
        dependsOn: ["web#build"],
        cache: false,
      },
      // builds the web app, migrates the remote D1, then deploys the Worker to hb.nhutien.com;
      // never cached, since a replayed run would skip the deploy
      deploy: {
        command: "wrangler d1 migrations apply streakky --remote && wrangler deploy",
        dependsOn: ["web#build"],
        cache: false,
      },
      // regenerates worker-configuration.d.ts after a change to wrangler.jsonc
      "cf-typegen": {
        command: "wrangler types",
        cache: false,
      },
    },
  },
});
