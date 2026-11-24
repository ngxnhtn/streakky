import { createCollection } from "@tanstack/db";
import {
  persistedCollectionOptions,
  type PersistedCollectionPersistence,
} from "@tanstack/db-sqlite-persistence-core";
import { generateKeyBetween } from "fractional-indexing";
import {
  canBeQuitDay,
  canToggle,
  celebrated,
  celebrationDue as isCelebrationDue,
  defaultSettings,
  GOALS,
  goalReached,
  HABIT_COLORS,
  PALETTES,
  slipsRemovedByMovingQuitDay,
  todayISO,
  type ArchivedPeriod,
  type Celebrated,
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

/**
 * The habit fields a device can change; each keeps the device time of its last change, for sync.
 * `archived` and `archivedPeriods` only ever change together, with one edit time.
 */
export const EDITABLE_FIELDS = [
  "name",
  "color",
  "goal",
  "quitDay",
  "archived",
  "archivedPeriods",
  "order",
] as const;
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
  /**
   * Every time it was archived, oldest first, the last one open (`restoredOn: null`) while it's
   * archived. Archiving and restoring write it with `archived`, at the same edit time, so when
   * devices merge, the two come from the same device's edit (ADR-0002). Records stored before it
   * came have none, and read as having no archived periods.
   */
  archivedPeriods?: ArchivedPeriod[];
  /** fractional position, so a reorder changes only one habit */
  order: string;
  /** tombstone: once true, never false again, whatever else changed later (ADR-0002) */
  deleted: boolean;
  /**
   * The device time of each editable field's last change. Records stored before `archivedPeriods`
   * came have no time for it: read it as `archived`'s, since the two change together.
   */
  edited: Record<Exclude<EditableField, "archivedPeriods">, number> & { archivedPeriods?: number };
};

/**
 * A record's archived periods as the device counts them: none on a record stored before they were
 * kept, and an open one only while the habit is archived, as archiving and restoring leave them.
 */
const archivedPeriodsOf = (h: HabitRecord): ArchivedPeriod[] =>
  (h.archivedPeriods ?? []).filter((p) => p.restoredOn !== null || h.archived);

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

/** `goal` is one of core's `GOALS`, or none when null or left out. */
type NewHabitBase = { name: string; color: ColorId; goal?: number | null };
export type NewBuildHabit = NewHabitBase & { kind: "build" };
/** `quitDay` is today or a past day (YYYY-MM-DD); the first clean day is the day after. */
export type NewQuitHabit = NewHabitBase & { kind: "quit"; quitDay: string };
export type NewHabit = NewBuildHabit | NewQuitHabit;

/** What Edit habit and the Goal tab change. A habit's kind never changes. */
export type HabitEdit = { name?: string; color?: ColorId; goal?: number | null };

