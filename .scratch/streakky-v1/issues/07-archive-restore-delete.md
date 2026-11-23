# 07: Archive, restore and delete

**What to build:** I can archive a habit I no longer track. It leaves Home but keeps its history. I can open a list of archived habits and restore one, and it comes back with its history intact. I can also delete a habit permanently after confirming. Deleted habits leave a tombstone that can never be undone, which sync will rely on.

**Spec:** Streakky v1 spec, user stories 11–13.

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** ready-for-agent

- [ ] Archive is available from a habit's screens. The habit disappears from Home, and its check-ins or slips are kept.
- [ ] An Archived habits screen lists archived habits. Restoring one returns it to Home with its full history.
- [ ] Delete asks for confirmation, then the habit and its days disappear from every view.
- [ ] A deleted habit is kept as a tombstone, and nothing can mark it undeleted.
- [ ] The habit store refuses edits and day toggles on deleted habits.
- [ ] Harness tests cover:
  - [ ] archiving moving a habit from the active list to the archived list;
  - [ ] restoring it;
  - [ ] deleting it;
  - [ ] commands on a deleted habit being refused.
- [ ] `vp check` and `vp test` pass.
