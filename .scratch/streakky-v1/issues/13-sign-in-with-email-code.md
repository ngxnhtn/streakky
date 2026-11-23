# 13: Sign in with an email code

**What to build:** From Settings I can sign in by typing my email and then the 6-digit code I receive. Only allowlisted addresses can sign in. Any other address is told it can't, and no email is sent. I stay signed in across reloads until I sign out. For now, signing out only ends the session: wiping the device comes with sync (15).

While I'm signed out on the web, one small note I can dismiss says my habits live only in this browser and links to sign-in.

**Spec:** Streakky v1 spec, user stories 42–45 and 56, and section "Auth". Also ADR-0003.

**Blocked by:** 05 (Settings screen), 12 (Worker serves the app at hb.nhutien.com)

**Status:** ready-for-agent

- [ ] better-auth runs in the Worker directly on the D1 binding, with the email-code plugin. Its tables are part of the D1 migrations.
- [ ] Settings has an Account section: "Sign in" when signed out, and my email with "Sign out" when signed in.
- [ ] Sign-in flow:
  - [ ] Entering an allowlisted email sends a 6-digit code through Resend, from an address on `hb.nhutien.com`.
  - [ ] Entering the code signs me in, and a wrong or expired code shows an error.
- [ ] A non-allowlisted email is told it can't sign in. No email is sent and no account is created.
- [ ] The allowlist is a Worker config variable, and the Resend API key and auth secret are Worker secrets.
- [ ] Sign-in attempts are rate-limited by Cloudflare's client IP.
- [ ] The session survives reloads. Signing out ends it and leaves habit data untouched.
- [ ] The signed-out note:
  - [ ] appears on the web while signed out;
  - [ ] links to sign-in;
  - [ ] once dismissed, stays dismissed on this device;
  - [ ] never appears while signed in.
- [ ] Harness: email sending is replaced by a capture. Tests cover:
  - [ ] an allowlisted sign-in using the captured code;
  - [ ] a non-allowlisted address being refused with nothing captured;
  - [ ] a wrong code being rejected.
- [ ] The Worker answers a missing file under `/assets/` with 404 instead of the app's page, so an old script file asked for after an update fails cleanly (owner decision 2026-11-24). App routes still fall back to the app.
- [ ] `vp check` and `vp test` pass.
