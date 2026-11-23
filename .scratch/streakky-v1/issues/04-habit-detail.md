# 04: Habit detail

**What to build:** Tapping a habit opens its Habit detail screen with:

- the current streak ring and when that streak began;
- a calendar of its history, with current and past streaks highlighted;
- a chart of all its streaks, with the longest and the current one labelled;
- its stats, including the longest streak.

On the calendar I can fix my history. For a build habit I can add or remove a check-in on any past day. For a quit habit I can add or remove a slip on any day after the quit day. Future days are locked.

**Spec:** Streakky v1 spec, user stories 18, 20–21 and 30–33.

**Blocked by:** 03 (Quit habits)

**Status:** ready-for-agent

- [ ] Tapping a habit on Home opens its detail screen, and back returns to Home.
- [ ] Detail shows the current streak ring with the "since" label, the calendar, the streaks chart and stats, built from the playground's design.
- [ ] The calendar's week starts on Monday by default and follows the week-start setting once it exists (05).
- [ ] Tapping a past day on the calendar toggles a check-in (build) or a slip (quit, only after the quit day). Future days can't be toggled.
- [ ] Changes show immediately on both the detail screen and Home.
- [ ] Harness tests cover:
  - [ ] backfilling a missed day, which joins two streaks into one;
  - [ ] removing a past check-in, which splits a streak;
  - [ ] a past slip splitting a quit streak;
  - [ ] a toggle on a future day being refused.
- [ ] Screens are tied to browser history: the browser's back button and the phone's back gesture go back from Habit detail and from Settings, as the in-app back arrow does (owner decision 2026-11-24).
- [ ] `vp check` and `vp test` pass.
