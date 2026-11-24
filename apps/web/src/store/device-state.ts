/**
 * What a device keeps for itself in its key-value storage, beside its habit records: its settings,
 * and the goals it has celebrated. Neither ever syncs. The settings stay on sign-out, and the
 * celebrations go with the habits they belong to.
 */
import {
  celebrated,
  celebrationDue as isCelebrationDue,
  defaultSettings,
  LAYOUTS,
  PALETTES,
  THEMES,
  WEEK_STARTS,
  type Celebrated,
  type Habit,
  type Settings,
} from "@streakky/core";
import { isRecord, readJSON, removeKey, writeJSON, type KeyValueStorage } from "./key-value.ts";

const SETTINGS_KEY = "streakky.settings";
/** The goals this device has celebrated, by habit id. */
const CELEBRATIONS_KEY = "streakky.celebrations";

const isOneOf =
  <T>(list: { id: T }[]) =>
  (value: unknown) =>
    list.some((item) => item.id === value);

/** What each setting may hold; anything else in storage is ignored. */
const SETTING_VALUES: { [K in keyof Settings]: (value: unknown) => boolean } = {
  theme: isOneOf(THEMES),
  palette: isOneOf(PALETTES),
  layout: isOneOf(LAYOUTS),
  weekStart: isOneOf(WEEK_STARTS),
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
export const readSettings = (storage: KeyValueStorage, fallback = defaultSettings): Settings =>
  readJSON(
    storage,
    SETTINGS_KEY,
    (stored) => {
      if (!isRecord(stored)) return undefined;
      const valid = Object.entries(stored).filter(
        ([key, value]) => key in SETTING_VALUES && SETTING_VALUES[key as keyof Settings](value),
      );
      return { ...fallback, ...Object.fromEntries(valid) };
    },
    fallback,
  );

/** Keeps the settings; with full or blocked storage, they apply until the app is reopened. */
export const writeSettings = (storage: KeyValueStorage, settings: Settings) =>
  writeJSON(storage, SETTINGS_KEY, settings);

type Celebrations = Record<string, Celebrated>;

/** The celebrations kept on this device; unreadable or damaged entries are dropped. */
const readCelebrations = (storage: KeyValueStorage): Celebrations =>
  readJSON(
    storage,
    CELEBRATIONS_KEY,
    (stored) =>
      isRecord(stored)
        ? (Object.fromEntries(
            Object.entries(stored).filter(
              ([, kept]) =>
                isRecord(kept) && typeof kept.goal === "number" && typeof kept.start === "string",
            ),
          ) as Celebrations)
        : undefined,
    {},
  );

/** Whether the habit's current streak has reached its goal without a celebration here yet. */
export const celebrationDue = (storage: KeyValueStorage, habit: Habit): boolean =>
  isCelebrationDue(habit, readCelebrations(storage)[habit.id] ?? null);

/**
 * Keeps that the habit's current streak has had its celebration for its goal. Written onto what's
 * stored, so another tab's celebrations stay. With full or blocked storage, a celebration may
 * play again once the app is reopened.
 */
export function markCelebrated(storage: KeyValueStorage, habit: Habit): void {
  const celebrations = readCelebrations(storage);
  const kept = celebrated(habit, celebrations[habit.id] ?? null);
  if (kept) writeJSON(storage, CELEBRATIONS_KEY, { ...celebrations, [habit.id]: kept });
}

/** Forgets every celebration kept here, as signing out clears the habits they belong to. */
export const forgetCelebrations = (storage: KeyValueStorage) =>
  removeKey(storage, CELEBRATIONS_KEY);
