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

**Status:** in progress: the code is done, waiting to be checked on the owner's phone in another time zone

- [x] A device setting holds an IANA time zone. It's set from the device's zone the first time it's read, and kept.
- [x] Settings shows the zone and lets me pick any other. When it differs from the device's current zone, Settings offers to switch to that one.
- [x] Core works out today and the day's start in the chosen zone, with tests (Seam 1):
  - a day changing at that zone's midnight, not the device's;
  - a zone ahead of and behind the device's;
  - a daylight-saving change.
- [x] The app's "today", the day-change at midnight, new habits' quit days, the calendars, stats and export all follow the zone.
- [x] The daily reminder fires at its time in the chosen zone. Changing the zone reschedules it.
- [x] The app writes the zone with the widget summaries. The widget counts with today in that zone, and its midnight refresh is that zone's midnight. A Kotlin test covers today in a zone other than the phone's.
- [x] Changing the zone in Settings updates everything above at once.
- [ ] Verified on the owner's phone, with the phone set to another zone: the app, the reminder and the widget keep the chosen zone's day.
- [x] `vp check` and `vp test` pass, and `vp run web#android-test`.

## Comments

**Code done (2026-11-25); the phone check in another time zone is still to come.**

- **Core:** `setTimeZone` sets the zone days follow, the device's own until it's called. `todayISO`, `today` and every rule built on them follow it, as do:
  - `dayOf`, the day a moment falls on there;
  - `momentOf`, when a time of day comes there: a day's start, or the reminder's time;
  - `tomorrowStarts`;
  - `fmtTime`.

  `deviceTimeZone`, `sameTimeZone` (an older name such as "Asia/Saigon" and "Asia/Ho_Chi_Minh" are one) and `isTimeZone` go with them.
  - **Clock changes:** where the clocks go back and show a time twice, `momentOf` takes the first. Where they go forward past it, it takes the moment straight after, so a day whose midnight is skipped (Santiago, Havana) starts at 01:00.

- **Tests:**
  - **Core (Seam 1):**
    - a day changing at the zone's midnight;
    - a zone ahead and one behind at the same moment;
    - a quit habit's count by the zone's days;
    - a day's start across London's spring change;
    - a skipped midnight and a repeated 01:30;
    - the reminder's moments across the spring change;
    - the device's own zone (stubbed as Kiritimati) until one is set;
    - aliases and unknown names.
  - **Store (Seam 2):** a new device takes its zone and keeps it after moving to another; an unknown stored zone falls back to the device's.
  - **Kotlin:** the widget's today in two zones at one moment.
- **Settings:**
  - `timeZone` is a device setting, never synced.
  - On open, `openSettings` gives it the device's zone if the stored settings have none, and writes only that, so other settings keep following their defaults.
  - Settings has a "Days" group: a "Time zone" select of every zone the device knows, each with its offset, and, when the device is somewhere else now, "Use this device's zone".
- **The app:**
  - It sets the zone before the database opens, and again on every change, from a store listener added before the screens'.
  - `useToday` redraws at the zone's midnight and when the zone changes. It never hands out the old zone's day.
  - The reminder plans in the zone and reschedules when it changes.
  - "Last synced" shows the zone's day and clock.
  - The export is named by the zone's day; its `exportedAt` stays the device's own time, with its offset.
  - The widget gets the zone with its summaries. It counts to that zone's today and refreshes at its midnight. A zone the phone's own data doesn't know falls back to the phone's, with a log line.
- **Checked in headless Chrome with an emulated time zone:**
  - A new device in Saigon kept "Asia/Saigon", Chrome's name for it, and today was Saigon's.
  - Reopened in Los Angeles, it kept Saigon's zone and day, and Settings offered Los Angeles.
  - Using that offer changed today at once, and so did picking Pacific/Kiritimati.
- **Review:**
  - The glossary's "Day" names the time zone, and "Time zone" is a new entry.
  - Stories 89 and 90 moved to the end of the spec's list: the formatter had renumbered them into the middle, shifting the stories after them.
  - Also fixed:
    - `momentOf`'s skipped midnight;
    - the widget's fallback for an unknown zone, which never ran;
    - `useToday`'s one stale render;
    - the device-zone test, which now has a fixed expected value;
    - the alias check, moved into core.
  - Kept as they are: a second open tab picks up a zone change on its next settings change or reload, as every setting does (ticket 05); "Last synced" uses the zone's clock, so "Today" and its time agree.
