# 05: Settings screen

**What to build:** A Settings screen where I choose:

- light, dark or system theme;
- the app's colour palette;
- grid or list layout for Home;
- whether weeks start on Monday or Sunday.

Settings belong to this device. They're stored separately from habit data, survive a reload and are never synced. Later tickets add their own sections to this screen: celebrations (06), export (09), account (13) and the reminder (19).

**Spec:** Streakky v1 spec, user stories 57–61, and section "Habit store" (device settings).

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** done

- [x] Settings is reachable from Home, and back returns to Home.
- [x] Theme (light, dark or system) applies immediately, and "system" follows the operating system's appearance.
- [x] Choosing one of the five palettes recolours the app immediately.
- [x] The layout setting switches Home between grid and list. List rows keep the one-tap check-in that grid cards got in 02 (the tick is its own 44px button).
- [ ] Week start (Monday or Sunday) is used by every calendar. There are no calendars yet. The setting is stored and offered in Settings, and 04 passes it to `HabitCalendar`.
- [x] Settings live in device-local storage outside the habit store's synced data, and survive a reload.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **Habit store:**
  - `settings()` is the device-settings live query. `changeSettings(change)` changes some settings and leaves the rest. `useSettings()` is the React hook.
  - Settings are one JSON value under `streakky.settings` in an injected `KeyValueStorage` (`getItem`/`setItem`): `localStorage` in the browser, and per-device in-memory storage in the test harness. Nothing about them touches the habit or day records.
  - Stored values are spread over `defaultSettings`, so a setting added later starts at its default.
  - Each change merges onto what is stored, not onto the store's own copy, so two tabs don't undo each other's changes. A second tab does not live-update, though: it shows the other tab's change only after its own next change or a reload.
- **Harness:** `createStorage()` now holds `keyValues` next to the database. Settings survive a store restart on the same storage, as habits do. Two stores opened on one storage stand in for two tabs.
- **Navigation:** `screens/stack.tsx` ports the playground's screen stack: `useNav().push/pop`, a `Route` union, Settings sliding in from the left, under-screens made inert, and swaps without animation under reduced motion. 04 adds its detail route to `Route` and to `screenOf` in `App.tsx`. Browser and Android back don't pop the stack: no history entries are pushed (Android back is for 16).
- **List rows:** `HabitRow` takes `onCheckIn` the way `HabitCard` does. The tick stays a 16px tick in the status line, inside a 44px `CheckInButton`. With `onClick` as well (from 04), an open button covers the row and the text is hidden from screen readers.
- **Copy:** the list status says "Checked in today" and "Not checked in today", following the glossary, where the playground had "Done today" and "Not logged today". "Log today to start" stays, to match the grid card's `sinceLabel`. That is the open copy question from 01.
- **Checked in headless Chrome (dev and production builds):**
  - Settings opened from Home's menu button and came back.
  - Dark and light applied at once, and system followed an emulated OS switch both ways.
  - Oxblood recoloured the ground and the `theme-color` meta.
  - The list layout and Sunday stuck. The list tick checked in from a tap 15px off its centre, and its target measured 44×44.
  - Dark, oxblood, list, Sunday and the check-in all survived a reload.
  - Reduced motion swapped screens on the next frame.
  - There were no console errors.
- **Known gap:** a stored dark theme applies only once the store has opened, so the empty page paints light for about 70ms first (in dev). This already happened for users whose OS is dark. Fixing it means applying the theme from `localStorage` before the store opens, in `main.tsx` or `index.html` (11's area).
- **For the owner:**
  - Layout lives only in Settings, as this ticket asks. The playground also has a grid/list switch in Home's header, but that control is only 36px high and misses the 44px tap-target rule, so I left it out.
  - `KeyValueStorage` is synchronous, which fits `localStorage`, including inside Capacitor's WebView. If 16 moves settings to an async native store such as Capacitor Preferences (ADR-0001), settings are read once when the store opens, so that read can wait. Writes would have to become fire-and-forget.
  - Settings use the default 44px `Segmented`, where the playground uses `sm`.

- **Owner decision (2026-11-24):** a second open tab picking up a settings change only on its next change or a reload is accepted for now.
