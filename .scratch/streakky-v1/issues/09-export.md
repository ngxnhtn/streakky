# 09: Export

**What to build:** From Settings I can export my full history as one JSON file. It contains every habit, archived ones included but deleted ones left out. Each habit comes with its kind, name, colour, goal, quit day, archived state and its check-ins or slips by day. On the web the file downloads; Android's share sheet comes with the Android app (16).

**Spec:** Streakky v1 spec, user stories 62–63, and section "Export".

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** done

- [x] Settings has an Export action that downloads one JSON file.
- [x] The file contains every active and archived habit with its fields and its check-ins or slips by day, and no deleted habits. Active habits are verified. The export also keeps archived habits and leaves out deleted ones, but neither case can be tested until 07 adds the archive and delete commands.
- [x] Export works signed-out and offline.
- [x] A harness test exports from a device with known habits and checks the file matches what the device shows.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).** Notes for later tickets:

- **The file:** one JSON file, `streakky-YYYY-MM-DD.json`, named with the device's local date. For example:

  ```json
  {
    "format": "streakky-export",
    "version": 1,
    "exportedAt": "2026-11-24T09:00:00+07:00",
    "habits": [
      {
        "id": "…",
        "kind": "build",
        "name": "Morning run",
        "color": "green",
        "goal": null,
        "archived": false,
        "checkIns": ["2026-11-23", "2026-11-24"]
      },
      {
        "id": "…",
        "kind": "quit",
        "name": "No smoking",
        "color": "red",
        "goal": 30,
        "quitDay": "2026-11-14",
        "archived": false,
        "slips": ["2026-11-20"]
      }
    ]
  }
  ```

  - It lists every habit that isn't deleted, archived ones included, in the person's order. The array order stands in for the stored fractional `order` key, which is left out.
  - Only quit habits have `quitDay`, as in the glossary. Build habits have `checkIns`, quit habits `slips`, each sorted. A future import should expect `quitDay` to be missing on build habits, not `null`.
  - `exportedAt` is the device's local date and time with its UTC offset, so its date agrees with the file name. `Date.parse` reads it as one exact moment.
  - `id` is kept so an import can recognise a habit it already has.
  - Edit times, tombstones and removed days (`logged: false`) are sync bookkeeping and are left out.
  - The shape is written out field by field in `apps/web/src/store/export.ts` (`ExportContent`, `ExportedHabit`). A change to core's `Habit` doesn't change the file; a new shape needs `version: 2`.

- **Logged days:** the file holds every check-in or slip recorded, not only the ones core counts (`loggedDays`). That includes a day after today, such as a check-in made before flying west, and a slip on or before the quit day, which ADR-0002 keeps after a quit-day move from another device. A backup shouldn't lose anything the person logged, and the counting rules can be applied again to whatever reads the file. A harness test checks the flying-west case. The store can't make a slip on or before the quit day yet, so that case needs a test once moving the quit day exists (06).
- **Store and platform:** `store.exportHabits()` returns the file as `{ name, type, text }` and doesn't depend on the platform. `apps/web/src/save-file.ts` (`saveFile`) is the one place the platform decides how the person gets the file: the web downloads it through a link to a blob URL. **For 16:** make `saveFile` open the share sheet inside Capacitor, using the same `isNativePlatform()` check as `service-worker.ts`. Settings calls `void saveFile(…)`, so decide there what a cancelled share does, since it may reject.
- **Settings:** a "Data" group under Appearance with one row, "Export as JSON", using the playground's `ListButton` and Download icon. The row is always enabled. With every habit archived, Home is empty but the export isn't, and an empty export is still a valid file.
- **Harness tests** (`habit-store.test.ts`, "an export from a device"):
  - build and quit habits with their fields and days, including a removed check-in left out;
  - the file equals the device's habits in order;
  - the file name, type, format and version;
  - `exportedAt` in two time zones, Kathmandu (+05:45) and St John's (−03:30), by setting `process.env.TZ`;
  - the flying-west check-in kept;
  - an empty device.

  **For 07:** the store can't archive or delete a habit yet, so two `it.todo` tests are waiting: archived habits included, marked and in order, and deleted habits left out.

- **Checked in headless Chrome 158:**
  - Dev server: three habits created (build, quit with quit day 14 Nov, and a build with quotes in its name), one checked in and one slipped today. Settings → Export as JSON downloaded `streakky-2026-11-24.json`. The file parsed, and its habits, order, kinds, quit day and today's check-in and slip matched Home.
  - Production build (`vp build` + `vp preview`): the same online, with the service worker in control. Then the preview server was stopped, the page emulated offline and reloaded from the worker, and the export downloaded and matched again.
  - The row is 56px tall at 400px wide and showed a 2px `:focus-visible` outline from the keyboard. It looked right in light and dark. No console errors or warnings in any run.
- **For the owner:**
  - `ListButton`'s focus ring has its corners clipped by the rounded, `overflow-hidden` `List`. This is the first `ListButton` in the web app. A fix in the UI package would round the first and last buttons' corners to the list's radius. I left it alone because it's outside this ticket.
  - "Export" and "backup" aren't in the glossary. Worth adding if export becomes a term the app uses elsewhere.
  - The store's `toHabits` skips a quit habit with no quit day, so the export would too. The store never writes one, but a record like that arriving from sync wouldn't make it into a backup.

- **Closed by 07 (2026-11-24):** the two `it.todo` export tests are now real tests in `habit-store.test.ts`: archived habits are kept, marked `archived: true` in their place in the order, and deleted habits are left out with their days.
