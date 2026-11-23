# 15: Sign-in merge and sign-out wipe

**What to build:**

- **Signing in:** when I sign in on a device that already has signed-out habits, all of them, with their check-ins and slips, are merged into my account exactly as they are. A habit with the same name as one already in the account is kept as a duplicate for me to delete myself.
- **Signing out:** this clears all my habits from the device and returns it to an empty signed-out app, so the next person to sign in there doesn't get my data. If some changes haven't synced yet, I'm warned first. My device settings stay.

**Spec:** Streakky v1 spec, user stories 52–55, and section "Sync API (Worker)" (first sign-in, sign-out). Also ADR-0002.

**Blocked by:** 14 (Sync between devices)

**Status:** ready-for-agent

- [ ] Signing in on a device with signed-out habits pushes every one of them, with its days, into the account. The device then shows the account's habits plus its own, duplicates included. There's no matching by name.
- [ ] Sign-out with pending changes shows a warning offering to cancel or to sign out anyway and lose them.
- [ ] Sign-out clears habit and day data and stored credentials, and the app returns to the empty signed-out state.
- [ ] Device settings survive sign-out.
- [ ] Signing in to a different account afterwards shows none of the previous account's data.
- [ ] Harness tests cover:
  - [ ] a merge with a duplicate name;
  - [ ] sign-out wiping habits but keeping settings;
  - [ ] the pending-changes warning;
  - [ ] signing back in pulling the account's habits down again.
- [ ] `vp check` and `vp test` pass.
