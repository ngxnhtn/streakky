import Database from "better-sqlite3";
import { createNodeSQLitePersistence } from "@tanstack/node-db-sqlite-persistence";
import { openHabitStore, type HabitStore, type KeyValueStorage } from "../src/store/habit-store.ts";

/**
 * A simulated device's on-device storage, which outlives its stores: an in-memory SQLite
 * database for habits, and in-memory key-value storage for settings.
 */
export type DeviceStorage = { database: Database.Database; keyValues: KeyValueStorage };

export const createStorage = (): DeviceStorage => ({
  database: new Database(":memory:"),
  keyValues: inMemoryKeyValues(),
});

/** Opens the real habit store on a simulated device's storage, as the app does on launch. */
export const openDevice = (storage: DeviceStorage): Promise<HabitStore> =>
  openHabitStore({
    persistence: createNodeSQLitePersistence({ database: storage.database }),
    keyValueStorage: storage.keyValues,
  });

function inMemoryKeyValues(): KeyValueStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}