/** What the screens use: commands that change habits, and the habits as the core model sees them. */
export type HabitStore = {
  createHabit(input: NewHabit): Promise<void>;
  /**
   * Renames a habit, changes its colour, or sets, changes or removes (null) its goal. Only fields
   * that differ from the habit's change, so a sync keeps another device's edits to the others.
   * Throws for an empty name or a goal that isn't one of core's `GOALS`. Only on an active habit.
   */
  editHabit(habitId: string, change: HabitEdit): Promise<void>;
  /**
   * Moves a quit habit's quit day to today or a past day and removes the slips on or before it,
   * which core's `slipsRemovedByMovingQuitDay` lists so the screen can warn first. Throws for a
   * day that can't be a quit day, or for a build habit. Only on an active habit.
   */
  moveQuitDay(habitId: string, quitDay: string): Promise<void>;
  /**
   * Adds or removes a check-in (build) or a slip (quit); today when `day` is left out. Only on an
   * active habit: an archived habit's days stay as they are until it's restored, and a deleted
   * habit's for good.
   */
  toggleDay(habitId: string, day?: string): Promise<void>;
  /**
   * Reorders: puts an active habit just after another active habit (`after`), or first with
   * null. Only the moved habit's order position changes. Does nothing if either one isn't active.
   * The first move that changes the order also dismisses Home's reorder hint on this device.
   */
  moveHabit(habitId: string, after: string | null): Promise<void>;
  /**
   * Hides a habit from the active habits, keeping its days, and starts an archived period today:
   * a quit habit's count stops after today until it's restored. Does nothing to a habit already
   * archived, or a deleted one.
   */
  archiveHabit(habitId: string): Promise<void>;
  /**
   * Brings an archived habit back to the active habits, in its old place, with all its days, and
   * ends its archived period today: a quit habit's count carries on from where it stopped. Does
   * nothing to an active habit, or a deleted one: nothing undoes a delete.
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
  /**
   * Whether the habit's current streak has reached its goal without a celebration on this device
   * yet. The screens play it, or let it pass with Celebrations off, then call `markCelebrated`.
   */
  celebrationDue(habit: Habit): boolean;
  /**
   * Keeps on this device that the habit's current streak has had its celebration for its goal,
   * so it plays once. Setting a goal the streak already reaches, or moving the quit day so that it
   * does, marks it too: those edits don't celebrate.
   */
  markCelebrated(habit: Habit): void;
  /**
   * Every habit, archived ones included and deleted ones left out, as one file to keep, with the
   * times each was archived (export.ts).
   */
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
/** The goals this device has celebrated, by habit id: device-local, like the settings. */
const CELEBRATIONS_KEY = "streakky.celebrations";

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
  reorderHintDismissed: (v) => typeof v === "boolean",
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

type Celebrations = Record<string, Celebrated>;

/** The celebrations kept on this device; unreadable or damaged entries are dropped. */
function readCelebrations(storage: KeyValueStorage): Celebrations {
  try {
    const stored: unknown = JSON.parse(storage.getItem(CELEBRATIONS_KEY) ?? "{}");
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored as Record<string, Partial<Celebrated> | null>).filter(
        ([, kept]) => typeof kept?.goal === "number" && typeof kept.start === "string",
      ),
    ) as Celebrations;
  } catch {
    return {};
  }
}

function writeCelebrations(storage: KeyValueStorage, celebrations: Celebrations) {
  try {
    storage.setItem(CELEBRATIONS_KEY, JSON.stringify(celebrations));
  } catch {
    // full or blocked storage: a celebration may play again once the app is reopened
  }
}

const isGoal = (goal: number | null) => goal === null || GOALS.includes(goal);

