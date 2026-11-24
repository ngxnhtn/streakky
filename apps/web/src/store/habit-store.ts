import { createCollection } from "@tanstack/db";
import {
  persistedCollectionOptions,
  type PersistedCollectionPersistence,
} from "@tanstack/db-sqlite-persistence-core";
import { generateKeyBetween } from "fractional-indexing";
import {
  canBeQuitDay,
  canToggle,
  defaultSettings,
  PALETTES,
  todayISO,
  type ColorId,
  type Habit,
  type Kind,
  type Settings,
} from "@streakky/core";
import { toExportFile, type ExportFile } from "./export.ts";
import { openAccount, type ApiFetch, type SyncStatus } from "./account.ts";

export {
  SIGN_IN_CODE,
  SignInError,
  type ApiFetch,
  type SignInFailure,
  type SyncStatus,
} from "./account.ts";

/** The habit fields a device can change; each keeps the device time of its last change, for sync. */
export const EDITABLE_FIELDS = ["name", "color", "goal", "quitDay", "archived", "order"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** A habit as the device stores and syncs it. */
export type HabitRecord = {
  /** generated on the device */
  id: string;
  /** fixed at creation */
  kind: Kind;
  name: string;
  color: ColorId;
  goal: number | null;
  /** YYYY-MM-DD, quit habits only */
  quitDay: string | null;
  archived: boolean;
  /** fractional position, so a reorder changes only one habit */
  order: string;
  /** tombstone: once true, never false again, whatever else changed later (ADR-0002) */
  deleted: boolean;
  edited: Record<EditableField, number>;
};

/**
 * One habit's day: a check-in (build) or a slip (quit) while `logged`. Removing one writes
 * `logged: false` instead of deleting the record, so the later edit can win when devices sync.
 * A habit and a day together identify the record.
 */
export type DayRecord = {
  habitId: string;
  /** YYYY-MM-DD */
  day: string;
  logged: boolean;
  /** device time of the last change */
  edited: number;
};

const dayKey = (habitId: string, day: string) => `${habitId}/${day}`;

export type NewBuildHabit = { kind: "build"; name: string; color: ColorId };
/** `quitDay` is today or a past day (YYYY-MM-DD); the first clean day is the day after. */
export type NewQuitHabit = { kind: "quit"; name: string; color: ColorId; quitDay: string };
export type NewHabit = NewBuildHabit | NewQuitHabit;

/** What the screens use: commands that change habits, and the habits as the core model sees them. */
export type HabitStore = {
  createHabit(input: NewHabit): Promise<void>;
  /**
   * Adds or removes a check-in (build) or a slip (quit); today when `day` is left out. Only on an
   * active habit: an archived habit's days stay as they are until it's restored, and a deleted
   * habit's for good.
   */
  toggleDay(habitId: string, day?: string): Promise<void>;
  /**
   * Reorders: puts an active habit just after another active habit (`after`), or first with
   * null. Only the moved habit's order position changes. Does nothing if either one isn't active.
   */
  moveHabit(habitId: string, after: string | null): Promise<void>;
  /** Hides a habit from the active habits, keeping its days. Does nothing to a deleted habit. */
  archiveHabit(habitId: string): Promise<void>;
  /**
   * Brings an archived habit back to the active habits, in its old place, with all its days.
   * Does nothing to a deleted habit: nothing undoes a delete.
   */
  restoreHabit(habitId: string): Promise<void>;
  /**
   * Deletes a habit for good, active or archived: it and its days leave every view. Its record
   * stays as a tombstone, so sync can tell other devices (ADR-0002).
   */
  deleteHabit(habitId: string): Promise<void>;
  /** Active habits in the person's order. The same array until something changes. */
  habits: () => Habit[];
  /** Archived habits in the person's order. The same array until something changes. */
  archivedHabits: () => Habit[];
  /** Changes some of this device's settings; the rest stay as they are. */
  changeSettings(change: Partial<Settings>): void;
  /** This device's settings: never synced, kept on sign-out. The same object until one changes. */
  settings: () => Settings;
  /** Every habit, archived ones included and deleted ones left out, as one file to keep. */
  exportHabits(): ExportFile;
  /** Emails a sign-in code to `email`; a `SignInError` says why not. */
  requestSignInCode(email: string): Promise<void>;
  /** Signs in with the code emailed to `email`; a `SignInError` says why not. */
  signIn(email: string, code: string): Promise<void>;
  /** Ends this device's session at once, offline too; its habits stay. */
  signOut(): Promise<void>;
  /** Asks the server whether this device is still signed in. The store does this when it opens. */
  checkSession(): Promise<void>;
  /** Whether this device is signed in. The same object until it changes. */
  syncStatus: () => SyncStatus;
  subscribe: (listener: () => void) => () => void;
  /** Stops the store; its data stays on the device for the next open. */
  close(): Promise<void>;
};

/**
 * Device-local key-value storage, such as the browser's localStorage. Device settings live here,
 * apart from the habit and day records, so they are never synced and they survive sign-out.
 */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export type HabitStoreOptions = {
  persistence: PersistedCollectionPersistence;
  keyValueStorage: KeyValueStorage;
  /** How the store reaches the API Worker, for signing in. */
  api: ApiFetch;
};

const SETTINGS_KEY = "streakky.settings";

/** What each setting may hold; anything else in storage is ignored. */
const SETTING_VALUES: { [K in keyof Settings]: (value: unknown) => boolean } = {
  theme: (v) => v === "system" || v === "light" || v === "dark",
  palette: (v) => PALETTES.some((p) => p.id === v),
  layout: (v) => v === "grid" || v === "list",
  weekStart: (v) => v === 0 || v === 1,
  reminder: (v) => typeof v === "boolean",
  reminderTime: (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
  celebrate: (v) => typeof v === "boolean",
  signedOutNoteDismissed: (v) => typeof v === "boolean",
};

/**
 * The stored settings this version recognises, over `fallback` (the defaults when opening), so
 * settings added later start at their default and damaged values are dropped. Unreadable or
 * blocked storage gives `fallback` rather than failing.
 */
export function readSettings(storage: KeyValueStorage, fallback = defaultSettings): Settings {
  try {
    const stored: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? "{}");
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return fallback;
    const valid = Object.entries(stored).filter(
      ([key, value]) => key in SETTING_VALUES && SETTING_VALUES[key as keyof Settings](value),
    );
    return { ...fallback, ...Object.fromEntries(valid) };
  } catch {
    return fallback;
  }
}

function writeSettings(storage: KeyValueStorage, settings: Settings) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // full or blocked storage: the change still applies until the app is reopened
  }
}

