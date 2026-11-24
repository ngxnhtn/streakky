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

**Status:** done

- [x] Adding the widget opens a configuration screen listing active habits, and the chosen habit is shown. Several widgets can show different habits.
- [x] The widget shows the habit's name, current streak and label in the habit's colour, looks right in light and dark, and can be resized.
- [x] After a check-in, slip or edit in the app, the widget updates: the app writes summaries through the plugin and refreshes the widgets.
- [x] After midnight the widget shows the right number without the app being opened. It refreshes at midnight and computes the number from the summary and today.
- [x] Tapping the widget opens the app on that habit.
- [x] A widget whose habit was archived or deleted says so, and tapping it opens the app.
- [x] The widget has no check-in or slip buttons.
- [x] Core exposes the widget summary and "count from summary" functions, with tests. Those tests export their cases (summary, today, expected number) to a shared fixture file.
- [x] A Kotlin unit test runs the widget's rule over the same fixture file and passes.
- [x] Verified on the owner's phone.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-25).**

- **Core:**
  - `widgetSummary(habit)` writes what the widget needs to count without the habit's history: name, colour and whether it's archived. A build habit adds its last check-in and the streak ending there; a quit habit adds the start of its current streak and the archived days since then.
  - `countFromSummary(summary, today)` is the widget's rule:
    - a build habit's streak lives through the day after its last check-in, then it's 0;
    - a quit habit counts the days since its start, less the archived ones.
- **Tests (Seam 1, `widget.test.ts`):**
  - A summary is written on one day and counted on later days, for build and quit habits: checked in today or yesterday, a gap, none at all, a slip, a quit day or slip today, and archived then restored.
  - Each expected count is worked out by hand. Its label is the app's own `counterLabel`.
  - Only a current archive sets `archived`.
  - The cases are written to `packages/core/fixtures/widget-cases.json` with `toMatchFileSnapshot`, so a change to them fails until it's written again with `vp test -u`.
- **Kotlin test:** `WidgetRuleTest` runs the widget's own rule over that file, with one test for the count and one for the label. It fails, saying why, if the file isn't there. Its rule broken by one day, it failed.
  - It runs with `vp run web#android-test`, on the JVM, not with `vp test`; ticket 18 notes that its workflow should run it.
  - The Capacitor template's example tests were removed: they tested nothing of the app's, and the instrumented one needed a phone.
- **Android:**
  - **Data:** `WidgetSummaries` writes every active and archived habit's summary a moment after any change and as the app opens, through a small `StreakkyWidgets` plugin, into the app's preferences, then redraws the widgets. Each widget's habit is kept there too, and forgotten when the widget is removed.
  - **Placing:** placing the widget opens "Choose a habit", listing the active habits with their colours. Lawnchair offers "Widget settings" on a placed widget, which opens it again to pick another (not tried).
    - Before the app has written its habits, it says to open Streakky first. With none active, it says to add one.
  - **Drawing:** the widget counts from the summary and today each time it's drawn. The full layout has the name at the top, the count big in the habit's colour, and the label under it, on a tile tinted with the habit's colour. The colours are copied from the app's habit colours, light and dark. From Android 12 they follow the system theme as it changes.
  - **Small sizes:** launchers may shrink a widget below its stated smallest size, as Lawnchair does, so below two cells either way it switches to a small layout: the count centred between its name and label in small type. On Android 12 and later the launcher picks the layout by size; before, the widget picks from the size the launcher reports (not tried on an older phone). In both layouts the count shrinks to fit (Android 8 on).
  - **Midnight:** an inexact alarm redraws the widgets within ten minutes after midnight, without waking the phone, and sets the next one. A clock or time-zone change redraws them too. The alarm is cancelled with the last widget.
  - **Tapping:** opens `com.ngxnhtn.streakky://habit/<id>`. The app follows it at launch (`App.getLaunchUrl`) and while open (`appUrlOpen`), showing the habit if it's there, and Home if not.
  - **No habit to show:**
    - archived: the name and "Archived";
    - deleted: "This habit is no longer here";
    - before the app has written its habits (just installed, or its data cleared): "Open Streakky to show your habit";
    - a widget whose pick went with the app's data: "Tap to choose a habit", and tapping it opens the chooser.
  - **TalkBack:** the widget reads as its habit's name, count and label, such as "Widget quit, 5 days free".
- **Checked on the owner's Pixel 8** (Android 17, Lawnchair):
  - **Placing:** the widget showed in Lawnchair's list once Lawnchair was restarted after the install. Two widgets were placed, picked through the chooser: "Widget quit" showed 5, "days free", in red; "Widget check" showed 1, "day streak", in teal.
  - **Tapping:** opened the app on the habit, every time.
  - **Updating from the app:** logging a slip made the quit widget 0, and removing it made it 5 again. Archiving made it say "Archived", and tapping it then opened the habit; restoring brought the count back.
  - **Themes:** switching the phone to light mode redrew the widget in the light colours, and back in the dark ones.
  - **Resizing:** shrinking "Widget check" to one cell showed the small layout, "Widg…", 1 and "day streak". Stretching it back to two cells brought the full layout back.
  - **Deleting:** deleting each habit (opened from its widget) made both widgets say "This habit is no longer here", and tapping one opened the app on Home.
  - **Midnight:** the alarm was set for 00:00:05 the next day, with a ten-minute window. The redraw itself wasn't watched overnight.
  - **Updating the app:** the widget kept its habit after the app was updated.
  - **Removing:** taking the widgets off made the app forget their picks and cancelled the alarm.
  - **Cleanup:** the test habits were deleted and the test widgets removed.
- **Review:**
  - Expected counts that came from core's own streak functions were replaced by hand-worked ones.
  - The Kotlin test was split in two, and fails clearly when its file is missing.
  - Clearing the app's data is handled: the widget asks for the app to be opened, then to be tapped to choose again. A plan to keep each widget's habit in Android's record of the widget was dropped, because Android keeps only a widget's size in that record when the phone restarts.
  - Lawnchair's small sizes got their own layout.
  - Content descriptions moved to strings.
  - The widget builds the habit link from the scheme the manifest uses.
  - A failure reading the app's launch link is logged.
  - The Kotlin type was renamed to core's `WidgetSummary`, and stale comments were fixed.
- **Limits:**
  - **Days logged ahead:** check-ins, slips or a quit day dated after the phone's today, such as from a device in a later time zone, aren't in the summary. Until the app opens again, the widget's count can be off once those days come.
  - **Teal only:** the widget uses the teal palette's habit colours, following the system theme rather than the app's palette and theme settings.
  - **Links while a screen slides:** a widget tapped while the app is mid-transition, or a reload of the app's page, may open Home or the launch habit again instead.
  - **Lawnchair's widget list** didn't show Streakky until Lawnchair was restarted after the first install.
- **For `/domain-modeling`:** "widget summary" isn't in the glossary yet.
