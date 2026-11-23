# 03: Quit habits

**What to build:** I can create a quit habit with a quit day of today or any past day, and see "N days free" on Home. The count grows by one each day without a slip. The today button on a quit habit logs today's slip or removes it. A slip ends the current streak, and a new one starts the next day.

**Spec:** Streakky v1 spec, user stories 2–3, 19, 22 and 27–29.

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** done

- [x] The New habit flow offers both kinds. A quit habit asks for a quit day: today or a past day, never a future one.
- [x] Nothing in the app lets you change a habit's kind after creation.
- [x] Home shows a quit habit's current streak as "1 day free" or "N days free", and the number grows as days pass.
- [x] The today button logs or removes today's slip. The labels read "slip logged today" or "started today" as in the playground.
- [x] Slips can't be logged on or before the quit day.
- [x] Harness tests cover:
  - [x] a quit habit with a past quit day counting its clean days;
  - [x] a slip today resetting the current streak;
  - [x] removing that slip restoring the streak;
  - [x] a passing day adding a clean day.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **Store:** `createHabit` takes a `NewHabit`: a build habit, or a quit habit with its `quitDay`. It refuses a quit day that isn't a real day up to today, using core's new `canBeQuitDay`, which the form uses too. The quit day is stored on the habit record, and slips are day records, as in the synced shape.
- **Home's slip control:** quit cards get a `SlipButton` from the UI package (with `SlipIcon`) in the corner where build cards have their tick. It is a 44px toggle with `aria-pressed` and the name "Log a slip for {name} today", and it is disabled on the quit day.
  - Logging a slip asks first, with `LogSlipDialog` (`apps/web/src/screens`). Removing today's slip is one tap.
  - The dialog opens with focus on "Keep counting", and returns focus to the slip button when it closes. It only logs if today has no slip yet, so a slip logged meanwhile in another tab isn't removed.
  - The playground's copy says the streak "moves to Stats". Stats doesn't exist yet, so the copy says the streak "ends". The title names the habit, because Home shows several. Ticket 04 can reuse the dialog with `TodayButton` and bring back the Stats wording.
- **Labels:** with no current streak, Home shows `sinceLabel` for both kinds: "started today" or "slip logged today" for quit habits, and "log today to start" for build habits.
- **Day change:** a `useToday` hook (`apps/web/src/screens/use-today.ts`) re-renders Home at local midnight and when the app comes back to the foreground.
- **Checked in a real browser** (headless Chrome, `vp dev`, a fresh profile):
  - created a quit habit with its quit day 10 days back, which showed "10 days free";
  - a future quit day, and the year 0050, were refused with an error;
  - "Keep counting" left the count alone; "Log slip" showed "0 / slip logged today", which survived a reload;
  - one tap undid the slip back to "10 days free", which survived a reload;
  - a quit day of yesterday showed "1 day free"; an empty quit day showed "0 / started today" with the slip button disabled;
  - keyboard: a visible focus ring on the slip button, and focus returned to it after Escape or either dialog choice;
  - shifting the page's timezone back a day and firing `visibilitychange` re-rendered the date and the counts;
  - no console errors or warnings.
- **For 05:** list rows (`HabitRow`) will need the slip button as well as the check-in tick.
- **Found, not fixed (outside this ticket):**
  - **Invisible focus rings:** most focus rings in the design system don't show. `outline-none` sets Tailwind's `--tw-outline-style` to `none`, so a following `focus-visible:outline-2` draws nothing. In this Tailwind version, `outline-hidden` does the same.
    - Affected: `Button`, `CheckInButton`, `NewHabitTile`, `Segmented`, the toggle chips and the habit tiles.
    - Fix: add `focus-visible:outline-solid`, as `SlipButton` does.
  - **Focus after closing a dialog:** dialogs opened from state, such as New habit and the playground's dialogs, drop focus on the page when they close. Radix only returns focus to a `DialogTrigger`.
- **Left for the owner to decide:**
  - Travelling west can put a slip or quit day logged "today" in the future, and then core counts the quit habit as 0, "started today". Should core ignore slips and quit days later than today?
  - Are the slip dialog's title and copy changes above acceptable?

- **Merge note (2026-11-24):** after merging with ticket 05's list layout, `HabitRow` got the same `SlipButton` as `HabitCard`, so quit habits log a slip from the list too. Checked in headless Chrome on the merged app.
