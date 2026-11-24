# 08: Drag to reorder

**What to build:** I can drag habits on Home into my own order, in both grid and list layouts and with mouse or touch. The order is kept on the device and is ready to sync. Each habit has a fractional order position, so moving one habit changes only that habit.

**Spec:** Streakky v1 spec, user stories 14–15, and section "Synced data shape" (order).

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** done

- [x] Dragging a habit on Home moves it, in both grid and list layouts, with mouse and touch.
- [x] The order survives a reload.
- [x] New habits are added at the end.
- [x] Reordering changes only the moved habit's order position.
- [x] Harness tests cover moving one habit between two others, and many repeated moves between the same neighbours still giving a valid, stable order.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **Store:**
  - `moveHabit(habitId, after)` is the spec's "reorder" command. It puts an active habit just after another active habit, `after`, or first with `null`. It does nothing when either habit isn't active, when `after` is the habit itself, or when the habit is already there. A drop in place doesn't touch the edit time, so it can't win a sync conflict by accident.
  - It is built on the private `changeHabit(habitId, change)` helper agreed with 06 and 07, right after `habits` in `openHabitStore`. The helper sets each changed field's edit time to `Date.now()`, and leaves a missing or deleted habit alone.
  - **Where the new position goes:** positions are shared with archived and deleted habits, so a plain midpoint between the two shown neighbours could equal a hidden habit's position. The new key goes strictly between `after`'s position and the next position above it held by any other habit, shown or hidden. Moved first, it goes before every habit's position. Being strictly between two neighbouring positions, it can't equal another habit's. So a habit dropped where an archived habit sits between the shown ones lands right after its shown neighbour, ahead of the archived one. When 07 restores the archived habit, it comes back after the moved one.
  - **Ties:** two habits can share a position only after sync (14), when two devices add a habit at the same spot offline. A habit dropped between two tied habits lands after both. No position fits between them, and the rule is that only the moved habit changes.
