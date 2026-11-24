# 15: Sign-in merge and sign-out wipe

**What to build:**

- **Signing in:** when I sign in on a device that already has signed-out habits, all of them, with their check-ins and slips, are merged into my account exactly as they are. A habit with the same name as one already in the account is kept as a duplicate for me to delete myself.
- **Signing out:** this clears all my habits from the device and returns it to an empty signed-out app, so the next person to sign in there doesn't get my data. If some changes haven't synced yet, I'm warned first. My device settings stay.

**Spec:** Streakky v1 spec, user stories 52–55, and section "Sync API (Worker)" (first sign-in, sign-out). Also ADR-0002.

**Blocked by:** 14 (Sync between devices)

**Status:** done

- [x] Signing in on a device with signed-out habits pushes every one of them, with its days, into the account. The device then shows the account's habits plus its own, duplicates included. There's no matching by name.
- [x] Sign-out with pending changes shows a warning offering to cancel or to sign out anyway and lose them.
- [x] Sign-out clears habit and day data and stored credentials, and the app returns to the empty signed-out state.
- [x] Device settings survive sign-out.
- [x] Signing in to a different account afterwards shows none of the previous account's data.
- [x] Harness tests cover:
  - [x] a merge with a duplicate name;
  - [x] sign-out wiping habits but keeping settings;
  - [x] the pending-changes warning;
  - [x] signing back in pulling the account's habits down again.
- [x] `vp check` and `vp test` pass.

## Comments

**Note from 14 (2026-11-24).** Every record a device changes waits (`pending`) until a push carries it, and records stored before sync count as waiting, so signing in already pushes the device's signed-out habits and their days, then pulls. What's left here: the tests named above, the pending-changes warning on sign-out (`syncStatus().pending`), and the wipe. Until the wipe lands, signing out keeps the habits and their pending marks, so signing in to another account on the same device would push them into that account. Clear `streakky.sync` (the per-account version and last sync) with the rest; it's already keyed by address, so a different account starts from the beginning.

**Note from the code review (2026-11-24): a second account on the same device.** Signing in pushes only the records still waiting. Until the wipe lands, signing out of one account and in to another on the same device leaves the first account's synced habits on screen, but they never reach the second account, since nothing marks them waiting again. The wipe on sign-out must cover them, so the second account starts from an empty device.

**Done (2026-11-24).**

- **Signing in** already pushed the device's signed-out habits (ticket 14's waiting marks), so it needed only its test. A phone with its own "Read" signs in to an account that has a "Read" too, and both devices then show both, each with its own days.
- **`HabitStore.signOut({ discardPending })`** answers `{ signedOut: true }` or `{ signedOut: false, pending }`:
  - It first syncs any changes still waiting, for up to 5 seconds (`signOutWait`). Online, they reach the account, and it signs out without asking.
  - If some still wait, it stays signed in and answers how many. It signs out and loses them only with `discardPending`.
- **The wipe, in this order:**
  - Sync halts. A sync still running is stopped through its abort signal, without waiting for its answers, and keeps nothing it was getting. The device's place in the account's changes (`streakky.sync`) is forgotten.
  - Every habit and day record is deleted, and so are the goals the device celebrated (`streakky.celebrations`), which belong to those habits.
  - Only then does the device count as signed out. A sign-out cut short leaves it signed in with its place forgotten, so its next sync pulls every habit back.
  - Device settings stay, and the server hears of the sign-out when it can (ticket 13's offline sign-out).
- **Settings:**
  - Sign out reads "Signing out…" while the last sync runs. With changes waiting, a sheet asks "Sign out and lose 1 change?", starting on Cancel.
  - Once signed out, focus moves to Sign in.
  - A line under the group says signing out clears the device's habits and the account keeps everything that has synced.
  - A sign-out that fails says so.
- **Tests** (Seam 2, `sync.test.ts`), each through the store and the real Worker:
  - the merge with a duplicate name;
  - a sign-out that syncs waiting changes first;
  - the question while offline, and losing the change only when told to;
  - not waiting on a sync stuck on a stalled network (`stallable` in `devices.ts`, which honours abort signals as `fetch` does);
  - asking rather than waiting when changes are stuck;
  - the wipe keeping settings, across a restart;
  - signing back in;
  - a second account seeing nothing of the first.

  Mutation checks: without the wipe, three of these fail. Without the abort, the stalled-network test fails. Ticket 13's "keeps its habits when it signs out" test is gone.

- **Checked in headless Chrome** against `vp run api#dev` and the web dev server (400px, mobile emulation):
  - Habits made signed out merged on signing in.
  - Offline, Sign out asked "Sign out and lose 1 change?" with focus on Cancel, and Cancel kept everything with focus back on Sign out.
  - Sign out anyway left Home empty, also after a reload. Focus was on Sign in, settings were kept and `streakky.sync` was gone.
  - Signing in again brought the synced habits back without the lost check-in.
  - Online, a check-in made just before Sign out reached the account without a question.
  - No console errors.
- **Local dev database:** its sync tables came from a draft of `0001_sync.sql` (`name_change` columns), so pushes failed locally with 500s. I dropped them and applied the committed migration again. The live database got the committed file at this deploy, so it was never affected.
- **Limits, not fixed:**
  - **Internal copies:** TanStack DB's persistence keeps its own copies of deleted rows inside the device's SQLite file: tombstones, and its replay log of up to 1,000 transactions or 24 hours. The app and the next person never see them, but the wipe doesn't erase them from storage. Its local-only collections have no public truncate.
  - **A session the server ends by itself** (a year unused): the device counts as signed out but keeps its habits, so nothing unsynced is lost. A different account signing in there afterwards would still see them. **Owner decision (2026-11-25): left as it is.**
  - **Two windows signing out offline:** a second window of the app stays signed in until it next hears from the server. If one window signs out offline, the cookie outlives the sign-out until the server hears of it. Until then the other window can still sync and pull the habits back.
  - **The cookie** goes only once the server hears of the sign-out, as since ticket 13.
