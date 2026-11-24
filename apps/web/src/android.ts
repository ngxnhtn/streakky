/**
 * The Android app (ticket 16, ADR-0001): this web build inside Capacitor. Its habits live in native
 * SQLite and its settings in native preferences, both in the app's own storage, which Android
 * doesn't clear the way it may clear a browser's. main.tsx loads this module only in the app, so
 * the web build doesn't carry it.
 */
import { App } from "@capacitor/app";
import { SystemBars, SystemBarsStyle, type PluginListenerHandle } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { Share } from "@capacitor/share";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { createCapacitorSQLitePersistence } from "@tanstack/capacitor-db-sqlite-persistence";
import { toISO, type Reminder } from "@streakky/core";
import type { Platform, Reminders } from "./platform.ts";
import type { ExportFile } from "./store/export.ts";
import {
  openHabitStore,
  type HabitStore,
  type KeyValueStorage,
  type SessionTokenStorage,
} from "./store/habit-store.ts";

/** The app's pages come from inside the APK, so the API is reached at its own address. */
const API_ORIGIN = "https://hb.nhutien.com";
const DATABASE = "streakky";
const SESSION_TOKEN_KEY = "streakky.session-token";

/**
 * Opens the habit store on the phone's own storage, with what the app needs from Android: its back
 * button, the colour of the system bars' icons and the daily reminder's notifications. `applySettings` puts the settings on the page
 * once they're read, before the database opens, and says whether the page is dark. The app's
 * pages come from another origin than the API's, so its cookies wouldn't be its own: it keeps its
 * session as a token, in secure storage (spec, "Auth").
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
    sessionToken: await loadSessionToken(),
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
      reminders,
    },
  };
}

const REMINDER_CHANNEL = "daily-reminder";
/** Android's default importance: the reminder makes a sound but doesn't pop up over the screen. */
const DEFAULT_IMPORTANCE = 3;
const habitList = new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" });

/**
 * The daily reminder as local notifications, one a day, each with its day as its id. They're
 * inexact, as the spec allows: an exact one would need Android's alarms permission, and the
 * plugin would open its settings to ask. Android puts them back after the phone restarts.
 */
const reminders: Reminders = {
  allowed: async () => (await LocalNotifications.checkPermissions()).display === "granted",
  allow: async () => (await LocalNotifications.requestPermissions()).display === "granted",
  schedule(plan, stillToday) {
    // One replacement at a time, so two close together can't leave a mix of both. One that fails
    // doesn't hold up the next, which starts from whatever is in place.
    const replaced = scheduling.then(() => replaceReminders(plan, stillToday));
    scheduling = replaced.catch(() => {});
    return replaced;
  },
};
let scheduling = Promise.resolve();

/** A day's reminder's id: the day, as 20261124. */
const reminderId = (day: string) => Number(day.replaceAll("-", ""));

async function replaceReminders(plan: Reminder[], stillToday: string[]) {
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: notifications.map(({ id }) => ({ id })) });
  }
  // one already shown stays only while it's today's and something is still to check in today
  const today = reminderId(toISO(new Date()));
  const shown = (await LocalNotifications.getDeliveredNotifications()).notifications;
  const outOfDate = shown.filter(({ id }) => id !== today || stillToday.length === 0);
  if (outOfDate.length > 0) {
    await LocalNotifications.removeDeliveredNotifications({ notifications: outOfDate });
  }
  if (plan.length === 0) return;
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL,
    name: "Daily reminder",
    description: "The build habits still to check in today",
    importance: DEFAULT_IMPORTANCE,
  });
  await LocalNotifications.schedule({
    notifications: plan.map((reminder) => ({
      id: reminderId(reminder.day),
      title: "Still to check in today",
      body: habitList.format(reminder.habits),
      channelId: REMINDER_CHANNEL,
      schedule: { at: reminder.at, allowWhileIdle: true },
      isExactNotification: false,
    })),
  });
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

/**
 * The session token, in secure storage, encrypted with a key the Android Keystore holds. It's
 * read in as the app opens, then each change is written through. A new token the storage refuses
 * holds until the app is reopened, which then asks for a sign-in again; a removal it refuses
 * leaves a token the signed-out device no longer uses.
 */
async function loadSessionToken(): Promise<SessionTokenStorage> {
  // the plugin refuses a key it doesn't hold: no session token yet
  let token = await SecureStoragePlugin.get({ key: SESSION_TOKEN_KEY }).then(
    ({ value }) => value,
    () => null,
  );
  return {
    get: () => token,
    set(next) {
      if (next === token) return;
      token = next;
      const written =
        next === null
          ? SecureStoragePlugin.remove({ key: SESSION_TOKEN_KEY })
          : SecureStoragePlugin.set({ key: SESSION_TOKEN_KEY, value: next });
      written.catch(() => {});
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
