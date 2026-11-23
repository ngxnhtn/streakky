import Database from "better-sqlite3";
import { createNodeSQLitePersistence } from "@tanstack/node-db-sqlite-persistence";
import {
  openHabitStore,
  type ApiFetch,
  type HabitStore,
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

/** How a device reaches the API Worker, given its storage (see `online` in server.ts). */
export type Connection = (storage: DeviceStorage) => ApiFetch;

/** No server answers: the device is offline, or the Worker is down. */
export const unreachable: Connection = () => () => Promise.reject(new TypeError("fetch failed"));

/** Opens the real habit store on a simulated device's storage, as the app does on launch. */
export const openDevice = (
  storage: DeviceStorage,
  connection: Connection = unreachable,
): Promise<HabitStore> =>
  openHabitStore({
    persistence: createNodeSQLitePersistence({ database: storage.database }),
    keyValueStorage: storage.keyValues,
    api: connection(storage),
  });

function inMemoryKeyValues(): KeyValueStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}
