# 14: Sync between devices

**What to build:** When I'm signed in, my habits, check-ins, slips, habit order and archive state sync between my devices through the Worker, with D1 as the system of record. Edits made offline sync by themselves when I'm back online. When two devices disagree, the merge rules in ADR-0002 decide:

- the later edit wins, per habit per day;
- the later edit wins, field by field, on a habit;
- a deleted habit stays deleted;
- ties are broken by change id.

Settings shows whether I'm synced and when I last synced. This ticket covers habits created while signed in. Bringing in habits that existed before sign-in, and wiping on sign-out, come in 15.

**Spec:** Streakky v1 spec, user stories 46–51, and sections "Sync API (Worker)" and "Testing Decisions" (Seam 2). Also ADR-0002.

**Blocked by:** 06 (Editing and goals), 07 (Archive, restore and delete), 08 (Drag to reorder), 13 (Sign in with an email code)

**Status:** done

- [x] D1 holds habits and day records, each with its owning account and a per-account server version.
- [x] Push sends changed habits and day records with change ids. Pushing the same batch twice changes nothing.
- [x] Pull returns every row changed since the device's last server version, deleted habits included, plus the new version. Large histories sync in batches.
- [x] The server applies the ADR-0002 merge rules:
  - [x] the later edit wins per habit per day;
  - [x] the later edit wins field by field on a habit;
  - [x] a deleted habit stays deleted, and days still arriving for it are ignored;
  - [x] ties go to the higher change id;
  - [x] slips on or before the quit day are ignored when counting.
- [x] A device syncs:
  - [x] on start;
  - [x] on reconnect;
  - [x] on returning to the foreground;
  - [x] shortly after a local change;
  - [x] periodically while open.
- [x] Signed-out devices never call sync.
- [x] Settings shows sync status: pending changes and last synced time.
- [x] Harness scenarios, each with two signed-in devices:
  - [x] offline edits on both converge after both sync;
  - [x] the same day toggled on both, where the later edit wins;
  - [x] a rename on one and a colour change on the other, where both survive;
  - [x] a delete beating a concurrent edit and a newly logged day;
  - [x] a quit-day move on one and an offline slip before it on the other, where both devices count correctly;
  - [x] a reorder syncing;
  - [x] devices with different clocks.
- [x] Two browsers signed in to the same account show the same habits after syncing, checked by hand.
- [x] `vp check` and `vp test` pass.

## Comments

**Note (2026-11-24): Drizzle manages D1.** Add the habit and day-record tables to `apps/api/src/db/schema.ts`, then run `vp run api#db-generate --name sync` for the migration. Query through `openDatabase(env.DB)` (`src/db/database.ts`); use `db.batch([...])` where writes must land together, since D1 has no interactive transactions. If a later change makes drizzle-kit rebuild a table, read the generated SQL before committing: it toggles `PRAGMA foreign_keys`, which D1 doesn't honour inside a migration.