const goalError = (goal: number | null) =>
  new Error(`A goal must be one of ${GOALS.join(", ")} days, not ${goal}.`);

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
      const base = {
        id: h.id,
        name: h.name,
        color: h.color,
        goal: h.goal,
        archivedPeriods: archivedPeriodsOf(h),
      };
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

  const changeSettings = (change: Partial<Settings>) => {
    // onto the stored settings, not this store's copy, so a change made in another tab stays
    settings = { ...readSettings(keyValueStorage, settings), ...change };
    writeSettings(keyValueStorage, settings);
    for (const listener of listeners) listener();
  };

  /**
   * An active habit, the only kind Edit habit and the Goal tab change: an archived habit stays as
   * it is until it's restored, as its days do, and a deleted one for good.
   */
  const activeHabit = (habitId: string): Habit | undefined =>
    habits().find((h) => h.id === habitId);

  const markCelebrated = (habit: Habit) => {
    // onto what's stored, so another tab's celebrations stay
    const celebrations = readCelebrations(keyValueStorage);
    const kept = celebrated(habit, celebrations[habit.id] ?? null);
    if (kept) writeCelebrations(keyValueStorage, { ...celebrations, [habit.id]: kept });
  };

  return {
    async createHabit(input) {
      const { kind, name, color, goal = null } = input;
      if (input.kind === "quit" && !canBeQuitDay(input.quitDay)) {
        throw new Error(`A quit day must be today or a past day, not "${input.quitDay}".`);
      }
      if (!isGoal(goal)) throw goalError(goal);
      const id = crypto.randomUUID();
      if (input.kind === "quit") {
        // a quit day far enough back reaches the goal at once: a goal set, not reached, today
        const habit: Habit = { ...input, id, goal, slips: [], archivedPeriods: [] };
        if (goalReached(habit)) markCelebrated(habit);
      }
      const editedAt = Date.now();
      // after every habit, archived and deleted ones too, so no two habits share a position
      const last = habitRecords.toArray.toSorted(byOrder).at(-1);
      const tx = habitRecords.insert({
        id,
        kind,
        name,
        color,
        goal,
        quitDay: input.kind === "quit" ? input.quitDay : null,
        archived: false,
        archivedPeriods: [],
        order: generateKeyBetween(last?.order ?? null, null),
        deleted: false,
        edited: Object.fromEntries(
          EDITABLE_FIELDS.map((field) => [field, editedAt]),
        ) as HabitRecord["edited"],
      });
      await tx.when("settled");
    },
    async editHabit(habitId, { name, color, goal }) {
      const record = habitRecords.get(habitId);
      const habit = activeHabit(habitId);
      if (!record || !habit) return;
      if (name !== undefined && !name.trim()) throw new Error("A habit's name can't be empty.");
      if (color !== undefined && !HABIT_COLORS.some((c) => c.id === color)) {
        throw new Error(`"${color}" isn't a habit colour.`);
      }
      if (goal !== undefined && !isGoal(goal)) throw goalError(goal);
      const change: Partial<Pick<HabitRecord, EditableField>> = {};
      if (name !== undefined && name !== record.name) change.name = name;
      if (color !== undefined && color !== record.color) change.color = color;
      if (goal !== undefined && goal !== record.goal) change.goal = goal;
      if (Object.keys(change).length === 0) return;
      if (change.goal !== undefined) {
        // a goal the current streak already reaches was set, not reached, so it doesn't celebrate
        const withGoal = { ...habit, goal: change.goal };
        if (goalReached(withGoal)) markCelebrated(withGoal);
      }
      await changeHabit(habitId, change);
    },
    async moveQuitDay(habitId, quitDay) {
      const habit = activeHabit(habitId);
      if (!habit) return;
      if (habit.kind !== "quit") throw new Error("Only a quit habit has a quit day.");
      if (!canBeQuitDay(quitDay)) {
        throw new Error(`A quit day must be today or a past day, not "${quitDay}".`);
      }
      if (quitDay === habit.quitDay) return;
      const removed = slipsRemovedByMovingQuitDay(habit, quitDay);
      const moved: Habit = {
        ...habit,
        quitDay,
        slips: habit.slips.filter((slip) => !removed.includes(slip)),
      };
      // correcting the quit day isn't reaching the goal, so it doesn't celebrate
      if (goalReached(moved)) markCelebrated(moved);
      // the quit day first: the slips on or before it stop counting at once
      await changeHabit(habitId, { quitDay });
      if (removed.length === 0) return;
      const editedAt = Date.now();
      const tx = dayRecords.update(
        removed.map((day) => dayKey(habitId, day)),
        (days) => {
          for (const d of days) {
            d.logged = false;
            d.edited = editedAt;
          }
        },
      );
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
      // the person has found reordering, so Home's hint about it can go
      if (!settings.reorderHintDismissed) changeSettings({ reorderHintDismissed: true });
      await changeHabit(habitId, { order: generateKeyBetween(lower, upper) });
    },
    // Archiving and restoring always write `archived` and `archivedPeriods` together, so the two
    // share an edit time and a merge takes both from the same device's edit (ADR-0002).
    async archiveHabit(habitId) {
      const record = habitRecords.get(habitId);
      if (!record || record.archived) return;
      const opened: ArchivedPeriod = { archivedOn: todayISO(), restoredOn: null };
      await changeHabit(habitId, {
        archived: true,
        archivedPeriods: [...archivedPeriodsOf(record), opened],
      });
    },
    async restoreHabit(habitId) {
      const record = habitRecords.get(habitId);
      if (!record?.archived) return;
      const restoredOn = todayISO();
      await changeHabit(habitId, {
        archived: false,
        // a habit archived before periods were kept has none open, and gets none
        archivedPeriods: archivedPeriodsOf(record).map((p) =>
          p.restoredOn === null ? { ...p, restoredOn } : p,
        ),
      });
    },
    async deleteHabit(habitId) {
      if (habitRecords.get(habitId)?.deleted !== false) return;
      // the record stays, so sync can carry the delete; `deleted` has no edit time, since no later
      // edit can undo it. Its day records stay too, unseen, as the server keeps them (ADR-0002).
      const tx = habitRecords.update(habitId, (h) => {
        h.deleted = true;
      });
      await tx.when("settled");
    },
    changeSettings,
    habits,
    archivedHabits,
    celebrationDue: (habit) =>
      isCelebrationDue(habit, readCelebrations(keyValueStorage)[habit.id] ?? null),
    markCelebrated,
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
