# 13: Sign in with an email code

**What to build:** From Settings I can sign in by typing my email and then the 6-digit code I receive. Only allowlisted addresses can sign in. Any other address is told it can't, and no email is sent. I stay signed in across reloads until I sign out. For now, signing out only ends the session: wiping the device comes with sync (15).

While I'm signed out on the web, one small note I can dismiss says my habits live only in this browser and links to sign-in.

**Spec:** Streakky v1 spec, user stories 42–45 and 56, and section "Auth". Also ADR-0003.

**Blocked by:** 05 (Settings screen), 12 (Worker serves the app at hb.nhutien.com)

**Status:** done

- [x] better-auth runs in the Worker directly on the D1 binding, with the email-code plugin. Its tables are part of the D1 migrations.
- [x] Settings has an Account section: "Sign in" when signed out, and my email with "Sign out" when signed in.
- [x] Sign-in flow:
  - [x] Entering an allowlisted email sends a 6-digit code through Resend, from an address on `hb.nhutien.com`. _(Checked against a stand-in for Resend's API; a real email needs the owner's setup in the Comments.)_
  - [x] Entering the code signs me in, and a wrong or expired code shows an error.
- [x] A non-allowlisted email is told it can't sign in. No email is sent and no account is created.
- [x] The allowlist is a Worker config variable, and the Resend API key and auth secret are Worker secrets.
- [x] Sign-in attempts are rate-limited by Cloudflare's client IP.
- [x] The session survives reloads. Signing out ends it and leaves habit data untouched.
- [x] The signed-out note:
  - [x] appears on the web while signed out;
  - [x] links to sign-in;
  - [x] once dismissed, stays dismissed on this device;
  - [x] never appears while signed in.
- [x] Harness: email sending is replaced by a capture. Tests cover:
  - [x] an allowlisted sign-in using the captured code;
  - [x] a non-allowlisted address being refused with nothing captured;
  - [x] a wrong code being rejected.
- [x] The Worker answers a missing file under `/assets/` with 404 instead of the app's page, so an old script file asked for after an update fails cleanly (owner decision 2026-11-24). App routes still fall back to the app.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24),** except a real email, which needs the owner's Resend account (setup below). Notes for later tickets:

**Worker.**

- `src/auth.ts` holds better-auth's options (better-auth 1.7.27, checked against its source and docs on 2026-11-24): the D1 binding passed straight in as `database` (native since 1.5, no adapter), the email-code plugin with its defaults (6 digits, 5 minutes, 3 tries per code) and codes stored hashed, and the bearer plugin. `src/index.ts` sends `/api/auth/*` to it, keeping one instance per isolate.
- **Allowlist:** the `SIGN_IN_ALLOWLIST` secret (owner decision 2026-11-24: a secret, so the repository never shows the addresses), addresses separated by commas, compared without regard to capitals. A `before` hook refuses any request whose body names another address with 403 `EMAIL_NOT_ALLOWED`, before a code is made, so nothing is sent or stored. A user-create database hook refuses the same addresses as a second guard. Only `sign-in` codes are sent, and the plugin's password-reset and email-change endpoints are off (404).
- **Email:** `src/email.ts` posts to Resend's API with `RESEND_API_KEY`, from `SIGN_IN_EMAIL_FROM` (`Streakky <sign-in@hb.nhutien.com>`). The subject starts with the code, so it shows in a notification. `EMAIL_DELIVERY` is `resend` in `wrangler.jsonc`; the dev task passes `log`, which writes `Sign-in code for <address>: <code>` to the Worker's terminal instead.
- **Secrets:** `BETTER_AUTH_SECRET`, `RESEND_API_KEY` and `SIGN_IN_ALLOWLIST` are listed under `secrets.required`, so `wrangler types` types them and Wrangler refuses to deploy while either is unset. The dev task passes stand-ins through the environment. An `apps/api/.dev.vars` file (git ignores it) overrides vars such as `SIGN_IN_ALLOWLIST` for local development, but once it exists Wrangler stops reading secrets from the environment, so it must hold `BETTER_AUTH_SECRET` and `RESEND_API_KEY` too (any values; codes are only logged).
- **Base URL:** better-auth takes the origin the request arrived on, which once deployed is only ever `https://hb.nhutien.com`. `wrangler dev` rewrites request URLs to the route's host, so the dev task passes `--local-upstream localhost:3000`: the Worker then sees the web dev server's origin, where the browser is. Sign-in in development therefore works through `vp run web#dev` (http://localhost:3000), not on the Worker's own :8787.
- **Rate limits:** better-auth's limiter, switched on everywhere (it defaults to production builds only), stored in D1 so it holds across isolates, keyed on `cf-connecting-ip`, per path: 3 code requests a minute (the plugin's default) and 10 sign-in tries a minute. The plugin's default of 3 tries would answer the fourth try at a code that three wrong ones used up with "wait a minute" instead of "send a new code"; guessing is capped either way, by 3 tries a code and 3 codes a minute. `/get-session` isn't limited, to spare a D1 write on every app start.
- **Session:** a year, renewed once a day while the app is used, so a device stays signed in until signing out (story 56). better-auth's default is 7 days.
- **Schema:** `scripts/auth-migration.ts` (`vpx scripts/auth-migration.ts` from `apps/api`) applies the existing migrations to an empty SQLite database, asks better-auth what its options still need, and writes it as the next migration. It wrote `0002_auth.sql`: `user`, `session`, `account`, `verification` and `rateLimit`. Run it again after changing the options or upgrading better-auth; it writes nothing when nothing is missing.
- **/assets/ 404:** `not_found_handling` is now `none`, with an `ASSETS` binding. Real files are still served by the assets layer without running the Worker. A path with no file reaches the Worker, which answers 404 under `/assets/` and the app's `index.html` anywhere else.

