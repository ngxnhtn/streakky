# Sync with TanStack DB over our own endpoints on D1

Each device keeps its habits in a local TanStack DB store, persisted to SQLite on the device, and syncs through push and pull endpoints we write ourselves on the Cloudflare Worker, with D1 as the system of record. We chose this over a full sync engine because the engines that fit Cloudflare either make Durable Objects the system of record (TinyBase, LiveStore, Jazz), need Postgres (Zero, PowerSync, ElectricSQL, Dexie Cloud), or charge for SQLite storage (RxDB). Streakky's data is small, private to one person and shaped like rows, so the merge rules are simple enough to own.

## Merge rules

The server applies these when two devices have changed the same thing offline:

- A day's check-in or slip: the later edit wins, per habit per day.
- A habit's name, colour, goal, quit day, archived state, archived periods and order: the later edit wins, field by field.
- A habit's archived periods (the days it was archived and restored on, each time) only ever change with its archived state, at one edit time. So both come from the same device's edit: one device's whole archive history wins, never a mix of two. The losing device's archiving and restoring are dropped, and the days it had archived count as the winning device recorded them.
- Slips on or before a quit habit's quit day are ignored when counting, so a slip logged offline on one device survives the merge harmlessly after another device moved the quit day past it.
- Slips on a quit habit's archived days are ignored when counting too, so a slip logged offline on a device where the habit was still active survives the merge harmlessly when another device's archiving wins.
- A deleted habit stays deleted, even if another device edited it or logged days on it.
- Signing in on a device with signed-out habits merges them into the account as they are. There is no matching by name.

"Later" means the edit time on the device that made the edit, so a device with a wrong clock can win a conflict it shouldn't. We accept that for one person's own devices.

Two edits with the same time go to the one with the higher change id: every change gets a random id of its own, shared by the fields it changes together, so devices that edited the same thing in the same millisecond still agree on one winner. A device never gives a change an earlier time than the edit it replaces: if its clock reads earlier, the change takes that edit's time plus a millisecond, so a device's own later edit always beats its earlier one.

## Consequences

We own delta pull, idempotent pushes and tombstones for deletes. TanStack DB 1.0 was still a release candidate when we chose it.

Habits stored before archived periods were kept have none, and no edit time for them. They read as having none, edited when the archived state last was, so the two still change together.
