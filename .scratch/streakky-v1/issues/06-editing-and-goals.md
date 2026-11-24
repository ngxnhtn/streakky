# 06: Editing and goals

**What to build:** I can edit a habit:

- rename it or change its colour;
- give it an optional goal (7, 14, 21, 30, 60, 90, 180 or 365 days) when creating it or later, and change or remove that goal;
- move a quit habit's quit day to another past day.

If moving the quit day would remove slips on or before the new day, I'm warned first. A habit's detail shows progress toward its goal and the day the goal will be or was reached. When the current streak reaches its goal there's a celebration, which I can turn off in Settings. After a break, the same goal applies to the next streak.

**Spec:** Streakky v1 spec, user stories 4–10 and 34–36.

**Blocked by:** 04 (Habit detail), 05 (Settings screen)

**Status:** done

- [x] Edit habit lets me rename a habit and change its colour, and the changes show everywhere immediately.
- [x] A goal can be chosen from the presets when creating a habit or afterwards, and can be changed or removed.
- [x] Habit detail shows goal progress and the date the goal will be reached, or was reached.
- [x] A quit habit's quit day can move to any past day. If that removes slips, a warning says how many before confirming. Confirming removes them, and cancelling changes nothing.
- [x] Edit habit has no way to change the kind.
- [x] When a current streak first reaches its goal, a celebration plays once for that streak on this device. For build habits that's on the check-in that reaches it. For quit habits it's the first time the app shows the habit on or after the day it's reached.
- [x] Settings gains a Celebrations toggle, on by default, and the celebration only plays when it's on.
- [x] Core tests cover moving the quit day reporting the slips it would remove.
- [x] Harness tests cover rename, colour and goal edits, and a quit-day move removing slips.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **Core** (`packages/core/src/habit.ts`):
  - `slipsRemovedByMovingQuitDay(habit, day)` lists the slips a move would remove: those that count now and fall on or before the new day, that day's own slip included. Moving the quit day earlier removes none. Slips that already don't count (on or before the old quit day, or after today) aren't listed.
  - `goalReached(habit)`: the current streak is at least the goal.
  - `celebrationDue(habit, last)` and `celebrated(habit, last)` hold the "once per streak" rule. The device keeps a `Celebrated` per habit: the highest goal celebrated and the current streak's first day when it was. A celebration is due when the goal is reached and the current streak didn't start on or before that day, or the goal is higher. So:
    - the same goal carries over to the next streak after a break or a slip;
    - a higher goal on the same streak gets its own celebration;
    - backfilling a missed day before a celebrated streak doesn't replay it;
    - lowering the goal and raising it again doesn't replay the higher one.
- **Store** (`apps/web/src/store/habit-store.ts`):
  - Uses main's `changeHabit` (from 07). `editHabit(id, { name?, color?, goal? })` and `moveQuitDay(id, day)` are built on it.
  - `editHabit` writes only the fields that differ from the habit's. So saving Edit habit with only a new name doesn't give the colour a new edit time, and a colour change from another device still wins when they sync (story 50). It throws for an empty name, an unknown colour or a goal outside `GOALS`.
  - `moveQuitDay` throws for a build habit or a day `canBeQuitDay` refuses (today is allowed, as when creating). It changes the quit day first, then writes `logged: false` on each removed slip, so they're removed, not just ignored: moving the quit day back doesn't bring them back.
  - Both act only on active habits, as `toggleDay` does. An archived habit stays as it is until it's restored, and a deleted one is never touched.
  - `createHabit` takes an optional `goal` (null when left out).
  - `celebrationDue(habit)` and `markCelebrated(habit)` read and write the celebrations kept under `streakky.celebrations` in the device's key-value storage, beside the settings. They're never synced. Each write merges onto what's stored, as `changeSettings` does.
  - **Edits don't celebrate:** setting a goal the current streak already reaches (on creation or later), or moving the quit day so it reaches the goal, marks the celebration as had without playing it. Check-ins, slips and the passing days can make it due.
