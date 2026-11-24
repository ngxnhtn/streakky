# 22: Time zone setting

**What to build:** Settings has a time zone, which decides when each day starts. It's set to the device's zone the first time the app opens (or opens after this update) and stays there until I change it, so travelling doesn't move my days. I can pick another zone, or go back to the device's current one.

Everything that knows "today" uses it:

- check-ins and slips;
- streaks, the calendars and stats;
- the day changing at midnight while the app is open;
- the daily reminder's time;
- the widget's today and its midnight refresh.

With every device of mine on the same zone, no device logs a day that's still ahead for another. This settles ticket 20's "days logged ahead" limit and ticket 19's time-zone limit.

Like every setting, it's kept on each device and isn't synced (story 61). Days stay plain dates with no zone.

**Spec:** Streakky v1 spec, user stories 23 (changed) and 90, and sections "Modules" (Core), "Habit store" (Device settings), "Android" (Reminder, Widget), "Testing Decisions" and "Out of Scope". Glossary: "Day" changes to name the chosen time zone.

**Blocked by:** 19 (Daily reminder), 20 (Home-screen widget)

**Status:** ready-for-agent

- [ ] A device setting holds an IANA time zone. It's set from the device's zone the first time it's read, and kept.
- [ ] Settings shows the zone and lets me pick any other. When it differs from the device's current zone, Settings offers to switch to that one.
- [ ] Core works out today and the day's start in the chosen zone, with tests (Seam 1):
  - a day changing at that zone's midnight, not the device's;
  - a zone ahead of and behind the device's;
  - a daylight-saving change.
- [ ] The app's "today", the day-change at midnight, new habits' quit days, the calendars, stats and export all follow the zone.
- [ ] The daily reminder fires at its time in the chosen zone. Changing the zone reschedules it.
- [ ] The app writes the zone with the widget summaries. The widget counts with today in that zone, and its midnight refresh is that zone's midnight. A Kotlin test covers today in a zone other than the phone's.
- [ ] Changing the zone in Settings updates everything above at once.
- [ ] Verified on the owner's phone, with the phone set to another zone: the app, the reminder and the widget keep the chosen zone's day.
- [ ] `vp check` and `vp test` pass, and `vp run web#android-test`.
