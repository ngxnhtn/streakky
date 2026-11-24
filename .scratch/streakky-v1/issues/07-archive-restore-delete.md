# 07: Archive, restore and delete

**What to build:** I can archive a habit I no longer track. It leaves Home but keeps its history. I can open a list of archived habits and restore one, and it comes back with its history intact. I can also delete a habit permanently after confirming. Deleted habits leave a tombstone that can never be undone, which sync will rely on.

**Spec:** Streakky v1 spec, user stories 11–13.

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** done

- [x] Archive is available from a habit's screens. The habit disappears from Home, and its check-ins or slips are kept.
- [x] An Archived habits screen lists archived habits. Restoring one returns it to Home with its full history.
- [x] Delete asks for confirmation, then the habit and its days disappear from every view.
- [x] A deleted habit is kept as a tombstone, and nothing can mark it undeleted.
- [x] The habit store refuses edits and day toggles on deleted habits.
- [x] Harness tests cover:
  - [x] archiving moving a habit from the active list to the archived list;
  - [x] restoring it;
  - [x] deleting it;
  - [x] commands on a deleted habit being refused.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **Store** (`apps/web/src/store/habit-store.ts`):
  - `archiveHabit(id)` and `restoreHabit(id)` change `archived` through the private `changeHabit(habitId, change)`, which sits right after `habits` and is shared with 06 and 08. It gives each field it changes `edited[field] = Date.now()`, and does nothing to a missing or deleted habit. It skips fields whose value is `undefined`, and does nothing when no field is left.
  - `deleteHabit(id)` sets `deleted: true` and leaves `edited` alone, since `deleted` has no edit time (ADR-0002). A missing or already deleted habit is left alone. The habit's day records stay in storage, unseen, as the server will keep them.
  - `archivedHabits()` is the live query of archived habits that aren't deleted, in the person's order. It returns the same array until something changes, like `habits()`. The React hooks are `useArchivedHabits()` and `useArchivedHabit(id)` in `store/react.tsx`. `useHabit(id)` still reads only active habits.
  - `toggleDay` still looks only at `habits()`, so it refuses archived and deleted habits.
  - Restoring keeps the habit's `order`, so it comes back in its old place on Home, not at the end.
- **Tombstone:** nothing writes `deleted: false`. `changeHabit`'s type leaves `deleted` out, it refuses deleted habits, and no other command touches the field. Tests can't see the record itself, so they check from outside that restoring, archiving, toggling days and deleting again all leave the habit gone, across a restart too. Delete winning over another device's edit is 14's to test.
- **Screens:**
  - **Habit detail** gets the playground's `Menu` button on the right of the app bar ("Habit options", `aria-haspopup="dialog"`). It opens `HabitOptions` (`screens/HabitOptions.tsx`), ported from the playground's `HabitDialogs` with a `HabitDialog = "options" | "delete" | null` state held by `HabitDetail`. The sheet lists Archive habit (Restore habit once archived) and Delete habit; there's no edit entry (06's).
  - **Delete** asks "Delete {name}?": "Its whole history goes with it, and this can't be undone. To take it off Home and keep its history, archive it instead." An archived habit's question leaves out the last sentence. The question opens on Cancel. The playground's "The habit and all N streaks go for good" read "all 1 streak" for one streak, so the words changed.
  - **Archiving and deleting** leave the screen first, then change the habit 320ms later, as the playground does, so the person sees the habit leave the screen beneath. Restoring stays on the screen, which becomes the active habit's again, with today's button back.
  - **Archived habits** (`screens/ArchivedHabits.tsx`, route `{ name: "archived" }`) is reached from an "Archived habits" row in Settings' Data group, above Export, which shows the count when there are any. Each row shows the habit's colour dot, its name and "Longest streak N days". The row opens the habit's Habit detail, and its own outlined Restore button restores it. With none, the screen says "Nothing archived" and how archiving works.
  - **An archived habit's Habit detail** is read-only. It keeps the ring, the calendar and stats, but has no today button and no Edit days. In the today button's place it says "Archived: hidden from Home, with its history kept." over a Restore habit button in the habit's colour. With no current streak, the ring says "no current streak" instead of asking for a check-in.
  - `HabitCalendar` (UI package): `onToggleDay` is now optional. Without it, the calendar has no Edit days button. The playground still passes it.
