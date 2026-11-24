import Database from "better-sqlite3";
import { createCollection } from "@tanstack/db";
import { persistedCollectionOptions } from "@tanstack/db-sqlite-persistence-core";
import { createNodeSQLitePersistence } from "@tanstack/node-db-sqlite-persistence";
import {
  openHabitStore,
  type ApiFetch,
  type DayRecord,
  type HabitRecord,
  type HabitStore,
  type HabitStoreOptions,
  type KeyValueStorage,
} from "../src/store/habit-store.ts";

/**
 * A simulated device's on-device storage, which outlives its stores: an in-memory SQLite
 * database for habits, in-memory key-value storage for settings, and the browser's cookies.
 */
export type DeviceStorage = {
  database: Database.Database;
  keyValues: KeyValueStorage;
  /** cookie values by name, as the browser keeps them for the app's origin */
  cookies: Map<string, string>;
};

export const createStorage = (): DeviceStorage => ({
  database: new Database(":memory:"),
  keyValues: inMemoryKeyValues(),
  cookies: new Map(),
});

/**
 * The same device's storage after its habit database is lost while its key-value storage and
 * cookies stay, as when a browser clears one but not the others.
 */
export const withRecordsLost = (storage: DeviceStorage): DeviceStorage => ({
  ...storage,
  database: new Database(":memory:"),
});

/** How a device reaches the API Worker, given its storage (see `online` in server.ts). */
export type Connection = (storage: DeviceStorage) => ApiFetch;

/** No server answers: the device is offline, or the Worker is down. */
export const unreachable: Connection = () => () => Promise.reject(new TypeError("fetch failed"));

/** A connection that drops and comes back, as a phone's does. */
export function switchable(connection: Connection) {
  let up = true;
  const switched: Connection = (storage) => {
    const reach = connection(storage);
    const none = unreachable(storage);
    return (path, init) => (up ? reach(path, init) : none(path, init));
  };
  return {
    connection: switched,
    goOffline: () => void (up = false),
    goOnline: () => void (up = true),
  };
}

/**
 * How a simulated device behaves beyond its storage and network: its clock, and when it syncs by
 * itself. By default it syncs only when it opens, after signing in, and when a test says so.
 */
export type DeviceOptions = Pick<HabitStoreOptions, "now" | "timing" | "syncTriggers">;

/** Opens the real habit store on a simulated device's storage, as the app does on launch. */
export const openDevice = (
  storage: DeviceStorage,
  connection: Connection = unreachable,
  { now, timing, syncTriggers }: DeviceOptions = {},
): Promise<HabitStore> =>
  openHabitStore({
    persistence: createNodeSQLitePersistence({ database: storage.database }),
    keyValueStorage: storage.keyValues,
    api: connection(storage),
    now,
    timing: { syncDelay: Infinity, syncInterval: Infinity, ...timing },
    syncTriggers,
  });

/** A device's stored habit records, as the store keeps them (the same id and schema version). */
const habitRecordsIn = (storage: DeviceStorage) =>
  createCollection(
    persistedCollectionOptions<HabitRecord, string>({
      id: "habits",
      getKey: (h) => h.id,
      persistence: createNodeSQLitePersistence({ database: storage.database }),
      schemaVersion: 1,
    }),
  );

const dayRecordsIn = (storage: DeviceStorage) =>
  createCollection(
    persistedCollectionOptions<DayRecord, string>({
      id: "days",
      getKey: (d) => `${d.habitId}/${d.day}`,
      persistence: createNodeSQLitePersistence({ database: storage.database }),
      schemaVersion: 1,
    }),
  );

/**
 * The habit records kept in a device's storage, read the way the store reads them, archived and
 * deleted ones included: what sync will send. Read while no store is open on the storage.
 */
export async function storedHabits(storage: DeviceStorage): Promise<HabitRecord[]> {
  const records = habitRecordsIn(storage);
  await records.preload();
  const stored = records.toArray.map((h) => structuredClone(h));
  await records.cleanup();
  return stored;
}

/**
 * Writes records straight into a device's storage, as an older version of the app or a sync
 * would have left them. Write while no store is open on the storage.
 */
export async function storeRecords(
  storage: DeviceStorage,
  { habits = [], days = [] }: { habits?: HabitRecord[]; days?: DayRecord[] },
): Promise<void> {
  const habitRecords = habitRecordsIn(storage);
  const dayRecords = dayRecordsIn(storage);
  await Promise.all([habitRecords.preload(), dayRecords.preload()]);
  if (habits.length > 0) await habitRecords.insert(habits).when("settled");
  if (days.length > 0) await dayRecords.insert(days).when("settled");
  await Promise.all([habitRecords.cleanup(), dayRecords.cleanup()]);
}

function inMemoryKeyValues(): KeyValueStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}
