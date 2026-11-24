import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      // the Worker on http://localhost:8787 with a local D1, migrated first; it serves the last web
      // build, and the web dev server (`vp run web#dev`) proxies /api here for live app development.
      // It takes the dev server's origin, http://localhost:3000, as its own, so sign-in cookies
      // work there. Sign-in codes go to this terminal instead of Resend, and the secrets are
      // stand-ins that only work locally (an apps/api/.dev.vars file replaces them). The allowlist is
      // dev@example.com unless SIGN_IN_ALLOWLIST is set in the shell.
      dev: {
        command:
          "wrangler d1 migrations apply streakky --local && BETTER_AUTH_SECRET=local-development-only-not-secret RESEND_API_KEY=unused-in-development SIGN_IN_ALLOWLIST=${SIGN_IN_ALLOWLIST:-dev@example.com} wrangler dev --local-upstream localhost:3000 --var EMAIL_DELIVERY:log",
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
      // writes the SQL migration for a change to src/db/schema.ts, the auth options or better-auth
      // itself, after rewriting better-auth's tables in src/db/auth-schema.ts. Name it with
      // `vp run api#db-generate --name <what-changed>`; it writes nothing when nothing changed.
      // Wrangler applies migrations on deploy, in dev and in tests
      "db-generate": {
        command: "drizzle-kit generate",
        dependsOn: ["auth-schema"],
        cache: false,
      },
      "auth-schema": {
        command: "vpx scripts/auth-schema.ts",
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
