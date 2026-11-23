# Streakky is a personal, self-hosted app

Streakky runs on its owner's own Cloudflare account at `hb.nhutien.com` for personal use, not as a public service. So sign-in is closed: better-auth with one-time email codes (sent through Resend), and codes go only to addresses on an allowlist in the Worker's config. There is no sign-up, no passwords, no Google sign-in, and no in-app account deletion. The Android app isn't on Google Play: GitHub Actions builds and signs an APK for each version tag and attaches it to a GitHub Release, and Obtainium installs it from there.

## Consequences

- Everything has to fit Cloudflare's free tiers for Workers and D1. Email codes help: they avoid password hashing, which can exceed the Free plan's CPU limit.
- The APK signing key must never change. Losing it means Android won't install updates over the existing app, so it is backed up outside the CI secrets.
- Opening Streakky to the public would reopen sign-up, account deletion, a privacy policy and Play Store distribution.
