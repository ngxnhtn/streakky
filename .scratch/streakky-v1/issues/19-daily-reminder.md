# 19: Daily reminder

**What to build:** On Android I can turn on one daily reminder at a time I choose (21:00 by default). It fires only on days when at least one active build habit has no check-in yet, and it names those habits. It never fires for quit habits alone. Since the app may not be opened every day, reminders are scheduled several days ahead. Today's reminder is cancelled once every active build habit is checked in.

**Spec:** Streakky v1 spec, user stories 70–73, and section "Android" (Reminder).

**Blocked by:** 05 (Settings screen), 16 (Android app tracer)

**Status:** done

- [x] In the Android app, Settings shows a reminder toggle and a time, defaulting to 21:00. The web app doesn't show them.
- [x] Turning the reminder on asks for notification permission. If it's denied, the reminder stays off and the app explains why.
- [x] The reminder fires at the chosen time only on days when an active build habit has no check-in, and names those habits.
- [x] Reminders are scheduled several days ahead:
  - [x] they're rescheduled when habits or check-ins change, on app start and on day change;
  - [x] today's is cancelled once all active build habits are checked in;
  - [x] none are scheduled with the reminder off or with no active build habits.
- [x] Tapping the notification opens the app.
- [x] Core tests cover the reminder plan: given habits, today and the reminder time, which days get a reminder and which habits each one names.
- [x] Verified on the owner's phone.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).**

- **Core:**
  - `reminderPlan(habits, time, now)` plans seven days, today included. Each day's reminder names `stillToCheckIn(habits, day)`: the active build habits without that day's check-in, never a quit or archived habit.
  - Today's reminder goes once its time has passed or nothing is left to check in. Later days name every active build habit.
  - `isReminderTime` checks the HH:MM setting for both the stored settings and the time field.
  - The setting is now `dailyReminder`, off by default. The playground's `reminder` defaulted to on and is stored that way on devices, so the old key is ignored rather than switching the reminder on unasked, as it would on Android 7–12, where notifications need no permission.
- **Tests (Seam 1, `reminder.test.ts`):**
  - today's habits still to check in;
  - none today once all are checked in, or past the time;
  - a week ahead naming every build habit;
  - none for quit habits alone;
  - archived habits left out;
  - none when every build habit is archived;
  - a just-past-midnight time;
  - `stillToCheckIn` itself.
- **Android:**
  - Settings has a Reminder group (only when the platform has `reminders`): a "Daily reminder" switch and a time, disabled while off. Turning it on asks Android for notifications. If they're refused, it stays off and says where to allow them; if Android doesn't answer, it says so.
  - `ReminderSchedule` reschedules a moment after the active habits, their check-ins, the setting or the day change, and when the app opens. If notifications were taken back, it turns the reminder off.
  - android.ts replaces every pending notification, one replacement at a time; a failed one doesn't stop the next. It also removes a shown reminder that's out of date. Each reminder has its day as its id, on a "Daily reminder" channel, with Streakky's mark in the ink.
  - The notifications are inexact. The plugin would otherwise open Android's "Alarms & reminders" settings each time it schedules, so the exact-alarm permission is removed from the manifest. The plugin puts the reminders back after a reboot.
- **Checked on the owner's Pixel 8** (Android 17):
  - **Settings:** the group showed, starting off.
  - **Permission:** refusing kept it off with the note. Allowing turned it on; the owner tapped Allow.
  - **The week ahead:** with one build habit at 23:37, six reminders were scheduled for 25–30 November at 21:00, titled "Still to check in today" and naming the habit.
  - **Today's reminder:** moving the time to a few minutes ahead put today's in place, checking in took it away, and undoing brought it back.
  - **Firing:** it fired about a minute late on its channel, with the mark, and tapping it opened Streakky. After the review fixes: the old stored setting left the reminder off, turning it on with notifications already allowed asked nothing, and a reminder already shown was taken away by the check-in.
  - **Cleanup:** the test habit was deleted, and the reminder put back to off at 21:00.
- **Limits:**
  - **Time zones:** reminders are set for a moment in time, so after travelling across time zones they fire at the old zone's time until the app is opened.
  - **Other devices:** a check-in made there doesn't cancel the phone's reminder until the phone app opens and syncs.
  - **Revoked notifications:** if they're taken back in Android's settings, the reminder turns itself off without explaining why.
  - **No daylight-saving test:** the times are set with `setHours` on the local date, which keeps them on the hour across a change.
- **Glossary:** "Daily reminder" and "active habit" were added on 2026-11-25.