**Web.**

- The habit store gains `requestSignInCode`, `signIn`, `signOut`, `checkSession` and `syncStatus()` (`{ signedIn: false }` or `{ signedIn: true, email }`; 14 adds pending changes and the last sync). Failures are a `SignInError` whose `reason` the screens put into words. The calls, better-auth's error codes and the code's length and lifetime (`SIGN_IN_CODE`) live in `store/account.ts`. `checkSession` is beyond the spec's list of commands: the store runs it on open, and tests call it to wait for that answer. 14 can run it when the app returns to the foreground.
- The device remembers the signed-in address under `streakky.account` in its key-value storage, so it knows offline. The store asks the server on open and adopts its answer. Signing out is immediate on the device, offline too; a sign-out the server hasn't heard of is sent on the next check, so the session can't come back.
- `signedOutNoteDismissed` is a new device setting (in core's `Settings`). The note shows above the habits while signed out, opens sign-in, and is never shown inside the Android app (`src/platform.ts`, shared with the service worker).
- The Sign-in screen is a pushed route (`sign-in`) with two steps. A whole code, typed or pasted with a space, signs in at once.

**Harness.** `startWorker(appBuild, { allowlist })` now also gives `url` and `sentEmails()`. While a Worker runs, Node's global fetch stands in for Resend's API, checks the Worker's per-run API key, and keeps each email; everything else passes through. In `apps/web/test`, `openDevice(storage, online(server))` connects a device: `server.ts` keeps its cookies in its storage, sends `Origin` on writes as a browser does, and gives each device its own `CF-Connecting-IP`, as Cloudflare would. With no connection, a device is offline. Sign-in tests are in `apps/web/test/sign-in.test.ts`; the bearer token check is in `apps/api/test/auth.test.ts`.

**For 17 (Android):** sign-in returns the session token in a `set-auth-token` header (exposed for CORS by the bearer plugin), and `Authorization: Bearer <token>` signs later requests in (tested). Still to do there: CORS headers for `https://localhost`, adding it to `trustedOrigins`, and a token store. The code request needs an `Origin` the Worker trusts, because WebView fetches send Fetch Metadata.

**Checked:**

- `vp test`: 88 tests. Sign-in through the store against the real Worker, with the captured code; capitals in the address; refusal with no email captured at all; the same for a sign-in attempt with any code; a wrong code, then the right one; a code used up by three wrong tries (then refused from any device); a fourth code request and an eleventh sign-in try in a minute refused for that device but not another; the session after a restart online and offline; signing out keeps habits; staying signed out; an offline sign-out ends the session once back online; the note's setting. The allowlist and rate-limit tests failed when I removed the check and the limiter.
- `curl` against `wrangler dev`: a code requested, then tried 5 minutes 15 seconds later, answered `OTP_EXPIRED`; the disabled endpoints answered 404.
- Headless Chrome on the dev server (proxied to `wrangler dev`): the whole flow at 390 px. An invalid address, a refused one (no code logged), a wrong code, a code pasted as "123 456", back on Home with the note gone, Settings showing the address, a reload, signing out, the note back, dismissed, still dismissed after a reload. Dark mode, the note's keyboard focus ring, 320 px and a 20 px base size looked right; tap targets measured 44 px or more. No console errors besides the deliberate 403 and 400 responses.
- Headless Chrome on the production build served by the Worker, with its service worker in control: a missing `/assets/` file answered 404 from the page, an app route the app. Signed in, reloaded, reloaded offline (still signed in), signed out offline, back online: the server's `get-session` returned null.
- Not seen: an expired code's message on screen (the server answer and the mapping were checked separately); a real email through Resend.
- Known: better-auth deletes a code once it has answered "expired" or "used up", so trying the same code again after that reads "That code isn't right". Both earlier messages already say to send a new one.

**For 15:** the test "keeps its habits when it signs out" pins this ticket's behaviour; 15 replaces it with the wipe.

**Review (standards and spec, by sub-agents).** No documented standard was broken. Fixed:

- the account module's names now match the store's;
- the code's length and lifetime moved into the store, out of the Sign-in screen;
- the refusal test counts every captured email;
- sign-in tries got their own limit (above);
- tests share one helper that reads codes;
- smaller renames.

Left as they are:

- The API's paths and error codes are written out on both sides of HTTP, in `apps/api/src/auth.ts` and `apps/web/src/store/account.ts`.
- The Sign-in title repeats Home's heading classes, so Home isn't touched while 04 changes it.
- The web tests import `apps/api/test/worker.ts` by relative path, which Seam 2 needs.
- `SIGN_IN_ALLOWLIST` is a required secret: a deploy fails until the owner sets it. Local development uses `dev@example.com` unless `SIGN_IN_ALLOWLIST` is set in the shell.

**Owner: before real codes can be sent.** Do these after steps 1–5 of ticket 12's first deploy (Wrangler login, the D1 database, the account id, the DNS check) and before its deploy step, which now refuses to run without the two secrets.

1. **Resend:** create an account at resend.com (the free plan is enough for one person's sign-ins; check its current limits).
2. **Domain:** in Resend, add the domain `hb.nhutien.com`. Resend lists three DNS records for it. Its "Sign in to Cloudflare" button can add them for you; by hand, in Cloudflare's DNS for `nhutien.com`, they are:
   - MX, name `send.hb`, the mail server Resend shows (`feedback-smtp.<region>.amazonses.com`), priority 10;
   - TXT, name `send.hb`, the SPF value Resend shows (`v=spf1 include:amazonses.com ~all`);
   - TXT, name `resend._domainkey.hb`, the DKIM key Resend shows, DNS only.

   These sit on `send.hb.nhutien.com` and `resend._domainkey.hb.nhutien.com`, not on `hb.nhutien.com` itself, so they don't get in the way of the Worker's custom domain. Resend also suggests a DMARC record (`_dmarc`) once the domain is verified. Wait until Resend shows the domain as verified: until then it won't send from `sign-in@hb.nhutien.com`.

3. **API key:** in Resend, create an API key with sending access, limited to `hb.nhutien.com`.
4. **Allowlist:** it's a secret, set in step 5 (addresses separated by commas).
5. **Secrets,** from the repo root:
   - `openssl rand -base64 32`, then `vp -C apps/api exec wrangler secret put BETTER_AUTH_SECRET` and paste it;
   - `vp -C apps/api exec wrangler secret put RESEND_API_KEY` and paste the key from step 3;
   - `vp -C apps/api exec wrangler secret put SIGN_IN_ALLOWLIST` and type your address.

   Before the first deploy there is no Worker yet: Wrangler asks whether to create one to hold the secrets; say yes. Keep `BETTER_AUTH_SECRET` the same from then on: changing it signs every device out.

6. **Deploy:** `vp run api#deploy` (ticket 12's step 6) applies `0002_auth.sql` to the remote D1 and deploys.
7. **Check:** open https://hb.nhutien.com, then Settings, then Sign in, and enter your address. The code should arrive from `sign-in@hb.nhutien.com` within a minute. Another address should be told it can't sign in. `vp -C apps/api exec wrangler tail` shows the Worker's errors if the code doesn't come (a Resend refusal is logged with its reason).

Steps 1–7 are unverified: they need your accounts. Nothing here has contacted Resend or Cloudflare.

**For the owner:**

- Sessions last a year from the last day the app was used (better-auth's default is 7 days), so story 56 holds. Say if you'd rather have a shorter limit.
- Removing an address from the allowlist stops new sign-ins for it, but a device already signed in stays signed in until it signs out or its session lapses.
- The signed-out note also shows on an empty Home, before any habit exists, as the criterion reads. It could wait for the first habit instead.

- **Owner decisions (2026-11-24):** sessions last a year from last use (kept); the allowlist is a Worker secret; the signed-out note appears only once there's a habit.

**Follow-up (2026-11-24): Drizzle manages D1.** The owner asked for Drizzle on the backend. This replaces "the D1 binding passed straight in as `database`" and the **Schema** note above:

- better-auth now runs on its Drizzle adapter (`authDatabase` in `apps/api/src/db/database.ts`), over `drizzle-orm/d1` with the adapter's transactions off, since D1 has none. The auth options didn't change.
- `scripts/auth-migration.ts`, `0002_auth.sql` and `0003_sign_in_attempts.sql` are gone. `scripts/auth-schema.ts` writes better-auth's tables as a Drizzle schema, `src/db/auth-schema.ts`, through the `auth` CLI's own generator (`auth/api`), from the Worker's options. `sign_in_attempts` is in `src/db/schema.ts`, and `countAttempt` is a Drizzle batch.
- `vp run api#db-generate` runs both: it rewrites the auth schema, then drizzle-kit writes any migration that's needed. After changing the auth options or upgrading better-auth, run it and commit what it writes. Keep `auth` and `better-auth` on the same version (both are `^1.7.27` in the catalog).
- Column names are now snake_case (`email_verified`, `user_id`) and dates are integer milliseconds. Nothing was deployed, so `0000_initial.sql` is a fresh baseline.
- Checked: `vp test` (103 passed, 2 todo), `vp check`, a no-op second `db-generate`, `wrangler d1 migrations apply --local` on an empty database (only `0000_initial.sql`, `meta/` ignored), and `wrangler deploy --dry-run`: 376 KiB gzipped, from 336 KiB.
