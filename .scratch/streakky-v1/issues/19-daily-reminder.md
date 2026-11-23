# 19: Daily reminder

**What to build:** On Android I can turn on one daily reminder at a time I choose (21:00 by default). It fires only on days when at least one active build habit has no check-in yet, and it names those habits. It never fires for quit habits alone. Since the app may not be opened every day, reminders are scheduled several days ahead. Today's reminder is cancelled once every active build habit is checked in.

**Spec:** Streakky v1 spec, user stories 70–73, and section "Android" (Reminder).

**Blocked by:** 05 (Settings screen), 16 (Android app tracer)

**Status:** ready-for-agent

- [ ] In the Android app, Settings shows a reminder toggle and a time, defaulting to 21:00. The web app doesn't show them.
- [ ] Turning the reminder on asks for notification permission. If it's denied, the reminder stays off and the app explains why.
- [ ] The reminder fires at the chosen time only on days when an active build habit has no check-in, and names those habits.
- [ ] Reminders are scheduled several days ahead:
  - [ ] they're rescheduled when habits or check-ins change, on app start and on day change;
  - [ ] today's is cancelled once all active build habits are checked in;
  - [ ] none are scheduled with the reminder off or with no active build habits.
- [ ] Tapping the notification opens the app.
- [ ] Core tests cover the reminder plan: given habits, today and the reminder time, which days get a reminder and which habits each one names.
- [ ] Verified on the owner's phone.
- [ ] `vp check` and `vp test` pass.