- **History:** the options sheet and the delete question share one history entry (one `useBackCloses` for both), so the browser's back closes whichever is open and stays on the screen. Leaving goes back twice, one after the other: the first back closes the sheet, as the back button would, and its popstate then calls `pop()`. If no popstate comes within a second, it leaves anyway.
  - **For 06:** I kept the sheet and the question in one entry to avoid a `history.back()` (one sheet's cleanup) being queued against the next sheet's `pushState`, which I'd expect to close the new sheet at once. An edit sheet opened from the options sheet with its own `useBackCloses` needs checking for that; adding `"edit"` to `HabitDialog` and keeping one entry avoids it.
- **Focus** (`screens/focus.ts`): `keepFocus(change, next)` moves focus to `next()` if a change took away the focused control, as soon as the change shows (not when it's saved). `neighbourOfFocus()` picks the same kind of control (`data-slot`) in the next list item, or the previous one.
  - After archiving or deleting, the stack gives focus back to the habit's card, and when the card goes, focus moves to the next card, or the New habit tile.
  - Restoring from a row moves focus to the next row's Restore. After the last one, it goes to the "Nothing archived" note. Restoring on the detail puts focus on Check in today.
  - Escape or the browser's back on either sheet returns focus to the options button. Cancel closes the question the same way.
- **Checked in headless Chrome** (`vp dev`, 400px wide, mobile emulation, a fresh profile, driven over the DevTools protocol):
  - **Archive:** from Read 20 pages' detail (two backfilled check-ins), Archive habit left the screen and the habit left Home. The history entries ended on Home, and a reload kept it archived. Settings showed "Archived habits 1"; the screen listed it with "Longest streak 2 days". Its detail showed the archived note, the 2-day ring and the calendar, with no today button or Edit days. Its sheet offered Restore and Delete, not Archive. A reload on the archived detail reopened it.
  - **Restore:** Restore habit on the detail brought back today's button and Edit days. Archived habits then said "Nothing archived", Settings lost the count, and Home showed the habit in its old second place with its 2-day streak, after a reload too. Restoring three habits from their rows by keyboard put each back on Home.
  - **Delete:** by keyboard, Delete Stretch asked first and deleted after Shift+Tab and Enter. Stretch left Home and stayed gone after a reload. An archived quit habit deleted from its detail went back to an empty Archived habits, then was gone from Home after a reload.
  - **Back:** the browser's back with the options sheet open, and with the delete question open, closed it and stayed on the detail. The sheet added one history entry, and the question shared it. Escape did the same.
  - **Forward:** after archiving, forward reopened the detail in its archived form.
  - **Focus:** as above, every time. Archiving or deleting moved focus to the next card or the New habit tile (ten repeated runs, with and without reduced motion).
  - **Keyboard:** Tab reached the options button (44×44), the sheet's entries, Cancel, the archived rows and their Restore buttons, each with the 2px ring. The rows' ring follows the list's rounded corners. Restore is 36px tall with a 44px tap target.
  - **Reduced motion:** screens swapped at once; archiving, deleting and restoring worked the same.
  - **Looks:** light and dark screenshots of the sheet, the delete question, Settings, Archived habits (full and empty) and an archived detail looked right.
  - **Console:** no errors or warnings from the app. The dev server logged a 502 for `/api/auth/get-session` on every load, because the API Worker wasn't running beside it.
  - **Build:** `vp build` succeeded. I didn't check the production build in the browser.
- **Found, not fixed:**
  - Home's empty state says "Nothing counted yet" and "Add a habit" when every habit is archived. It could point to Archived habits, but Home is 08's area right now.
- **For the owner:**
  - **Archived habits are read-only:** they open to show their history, but their days can't change until they're restored, and the store refuses toggles on them. Editing an archived habit's days would also work if you'd rather.
  - **Quit habits keep counting while archived:** no slip can be logged on an archived quit habit, so its clean days keep growing, and on restore its current streak includes the archived time. Should archiving pause a quit habit's count, or is it right that you were clean unless you say otherwise?
  - **Restore puts a habit back in its old place** on Home, not at the end.
  - **Archive asks nothing**, since restoring undoes it. Delete asks.
  - **The Archived habits row is in the Data group**, next to Export. A Habits group may suit it better once Settings grows.
  - **The options button uses the playground's `Menu` (three lines) icon,** the same as Home's Settings button. An ellipsis might read better as "options".

- **Owner decisions (2026-11-24):** an archived quit habit stops counting while it's archived (follow-up). When every habit is archived, Home points to Archived habits (follow-up).

**Follow-up (2026-11-24): Home when every habit is archived.**

- **What Home says:** with no active habit and at least one archived, Home shows a card in the same style as "Nothing counted yet":
  - "Every habit is archived" over "Archived habits keep their history. Restore one to track it again, or start a new one.";
  - a full-width **See archived habits** button, which pushes `{ name: "archived" }` through `useNav().push`;
  - under the card, the New habit tile, in the person's layout (grid or list), where it always ends the habits.

  "Nothing counted yet" stays for a device with no habits at all. Deleted habits don't count, so deleting every archived habit brings it back. `emptyHome(habits, archived)` in `Home.tsx` makes the choice.

- **The way back:** Archived habits' back button now says "Back to habits" when it was opened from Home and "Back to settings" when it was opened from Settings. `stack.tsx` gains `useScreenBelow()`, the route of the screen underneath, which also holds after a reload.
- **Tests:** `apps/web/test/home.test.ts` (6) checks `emptyHome` against the real store:
  - a new device;
  - some habits archived but one still active;
  - every habit archived, also after a restart;
  - one of them restored;
  - every archived habit deleted, one at a time;
  - the only habit deleted.

  183 tests pass.

- **Checked in headless Chrome 158** against `vp build` + `vp preview`, at 320px (dark, list), 400px (light, grid) and 1024px (dark, grid). Three habits, one of them a quit habit, were each archived from their options:
  - **Home:** it showed the card and the New habit tile, and no "Nothing counted yet".
  - **Keyboard:** from the top, Tab went to Settings, New habit, See archived habits and the New habit tile, and each showed the 2px ring. The button is 52px tall; the tile is 168px (grid) or 60px (list). Enter opened Archived habits, whose back button said "Back to habits". Tab reached the back button, and Enter went back to Home with focus on See archived habits.
  - **Pointer:** restoring Stretch there and going back showed Stretch on Home, with the signed-out note. Archiving it again brought the card back.
  - **From Settings:** the back button said "Back to settings". Deleting all three habits from their details left "Nothing archived", and Home said "Nothing counted yet".
  - **Dev mode** (StrictMode) behaved the same.
  - **Console:** no errors or warnings from the app. The only entry was the 502 for `/api/auth/get-session`, since no API Worker ran.
- **For the owner:**
  - **The signed-out note hides while every habit is archived.** `useSignedOutNoteShown` counts only active habits, but archived habits still live only in this browser. Home's note slot then falls to the reorder hint, which stays folded because it needs two active habits. Counting archived habits there would be a one-line change.
  - **Focus after a restore:** after restoring a habit in Archived habits and going back, the See archived habits button is gone, so focus is left on the page and the next Tab starts at the top.
