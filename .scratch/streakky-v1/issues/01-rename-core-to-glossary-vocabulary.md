# 01: Rename core to the glossary vocabulary

**What to build:** The core package, the UI package and the design playground use the vocabulary in `GLOSSARY.md`:

- The tracked thing is a **Habit**, with a **Kind** of build or quit.
- An unbroken stretch of days is a **Streak**.
- Build habits carry **check-ins** and no start date.
- Quit habits carry a **quit day** and **slips**.

This is a pure rename with no behaviour change, done first so every later ticket is written in the new language. It also adds the repo's first tests. They pin down today's streak rules through the core package's public functions, so the rename is provably safe.

**Spec:** Streakky v1 spec (`spec.md` in this folder), sections "Modules" and "Testing Decisions" (Seam 1).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Core exposes Habit, Kind, Streak, check-ins, slips and quit day. None of the old names remain in core, UI or the playground: `Streak` for the tracked thing, `Mode`, `Run`, `marks`, or `start` on build habits.
- [ ] The UI package's components use the new names: the streak card becomes a habit card, the runs chart becomes a streaks chart, and the "Longest run" label reads "Longest streak".
- [ ] The design playground looks and behaves exactly as before: all three phone screens and the desktop layout, with sample data.
- [ ] `vp test` runs core tests with a controlled clock. They cover:
  - [ ] a build streak surviving through today before today's check-in, and ending after a missed day;
  - [ ] quit habits counting clean days, with the slip day itself not clean;
  - [ ] slips on or before the quit day being ignored;
  - [ ] the longest streak;
  - [ ] the goal date for both kinds;
  - [ ] which days are editable;
  - [ ] calendar highlighting of current and past streaks.
- [ ] `vp check` and `vp test` pass.
