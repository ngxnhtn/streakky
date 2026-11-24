/**
 * Signing in to the API Worker with an email code, and remembering on the device whether it is
 * signed in, so the app knows while offline. The session itself is the server's cookie, which
 * the browser keeps. Screens reach all of this through the habit store.
 */
import { AUTH_PATH, SIGN_IN_CODE, SIGN_IN_ERRORS } from "@streakky/contract";
import { isRecord, readJSON, writeJSON, type KeyValueStorage } from "./key-value.ts";

export { SIGN_IN_CODE };

/** Calls the API Worker: `fetch` on the app's own origin in the browser. */
export type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

/** Whether this device is signed in, and as whom. */
export type AccountStatus = { signedIn: false } | { signedIn: true; email: string };

/**
 * Whether this device is signed in, as whom, and how its sync stands: how many changes wait for a
 * push, when it last synced with the server (device time; null before the first sync), and
 * whether its last try didn't go through.
 */
export type SyncStatus =
  | { signedIn: false }
  | { signedIn: true; email: string; pending: number; lastSynced: number | null; failing: boolean };

/** Why a code wasn't sent, or a sign-in didn't go through. */
export type SignInFailure =
  /** not an email address */
  | "invalid-email"
  /** not on the server's allowlist: no code was sent */
  | "not-allowed"
  | "wrong-code"
  | "expired-code"
  /** three wrong tries used the code up; a new one is needed */
  | "used-up-code"
  /** too many tries from this network for now */
  | "rate-limited"
  | "limit-today"
  /** the server couldn't be reached */
  | "offline"
  /** the server failed */
  | "server";

export class SignInError extends Error {
  constructor(readonly reason: SignInFailure) {
    super(`Sign-in failed: ${reason}`);
    this.name = "SignInError";
  }
}

/**
 * What the device remembers: the signed-in address, or a sign-out the server hasn't heard of yet
 * because it happened offline. The device counts as signed out from that moment on.
 */
type Stored = { email: string } | { signingOut: true } | null;

const ACCOUNT_KEY = "streakky.account";

/** Sign-in's error codes, better-auth's and the Worker's own, as the app tells them apart. */
const FAILURES: Record<string, SignInFailure> = {
  INVALID_EMAIL: "invalid-email",
  [SIGN_IN_ERRORS.notAllowed]: "not-allowed",
  INVALID_OTP: "wrong-code",
  OTP_EXPIRED: "expired-code",
  TOO_MANY_ATTEMPTS: "used-up-code",
};

/**
 * The habit store's sign-in commands, which the store hands on (see `HabitStore`), and whether
 * this device is signed in.
 */
export type Account = {
  requestSignInCode: (email: string) => Promise<void>;
  signIn: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  status: () => AccountStatus;
};

export function openAccount({
  api,
  storage,
  statusChanged,
}: {
  api: ApiFetch;
  storage: KeyValueStorage;
  /** Whether the device is signed in, or as whom, changed. */
  statusChanged: () => void;
}): Account {
  let stored = readStored(storage);
  let status = statusOf(stored);
  // bumped by every change, so an answer that left before one is not applied after it
  let generation = 0;
  const save = (next: Stored) => {
    generation++;
    stored = next;
    status = statusOf(next);
    // with full or blocked storage, the change holds until the app is reopened
    writeJSON(storage, ACCOUNT_KEY, next);
    statusChanged();
  };

  const post = async (path: string, body: object) => {
    try {
      return await api(`${AUTH_PATH}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new SignInError("offline");
    }
  };

  /** Tells the server to end this device's session; the device stays signed out either way. */
  const endSession = async () => {
    const started = generation;
    const response = await post("/sign-out", {}).catch(() => null);
    // 400: the server holds no session for this device any more
    if (response && (response.ok || response.status === 400) && generation === started) {
      save(null);
    }
  };

  return {
    status: () => status,
    async requestSignInCode(email) {
      const response = await post("/email-otp/send-verification-otp", {
        email: email.trim(),
        type: "sign-in",
      });
      if (!response.ok) throw await failure(response);
    },
    async signIn(email, code) {
      const response = await post("/sign-in/email-otp", {
        email: email.trim(),
        otp: code.replaceAll(/\s/g, ""),
      });
      if (!response.ok) throw await failure(response);
      const { user } = (await response.json()) as { user: { email: string } };
      save({ email: user.email });
    },
    async signOut() {
      save({ signingOut: true });
      await endSession();
    },
    async checkSession() {
      if (stored && "signingOut" in stored) return endSession();
      const started = generation;
      const response = await api(`${AUTH_PATH}/get-session`).catch(() => null);
      // offline, or the server failing: the device keeps what it knew
      if (!response?.ok) return;
      const session = (await response.json()) as { user: { email: string } } | null;
      if (generation === started) save(session ? { email: session.user.email } : null);
    },
  };
}

async function failure(response: Response): Promise<SignInError> {
  const body = (await response.json().catch(() => null)) as { code?: string } | null;
  // the Worker's per-address daily limit, which answers 429 as the per-IP limits do
  if (body?.code === SIGN_IN_ERRORS.limitToday) return new SignInError("limit-today");
  if (response.status === 429) return new SignInError("rate-limited");
  return new SignInError(FAILURES[body?.code ?? ""] ?? "server");
}

const statusOf = (stored: Stored): AccountStatus =>
  stored && "email" in stored ? { signedIn: true, email: stored.email } : { signedIn: false };

const readStored = (storage: KeyValueStorage): Stored =>
  readJSON<Stored>(
    storage,
    ACCOUNT_KEY,
    (value) => {
      if (!isRecord(value)) return null;
      if (typeof value.email === "string") return { email: value.email };
      if (value.signingOut === true) return { signingOut: true };
      return null;
    },
    null,
  );
