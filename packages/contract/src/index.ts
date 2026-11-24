/**
 * What the API Worker (apps/api) and the web app (apps/web) agree on over HTTP: where sign-in and
 * sync are served, the rows sync carries and how many at once, and what sign-in answers with. Both
 * sides import it, so neither can change the shape alone. Only types and constants: nothing here
 * runs.
 */
import type { ArchivedPeriod, ColorId, Kind } from "@streakky/core";

/** Where the Worker serves better-auth. */
export const AUTH_PATH = "/api/auth";

/** Where the Worker serves sync: `POST ${SYNC_PATH}/push` and `GET ${SYNC_PATH}/pull?since=N`. */
export const SYNC_PATH = "/api/sync";

/**
 * The Android app's origin: Capacitor serves its pages from inside the APK at this address, so
 * every request it makes to the Worker crosses origins. The Worker allows it through CORS.
 */
export const ANDROID_APP_ORIGIN = "https://localhost";

/** The header that hands the Android app its session token, in place of a cookie. */
export const SESSION_TOKEN_HEADER = "set-auth-token";

/**
 * The sign-in codes the Worker emails: how many digits, and how many minutes each works
 * (better-auth's defaults, named so the email and the Sign-in screen can say them).
 */
export const SIGN_IN_CODE = { length: 6, minutes: 5 } as const;

/**
 * The error codes the Worker adds to better-auth's own, which the app tells apart from other
 * failures.
 */
export const SIGN_IN_ERRORS = {
  /** The address isn't on the allowlist: no code was made or sent. */
  notAllowed: "EMAIL_NOT_ALLOWED",
  /** The address has taken all of today's sign-in steps (UTC), whatever IPs they came from. */
  limitToday: "TOO_MANY_SIGN_IN_ATTEMPTS_TODAY",
} as const;

/**
 * The habit fields a device can change. Each keeps the device time of its last change and that
 * change's id, so "the later edit wins" works field by field (ADR-0002). `archived` and
 * `archivedPeriods` only ever change together, with one edit time.
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

/** A habit as push and pull carry it (spec, "Synced data shape"). */
export type SyncedHabit = {
  id: string;
  kind: Kind;
  name: string;
  color: ColorId;
  goal: number | null;
  /** YYYY-MM-DD: a quit habit always has one, a build habit never does */
  quitDay: string | null;
  archived: boolean;
  /** every time it was archived, oldest first; the last one open while it's archived */
  archivedPeriods: ArchivedPeriod[];
  /** fractional position */
  order: string;
  /** tombstone: once true, never false again */
  deleted: boolean;
  /** the device time of each field's last change */
  edited: Record<EditableField, number>;
  /** the id of each field's last change, for ties in edit time; "" (the lowest) from before sync */
  changeIds: Record<EditableField, string>;
};

/** A habit's day as push and pull carry it: a check-in or a slip while `logged`. */
export type SyncedDay = {
  habitId: string;
  /** YYYY-MM-DD; with `habitId`, the record's identity */
  day: string;
  logged: boolean;
  /** the device time of the last change */
  edited: number;
  /** the id of the last change, for ties in edit time; "" (the lowest) from before sync */
  changeId: string;
};

/** What a device pushes: the rows it changed, at most `PUSH_LIMIT` in all. */
export type Pushed = { habits: SyncedHabit[]; days: SyncedDay[] };

/** The most rows one push may carry; a device sends more in several pushes. */
export const PUSH_LIMIT = 200;

/** Where in a push's lists were the rows the server couldn't read: their places in each list. */
export type Refused = { habits: number[]; days: number[] };

/**
 * A push's answer. The rows it refused were not stored, and wait on the device; the rest are
 * stored, merged by ADR-0002's rules.
 */
export type PushAnswer = { refused: Refused };

/** A page of a pull: rows changed after the version asked for, oldest change first. */
export type Pulled = Pushed & {
  /** the server version to pull from next time */
  version: number;
  /** more rows wait past `version`: pull again */
  more: boolean;
};
