# 02: Web app tracer: build habits saved on the device

**What to build:** Opening the web app shows the phone-layout Home screen. I can create a build habit with a name and colour, see it on Home with its current streak, check in today with one tap, and undo it. Everything is saved on the device and survives a reload, with no server involved.

This replaces the TanStack Start starter with a plain Vite single-page app. It introduces the **habit store**, which is the only thing screens talk to: TanStack DB collections for habits and day records, saved to SQLite in the browser. It also starts the device side of the "devices plus server" test harness.

This is the riskiest ticket, because TanStack DB is still a release candidate and its OPFS persistence hasn't been tried under Vite+. Surface any blocker early.

**Spec:** Streakky v1 spec, sections "Habit store", "Synced data shape" and "Testing Decisions" (Seam 2).

**Blocked by:** 01 (Rename core to the glossary vocabulary)

**Status:** ready-for-agent

- [ ] The web app is a plain Vite single-page app with no server rendering. It opens straight into Home, and its dev script runs it.
- [ ] A New habit flow creates a build habit from a name and a colour. New habits appear on Home after the existing ones.
- [ ] The today button checks in and undoes. The current streak and its "day streak" label update immediately, and a habit with no current streak says "log today to start".
- [ ] Habits and check-ins survive a reload, and the app keeps working with the network turned off once it's loaded. Opening it offline comes in 11.
- [ ] Habits and day records follow the spec's synced data shape:
  - [ ] ids generated on the device;
  - [ ] an edit time for each field;
  - [ ] day records with a logged flag, where removing a check-in writes `logged: false`.
- [ ] Screens are built from UI package components and contain no storage code. They use only the habit store's commands and live queries.
- [ ] The test harness can create a simulated device: a real habit store with in-memory persistence and a controlled clock. Tests cover:
  - [ ] creating a build habit;
  - [ ] checking in and undoing;
  - [ ] the current streak as days pass;
  - [ ] data surviving a restart of the store on the same storage.
- [ ] `vp check` and `vp test` pass.
