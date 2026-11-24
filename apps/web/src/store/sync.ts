/**
 * Sync with the API Worker (spec, "Sync API (Worker)"; ADR-0002), for a signed-in device. Every
 * change a device makes is pending until a push has carried it. A sync pushes what's pending, then
 * pulls every row changed since the server version it last saw, merging each one with the
 * device's own by the same rules the server uses:
 * - a habit's fields: the later edit wins, field by field;
 * - a day: the later edit wins, per habit and day;
 * - a tie in edit time goes to the higher change id;
 * - a deleted habit stays deleted.
 */
import type { Collection } from "@tanstack/db";
import {
  EDITABLE_FIELDS,
  PUSH_LIMIT,
  SYNC_PATH,
  type EditableField,
  type Pulled,
  type PushAnswer,
  type SyncedDay,
  type SyncedHabit,
} from "@streakky/contract";
import type { ApiFetch } from "./account.ts";
import { isRecord, readJSON, writeJSON, type KeyValueStorage } from "./key-value.ts";
import { dayKey, type DayRecord, type HabitRecord } from "./records.ts";

/** What a sync knows between runs, kept per account so another account starts afresh. */
type Cursor = { email: string; version: number; lastSynced: number | null };

const CURSOR_KEY = "streakky.sync";

export type SyncTiming = {
  /** How long after a change on the device it syncs, gathering the changes made meanwhile. */
  syncDelay: number;
  /** How often it syncs while open, for changes made on other devices. */
  syncInterval: number;
};

export const DEFAULT_TIMING: SyncTiming = { syncDelay: 2_000, syncInterval: 5 * 60_000 };

/** A stamp: an edit time and the id of that edit. Later time wins; a tie goes to the higher id. */
type Stamp = [number, string];
const later = (a: Stamp, b: Stamp) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

/** A stored habit as sync sends it. Records kept from before sync read as having no change ids. */
export function syncedHabit(h: HabitRecord): SyncedHabit {
  const { edited, changeIds, pending: _pending, archivedPeriods, ...fields } = h;
  return {
    ...fields,
    archivedPeriods: archivedPeriods ?? [],
    // a record stored before archived periods came changed them with its archived state
    edited: { ...edited, archivedPeriods: edited.archivedPeriods ?? edited.archived },
    changeIds: Object.fromEntries(
      EDITABLE_FIELDS.map((field) => [field, changeIds?.[field] ?? ""]),
    ) as Record<EditableField, string>,
  };
}

const syncedDay = ({ pending: _pending, changeId, ...day }: DayRecord): SyncedDay => ({
  ...day,
  changeId: changeId ?? "",
});

/**
 * A pulled habit merged with this device's record of it. It stays pending if the device has an
 * edit the server doesn't yet: one made after the push, which the next push carries.
 */
function mergeHabit(local: HabitRecord | undefined, remote: SyncedHabit): HabitRecord {
  if (!local) return { ...remote, pending: false };
  const mine = syncedHabit(local);
  const merged: SyncedHabit = {
    ...mine,
    edited: { ...mine.edited },
    changeIds: { ...mine.changeIds },
    deleted: mine.deleted || remote.deleted,
  };
  let ahead = mine.deleted && !remote.deleted;
  for (const field of EDITABLE_FIELDS) {
    const theirs: Stamp = [remote.edited[field], remote.changeIds[field]];
    const ours: Stamp = [mine.edited[field], mine.changeIds[field]];
    if (later(theirs, ours)) {
      Object.assign(merged, { [field]: remote[field] });
      merged.edited[field] = remote.edited[field];
      merged.changeIds[field] = remote.changeIds[field];
    } else if (later(ours, theirs)) {
      ahead = true;
    }
  }
  return { ...merged, pending: ahead };
}

/**
 * Whether a pulled habit gives this device its goal or its quit day: it's new here, or the server
 * holds a later edit of either. Its goal was then set, or reached by moving the quit day, on
 * another device, which doesn't celebrate that (glossary, "Celebration"), so neither does this one.
 */
function setsGoal(local: HabitRecord | undefined, remote: SyncedHabit): boolean {
  if (!local) return true;
  const mine = syncedHabit(local);
  return (["goal", "quitDay"] as const).some((field) =>
    later(
      [remote.edited[field], remote.changeIds[field]],
      [mine.edited[field], mine.changeIds[field]],
    ),
  );
}

function mergeDay(local: DayRecord | undefined, remote: SyncedDay): DayRecord {
  if (!local) return { ...remote, pending: false };
  const mine = syncedDay(local);
  const theirs: Stamp = [remote.edited, remote.changeId];
  const ours: Stamp = [mine.edited, mine.changeId];
  if (later(theirs, ours)) return { ...remote, pending: false };
  return { ...mine, pending: later(ours, theirs) };
}

