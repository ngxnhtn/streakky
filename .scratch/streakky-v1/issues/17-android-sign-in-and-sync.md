# 17: Android sign-in and sync

**What to build:** In the Android app I can sign in with my email code, and my habits sync with the web app. The app talks to `https://hb.nhutien.com/api`. Because the WebView's origin makes cookies third-party, it uses a bearer token kept in secure device storage. Signing out on the phone wipes it just as on the web.

**Spec:** Streakky v1 spec, user story 69, and section "Auth" (Android).

**Blocked by:** 15 (Sign-in merge and sign-out wipe), 16 (Android app tracer)

**Status:** ready-for-agent

- [ ] Sign-in with an email code works inside the Android app, and the session survives app restarts.
- [ ] The app stores its bearer token in secure device storage and sends it on every API call.
- [ ] The Worker trusts the `https://localhost` origin and exposes the session token header through CORS. Web sign-in with cookies keeps working.
- [ ] A change made on the phone appears on the web after syncing, and the reverse also works. The phone syncs when the app returns to the foreground.
- [ ] Sign-out on Android warns about pending changes and wipes habits as on the web.
- [ ] Verified on the owner's phone against the deployed Worker.
- [ ] `vp check` and `vp test` pass.
