import {
  BrowserCollectionCoordinator,
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
} from "@tanstack/browser-db-sqlite-persistence";
import { openHabitStore, type HabitStore } from "./habit-store.ts";

/**
 * The habit store on this browser's own storage: SQLite in the origin private file system, and
 * localStorage for device settings. The coordinator lets two tabs of the app share the database.
 */
export async function openBrowserHabitStore(): Promise<HabitStore> {
  void requestPersistentStorage();
  const database = await openBrowserWASQLiteOPFSDatabase({ databaseName: "streakky.sqlite" });
  const coordinator = new BrowserCollectionCoordinator({ dbName: "streakky" });
  return openHabitStore({
    persistence: createBrowserWASQLitePersistence({ database, coordinator }),
    keyValueStorage: window.localStorage,
    // the API is on the app's own origin, so the browser keeps the session cookie first-party
    api: (path, init) => fetch(path, init),
  });
}

/**
 * Asks the browser not to evict this origin's storage, where the habits live. Browsers may refuse,
 * or decide without asking the person, and the store works the same either way.
 */
async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist || (await navigator.storage.persisted())) return;
    await navigator.storage.persist();
  } catch {
    // the storage stays best-effort
  }
}
