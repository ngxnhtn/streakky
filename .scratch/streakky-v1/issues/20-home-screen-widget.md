# 20: Home-screen widget

**What to build:** I can place a Streakky widget on my Android home screen and pick which habit it shows. Each widget shows one habit's name, its current streak and the right label ("day streak" or "days free"), in the habit's colour. I can add several widgets for several habits and resize them.

- The widget updates right after I change something in the app.
- It stays correct after midnight even if I haven't opened the app.
- Tapping it opens that habit.
- If its habit was archived or deleted, it says so.
- It's display-only.

The widget is native code (ADR-0001). The app writes a small summary of each habit to native storage through a custom plugin, and the widget works out today's number from that summary. Core owns the same rule, and a shared fixture keeps the two in agreement.

**Spec:** Streakky v1 spec, user stories 74–81, and sections "Android" (Widget) and "Testing Decisions" (widget rule parity). Also ADR-0001.

**Blocked by:** 07 (Archive, restore and delete), 16 (Android app tracer)

**Status:** ready-for-agent

- [ ] Adding the widget opens a configuration screen listing active habits, and the chosen habit is shown. Several widgets can show different habits.
- [ ] The widget shows the habit's name, current streak and label in the habit's colour, looks right in light and dark, and can be resized.
- [ ] After a check-in, slip or edit in the app, the widget updates: the app writes summaries through the plugin and refreshes the widgets.
- [ ] After midnight the widget shows the right number without the app being opened. It refreshes at midnight and computes the number from the summary and today.
- [ ] Tapping the widget opens the app on that habit.
- [ ] A widget whose habit was archived or deleted says so, and tapping it opens the app.
- [ ] The widget has no check-in or slip buttons.
- [ ] Core exposes the widget summary and "count from summary" functions, with tests. Those tests export their cases (summary, today, expected number) to a shared fixture file.
- [ ] A Kotlin unit test runs the widget's rule over the same fixture file and passes.
- [ ] Verified on the owner's phone.
- [ ] `vp check` and `vp test` pass.
