# 06: Editing and goals

**What to build:** I can edit a habit:

- rename it or change its colour;
- give it an optional goal (7, 14, 21, 30, 60, 90, 180 or 365 days) when creating it or later, and change or remove that goal;
- move a quit habit's quit day to another past day.

If moving the quit day would remove slips on or before the new day, I'm warned first. A habit's detail shows progress toward its goal and the day the goal will be or was reached. When the current streak reaches its goal there's a celebration, which I can turn off in Settings. After a break, the same goal applies to the next streak.

**Spec:** Streakky v1 spec, user stories 4–10 and 34–36.

**Blocked by:** 04 (Habit detail), 05 (Settings screen)

**Status:** ready-for-agent

- [ ] Edit habit lets me rename a habit and change its colour, and the changes show everywhere immediately.
- [ ] A goal can be chosen from the presets when creating a habit or afterwards, and can be changed or removed.
- [ ] Habit detail shows goal progress and the date the goal will be reached, or was reached.
- [ ] A quit habit's quit day can move to any past day. If that removes slips, a warning says how many before confirming. Confirming removes them, and cancelling changes nothing.
- [ ] Edit habit has no way to change the kind.
- [ ] When a current streak first reaches its goal, a celebration plays once for that streak on this device. For build habits that's on the check-in that reaches it. For quit habits it's the first time the app shows the habit on or after the day it's reached.
- [ ] Settings gains a Celebrations toggle, on by default, and the celebration only plays when it's on.
- [ ] Core tests cover moving the quit day reporting the slips it would remove.
- [ ] Harness tests cover rename, colour and goal edits, and a quit-day move removing slips.
- [ ] `vp check` and `vp test` pass.
