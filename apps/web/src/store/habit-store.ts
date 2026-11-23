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
  todayISO,
  type ColorId,
  type Habit,
  type Kind,
  type Settings,
} from "@streakky/core";

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
  /** Adds or removes a check-in (build) or a slip (quit); today when `day` is left out. */
  toggleDay(habitId: string, day?: string): Promise<void>;
  /** Active habits in the person's order. The same array until something changes. */
  habits: () => Habit[];
  /** Changes some of this device's settings; the rest stay as they are. */
  changeSettings(change: Partial<Settings>): void;
  /** This device's settings: never synced, kept on sign-out. The same object until one changes. */
  settings: () => Settings;
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
};

const SETTINGS_KEY = "streakky.settings";

/**
 * The stored settings over the defaults, so settings added later start at their default.
 * Unreadable or blocked storage gives `fallback` rather than failing.
 */
function readSettings(storage: KeyValueStorage, fallback = defaultSettings): Settings {
  try {
    const stored: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? "{}");
    return typeof stored === "object" ? { ...defaultSettings, ...stored } : fallback;
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

const byOrder = (a: HabitRecord, b: HabitRecord) =>
  a.order < b.order ? -1 : a.order > b.order ? 1 : 0;

export async function openHabitStore({
  persistence,
  keyValueStorage,
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
  const listeners = new Set<() => void>();
  const changed = () => {
    snapshot = null;
    for (const listener of listeners) listener();
  };
  const subscriptions = [
    habitRecords.subscribeChanges(changed),
    dayRecords.subscribeChanges(changed),
  ];

  const toHabits = (records: HabitRecord[]): Habit[] => {
    const logged = new Map<string, string[]>();
    for (const d of dayRecords.toArray) {
      if (d.logged) logged.set(d.habitId, [...(logged.get(d.habitId) ?? []), d.day]);
    }
    return records.map((h) => {
      const days = (logged.get(h.id) ?? []).sort();
      const base = { id: h.id, name: h.name, color: h.color, goal: h.goal };
      return h.kind === "build"
        ? { ...base, kind: "build", checkIns: days }
        : { ...base, kind: "quit", quitDay: h.quitDay ?? "", slips: days };
    });
  };

  const habits = () =>
    (snapshot ??= toHabits(
      habitRecords.toArray.filter((h) => !h.deleted && !h.archived).toSorted(byOrder),
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
    changeSettings(change) {
      // onto the stored settings, not this store's copy, so a change made in another tab stays
      settings = { ...readSettings(keyValueStorage, settings), ...change };
      writeSettings(keyValueStorage, settings);
      for (const listener of listeners) listener();
    },
    habits,
    settings: () => settings,
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