/**
 * The person's order. Two devices adding a habit after the same one offline give both the same
 * position, so ties fall back to the id, the same on every device.
 */
const byOrder = (a: HabitRecord, b: HabitRecord) =>
  a.order < b.order ? -1 : a.order > b.order ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export async function openHabitStore({
  persistence,
  keyValueStorage,
  api,
}: HabitStoreOptions): Promise<HabitStore> {
  const habitRecords = createCollection(
    persistedCollectionOptions<HabitRecord, string>({
      id: "habits",
      getKey: (h) => h.id,
      persistence,
      schemaVersion: 1,
    }),
  );
  const dayRecords = createCollection(
    persistedCollectionOptions<DayRecord, string>({
      id: "days",
      getKey: (d) => dayKey(d.habitId, d.day),
      persistence,
      schemaVersion: 1,
    }),
  );
  await Promise.all([habitRecords.preload(), dayRecords.preload()]);
  let settings = readSettings(keyValueStorage);

  let snapshot: Habit[] | null = null;
  let archivedSnapshot: Habit[] | null = null;
  const listeners = new Set<() => void>();
  const changed = () => {
    snapshot = null;
    archivedSnapshot = null;
    for (const listener of listeners) listener();
  };
  const subscriptions = [
    habitRecords.subscribeChanges(changed),
    dayRecords.subscribeChanges(changed),
  ];
  const account = openAccount({
    api,
    storage: keyValueStorage,
    changed: () => {
      for (const listener of listeners) listener();
    },
  });
  void account.checkSession();

  const toHabits = (records: HabitRecord[]): Habit[] => {
    const logged = new Map<string, string[]>();
    for (const d of dayRecords.toArray) {
      if (d.logged) logged.set(d.habitId, [...(logged.get(d.habitId) ?? []), d.day]);
    }
    return records.flatMap((h): Habit[] => {
      const days = (logged.get(h.id) ?? []).sort();
      const base = { id: h.id, name: h.name, color: h.color, goal: h.goal };
      if (h.kind === "build") return [{ ...base, kind: "build", checkIns: days }];
      // a quit habit can't be counted without its quit day; the store never writes one without
      return h.quitDay ? [{ ...base, kind: "quit", quitDay: h.quitDay, slips: days }] : [];
    });
  };

  const habits = () =>
    (snapshot ??= toHabits(
      habitRecords.toArray.filter((h) => !h.deleted && !h.archived).toSorted(byOrder),
    ));

  /**
   * Changes some of a habit's editable fields, giving each the device time of this change, for
   * sync. A missing or deleted habit is left alone: a tombstone is never edited (ADR-0002).
   */
  const changeHabit = async (
    habitId: string,
    change: Partial<Pick<HabitRecord, EditableField>>,
  ): Promise<void> => {
    const habit = habitRecords.get(habitId);
    const fields = EDITABLE_FIELDS.filter((field) => change[field] !== undefined);
    if (!habit || habit.deleted || fields.length === 0) return;
    const editedAt = Date.now();
    const tx = habitRecords.update(habitId, (h) => {
      for (const field of fields) {
        Object.assign(h, { [field]: change[field] });
        h.edited[field] = editedAt;
      }
    });
    await tx.when("settled");
  };

  const archivedHabits = () =>
    (archivedSnapshot ??= toHabits(
      habitRecords.toArray.filter((h) => !h.deleted && h.archived).toSorted(byOrder),
    ));

  return {
    async createHabit(input) {
      const { kind, name, color } = input;
      if (input.kind === "quit" && !canBeQuitDay(input.quitDay)) {
        throw new Error(`A quit day must be today or a past day, not "${input.quitDay}".`);
      }
      const editedAt = Date.now();
      // after every habit, archived and deleted ones too, so no two habits share a position
      const last = habitRecords.toArray.toSorted(byOrder).at(-1);
      const tx = habitRecords.insert({
        id: crypto.randomUUID(),
        kind,
        name,
        color,
        goal: null,
        quitDay: input.kind === "quit" ? input.quitDay : null,
        archived: false,
        order: generateKeyBetween(last?.order ?? null, null),
        deleted: false,
        edited: Object.fromEntries(
          EDITABLE_FIELDS.map((field) => [field, editedAt]),
        ) as HabitRecord["edited"],
      });
      await tx.when("settled");
    },
    async toggleDay(habitId, day = todayISO()) {
      const habit = habits().find((h) => h.id === habitId);
      if (!habit || !canToggle(habit, day)) return;
      const key = dayKey(habitId, day);
      const tx = dayRecords.has(key)
        ? dayRecords.update(key, (d) => {
            d.logged = !d.logged;
            d.edited = Date.now();
          })
        : dayRecords.insert({ habitId, day, logged: true, edited: Date.now() });
      await tx.when("settled");
    },
    async moveHabit(habitId, after) {
      const shown = habits();
      const at = shown.findIndex((h) => h.id === habitId);
      const isShown = (id: string | null) => id === null || shown.some((h) => h.id === id);
      if (at === -1 || after === habitId || !isShown(after)) return;
      if ((shown[at - 1]?.id ?? null) === after) return; // already there
      // Just after `after`, before the next position of any other habit, shown or not: archived
      // and deleted habits keep positions between the shown ones. Strictly between two
      // neighbouring positions, the new one can't equal another habit's.
      const lower = after === null ? null : (habitRecords.get(after)?.order ?? null);
      const upper =
        habitRecords.toArray
          .filter((h) => h.id !== habitId && (lower === null || h.order > lower))
          .toSorted(byOrder)[0]?.order ?? null;
      await changeHabit(habitId, { order: generateKeyBetween(lower, upper) });
    },
    archiveHabit: (habitId) => changeHabit(habitId, { archived: true }),
    restoreHabit: (habitId) => changeHabit(habitId, { archived: false }),
    async deleteHabit(habitId) {
      if (habitRecords.get(habitId)?.deleted !== false) return;
      // the record stays, so sync can carry the delete; `deleted` has no edit time, since no later
      // edit can undo it. Its day records stay too, unseen, as the server keeps them (ADR-0002).
      const tx = habitRecords.update(habitId, (h) => {
        h.deleted = true;
      });
      await tx.when("settled");
    },
    changeSettings(change) {
      // onto the stored settings, not this store's copy, so a change made in another tab stays
      settings = { ...readSettings(keyValueStorage, settings), ...change };
      writeSettings(keyValueStorage, settings);
      for (const listener of listeners) listener();
    },
    habits,
    archivedHabits,
    settings: () => settings,
    exportHabits() {
      const records = habitRecords.toArray.filter((h) => !h.deleted).toSorted(byOrder);
      const archived = new Set(records.filter((h) => h.archived).map((h) => h.id));
      return toExportFile(toHabits(records).map((h) => ({ ...h, archived: archived.has(h.id) })));
    },
    ...account,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async close() {
      for (const subscription of subscriptions) subscription.unsubscribe();
      listeners.clear();
      await Promise.all([habitRecords.cleanup(), dayRecords.cleanup()]);
    },
  };
}
