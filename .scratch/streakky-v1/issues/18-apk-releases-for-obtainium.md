# 18: APK releases for Obtainium

**What to build:** Pushing a version tag builds, signs and publishes the Android APK to a GitHub Release, and Obtainium on my phone installs it and updates it to later releases (ADR-0003). This needs a GitHub repository for the project, which gets created only after the owner confirms. Public is simplest for Obtainium; a private repo needs a read-only token in Obtainium.

**Spec:** Streakky v1 spec, user stories 67 and 84, and section "Android" (Release). Also ADR-0003.

**Blocked by:** 16 (Android app tracer)

**Status:** in progress: the workflow is written; the repo, the first releases and the phone come next

- [ ] The project has a GitHub repository, created only with the owner's confirmation of its name and visibility, and the local repo pushes to it.
- [x] A GitHub Actions workflow on version tags of the form `vX.Y.Z` does the following:
  - [x] builds the web app and syncs Capacitor;
  - [x] builds a release APK signed with a keystore from repository secrets;
  - [x] attaches the APK to a GitHub Release named after the tag.
- [x] The Android version code is derived from the tag and increases with every release.
- [x] The release APK calls the production API at `hb.nhutien.com`.
- [ ] The signing keystore is generated once, and the owner has confirmed a backup is stored outside CI.
- [ ] On the owner's phone, Obtainium installs the app from the repo, then updates it over the existing install when the next tag is released.

## Comments

**From ticket 20:** the widget's Kotlin unit test runs with `vp run web#android-test`, not with `vp test`, so nothing runs it on its own yet. The release workflow should run it alongside `vp check` and `vp test` before building, so the widget's rule and core's can't drift unnoticed.

**Workflow written (2026-11-25).**

- **Decisions:** the owner chose a public repo, `ngxnhtn/streakky`. The history was scanned first: no secrets; the only real addresses are the app's sender, which the spec names. The skills vendored under `.agents/skills` from public repos become public with it.
- **The release key:** generated once on the owner's Mac, outside the repo, in `~/streakky-signing/`: a PKCS12 keystore, alias `streakky`, RSA 4096, valid 100 years, named only `CN=Streakky`, with its password beside it. Its SHA-256 fingerprint is `80:56:BD:F9:…:C5:BF:F0`, which the workflow checks. Keystores are ignored throughout the repo.
- **`.github/workflows/release.yml`,** on a `v*.*.*` tag:
  - **The build job** has a read-only token, and every action is pinned to a commit since it holds the key. It:
    - refuses a tag that isn't above the latest release;
    - runs `vp check`, `vp test` and the widget's Kotlin test;
    - decodes the key from the `STREAKKY_KEYSTORE_BASE64` and `STREAKKY_KEYSTORE_PASSWORD` secrets into the runner's temp folder, builds with `vp run web#android-release` and deletes the key;
    - refuses an APK not signed with the release key's fingerprint;
    - hands the APK on as `streakky-vX.Y.Z.apk`.
  - **The publish job,** the only one that may write and never shown the key, attaches the APK to a release named after the tag, with generated notes.
- **Gradle:** a `releaseTag` property gives the version: code X·1000000 + Y·1000 + Z, name X.Y.Z. A malformed tag is refused. A release build fails without its tag or its key, rather than going out as version 1 or under another key. Builds without a tag are version 1, "dev".
- **Debug builds** are an app of their own: `com.ngxnhtn.streakky.debug`, "Streakky Dev". Android won't put a debug-signed build over the release, so without this each dev install would mean uninstalling the release and losing its data. The widget's links stay explicit to their own app.
- **Tasks:** one Gradle command for all of them: Java 21 from macOS's `java_home`, or from `JAVA_HOME` as in CI. `android-test` now syncs Capacitor first: on a fresh checkout Gradle needs the plugins' files `cap sync` writes. It only passed before because they were left over.
- **Checked locally:**
  - A `v1.0.0` build was `com.ngxnhtn.streakky`, version code 1000000, name 1.0.0, "Streakky", signed by `CN=Streakky` with the fingerprint above, calling `https://hb.nhutien.com`.
  - `v1.2` and a release without a tag were refused.
  - The debug build was `com.ngxnhtn.streakky.debug`, "Streakky Dev".
  - The fingerprint check passed the release APK and refused the debug one.
  - The version check allowed a first release, v1.0.0→v1.0.1 and v1.9.0→v1.10.0, and refused the same tag and v1.1.0→v1.0.1.
- **Review:**
  - **Fixed:** the Kotlin test's missing sync; the version-order and key checks; two jobs; actions pinned to commits; checkout without a stored token; no shared cache; release builds needing a tag; a loud missing Java 21; keystores ignored repo-wide.
  - **Kept, with reasons:** the debug app's own id, flagged as not asked for, is needed for the signature reason above; `android` and `android-release` stay two short tasks.
- **Moving the owner's phone to the release:** the app on it now is `com.ngxnhtn.streakky` signed with the debug key, which Android won't replace with the release-signed one. It has to be uninstalled first, which clears its local data: its habits, settings, widget and session. So before that, its sync shows nothing waiting. The habits come back from the server on signing in again; the settings and the widget are set up again by hand.
