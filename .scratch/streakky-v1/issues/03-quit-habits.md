# 03: Quit habits

**What to build:** I can create a quit habit with a quit day of today or any past day, and see "N days free" on Home. The count grows by one each day without a slip. The today button on a quit habit logs today's slip or removes it. A slip ends the current streak, and a new one starts the next day.

**Spec:** Streakky v1 spec, user stories 2–3, 19, 22 and 27–29.

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** ready-for-agent

- [ ] The New habit flow offers both kinds. A quit habit asks for a quit day: today or a past day, never a future one.
- [ ] Nothing in the app lets you change a habit's kind after creation.
- [ ] Home shows a quit habit's current streak as "1 day free" or "N days free", and the number grows as days pass.
- [ ] The today button logs or removes today's slip. The labels read "slip logged today" or "started today" as in the playground.
- [ ] Slips can't be logged on or before the quit day.
- [ ] Harness tests cover:
  - [ ] a quit habit with a past quit day counting its clean days;
  - [ ] a slip today resetting the current streak;
  - [ ] removing that slip restoring the streak;
  - [ ] a passing day adding a clean day.
- [ ] `vp check` and `vp test` pass.
