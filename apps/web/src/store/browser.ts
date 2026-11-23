import {
  BrowserCollectionCoordinator,
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
} from "@tanstack/browser-db-sqlite-persistence";
import { openHabitStore, type HabitStore } from "./habit-store.ts";

/**
 * The habit store on this browser's own storage: SQLite in the origin private file system.
 * The coordinator lets two tabs of the app share it safely.
 */
export async function openBrowserHabitStore(): Promise<HabitStore> {
  const database = await openBrowserWASQLiteOPFSDatabase({ databaseName: "streakky.sqlite" });
  const coordinator = new BrowserCollectionCoordinator({ dbName: "streakky" });
  return openHabitStore({
    persistence: createBrowserWASQLitePersistence({ database, coordinator }),
  });
}
