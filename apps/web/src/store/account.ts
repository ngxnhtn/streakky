/**
 * Signing in to the API Worker with an email code, and remembering on the device whether it is
 * signed in, so the app knows while offline. The session itself is the server's cookie, which
 * the browser keeps. Screens reach all of this through the habit store.
 */
import type { HabitStore, KeyValueStorage } from "./habit-store.ts";

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

/** The codes the server emails: how many digits, and how many minutes each works (auth.ts). */
export const SIGN_IN_CODE = { length: 6, minutes: 5 } as const;

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
const AUTH = "/api/auth";

/** better-auth's error codes, as the app tells them apart. */
const FAILURES: Record<string, SignInFailure> = {
  INVALID_EMAIL: "invalid-email",
  EMAIL_NOT_ALLOWED: "not-allowed",
  INVALID_OTP: "wrong-code",
  OTP_EXPIRED: "expired-code",
  TOO_MANY_ATTEMPTS: "used-up-code",
};

/** The habit store's sign-in commands, which the store hands on, and whether it's signed in. */
export type Account = Pick<
  HabitStore,
  "requestSignInCode" | "signIn" | "signOut" | "checkSession"
> & { status: () => AccountStatus };

export function openAccount({
  api,
  storage,
  changed,
}: {
  api: ApiFetch;
  storage: KeyValueStorage;
  changed: () => void;
}): Account {
  let stored = readStored(storage);
  let status = statusOf(stored);
  // bumped by every change, so an answer that left before one is not applied after it
  let generation = 0;
  const save = (next: Stored) => {
    generation++;
    stored = next;
    status = statusOf(next);
    try {
      storage.setItem(ACCOUNT_KEY, JSON.stringify(next));
    } catch {
      // full or blocked storage: the change holds until the app is reopened
    }
    changed();
  };

  const post = async (path: string, body: object) => {
    try {
      return await api(`${AUTH}${path}`, {
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
      const response = await api(`${AUTH}/get-session`).catch(() => null);
      // offline, or the server failing: the device keeps what it knew
      if (!response?.ok) return;
      const session = (await response.json()) as { user: { email: string } } | null;
      if (generation === started) save(session ? { email: session.user.email } : null);
    },
  };
}

async function failure(response: Response): Promise<SignInError> {
  const body = (await response.json().catch(() => null)) as { code?: string } | null;
  // the Worker's per-address daily limit (apps/api/src/auth.ts, TOO_MANY_TODAY)
  if (body?.code === "TOO_MANY_SIGN_IN_ATTEMPTS_TODAY") return new SignInError("limit-today");
  if (response.status === 429) return new SignInError("rate-limited");
  return new SignInError(FAILURES[body?.code ?? ""] ?? "server");
}

const statusOf = (stored: Stored): AccountStatus =>
  stored && "email" in stored ? { signedIn: true, email: stored.email } : { signedIn: false };

function readStored(storage: KeyValueStorage): Stored {
  try {
    const value: unknown = JSON.parse(storage.getItem(ACCOUNT_KEY) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    if ("email" in value && typeof value.email === "string") return { email: value.email };
    if ("signingOut" in value && value.signingOut === true) return { signingOut: true };
    return null;
  } catch {
    return null;
  }
}
