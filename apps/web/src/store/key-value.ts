/**
 * Device-local key-value storage, such as the browser's localStorage. Device settings live here,
 * apart from the habit and day records, so they are never synced and they survive sign-out. The
 * account, sync's place in its changes and the goals celebrated live here too; signing out clears
 * those.
 */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * The value kept as JSON under `key`, as `read` makes it out, or `fallback` when there's none,
 * when it isn't JSON, when `read` can't use it (returning undefined), or when the storage can't
 * be read at all.
 */
export function readJSON<T>(
  storage: KeyValueStorage,
  key: string,
  read: (stored: unknown) => T | undefined,
  fallback: T,
): T {
  try {
    const stored = storage.getItem(key);
    return stored === null ? fallback : (read(JSON.parse(stored)) ?? fallback);
  } catch {
    return fallback;
  }
}

/**
 * Keeps `value` as JSON under `key`. Full or blocked storage keeps nothing, and doesn't fail: what
 * the app holds in memory still applies until it's reopened.
 */
export function writeJSON(storage: KeyValueStorage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // full or blocked storage: see above
  }
}

/** Removes what's kept under `key`. Blocked storage keeps it, and doesn't fail. */
export function removeKey(storage: KeyValueStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // blocked storage: nothing can be removed
  }
}

/** Whether a stored value is a plain object, whose entries can be read one by one. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
