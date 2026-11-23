# 14: Sync between devices

**What to build:** When I'm signed in, my habits, check-ins, slips, habit order and archive state sync between my devices through the Worker, with D1 as the system of record. Edits made offline sync by themselves when I'm back online. When two devices disagree, the merge rules in ADR-0002 decide:

- the later edit wins, per habit per day;
- the later edit wins, field by field, on a habit;
- a deleted habit stays deleted;
- ties are broken by change id.

Settings shows whether I'm synced and when I last synced. This ticket covers habits created while signed in. Bringing in habits that existed before sign-in, and wiping on sign-out, come in 15.

**Spec:** Streakky v1 spec, user stories 46–51, and sections "Sync API (Worker)" and "Testing Decisions" (Seam 2). Also ADR-0002.

**Blocked by:** 06 (Editing and goals), 07 (Archive, restore and delete), 08 (Drag to reorder), 13 (Sign in with an email code)

**Status:** ready-for-agent

- [ ] D1 holds habits and day records, each with its owning account and a per-account server version.
- [ ] Push sends changed habits and day records with change ids. Pushing the same batch twice changes nothing.
- [ ] Pull returns every row changed since the device's last server version, deleted habits included, plus the new version. Large histories sync in batches.
- [ ] The server applies the ADR-0002 merge rules:
  - [ ] the later edit wins per habit per day;
  - [ ] the later edit wins field by field on a habit;
  - [ ] a deleted habit stays deleted, and days still arriving for it are ignored;
  - [ ] ties go to the higher change id;
  - [ ] slips on or before the quit day are ignored when counting.
- [ ] A device syncs:
  - [ ] on start;
  - [ ] on reconnect;
  - [ ] on returning to the foreground;
  - [ ] shortly after a local change;
  - [ ] periodically while open.
- [ ] Signed-out devices never call sync.
- [ ] Settings shows sync status: pending changes and last synced time.
- [ ] Harness scenarios, each with two signed-in devices:
  - [ ] offline edits on both converge after both sync;
  - [ ] the same day toggled on both, where the later edit wins;
  - [ ] a rename on one and a colour change on the other, where both survive;
  - [ ] a delete beating a concurrent edit and a newly logged day;
  - [ ] a quit-day move on one and an offline slip before it on the other, where both devices count correctly;
  - [ ] a reorder syncing;
  - [ ] devices with different clocks.
- [ ] Two browsers signed in to the same account show the same habits after syncing, checked by hand.
- [ ] `vp check` and `vp test` pass.
