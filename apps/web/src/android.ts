/**
 * The Android app (ticket 16, ADR-0001): this web build inside Capacitor. Its habits live in native
 * SQLite and its settings in native preferences, both in the app's own storage, which Android
 * doesn't clear the way it may clear a browser's. main.tsx loads this module only in the app, so
 * the web build doesn't carry it.
 */
import { App } from "@capacitor/app";
import { SystemBars, SystemBarsStyle, type PluginListenerHandle } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import { Share } from "@capacitor/share";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { createCapacitorSQLitePersistence } from "@tanstack/capacitor-db-sqlite-persistence";
import type { Platform } from "./platform.ts";
import type { ExportFile } from "./store/export.ts";
import { openHabitStore, type HabitStore, type KeyValueStorage } from "./store/habit-store.ts";

/** The app's pages come from inside the APK, so the API is reached at its own address. */
const API_ORIGIN = "https://hb.nhutien.com";
const DATABASE = "streakky";

/**
 * Opens the habit store on the phone's own storage, with what the app needs from Android: its back
 * button and the colour of the system bars' icons. `applySettings` puts the settings on the page
 * once they're read, before the database opens, and says whether the page is dark.
 */
export async function openAndroidApp(
  applySettings: (keyValues: KeyValueStorage) => boolean,
): Promise<{ store: HabitStore; platform: Platform }> {
  const keyValues = await loadPreferences();
  setSystemBars(applySettings(keyValues));
  const store = await openHabitStore({
    persistence: createCapacitorSQLitePersistence({ database: await openDatabase() }),
    keyValueStorage: keyValues,
    api: (path, init) => fetch(new URL(path, API_ORIGIN), init),
    syncTriggers: whenBack,
  });
  return {
    store,
    platform: {
      backButton(back) {
        const listener = App.addListener("backButton", () => {
          // closing can't fail in a way the app could do anything about
          if (!back()) App.exitApp().catch(() => {});
        });
        return () => removeListener(listener);
      },
      systemBars: setSystemBars,
    },
  };
}

/**
 * Light icons over a dark theme, dark ones over a light theme. Should Android refuse, the icons
 * keep the system's own style, which still shows.
 */
function setSystemBars(dark: boolean) {
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(
    () => {},
  );
}

/**
 * The app's SQLite database, opened. A connection the plugin still holds from before, as after the
 * page reloads or the app is reopened in the same process, isn't the page's any more: the
 * consistency check closes it, so the page always opens its own.
 */
async function openDatabase() {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  await sqlite.checkConnectionsConsistency();
  const database = await sqlite.createConnection(DATABASE, false, "no-encryption", 1, false);
  await database.open();
  return database;
}

/**
 * Device settings and the like, kept in native preferences. The store reads and writes them at
 * once, so they're read in one go as the app opens, then kept in memory; each write goes to the
 * preferences after. A write the preferences refuse holds until the app is reopened, as a full
 * browser storage's does (key-value.ts).
 */
async function loadPreferences(): Promise<KeyValueStorage> {
  const { keys } = await Preferences.keys();
  const stored = await Promise.all(
    keys.map(async (key) => [key, (await Preferences.get({ key })).value] as const),
  );
  const items = new Map(stored.flatMap(([key, value]) => (value === null ? [] : [[key, value]])));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem(key, value) {
      items.set(key, value);
      Preferences.set({ key, value }).catch(() => {});
    },
    removeItem(key) {
      items.delete(key);
      Preferences.remove({ key }).catch(() => {});
    },
  };
}

/** Syncs when the app is back in front, or the phone back online. */
function whenBack(sync: () => void): () => void {
  const resumed = App.addListener("resume", sync);
  window.addEventListener("online", sync);
  return () => {
    removeListener(resumed);
    window.removeEventListener("online", sync);
  };
}

/** Stops a Capacitor listener, once it has been added. */
const removeListener = (listener: Promise<PluginListenerHandle>) =>
  void listener.then((handle) => handle.remove());

/**
 * Hands a file to the share sheet, where the person can save it to Files or send it somewhere. It
 * goes through the app's cache, which the share sheet can read. Closing the sheet isn't a failure;
 * the plugin says so only in its message, "Share canceled".
 */
export async function shareFile({ name, text }: ExportFile): Promise<void> {
  const { uri } = await Filesystem.writeFile({
    path: name,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ title: name, files: [uri] });
  } catch (error) {
    if (!(error instanceof Error && /cancel/i.test(error.message))) throw error;
  }
}
