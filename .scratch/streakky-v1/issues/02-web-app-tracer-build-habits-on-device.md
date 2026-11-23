# 02: Web app tracer: build habits saved on the device

**What to build:** Opening the web app shows the phone-layout Home screen. I can create a build habit with a name and colour, see it on Home with its current streak, check in today with one tap, and undo it. Everything is saved on the device and survives a reload, with no server involved.

This replaces the TanStack Start starter with a plain Vite single-page app. It introduces the **habit store**, which is the only thing screens talk to: TanStack DB collections for habits and day records, saved to SQLite in the browser. It also starts the device side of the "devices plus server" test harness.

This is the riskiest ticket, because TanStack DB is still a release candidate and its OPFS persistence hasn't been tried under Vite+. Surface any blocker early.

**Spec:** Streakky v1 spec, sections "Habit store", "Synced data shape" and "Testing Decisions" (Seam 2).

**Blocked by:** 01 (Rename core to the glossary vocabulary)

**Status:** done

- [x] The web app is a plain Vite single-page app with no server rendering. It opens straight into Home, and its dev script runs it.
- [x] A New habit flow creates a build habit from a name and a colour. New habits appear on Home after the existing ones.
- [x] The today button checks in and undoes. The current streak and its "day streak" label update immediately, and a habit with no current streak says "log today to start" (now "check in today to start", by the owner's copy decision of 2026-11-24).
- [x] Habits and check-ins survive a reload, and the app keeps working with the network turned off once it's loaded. Opening it offline comes in 11.
- [x] Habits and day records follow the spec's synced data shape:
  - [x] ids generated on the device;
  - [x] an edit time for each field;
  - [x] day records with a logged flag, where removing a check-in writes `logged: false`.
- [x] Screens are built from UI package components and contain no storage code. They use only the habit store's commands and live queries.
- [x] The test harness can create a simulated device: a real habit store with in-memory persistence and a controlled clock. Tests cover:
  - [x] creating a build habit;
  - [x] checking in and undoing;
  - [x] the current streak as days pass;
  - [x] data surviving a restart of the store on the same storage.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **Checked in a real browser:** OPFS SQLite works under both `vp dev` and the production build (`vp build` + `vp preview`) in headless Chrome. Creating a habit, checking in and undoing all survive reloads and a full browser restart. With the network off after load, checking in and creating habits still work, and there were no console errors.
- **Check-in from Home:** the card's tick is now its own 44px toggle (`CheckInButton` in the UI package), so a build habit is checked in from Home with one tap. `TodayButton` stays for the habit detail screen (04). List rows need the same toggle (noted in 05).
- **Clock:** the store takes its edit times from the device clock (`Date.now()`), and tests control it with Vitest's fake `Date`. Ticket 14's "devices with different clocks" scenario will need a clock injected per device.
- **Day records:** keyed by habit and day with no stored id, matching the spec's synced shape. `deleted` is a tombstone without an edit time (ADR-0002).
- **Two tabs:** they share the browser database through TanStack's `BrowserCollectionCoordinator`.
- **Bundle size:** the production bundle is 191 kB of gzipped JS plus 535 kB of gzipped SQLite wasm, which is worth revisiting for load time.
