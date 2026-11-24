# 18: APK releases for Obtainium

**What to build:** Pushing a version tag builds, signs and publishes the Android APK to a GitHub Release, and Obtainium on my phone installs it and updates it to later releases (ADR-0003). This needs a GitHub repository for the project, which gets created only after the owner confirms. Public is simplest for Obtainium; a private repo needs a read-only token in Obtainium.

**Spec:** Streakky v1 spec, user stories 67 and 84, and section "Android" (Release). Also ADR-0003.

**Blocked by:** 16 (Android app tracer)

**Status:** ready-for-agent

- [ ] The project has a GitHub repository, created only with the owner's confirmation of its name and visibility, and the local repo pushes to it.
- [ ] A GitHub Actions workflow on version tags of the form `vX.Y.Z` does the following:
  - [ ] builds the web app and syncs Capacitor;
  - [ ] builds a release APK signed with a keystore from repository secrets;
  - [ ] attaches the APK to a GitHub Release named after the tag.
- [ ] The Android version code is derived from the tag and increases with every release.
- [ ] The release APK calls the production API at `hb.nhutien.com`.
- [ ] The signing keystore is generated once, and the owner has confirmed a backup is stored outside CI.
- [ ] On the owner's phone, Obtainium installs the app from the repo, then updates it over the existing install when the next tag is released.

## Comments

**From ticket 20:** the widget's Kotlin unit test runs with `vp run web#android-test`, not with `vp test`, so nothing runs it on its own yet. The release workflow should run it alongside `vp check` and `vp test` before building, so the widget's rule and core's can't drift unnoticed.