const isPending = (record: { pending?: boolean }) => record.pending !== false;

export type Sync = {
  /** Pushes and pulls now, or once the sync already running ends. Never throws. */
  sync(): Promise<void>;
  /** A change made on this device: it syncs a moment later. */
  changedHere(): void;
  /**
   * Changes waiting for a push, when this account last synced on this device, and whether the
   * last sync didn't go through.
   */
  progress(email: string): { pending: number; lastSynced: number | null; failing: boolean };
  close(): Promise<void>;
};

export function openSync({
  api,
  habitRecords,
  dayRecords,
  storage,
  signedInAs,
  now,
  timing,
  triggers,
  statusChanged,
  sessionEnded,
  goalsSetElsewhere,
}: {
  api: ApiFetch;
  habitRecords: Collection<HabitRecord, string>;
  dayRecords: Collection<DayRecord, string>;
  storage: KeyValueStorage;
  /** The signed-in address, or null while signed out: a signed-out device never syncs. */
  signedInAs: () => string | null;
  now: () => number;
  timing: SyncTiming;
  /** The platform's moments to sync, such as coming back online or to the foreground. */
  triggers?: (sync: () => void) => () => void;
  /** Sync's progress changed: what waits for a push, the last sync, or whether it's failing. */
  statusChanged: () => void;
  /** The server answered that this device isn't signed in. */
  sessionEnded: () => void;
  /**
   * The habits this pull gave a goal or a quit day from another device, or brought here for the
   * first time. Called as soon as each page of pulled rows is in the collections, before anything
   * can show them, so that the device can keep their reached goals as celebrated.
   */
  goalsSetElsewhere: (habitIds: ReadonlySet<string>) => void;
}): Sync {
  /** The account's cursor; none, another account's, or an unreadable one starts from the beginning. */
  const readCursor = (email: string): Cursor =>
    readJSON<Cursor>(
      storage,
      CURSOR_KEY,
      (stored) =>
        isRecord(stored) && stored.email === email && Number.isSafeInteger(stored.version)
          ? {
              email,
              version: stored.version as number,
              lastSynced: typeof stored.lastSynced === "number" ? stored.lastSynced : null,
            }
          : undefined,
      { email, version: 0, lastSynced: null },
    );
  // with full or blocked storage, the next sync pulls again from the last version saved
  const saveCursor = (cursor: Cursor) => writeJSON(storage, CURSOR_KEY, cursor);

  const request = async (path: string, init?: RequestInit): Promise<Response | null> => {
    const response = await api(path, init).catch(() => null);
    if (response?.status === 401) sessionEnded();
    return response?.ok ? response : null;
  };

  /**
   * Clears the pending mark of each record a push carried, unless the server couldn't read it, or
   * it changed while the push was out: those stay pending, for the next push.
   */
  const markPushed = async <T extends { pending?: boolean }, S>(
    records: Collection<T, string>,
    sent: S[],
    refused: number[],
    keyOf: (row: S) => string,
    synced: (record: T) => S,
  ) => {
    const unchanged = sent.flatMap((row, i) => {
      const key = keyOf(row);
      const record = records.get(key);
      const same = record && JSON.stringify(synced(record)) === JSON.stringify(row);
      return same && !refused.includes(i) ? [key] : [];
    });
    if (unchanged.length === 0) return;
    await records
      .update(unchanged, (drafts) => drafts.forEach((draft) => (draft.pending = false)))
      .when("settled");
  };

  /** Pushes what's pending, in pushes the Worker takes. False if one didn't go through. */
  const pushPending = async (): Promise<boolean> => {
    const habits = habitRecords.toArray.filter(isPending).map(syncedHabit);
    const days = dayRecords.toArray.filter(isPending).map(syncedDay);
    const rows = [...habits.map((habit) => ({ habit })), ...days.map((day) => ({ day }))];
    for (let start = 0; start < rows.length; start += PUSH_LIMIT) {
      const chunk = rows.slice(start, start + PUSH_LIMIT);
      const body = {
        habits: chunk.flatMap((row) => ("habit" in row ? [row.habit] : [])),
        days: chunk.flatMap((row) => ("day" in row ? [row.day] : [])),
      };
      const response = await request(`${SYNC_PATH}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response) return false;
      const { refused } = (await response.json()) as PushAnswer;
      await Promise.all([
        markPushed(habitRecords, body.habits, refused.habits, (h) => h.id, syncedHabit),
        markPushed(dayRecords, body.days, refused.days, dayKey, syncedDay),
      ]);
    }
    return true;
  };

  /**
   * Merges pulled rows into the device's records, all at once, so no edit lands in between. Adds
   * to `setElsewhere` the habits whose goal or quit day comes from another device.
   */
  const applyPulled = async ({ habits, days }: Pulled, setElsewhere: Set<string>) => {
    for (const remote of habits) {
      if (!remote.deleted && setsGoal(habitRecords.get(remote.id), remote)) {
        setElsewhere.add(remote.id);
      }
    }
    const writes: Promise<unknown>[] = [];
    const apply = <T extends object>(
      records: Collection<T, string>,
      keyOf: (record: T) => string,
      rows: { key: string; merged: (local: T | undefined) => T }[],
    ) => {
      const inserts: T[] = [];
      const updates = new Map<string, T>();
      for (const { key, merged } of rows) {
        const local = records.get(key);
        if (local) updates.set(key, merged(local));
        else inserts.push(merged(undefined));
      }
      if (inserts.length > 0) writes.push(records.insert(inserts).when("settled"));
      if (updates.size > 0) {
        const tx = records.update([...updates.keys()], (drafts) =>
          drafts.forEach((draft) => Object.assign(draft, updates.get(keyOf(draft as T)))),
        );
        writes.push(tx.when("settled"));
      }
    };
    apply(
      habitRecords,
      (h) => h.id,
      habits.map((remote) => ({ key: remote.id, merged: (local) => mergeHabit(local, remote) })),
    );
    apply(
      dayRecords,
      dayKey,
      days.map((remote) => ({ key: dayKey(remote), merged: (local) => mergeDay(local, remote) })),
    );
    // the merged rows are in the collections already, waiting to be stored: nothing has shown
    // them yet
    goalsSetElsewhere(setElsewhere);
    await Promise.all(writes);
  };

  const pullChanges = async (email: string): Promise<boolean> => {
    let cursor = readCursor(email);
    // The cursor lives apart from the records: with none of them left but a cursor past the
    // start, the records were lost and the cursor kept (a browser clearing one store but not the
    // other), and only a pull from the beginning brings them back. A pull always leaves a record.
    if (cursor.version > 0 && habitRecords.size === 0 && dayRecords.size === 0) {
      cursor = { ...cursor, version: 0 };
    }
    // across the pull's pages, since a new habit's days can come a page after it
    const setElsewhere = new Set<string>();
    for (;;) {
      const response = await request(`${SYNC_PATH}/pull?since=${cursor.version}`);
      if (!response) return false;
      const pulled = (await response.json()) as Pulled;
      await applyPulled(pulled, setElsewhere);
      // only once the rows are stored, so a sync cut short pulls them again
      cursor = { ...cursor, version: pulled.version };
      saveCursor(cursor);
      if (!pulled.more) return true;
    }
  };

  /** Whether the last sync didn't go through: offline, or the server failing. */
  let failing = false;

  const run = async () => {
    const email = signedInAs();
    if (!email) return;
    const pushed = await pushPending();
    // pulls even when a push didn't go through, so other devices' changes still arrive
    const pulled = await pullChanges(email);
    failing = !(pushed && pulled);
    if (!failing) saveCursor({ ...readCursor(email), lastSynced: now() });
    statusChanged();
  };

  let running: Promise<void> | null = null;
  let queued: Promise<void> | null = null;
  const sync = (): Promise<void> => {
    if (!running) {
      running = run()
        .catch(() => {})
        .finally(() => (running = null));
      return running;
    }
    // a sync is out: run once more after it, for whatever changed since it started
    queued ??= running.then(() => {
      queued = null;
      return sync();
    });
    return queued;
  };

  let delayed: ReturnType<typeof setTimeout> | undefined;
  const changedHere = () => {
    if (!signedInAs() || !Number.isFinite(timing.syncDelay)) return;
    clearTimeout(delayed);
    delayed = setTimeout(() => void sync(), timing.syncDelay);
  };
  const periodic = Number.isFinite(timing.syncInterval)
    ? setInterval(() => void sync(), timing.syncInterval)
    : undefined;
  const stopTriggers = triggers?.(() => void sync());

  return {
    sync,
    changedHere,
    progress(email) {
      const pending =
        habitRecords.toArray.filter(isPending).length + dayRecords.toArray.filter(isPending).length;
      return { pending, lastSynced: readCursor(email).lastSynced, failing };
    },
    async close() {
      clearTimeout(delayed);
      clearInterval(periodic);
      stopTriggers?.();
      await (queued ?? running);
    },
  };
}
