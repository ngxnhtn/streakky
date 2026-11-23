# Sync with TanStack DB over our own endpoints on D1

Each device keeps its habits in a local TanStack DB store, persisted to SQLite on the device, and syncs through push and pull endpoints we write ourselves on the Cloudflare Worker, with D1 as the system of record. We chose this over a full sync engine because the engines that fit Cloudflare either make Durable Objects the system of record (TinyBase, LiveStore, Jazz), need Postgres (Zero, PowerSync, ElectricSQL, Dexie Cloud), or charge for SQLite storage (RxDB). Streakky's data is small, private to one person and shaped like rows, so the merge rules are simple enough to own.

## Merge rules

The server applies these when two devices have changed the same thing offline:

- A day's check-in or slip: the later edit wins, per habit per day.
- A habit's name, colour, goal, quit day, archived state and order: the later edit wins, field by field.
- Slips on or before a quit habit's quit day are ignored when counting, so a slip logged offline on one device survives the merge harmlessly after another device moved the quit day past it.
- A deleted habit stays deleted, even if another device edited it or logged days on it.
- Signing in on a device with signed-out habits merges them into the account as they are. There is no matching by name.

"Later" means the edit time on the device that made the edit, so a device with a wrong clock can win a conflict it shouldn't. We accept that for one person's own devices.

## Consequences

We own delta pull, idempotent pushes and tombstones for deletes. TanStack DB 1.0 was still a release candidate when we chose it.
