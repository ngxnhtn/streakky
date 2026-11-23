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
  /** The D1 binding in the Worker; any SQLite database better-auth knows, for the schema script. */
  database: BetterAuthOptions["database"];
  /** The app's origin, such as https://hb.nhutien.com. */
  baseURL?: string;
  secret?: string;
  /** The addresses that may sign in, separated by commas or spaces (the SIGN_IN_ALLOWLIST var). */
  allowlist: string;
  sendCode: (code: SignInCode) => Promise<void>;
};

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
    // the email-code plugin's password and email-change flows: Streakky has neither
    disabledPaths: [
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
      },
    },
    advanced: {
      // Cloudflare sets this to the client's address on every request it forwards
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  } satisfies BetterAuthOptions;
}

export const createAuth = (config: AuthConfig) => betterAuth(authOptions(config));
