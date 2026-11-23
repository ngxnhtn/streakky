# 09: Export

**What to build:** From Settings I can export my full history as one JSON file. It contains every habit, archived ones included but deleted ones left out. Each habit comes with its kind, name, colour, goal, quit day, archived state and its check-ins or slips by day. On the web the file downloads; Android's share sheet comes with the Android app (16).

**Spec:** Streakky v1 spec, user stories 62–63, and section "Export".

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** ready-for-agent

- [ ] Settings has an Export action that downloads one JSON file.
- [ ] The file contains every active and archived habit with its fields and its check-ins or slips by day, and no deleted habits.
- [ ] Export works signed-out and offline.
- [ ] A harness test exports from a device with known habits and checks the file matches what the device shows.
- [ ] `vp check` and `vp test` pass.
