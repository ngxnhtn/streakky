# 08: Drag to reorder

**What to build:** I can drag habits on Home into my own order, in both grid and list layouts and with mouse or touch. The order is kept on the device and is ready to sync. Each habit has a fractional order position, so moving one habit changes only that habit.

**Spec:** Streakky v1 spec, user stories 14–15, and section "Synced data shape" (order).

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** ready-for-agent

- [ ] Dragging a habit on Home moves it, in both grid and list layouts, with mouse and touch.
- [ ] The order survives a reload.
- [ ] New habits are added at the end.
- [ ] Reordering changes only the moved habit's order position.
- [ ] Harness tests cover moving one habit between two others, and many repeated moves between the same neighbours still giving a valid, stable order.
- [ ] `vp check` and `vp test` pass.