- **Harness tests** (`apps/web/test/reorder.test.ts`, 10 tests):
  - a move between two others, to the top and to the end;
  - the order after a restart;
  - only the moved habit's `order` and `edited.order` changing, read from the device's stored records;
  - a drop in place leaving the records untouched;
  - moves to or of missing habits ignored;
  - a new habit added at the end after a reorder;
  - 300 moves squeezed in after the same habit, each giving the expected order, with distinct, valid keys, the same order after a restart, and the first habit's record unchanged;
  - a move across an archived habit, which sits where a plain midpoint would go, not taking its position, and the restored habit coming back after the moved one (this test fails if `moveHabit` skips archived habits' positions);
  - moves of or after an archived habit ignored.

  The file reads stored records through a plain TanStack collection on the device's database (`storedHabits`). Other tickets may want that helper in `devices.ts`.

- **Merged with 07 (2026-11-24):** `moveHabit` sits on main's `changeHabit`. After a keyboard move, the hook gives focus back only if the list changed into the order that move asked for. Any other change, such as an archive through 07's `keepFocus`, leaves focus to its own code. Checked in headless Chrome: archived a habit from its options sheet, dragged a habit into the gap it left, moved one with Alt+↓, and restored the archived habit from Archived habits. It came back after the moved habits, and the order survived a reload.

- **Dragging (UI package):**
  - `useReorder` (`packages/ui/src/hooks/use-reorder.ts`) is written by hand with pointer events, with no dependency. The faces sit in equal grid slots, in both layouts, so finding the drop slot is a nearest-slot search. Hand-written code also controls the details below directly. The web bundle grew by 2.6 kB of gzipped JS (206.15 → 208.72 kB) and 0.3 kB of CSS. A library such as dnd-kit wasn't measured.
  - `HabitCollection` takes `onMove(from, to)` and an `end` slot. `end` holds the New habit tile, which never moves. Without `onMove` it is unchanged, which keeps the playground as it was.
  - **Starting a drag:**
    - With a mouse, a face lifts once the pointer moves 0.375rem with the button down, so a click stays a click.
    - With a finger or pen, it lifts after resting 400ms within 0.625rem. A swipe that moves sooner scrolls.
    - Once a face is lifted, a non-passive `touchmove` listener on the list stops the page scrolling.
    - While a finger rests on a face, the long-press menu is blocked.
    - Faces are `select-none` with `-webkit-touch-callout: none`.
  - **During a drag:**
    - The lifted face follows the pointer, kept within the faces' span. The others slide to make room.
    - The screen scrolls when the pointer is within 4rem of its top or bottom edge.
    - Escape, or the browser cancelling the pointer, puts the face back.
  - **The drop:**
    - The face settles into its slot over 200ms, then `moveHabit` is called.
    - The click that ends a drag is swallowed, so a drop never opens a habit or checks one in. The next press stops the swallowing.
  - **If the list changes:** a change under a lifted face, say from another tab, ends the drag.
  - **Look:** a lifted face scales to 1.03 on a soft shadow, edged with the `input` hairline so it shows in dark. Its own press and hover moves stop while it's held.
  - **Reduced motion:** nothing scales or glides, and the drop commits at once.
- **Keyboard:**
  - Alt+↑ and Alt+↓ move the habit holding the focus one place earlier or later, in both layouts. That works from the open button or from the tick.
  - Focus stays on the moved habit. React moves some faces' elements, which drops their focus, so the hook gives it back.
  - A polite live region says "Moved to position 3 of 8." after a keyboard move or a drop.
  - Alt+← and Alt+→ were left alone, since Alt+← is Back in Chrome on Windows and Linux.
- **Checked in headless Chrome 158** (`vp dev`, 400px wide, mobile emulation, Chrome DevTools Protocol mouse and touch input), with 8 habits, in grid and list, light and dark, and with and without reduced motion:
  - mouse drags from the 6th face to the 2nd, and touch drags from the 1st to the 4th, both landing where dropped;
  - an Escape mid-drag putting the face back;
  - the order surviving a reload;
  - a click or a tap still opening a habit, a tap straight after a drop too;
  - the tick checking in with one tap and undoing;
  - a long press released in place moving and opening nothing, and a long press on the tick not checking in;
  - a quick swipe scrolling the page with no drag;
  - holding a lifted face at the bottom edge scrolling to the end, and the drop landing in the last row;
  - Alt+↓ twice and Alt+↑ moving the focused habit, with the focus and its 2px ring staying on it;
  - under reduced motion, a lifted face with no scale and 1ms slides;
  - frame-by-frame sampling around a drop: no frame showed the old order;
  - screenshots of lifted faces in light and dark;
  - no console errors or warnings from the app. The only one was the 502 from `/api/auth/get-session`, since no API Worker ran beside the dev server.
- **Found and worked around:**
  - **Reduced motion:** the global reduced-motion rule in `globals.css` sets `transition-duration: 1ms !important` on every element. `transition-property` defaults to `all`, so under reduced motion every style change tweens for one frame. Here that briefly drew two faces swapped after a drop. The faces now set `transition-none` outside a drag's steps. Other components may show the same one-frame tween. A fix in the design system would also set `transition-property` in that rule.
- **Not checked:** a real phone. The long-press menu on Android Chrome, and iOS Safari's callout and scroll blocking after a long press, need a device. DevTools touch emulation stands in for both.
- **For the owner:**
  - A long press to reorder can't be seen. Should Home hint at it once, say with the first few habits?
  - The keyboard shortcut isn't announced to screen readers. Only the live region speaks after a move. Should the faces carry `aria-keyshortcuts` or a description? That needs a prop on `HabitCard` and `HabitRow`.
  - List rows scale by 1.03 like cards, which on a phone makes a lifted row about 0.7rem wider. Is that all right, or should rows lift less?
