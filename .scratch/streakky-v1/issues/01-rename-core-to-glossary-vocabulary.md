# 01: Rename core to the glossary vocabulary

**What to build:** The core package, the UI package and the design playground use the vocabulary in `GLOSSARY.md`:

- The tracked thing is a **Habit**, with a **Kind** of build or quit.
- An unbroken stretch of days is a **Streak**.
- Build habits carry **check-ins** and no start date.
- Quit habits carry a **quit day** and **slips**.

This is a pure rename with no behaviour change, done first so every later ticket is written in the new language. It also adds the repo's first tests. They pin down today's streak rules through the core package's public functions, so the rename is provably safe.

**Spec:** Streakky v1 spec (`spec.md` in this folder), sections "Modules" and "Testing Decisions" (Seam 1).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Core exposes Habit, Kind, Streak, check-ins, slips and quit day. None of the old names remain in core, UI or the playground: `Streak` for the tracked thing, `Mode`, `Run`, `marks`, or `start` on build habits.
- [x] The UI package's components use the new names: the streak card becomes a habit card, the runs chart becomes a streaks chart, and the "Longest run" label reads "Longest streak".
- [x] The design playground looks and behaves exactly as before: all three phone screens and the desktop layout, with sample data.
- [x] `vp test` runs core tests with a controlled clock. They cover:
  - [x] a build streak surviving through today before today's check-in, and ending after a missed day;
  - [x] quit habits counting clean days, with the slip day itself not clean;
  - [x] slips on or before the quit day being ignored;
  - [x] the longest streak;
  - [x] the goal date for both kinds;
  - [x] which days are editable;
  - [x] calendar highlighting of current and past streaks.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **New in core:** `historyStart`, `longestStreakDays` and `loggedDays`.
- **Build habits:** a build habit's history now starts at its first check-in (today if it has none). The playground looks the same with today's sample data, with two small differences:
  - Month view can page back one fewer empty month when the first check-in falls early in a month.
  - Month view stays on the current month after every check-in is cleared.
- **UI copy:** "streak" now only means a streak. Copy that used it for the tracked thing now says "habit", for example "New habit", "Habits" and "Edit habit". The playground's CSV headers say `kind` and `longest_streak`.
- **Left for the owner to decide:**
  - Is there a glossary word for "a check-in or a slip"? The code uses `loggedDays` and `loggedToday` for now.
  - What is the ring's fallback target when there's no goal? Code comments call it a "milestone", a word the glossary avoids for Goal.
  - The copy still says "Mark today done", "Done in total" and "Log it each day". Should that copy change?