**Note (2026-11-24): habits gain `archivedPeriods`** (ticket 07's follow-up, "archived quit habits stop counting").

- **The field:** `HabitRecord.archivedPeriods` is `{ archivedOn, restoredOn }[]` (YYYY-MM-DD, `restoredOn` null while still archived), and `EDITABLE_FIELDS` includes it. Give the habits table a column for it (JSON text) and an edit time beside the others.
- **Merging:** archive and restore always write it with `archived` at one edit time, so "later edit wins, field by field" takes both from the same device. Keep the tie-break identical for every field of one push, so they never split. ADR-0002 has the rule, and adds that slips on a quit habit's archived days are ignored when counting.
- **Older records:** habits stored on a device before this change have neither `archivedPeriods` nor `edited.archivedPeriods`. Push them as `[]` with `edited.archivedPeriods = edited.archived`.
- **Harness scenario worth adding:** one device archives and restores while another archives offline; after both sync, both devices show the same count.

**Done (2026-11-24).** Notes for later tickets:

**Worker (Hono, owner decision 2026-11-24).** `apps/api/src/index.ts` routes with Hono: health, better-auth under `/api/auth/*`, and a `/api/sync` sub-app behind a session check (cookie, or bearer for 17). `apps/api/src/sync.ts` holds push, pull and the push's validation.

- **Tables** (`src/db/schema.ts`, migration `0001_sync.sql`): `habits` and `day_records`, each keyed by account and keeping every editable field's value, edit time and change id; `sync_versions` holds each account's latest server version. Rows go with their account (foreign key, cascade).
- **Push** (`POST /api/sync/push`, at most 200 rows, 512 KiB): one D1 batch, which runs as one transaction, so two devices pushing at once can't undo each other. It bumps the account's version by the row count, then upserts habits and days from one JSON parameter each (`json_each`), field by field with `(edited, change id)` compared as a row value. A row only takes a new version when the push changed it, so resending a push changes nothing. `deleted` merges with `MAX`. A row the server can't read is skipped; the answer lists where it was (`refused`), the device keeps it waiting, and the rest sync.
- **Pull** (`GET /api/sync/pull?since=N`): pages of at most 500 rows across both tables, by version; every row has its own version, so a page always ends cleanly. `more: true` means pull again.
- **Origin:** a cookie push from another origin is refused (403). A bearer request skips that check, ready for the Android app.

**Device** (`apps/web/src/store/sync.ts`).

- Every change the store makes is stamped with the device time (or one millisecond after the time it replaces, so a later edit on the device always wins), a fresh change id, and `pending: true`. Records stored before this ticket count as pending, so signing in pushes them.
- A sync pushes everything pending in 200-row chunks, clears `pending` on each record the server took and that didn't change meanwhile, then pulls from the saved version, merging each row by the same rules. A record that still has a later local edit stays pending. The pull runs even if a push failed. The version and last-sync time are kept per account under `streakky.sync`.
- **When:** on open, after signing in, two seconds after a change, every five minutes, and on `online`, `focus` and `visibilitychange` (`store/browser.ts`). One sync runs at a time; a call during one runs once more after it. Signed out, nothing calls the server.
- **Status:** `syncStatus()` adds `pending`, `lastSynced` and `failing`. Settings' Account group shows "Last synced", "Waiting to sync N changes" while any wait, and "Sync: Didn't go through, trying again" after a failed try.
- Habit names are capped at 100 characters in the name fields (`HABIT_NAME_MAX_LENGTH` in core); the server takes up to 1000, and order positions up to 1024 characters, so nothing the app writes is refused.

**Harness.** `openDevice(storage, connection, { now, timing, syncTriggers })`: a clock per device, sync timing (off by default, so tests sync when they say), and the platform's sync moments. `switchable(connection)` takes a device offline and back. Tests are in `apps/web/test/sync.test.ts` (20).

**Checked:**

- `vp test`: 242 passed, `vp check` clean. The scenarios in the criteria, plus: an archive on one device against an archive and restore on the other; a push whose answer was lost, sent again after a later edit elsewhere; 1200 check-ins (several pushes and pulls); two accounts never seeing each other's habits; the server keeping the rest when it can't read one record; 401 for push and pull without a session. Breaking the server's merge on purpose (always taking the pushed value) made two tests fail; the different-clocks test was then changed to push in the order that catches it too.
- **By hand**, two separate headless Chrome profiles on `vp run api#dev` + `vp run web#dev`, both signed in as `dev@example.com`: a habit and a check-in on one showed on the other after it came back to the foreground; the other's new habit came back the same way; both showed the same habits in the same order. Offline, Settings showed "Waiting to sync 1 change"; back online, the change reached the other browser and Settings showed nothing waiting and the time of the last sync. Both kept everything after a reload. No console errors.
- The Worker bundle is 395 KiB gzipped.

**For 15:** signing in already pushes the device's signed-out habits, since every record waits until a push carries it; 15 adds the tests, the pending-changes warning and the wipe. Until then, signing out keeps the habits, and signing in to another account on the same device would push them into that account too.

**For 17:** the bearer push skips the origin check; CORS for `https://localhost` and `trustedOrigins` are still to do.

**Code review (standards and spec, by sub-agents).** Fixed: a record the server couldn't read stopped all sync on that device (now skipped and kept waiting); the origin check would have refused the Android app's bearer requests; no sign of a failed sync in Settings; the sync tests used the real date; the reorder test checked sync's bookkeeping fields; column names for change ids; a duplicated day key; unused exports. Left: the "signed out never syncs" test watches the network calls, since that's what the criterion is about; the push and pull row types are written out on both sides of HTTP, as the sign-in calls are; goals reached on another device still celebrate once here, as ticket 06 allows ("on this device").

**Follow-up (2026-11-24): whole-codebase code review, data and server side.** Notes for later tickets:

- **Where things are now.** The wire shapes, the editable fields, `PUSH_LIMIT`, the push answer, the auth and sync paths and sign-in's code and error codes live in `packages/contract` (`@streakky/contract`), which the Worker and the web app both import. In the web store, `records.ts` holds the record types, `dayKey`, `byOrder` and the collection options; `device-state.ts` the settings and celebrations; `key-value.ts` the key-value storage type and its JSON read and write. `habit-store.ts` re-exports every name it had.
- **Celebrations.** A pull tells the store which habits got their goal or quit day from the server, or are new on the device; their reached goals are kept as celebrated before anything shows them. Check-ins and slip-free days from another device may still celebrate here once.
- **Cursor.** A pull with a version beyond the account's latest starts from 0, and so does a device with no records but a saved version.
- **Push.** A quit habit without a quit day, or a build habit with one, is refused.
- **Session.** The sync routes forward the cookie better-auth sets when it renews a session (once a day of use), so a device that mostly syncs stays signed in a year from its last use.
- **Reorder.** Moving a habit just after one that shares its position with others first gives those positions of their own.
- **Harness.** `withRecordsLost(storage)` is a device that lost its habit database but kept its key-value storage and cookies; `signedInDevice(email, options, { at })` signs in on another server. `storedHabits` is gone: tests check what devices show.
