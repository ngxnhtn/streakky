import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      // the Worker on http://localhost:8787 with a local D1, migrated first; it serves the last web
      // build, and the web dev server (`vp run web#dev`) proxies /api here for live app development.
      // It takes the dev server's origin, http://localhost:3000, as its own, so sign-in cookies
      // work there. Sign-in codes go to this terminal instead of Resend, and the secrets are
      // stand-ins that only work locally (an apps/api/.dev.vars file replaces them).
      dev: {
        command:
          "wrangler d1 migrations apply streakky --local && BETTER_AUTH_SECRET=local-development-only-not-secret RESEND_API_KEY=unused-in-development wrangler dev --local-upstream localhost:3000 --var EMAIL_DELIVERY:log",
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
        command: "wrangler types --strict-vars=false",
        cache: false,
      },
    },
  },
});