- **Screens:**
  - **Options sheet** (`HabitOptions.tsx`, merged with 07's): an "Edit habit" entry (Pencil) above Archive habit, for active habits only. `HabitDialog` gains `"edit"`, so the options, Edit habit and 07's delete question share one history entry. The browser's back with Edit habit open, or with the quit-day question open, closed it and stayed on the detail. The edit sheet opens with focus on the sheet itself, not the name field, so a phone's keyboard doesn't jump up; Tab goes to Name. Closing it returns focus to the options button.
  - **Edit habit** (`EditHabit.tsx`, the playground's edit form): Name, Quit on (quit habits only, a date input up to today), Colour, Save changes. There's no kind control. If the new quit day removes slips, the same sheet asks "Move the quit day to Fri 20 Nov?" and says "This removes 2 slips, on Mon 16 Nov and Fri 20 Nov. Only days after the quit day can have slips." With more than three slips it gives the first and last day. It opens on Cancel, which goes back to the form with the date still chosen and focus on the date field. "Move quit day" (destructive) saves.
  - **Goal tab** on Habit detail: the UI package's `HabitGoal` as in the playground, with "N days to go" and "N-day goal on {date}", or "Goal reached" with the day it was, a progress bar and the chips with None. An archived habit has no Goal tab: like its days, its goal stays as it was until it's restored.
  - **New habit** gains a Goal row: the eight presets and None, in the chosen colour. None is chosen at first.
  - **Celebration** (`Celebration.tsx`, nothing in the playground): `useCelebration(habits, day)` is used by Home (all its habits) and Habit detail (an active habit), and plays only on the screen in front. It shows a notice along the bottom, like the update prompt: a party-popper disc in the habit's colour, "7-day goal reached" and the habit's name, and a 44px dismiss button. A burst of 28 pieces in the habit's colour rises from it, about 1.7s, made with CSS (`animate-confetti`, keyframes in `apps/web/src/styles.css`). The notice leaves after 6s unless a pointer or focus is on it. It's in a `role="status"` region, so screen readers announce it, and it never takes focus. Dismissed from the keyboard, it gives focus back to where it came from. Under reduced motion, there's no burst. With several due, they play one at a time.
  - **Settings:** a "Goal celebrations" switch, the playground's label, as the last row of Appearance, not in Data next to 07's Archived habits, since it isn't data. With it off, due celebrations pass without playing and are marked as had, so turning it on later doesn't replay them.
  - Home's only change is rendering the celebration.
- **Harness tests** (`apps/web/test/edit-habit.test.ts`, 26): rename, colour, both kept after a restart and heard by the screens at once; kind and days unchanged by edits; an empty name refused; an archived habit left as it is and a deleted one untouched; a goal on creation, set, changed and removed, presets only, and its date; moving the quit day earlier and past slips (removed, later ones kept, not back after moving back, left out of the export), to today but not tomorrow, never on a build habit; celebrations due on the check-in that reaches the goal and once only, on a quit habit's goal day, again after a slip and for a higher goal, not for a goal set already reached or a quit-day move, kept after a restart; and the Celebrations setting. Core has 15 new tests (55 in all). All 163 tests pass, with 07's.
- **Checked in headless Chrome 158** (`vp dev`, 400px wide, mobile emulation, a fresh browser context per run, driven over the DevTools protocol; dates moved forward with a `Date` wrapper and a reload):
  - **Build habit:** created Morning run with a 7-day goal. The Goal tab said "7 days to go, 7-day goal on Mon 30 Nov". Backfilling 18–23 November played nothing. Checking in today played the celebration (28 pieces, "7-day goal reached / Morning run"), and the ring's label read "7 day streak, goal 7 days". The notice left after 6s. Undoing and checking in again played nothing.
  - **Edit habit:** renamed to Evening run and chose blue. The app bar and colour changed at once, focus went back to the options button, and Home's card showed the new name in blue.
  - **Quit-day warning:** No smoking (quit 14 Nov, slips 16 and 20 Nov). Moving the quit day to 20 Nov asked, as above, with focus on Cancel. Cancel kept the form and the date, and the habit was unchanged. Confirming left 4 days free since 20 Nov with Stats showing 0 slips and one streak, and days up to 20 Nov no longer editable. Moving it back to 10 Nov asked nothing and gave 14 days free, with the slips still gone.
  - **Quit celebration:** No sugar (quit 18 Nov, goal 7) played nothing on the 24th. Moved to the 25th, Home played it on load. A reload played nothing more.
  - **Celebrations off:** with the switch off, No soda reaching 14 days played nothing; switching it back on played nothing either.
  - **Reduced motion:** No tea's celebration showed the notice with no pieces.
  - **Keyboard:** Tab reached the options button (44×44); Enter opened the sheet on Edit habit and Enter opened the form; Escape closed it with focus back on the options button. The Goal tab's chips moved with the arrow keys and Space chose one. Check in today by Enter played the celebration with focus staying put; Tab reached the dismiss button, which held the notice past 6s, and Enter dismissed it. The Goal celebrations switch toggled with Space. Each showed the 2px ring.
  - **Archived habit:** its detail has Calendar and Stats only, and its options are Restore habit and Delete habit.
  - **Looks:** light and dark screenshots of New habit with goals, the Goal tab, the options and edit sheets, the quit-day question, the celebration on Home and Habit detail, and Settings looked right.
  - **Console:** no errors or warnings from the app. The dev server logged a 502 for `/api/auth/get-session` on each load, because the API Worker wasn't running beside it (as in 07).
  - **Build:** `vp build` succeeded; the production build wasn't checked in the browser.
- **Found, not fixed:**
  - Habit detail's ring tweens its number from 0 when the screen opens, so its text reads mid-count for a moment; its `aria-label` is right throughout. Unchanged from 04.
  - The celebration notice and the update prompt both sit along the bottom, so if a new version is ready during a celebration they overlap until one goes. Both are rare.
  - Sign-out (15) should clear `streakky.celebrations` along with the habits, or leave it: entries for habits that are gone are harmless.
- **For 14 (sync):** a build habit whose goal was reached by a check-in on another device will celebrate on this device the first time it's shown. To play only on the check-in's own device, mark pulled habits' reached goals as had (`markCelebrated`) when a pull brings them in.
- **For the owner:**
  - **New habit's goal starts at None,** since the goal is optional. The playground starts at 30 with five presets; this has all eight.
  - **Edits don't celebrate:** a goal set when the streak is already past it, or a quit day moved back far enough, says "Goal reached" on the Goal tab but plays nothing. A quit habit created with a quit day already past its goal is the same. Is that right, or should those celebrate too?
  - **A quit day can move to today,** as when creating a habit, which starts the count again from 0. The ticket says "any past day".
  - **Removed slips are removed,** written as `logged: false`, not kept and ignored. A slip logged offline on another device before a moved quit day still survives sync and is ignored, as ADR-0002 says.
  - **"Celebration" isn't in the glossary.** It's in the ticket and the settings (`celebrate`). Worth adding if it stays.
  - **Goal celebrations sits in Appearance.** It could move to a Reminders or Goals group once 19 adds the reminder.

- **Owner decisions (2026-11-24):** a quit day may move to today as well as a past day, as when creating a habit (kept). "Celebration" is now in the glossary. The celebration notice and the update prompt must not overlap; that's fixed in a follow-up.

**Follow-up (2026-11-24): the celebration and the update prompt never overlap.** This replaces the "Found, not fixed" note about the two overlapping.

- **One bottom stack:** `BottomNotices` (`apps/web/src/BottomNotices.tsx`) is the one place for notices along the bottom of the window. `App` renders it around the screen stack.
  - It is a column pinned at `inset-x-2`, `bottom: max(0.5rem, env(safe-area-inset-bottom))`, at z-40. It ignores the pointer; each notice takes it back.
  - The screens' notices go on top: the celebration's region portals in through `ScreenNotice`. The update prompt, the app's notice, goes below.
  - Since they share one column, neither can cover the other at any width or height. At 320px the prompt wraps to two lines.
  - With the prompt shown, the celebration keeps 0.5rem above it, through a `:has()` rule on the stack. The notices carry `data-notice="celebration"` and `data-notice="update"`.
  - **Why the celebration goes on top:** its burst rises from its top edge, so it flies into the screen, not through the prompt. Also, the prompt usually comes first (on opening the app) and a check-in comes after, so the prompt stays put.
- **Room at the end of every screen:**
  - A `ResizeObserver` keeps the stack's height in `--notices-height`, set on a `display: contents` wrapper around the screens.
  - `ScreenScroll`'s bottom padding is `max(4.5rem, notices height + max(0.5rem, safe-area inset) + 0.5rem)`. With nothing showing it stays at ticket 11's 72px. With the prompt it is 78px, and with both about 150px.
  - Scrolled to the end, the last habit, the New habit tile or the end of Habit detail stays clear of whatever shows. That now holds above a home indicator too, where the 72px wasn't enough for the prompt (a 34px inset plus 62px).
- **The celebration belongs to its screen:**
  - Its notice no longer sits inside its screen's section, so a screen in front wouldn't cover or inert it. Instead, a screen that another covers, or that goes, ends its celebration at once. Before, the celebration slid away with its screen and could still be there on coming back within 6s.
  - It starts only once the stack's slot is in the page, so its live region is there first.
- **The burst lets taps through:** the burst's pieces are now `pointer-events-none`. Before, the 28 invisible pieces stayed over the screen for the notice's 6s and could catch taps.
- **Unchanged:**
  - **Update prompt:** it is an always-present `role="status"` region with explicit `aria-live`. It never takes focus, sits under a dialog's scrim, and Not now hides it for the page's life.
  - **Celebration:** it stays while pointed at or focused, and its dismiss button returns focus. Under reduced motion it has no burst, and the burst is in the habit's colour.
- **Checked in headless Chrome 158** against `vp build` + `vp preview`:
  - **Setup:** build A was installed. B (A with a changed `index.html` and its precache revision) was then deployed, and a reload's update check showed the prompt.
  - **Prompt first:** a 7-day goal was reached on Home (Enter on a card's tick) and on Habit detail (Check in today). Sizes: 320×568 light, 400×860 light, 1024×768 dark, and 400×860 dark with reduced motion.
    - Every frame for 1.5s was sampled, and the two never overlapped. The gap was 8px, or 4–8px while the celebration rose its 0.25rem.
    - The celebration was 64px tall and the prompt 62px (63.5px at 320, on two lines), so the stack was 134–136px.
    - The burst had 28 pieces. Under reduced motion it had none, and the notice was at full opacity from the first frame.
  - **Celebration first:** a quit habit reached its 7-day goal on load, with the clock moved a day, at 400px light and at 320px dark with reduced motion.
    - The celebration showed at about 110ms and the prompt at about 1.65s.
    - None of the 360 frames with both overlapped. The celebration moved up in one step when the prompt arrived under it.
  - **Scroll end:** Home's New habit tile and Habit detail's calendar ended above the notices, with the prompt (78px of padding) and with both (150px). After Not now, the padding was back to 72px.
  - **Reorder hint:** at 320×568 it was clear of both notices (the hint ends at 222px and the notices start at 424px). In a 568×320 landscape window, the celebration covered the hint's lower part at the top of the scroll; 42px of scrolling cleared it.
  - **Keyboard:**
    - Focus stayed on the page when the prompt appeared, and on the tick when the celebration played.
    - From the New habit tile, Tab reached the celebration's dismiss button first, which held the notice past 6s. Enter dismissed it, with focus back on the tile.
    - Focus never went into the prompt by itself. Not now is 44px tall with the 2px ring.
  - **Pointer:** on Habit detail, the pointer held the notice past 6s, and it left 6s after the pointer moved away. In scripted runs, a headless screenshot moves the virtual pointer out and back, which restarts the timer.
  - **Dialog:** New habit opened over both notices. The sheet and its scrim covered them, neither live region was `aria-hidden`, and focus stayed in the dialog.
  - **Prompt buttons:** Not now hid the prompt for the page, and Reload moved the page to B.
  - **Colour:** a blue habit's pieces and disc were #2453a0 in light and #a9c8f5 in dark, the habit's own colour.
  - **Dev mode:** with StrictMode it behaved the same, with one live region per mounted screen plus the prompt's.
  - **Console:** no errors or warnings from the app, apart from the 502 for `/api/auth/get-session`.
- **Not unit-tested:** the layout. The web app's tests run in Node without a DOM, so the browser runs above cover it.
- **For the owner:** if the prompt arrives while a pointer rests on a celebration, the celebration moves up out from under the pointer, and its 6s starts. It's rare: both have to show within the same 6s.
