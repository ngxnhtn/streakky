import Database from "better-sqlite3";
import { createNodeSQLitePersistence } from "@tanstack/node-db-sqlite-persistence";
import { openHabitStore, type HabitStore } from "../src/store/habit-store.ts";

/** A simulated device's on-device storage: an in-memory SQLite database that outlives its stores. */
export type DeviceStorage = { database: Database.Database };

export const createStorage = (): DeviceStorage => ({ database: new Database(":memory:") });

/** Opens the real habit store on a simulated device's storage, as the app does on launch. */
export const openDevice = (storage: DeviceStorage): Promise<HabitStore> =>
  openHabitStore({ persistence: createNodeSQLitePersistence({ database: storage.database }) });
