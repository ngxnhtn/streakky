# 04: Habit detail

**What to build:** Tapping a habit opens its Habit detail screen with:

- the current streak ring and when that streak began;
- a calendar of its history, with current and past streaks highlighted;
- a chart of all its streaks, with the longest and the current one labelled;
- its stats, including the longest streak.

On the calendar I can fix my history. For a build habit I can add or remove a check-in on any past day. For a quit habit I can add or remove a slip on any day after the quit day. Future days are locked.

**Spec:** Streakky v1 spec, user stories 18, 20–21 and 30–33.

**Blocked by:** 03 (Quit habits)

**Status:** done

- [x] Tapping a habit on Home opens its detail screen, and back returns to Home.
- [x] Detail shows the current streak ring with the "since" label, the calendar, the streaks chart and stats, built from the playground's design.
- [x] The calendar's week starts on Monday by default and follows the week-start setting once it exists (05).
- [x] Tapping a past day on the calendar toggles a check-in (build) or a slip (quit, only after the quit day). Future days can't be toggled.
- [x] Changes show immediately on both the detail screen and Home.
- [x] Harness tests cover:
  - [x] backfilling a missed day, which joins two streaks into one;
  - [x] removing a past check-in, which splits a streak;
  - [x] a past slip splitting a quit streak;
  - [x] a toggle on a future day being refused.
- [x] Screens are tied to browser history: the browser's back button and the phone's back gesture go back from Habit detail and from Settings, as the in-app back arrow does (owner decision 2026-11-24).
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **Screen:** `apps/web/src/screens/HabitDetail.tsx` ports the playground's phone detail. It has the ring with `sinceLabel`, `TodayButton`, and Calendar and Stats tabs. The calendar is in Weeks or Month view with Edit days, and it takes `weekStart` from the device settings. Stats shows the four tiles and the streaks chart.
  - The playground's Goal tab and options menu (rename, delete) are left out, for 06 and 07. Those tickets add a third tab and the app bar's right-hand button.
  - A missing habit shows "This habit is no longer here." under the back arrow.
- **Opening:** Home's cards and list rows pass `onClick`, so the rest of the card opens the habit. The tick and the slip button stay one-tap. `useHabit(id)` in `store/react.tsx` reads one active habit from `useHabits()`. The store itself didn't change.
- **Slips:** `useTodaysSlip()` in `LogSlipDialog.tsx` is now shared by Home and Habit detail. It removes today's slip in one tap and asks before logging one. The dialog says the streak "moves to Stats" again, as in the playground. Past slips on the calendar are toggled straight away, without asking, as in the playground.
- **Browser history** (`screens/stack.tsx`):
  - Every push adds a history entry whose state is `{ screens: Route[] }`, the screens over Home. The URL doesn't change.
  - A popstate makes the stack match its entry. Going back one screen slides it out, and any other jump swaps at once. The in-app back arrow calls `history.back()`, so both backs take the same path.
  - A reload reopens the screen it was on, from `history.state`.
  - When the browser has already drawn its own back animation (`PopStateEvent.hasUAVisualTransition`, as with iOS Safari's swipe), the app swaps without sliding.
  - Safety nets:
    - A double tap on the arrow can't go back twice.
    - If no popstate arrives within a second, the arrow goes back without history. That happens in a tab whose only entry is a detail.
    - If a screen has no entry of its own, the arrow goes back without history. That happens when Chrome ignores `pushState` because it is called too often.
  - `useInFront()` tells a screen whether it is in front. The slip sheet and New habit close when their screen is left, say by the browser's back or forward button.
- **Calendar fix (UI package):** `HabitCalendar` no longer memoises `daysByStreak` on the habit. A quit habit's clean days grow at midnight while the habit object stays the same, so the memo kept the screen a day behind until the next change. The demo app uses the same component.
- **Harness tests:** these went green at once, because `toggleDay(id, day)` and its `canToggle` guard already existed from 02 and 03. They cover backfilling a missed day, removing a past check-in, a past slip on a quit habit, and a check-in and a slip on a future day.
- **Checked in headless Chrome 158** (`vp dev`, and `vp build` + `vp preview` with the service worker in control), 400 px wide, mobile emulation:
  - **Opening and the calendar:** a card's open area pushed the detail and added one history entry. The tick and slip buttons stayed one-tap. On the calendar, Edit days toggled past days:
    - backfilling a missed day joined 1 + 4 into 6;
    - removing a check-in split 6 into 3 + 2;
    - a slip 4 days back split a quit habit's 10 days free into 5 + 4.
    - Neither tomorrow nor a quit habit's quit day was a button. The day after the quit day was.
    - Home showed the new counts after going back.
  - **Today:** for a quit habit, "I slipped today" asked first, and Keep counting changed nothing. Log slip gave "0 days free / slip logged today", and Undo today's slip gave 4 back.
  - **Back:** these all returned to Home with the slide:
    - the in-app arrow;
    - `history.back()`;
    - `Page.navigateToHistoryEntry`;
    - after a reload on the detail, both backs (Chrome kept the same document, popstate fired);
    - from Settings, `history.back()`.
  - **Forward:** `history.forward()` reopened the detail.
  - **Back with a sheet open:** the browser's back with the slip sheet open closed the sheet along with the screen. Forward with New habit open closed New habit.
  - **Double taps and odd tabs:** a double tap on the arrow stayed in the app. A new tab whose only entry was a detail went back to Home through the timeout.
  - **Week start:** Monday by default in Weeks view. With Sunday, Weeks listed Sun first, Month read S M T W T F S, and the 1st sat under its weekday.
  - **Reduced motion:** screens swapped at once both ways.
  - **Keyboard:** the card opened with Enter. The back button and the day buttons showed the 2 px ring, and Enter toggled a day.
  - **Looks:** light and dark screenshots of the detail (calendar, edit mode, month, stats, quit habit) looked right.
  - **Console:** no errors or warnings.
- **Not checked:** a real phone. The Android Chrome back gesture and iOS Safari's swipe fire the same popstate as the back button, but the `hasUAVisualTransition` path and the gesture itself need a check on a device. Capacitor's hardware back button is ticket 16's.
- **Found, not fixed:**
  - **Focus after navigating:** opening or leaving a screen leaves focus on the page body, as Settings already did. A keyboard user's next Tab lands on the new screen's first control. Returning focus to the card that opened the detail would be kinder.
  - **Fast double tap under reduced motion:** a double tap on the back arrow can fall through to Home's Settings button in the same spot, since the screens swap at once. This happened before this ticket. With motion, the slide-out guard catches it.
  - **No heading on Habit detail and Settings:** the screens have no heading element, because the app bar's title is a `<p>`.

**Owner decision (2026-11-24): the build habit's today button says what it does.** It read "Checked in today · Undo" while its name stayed "Check in today", so the words on screen weren't its name (WCAG 2.5.3, label in name). It now reads "Check in today", then "Undo today's check-in" beside the filled tick, as the quit habit's reads "I slipped today", then "Undo today's slip". Its words are its name, and it no longer carries `aria-pressed`.
