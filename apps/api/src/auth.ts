import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { bearer, emailOTP } from "better-auth/plugins";

/** Where the Worker serves better-auth. */
export const AUTH_PATH = "/api/auth";

/** How long a sign-in code works: better-auth's default, named so the email can say it. */
export const CODE_MINUTES = 5;

/** A sign-in code on its way to an allowlisted address. */
export type SignInCode = { to: string; code: string };

export type AuthConfig = {
  /** better-auth's tables, through its Drizzle adapter (`authDatabase` in src/db/database.ts). */
  database: BetterAuthOptions["database"];
  /** The app's origin, such as https://hb.nhutien.com. */
  baseURL?: string;
  secret?: string;
  /** The addresses that may sign in, separated by commas or spaces (the SIGN_IN_ALLOWLIST secret). */
  allowlist: string;
  sendCode: (code: SignInCode) => Promise<void>;
  /**
   * Counts one sign-in step (`path`) for an address today, across every client IP, and returns
   * today's count so far. The Worker keeps the counts in D1; without it there's no daily limit.
   */
  countAttempt?: (email: string, path: string) => Promise<number>;
};

/**
 * Sign-in steps an address may take per UTC day, whatever IPs they come from. Per-IP limits
 * alone let someone with many addresses keep guessing; with these, guessing a 6-digit code gets
 * at most 20 tries a day. The cost: such an attacker can use up the owner's tries for the day.
 */
export const DAILY_LIMITS: Record<string, number> = {
  "/email-otp/send-verification-otp": 10,
  "/sign-in/email-otp": 20,
};

/** The code a refused address gets after using up today's sign-in steps. */
export const TOO_MANY_TODAY = "TOO_MANY_SIGN_IN_ATTEMPTS_TODAY";

/** The code a refused address gets, which the app tells apart from other failures. */
export const NOT_ALLOWED = "EMAIL_NOT_ALLOWED";

const notAllowed = () =>
  new APIError("FORBIDDEN", { code: NOT_ALLOWED, message: "This email address can't sign in." });

/**
 * Sign-in for Streakky (ADR-0003): a 6-digit code by email, only for allowlisted addresses, and
 * no passwords. Any other address is refused before a code is made, so nothing is sent and no
 * account is created. Session cookies on the web; the bearer plugin returns the session token
 * for the Android app.
 */
export function authOptions(config: AuthConfig) {
  const allowed = new Set(
    config.allowlist
      .split(/[\s,]+/)
      .map((email) => email.toLowerCase())
      .filter(Boolean),
  );
  const isAllowed = (email: unknown) =>
    typeof email === "string" && allowed.has(email.toLowerCase());

  return {
    appName: "Streakky",
    baseURL: config.baseURL,
    basePath: AUTH_PATH,
    secret: config.secret,
    database: config.database,
    session: {
      // signed in until signing out (story 56): a year from the last day the app was used
      expiresIn: 60 * 60 * 24 * 365,
      updateAge: 60 * 60 * 24,
    },
    plugins: [
      emailOTP({
        expiresIn: CODE_MINUTES * 60,
        storeOTP: "hashed",
        sendVerificationOTP: ({ email, otp }) => config.sendCode({ to: email, code: otp }),
      }),
      bearer(),
    ],
    // the email-code plugin's password and email-change flows: Streakky has neither. Nor does it
    // check a code or verify an email apart from signing in, and those routes would let a code be
    // guessed outside DAILY_LIMITS
    disabledPaths: [
      "/email-otp/check-verification-otp",
      "/email-otp/verify-email",
      "/email-otp/request-password-reset",
      "/email-otp/reset-password",
      "/forget-password/email-otp",
      "/email-otp/request-email-change",
      "/email-otp/change-email",
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body: unknown = ctx.body;
        if (typeof body !== "object" || body === null || !("email" in body)) return;
        if (!isAllowed(body.email)) throw notAllowed();
        const limit = DAILY_LIMITS[ctx.path];
        if (limit && config.countAttempt) {
          const count = await config.countAttempt(String(body.email).toLowerCase(), ctx.path);
          if (count > limit) {
            throw new APIError("TOO_MANY_REQUESTS", {
              code: TOO_MANY_TODAY,
              message: "Too many sign-in tries for this address today. Try again tomorrow.",
            });
          }
        }
        if (
          ctx.path === "/email-otp/send-verification-otp" &&
          "type" in body &&
          body.type !== "sign-in"
        ) {
          throw new APIError("BAD_REQUEST", { message: "Only sign-in codes are sent." });
        }
      }),
    },
    databaseHooks: {
      // however a request got here, accounts are only made for allowlisted addresses
      user: {
        create: {
          before: async (user) => {
            if (!isAllowed(user.email)) throw notAllowed();
          },
        },
      },
    },
    rateLimit: {
      // better-auth only limits in production builds unless told to; the Worker always does
      enabled: true,
      // in D1, so the limit holds across the Worker's isolates
      storage: "database",
      customRules: {
        // read-only and asked on every app start: not worth a D1 write each time
        "/get-session": false,
        // one more than the 3 tries a code allows, so a fourth try at a used-up code hears
        // that rather than "wait a minute"; DAILY_LIMITS caps tries across every IP
        "/sign-in/email-otp": { window: 60, max: 4 },
      },
    },
    advanced: {
      // Cloudflare sets this to the client's address on every request it forwards
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  } satisfies BetterAuthOptions;
}

export const createAuth = (config: AuthConfig) => betterAuth(authOptions(config));
