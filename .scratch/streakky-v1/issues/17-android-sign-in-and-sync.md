# 17: Android sign-in and sync

**What to build:** In the Android app I can sign in with my email code, and my habits sync with the web app. The app talks to `https://hb.nhutien.com/api`. Because the WebView's origin makes cookies third-party, it uses a bearer token kept in secure device storage. Signing out on the phone wipes it just as on the web.

**Spec:** Streakky v1 spec, user story 69, and section "Auth" (Android).

**Blocked by:** 15 (Sign-in merge and sign-out wipe), 16 (Android app tracer)

**Status:** done

- [x] Sign-in with an email code works inside the Android app, and the session survives app restarts.
- [x] The app stores its bearer token in secure device storage and sends it on every API call.
- [x] The Worker trusts the `https://localhost` origin and exposes the session token header through CORS. Web sign-in with cookies keeps working.
- [x] A change made on the phone appears on the web after syncing, and the reverse also works. The phone syncs when the app returns to the foreground.
- [x] Sign-out on Android warns about pending changes and wipes habits as on the web.
- [x] Verified on the owner's phone against the deployed Worker.
- [x] `vp check` and `vp test` pass.

## Comments

**Code done (2026-11-24); the phone check against the deployed Worker is still to come.**

- **Worker:**
  - Hono's `cors` answers the Android app's origin (`ANDROID_APP_ORIGIN`, `https://localhost`, in the contract package) on `/api/*`. It allows `GET` and `POST` with `Content-Type` and `Authorization`, and exposes `set-auth-token`.
  - better-auth lists the origin in `trustedOrigins`.
  - Web sign-in with cookies is unchanged: the web app is on the Worker's own origin, which needs no CORS.
- **Store:**
  - A device that can't keep the server's cookie gets `sessionToken` storage. `withSessionToken` (account.ts) puts its token on every call and keeps the token the server hands back on signing in or renewing.
  - The account forgets the token when the server says the session is over. It also forgets it on signing out, once the server has been asked, heard or not, since nobody else holds it. It only forgets the token it signed out with, never a newer one.
- **App:**
  - android.ts keeps the token in `capacitor-secure-storage-plugin`, encrypted with an Android Keystore key, read into memory as the app opens.
  - The app already syncs when it comes back to the front (`App` resume) or back online.
  - `capacitor.config.ts` takes its scheme and host from the contract's `ANDROID_APP_ORIGIN`, so the Worker and the app can't drift apart.
- **Tests (Seam 2):**
  - The harness's `fromAndroidApp` connection reaches the real Worker as the WebView does: from `https://localhost`, with no cookies. It sends a preflight before anything that isn't a simple request, fails like fetch on a response not allowed for the app's origin, and lets the page read only the headers the server exposes.
  - New tests in `app.test.ts`:
    - signing in with a code, signed in after a restart;
    - a change on the phone reaching the web and one on the web reaching the phone;
    - signing out asking about a waiting change, then clearing the phone, signed out after a restart;
    - signing out with no server reachable, still signed out once it's back.
  - Mutation check: without the `Authorization` header, the first three fail. Without the Worker's CORS, sign-in fails as offline, which was this ticket's first red.
- **Not covered by tests:**
  - That the token is forgotten would mean reading it out of the device's storage.
  - That the server ended the session can't be told apart from the outside, since the forgotten token can't be used either way.

**Checked on the owner's Pixel 8 against the deployed Worker (2026-11-24).**

- **Deploy:** the owner deployed. The live Worker's preflight for `/api/sync/push` from `https://localhost` answered 204, allowing the app's origin, `Content-Type` and `Authorization`, and exposing `set-auth-token`.
- **Sign-in:** the owner signed in on the phone with a real code. The app showed the owner's address and a sync time.
- **Phone → web:** a habit made on the phone, "Sync check from phone", synced with nothing left waiting, and the owner saw it on the web.
- **Web → phone:** the owner made "Sync check from web" on the web. The app went to the background and came back to the front, and the habit appeared.
- **A mistake of mine:** two test habits from ticket 16's checks ("Read" and "No sugar") were still on the phone when the owner signed in, so the sign-in merge put them in the owner's account. With the owner's OK, all four test habits were deleted on the phone, which synced the deletions.
- **Not explained:** one `console.error` (an object) showed up once during these checks and didn't come back in a dedicated run. Everything worked.
- **Ticket 16's last build** (after its review) was in use throughout: native storage, settings, sign-in, sync and deleting all behaved.
